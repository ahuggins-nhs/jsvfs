/**
 * [[include:packages/adapter-noop/README.md]]
 * @packageDocumentation
 * @module @jsvfs/adapter-noop
 */

import type { Adapter, ItemType, JournalEntry, LinkType, SnapshotEntry } from '@jsvfs/types'

/** An adapter for No-Operation; essentially makes the VFS a memory-only instance. */
export class NoopAdapter implements Adapter {
  /** Creates an instance of noop adapter. */
  constructor () {
    this.root = ''
    this.handle = 'noop'
    this.journal = []
  }

  /** The real root of this file system which will be committed to. */
  readonly root: string
  /** Log useful messages to the journal about file operations. */
  journal: JournalEntry[]
  /** The handle for this adapter, basically an id. Should be something simple but descriptive, like 'node-fs' or 'blob'. */
  handle: 'noop'

  /** Snapshot of the underlying file system; an asynchronous iterable which returns an entry of path and data.
   * @returns {AsyncGenerator<[string, SnapshotEntry]>} The asynchronous iterable to get the snapshot.
   */
  async * snapshot (): AsyncGenerator<[string, SnapshotEntry]> {}

  /** Create a file or write the contents of a file to persistent storage. */
  async write (path: string, contents?: Buffer): Promise<void> {}

  /** Make a directory or directory tree in persistent storage. */
  async mkdir (path: string): Promise<void> {}

  /** Create a link in persistent storage. */
  async link (from: string, to: string, type: LinkType): Promise<void> {}

  /** Remove items from persistent storage. */
  async remove (path: string, type: ItemType): Promise<void> {}

  /** Flush the underlying file system to prepare for a commit. */
  async flush (): Promise<void> {}
}
