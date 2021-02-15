import type { ClientOptions } from 'minio'
import { JournalEntry } from '@jsvfs/types'

export interface MinioS3JournalEntry extends JournalEntry {
  error: Error
}

export type JournalOp = MinioS3JournalEntry['op']

/** Options to construct an adapter instance. */
export interface MinioS3AdapterOpts {
  /** The options to connect to and access an Amazon S3 compatible storage. */
  access: ClientOptions
  /** The file globs to apply to `snapshot` and `flush` operations. */
  include?: string[]
  /**
   * If no bucket name is provided, or bucket name is set to '/', then the storage account is considered root.
   * Providing any other valid string will be considered a bucket name, making the bucket the root.
   */
  bucketName?: string
  /** Enable flushing the file system before commiting; defaults to false, since flush is a destructive operation. */
  flushEnabled?: boolean
  /** Enable creating buckets if they do not exist; defaults to false. */
  createIfNotExist?: boolean
  /**
   * Region to create buckets in; if provided, option `createIfNotExist` defaults to true.
   * If not provided and `createIfNotExist` is true, region defaults to 'us-east-1'.
   */
  region?: string
}

/** The result of parsing a path. */
export interface PathParseResult {
  bucketName: string
  objectName: string
}
