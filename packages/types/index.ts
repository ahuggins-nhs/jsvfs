/**
 * [[include:packages/types/README.md]]
 * @packageDocumentation
 * @module @jsvfs/types
 */

export const JSON_SCHEMA = {
  JournalEntry: {
    type: 'object',
    required: [
      'op',
      'level',
      'message'
    ],
    properties: {
      id: {
        type: ['string', 'number']
      },
      op: {
        type: 'string',
        enum: [
          'snapshot',
          'write',
          'mkdir',
          'link',
          'remove',
          'flush'
        ]
      },
      level: {
        type: 'string',
        enum: [
          'info',
          'warn',
          'error',
          'crit'
        ]
      },
      message: {
        type: 'string'
      }
    },
    additionalProperties: true
  }
}

/** An adapter for the underlying persistent file storage.
 *
 * Rules for implementing an adapter:
 * 1. Throwing errors is unacceptable; log errors to the journal.
 * 2. Adapters must create paths recursively.
 * 3. Adapters must implement all methods.
 * 4. Unsupported methods must be a noop.
 */
export interface Adapter {
  /** Snapshot of the underlying file system; an asynchronous iterable which returns an entry of path and data. */
  snapshot: () => AsyncGenerator<[string, SnapshotEntry]>
  /** Create a file or write the contents of a file to persistent storage. */
  write: (path: string, contents?: Buffer) => Promise<void>
  /** Make a directory or directory tree in persistent storage. */
  mkdir: (path: string) => Promise<void>
  /** Create a link in persistent storage. */
  link: (from: string, to: string, type: LinkType) => Promise<void>
  /** Remove items from persistent storage. */
  remove: (path: string, type: ItemType) => Promise<void>
  /** Flush the underlying file system to prepare for a commit. */
  flush: () => Promise<void>
  /** The real root of this file system which will be committed to. */
  readonly root: string
  /** Log useful messages to the journal about file operations. */
  journal: JournalEntry[]
  /** The handle for this adapter, basically an id. Should be something simple but descriptive, like 'node-fs' or 'blob'. */
  handle: string
}

/** Types the indicate the link behavior. */
export type LinkType = 'hardlink' | 'softlink'
/** Types that implement folder or "parent item" functionality. */
export type FolderType = 'folder'| 'root'
/** The valid item types implemented by jsvfs. */
export type ItemType = 'file' | FolderType | LinkType
/** Types of entries which may be encountered during a snapshot. */
export type SnapshotEntry = SnapshotFileEntry | SnapshotFolderEntry | SnapshotLinkEntry

/** Metadata about an event for the adapter journal. */
export interface JournalEntry {
  id?: string | number
  op: 'snapshot' | 'write' | 'mkdir' | 'link' | 'remove' | 'flush'
  level: 'info' | 'warn' | 'error' | 'crit'
  message: string
  [property: string]: any
}

/** Metadata about the file system captured by the snapshot. */
interface SnapshotEntryBase {
  /** The type of entry, such as 'file' or 'folder'. */
  type: ItemType
  contents?: any
}

export interface SnapshotFileEntry extends SnapshotEntryBase {
  type: 'file'
  /** The contents of the file as a buffer. */
  contents: Buffer
}

export interface SnapshotFolderEntry extends SnapshotEntryBase {
  type: 'folder'
}

export interface SnapshotLinkEntry extends SnapshotEntryBase {
  type: LinkType
  /** The target path of the link. */
  contents: string
}
