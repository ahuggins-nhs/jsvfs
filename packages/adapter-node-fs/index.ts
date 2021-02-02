/**
 * A back-end for `@jsvfs/core` using Node's `fs` module.
 * 
 * Allows a developer to define the current working directory that acts as the root of the adapter, and to enable the
 * `flush` functionality of the adapter. This second option is important, as flush in this adapter attempts to completely
 * remove all files and folders from the root of the adapter. To protect developers against accidentally destroying files,
 * this option defaults to `false` and must be intentionally enabled.
 * 
 * If you're looking to create new adapters, please use `@jsvfs/types` and look to this module as an example.
 * @packageDocumentation
 * @module @jsvfs/adapter-node-fs
 */

import { Dirent, promises } from 'fs'
import { dirname, join, posix, resolve, relative } from 'path'
import type { Adapter, ItemType, JournalEntry, SnapshotEntry } from '@jsvfs/types'

const { link, mkdir, readdir, readFile, readlink, rmdir, symlink, unlink, writeFile } = promises

export interface NodeFSAdapterOpts {
  /** The desired working directory for this adater; defaults to process current working directory. */
  cwd?: string
  /** Enable flushing the file system before commiting; defaults to false, since flush is a destructive operation. */
  flushEnabled?: boolean
}

/** An adapter for NodeJS local filesystems using the `fs` module. */
export class NodeFSAdapter implements Adapter {
  /** Creates an instance of Node file system adapter.
   * @param {NodeFSAdapterOpts} [opts] - Options for this instance.
   */
  constructor (opts: NodeFSAdapterOpts = {}) {
    this.root = typeof opts.cwd === 'string' ? resolve(opts.cwd) : process.cwd()
    this.flushEnabled = typeof opts.flushEnabled === 'boolean' ? opts.flushEnabled : false
    this.handle = 'node-fs'
    this.journal = []
  }

  /** The real root of this file system which will be committed to. */
  readonly root: string
  /** Enable or disable flushing the file system. */
  flushEnabled: boolean
  /** Log useful messages to the journal about file operations. */
  journal: JournalEntry[]
  /** The handle for this adapter, basically an id. Should be something simple but descriptive, like 'node-fs' or 'blob'. */
  handle: 'node-fs'

  /** Snapshot of the underlying file system; an asynchronous iterable which returns an entry of path and data.
   * @param {string} [path='/'] - The current path as the tree is descended.
   * @param {boolean} [read=true] - Whether to retrieve the underlying data.
   * @returns {AsyncGenerator<[string, SnapshotEntry]>} The asynchronous iterable to get the snapshot.
   */
  async *snapshot (path: string = '/'): AsyncGenerator<[string, SnapshotEntry]> {
    let result: Dirent[] = []

    try {
      result = await promises.readdir(path === '/' ? this.root : join(this.root, path), { withFileTypes: true })
    } catch (error) {
      this.journal.push({
        id: this.journal.length,
        level: 'error',
        message: `Could not read directory '${join(this.root, path)}'.`,
        op: 'snapshot',
        error
      })
    }

    for (const entry of result) {
      const newPath = posix.join(path, entry.name)

      try {
        switch (true) {
          case entry.isDirectory():
            yield [newPath, { type: 'folder' }]
            for await (const [path, data] of this.snapshot(newPath)) {
              yield [path, data]
            }
            break
          case entry.isFile():
            yield [newPath, {
              type: 'file',
              contents: await readFile(join(this.root, newPath))
            }]
            break
          case entry.isSymbolicLink():
            yield [newPath, {
              type: 'softlink',
              contents: relative(
                join(this.root, newPath),
                await readlink(join(this.root, newPath), 'utf8')
              )
                .replace(this.root, '')
                .replace(/\\+|\/+/gu, '/')
            }]
            break
        }
      } catch (error) {
        this.journal.push({
          id: this.journal.length,
          level: 'error',
          message: `Could not get contents of '${join(this.root, newPath)}'.`,
          op: 'snapshot',
          error
        })
      }
    }
  }

  /** Create a file or write the contents of a file to persistent storage. */
  async write (path: string, contents?: Buffer): Promise<void> {
    const newPath = join(this.root, path)

    try {
      const parent = dirname(newPath)

      if (typeof contents === 'undefined') contents = Buffer.alloc(0)

      try {
        await mkdir(parent, { recursive: true })
      } catch (error) {
        this.journal.push({
          id: this.journal.length,
          level: 'warn',
          message: `Could not create directory '${parent}'.`,
          op: 'snapshot',
          error
        })
      }

      await writeFile(newPath, contents)
    } catch (error) {
      this.journal.push({
        id: this.journal.length,
        level: 'error',
        message: `Could not get contents of '${newPath}'.`,
        op: 'snapshot',
        error
      })
    }
  }

  /** Make a directory or directory tree in persistent storage. */
  async mkdir (path: string): Promise<void> {
    const newPath = join(this.root, path)

    await mkdir(newPath, { recursive: true })
  }

  /** Create a link in persistent storage. */
  async link (from: string, to: string, type: 'hardlink' | 'softlink'): Promise<void> {
    const newFrom = join(this.root, from)
    const newTo = join(this.root, to)

    switch(type) {
      case 'hardlink':
        await link(newTo, newFrom)
        break
      case 'softlink':
        await symlink(newTo, newFrom)
        break
    }
  }

  /** Remove items from persistent storage. */
  async remove (path: string, type: ItemType): Promise<void> {
    switch (type) {
      case 'root':
        // Ignore root; removal of root is probably unintentional.
        break
      case 'folder':
        await rmdir(join(this.root, path), { recursive: true })
        break
      default:
        await unlink(join(this.root, path))
        break
    }
  }

  /** Flush the underlying file system to prepare for a commit. This is a destructive operation unless flush is disabled. */
  async flush (): Promise<void> {
    if (this.flushEnabled) {
      const result = await readdir(this.root, { withFileTypes: true })

      for (const entry of result) {
        const path = join(this.root, entry.name)
  
        switch (true) {
          case entry.isDirectory():
            await rmdir(path, { recursive: true })
            break
          case entry.isFile():
            await unlink(path)
            break
        }
      }
    }
  }
}
