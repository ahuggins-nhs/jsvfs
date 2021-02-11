import { Client } from 'minio'
import { isContainerName, parse } from './helpers'
import type { Adapter, ItemType, JournalEntry, LinkType, SnapshotEntry } from '@jsvfs/types'
import type { MinioS3AdapterOpts } from './types'

/** An adapter for Amazon S3 compatible storage. */
export class MinioS3Adapter implements Adapter {
  /** Creates an instance of MinIO S3 adapter. */
  constructor (opts: MinioS3AdapterOpts) {
    const { access } = opts

    if (typeof access === 'undefined') {
      throw new Error("Option 'access' cannot be undefined.")
    } else {
      this.minio = new Client(access)
    }

    if (isContainerName(opts.bucketName)) {
      this.root = opts.bucketName
    } else {
      this.root = '/'
    }

    this.include = Array.isArray(opts.include) ? Object.freeze(Array.from(opts.include)) : Object.freeze([])
    this.flushEnabled = opts.flushEnabled ?? false
    this.createIfNotExist = opts.createIfNotExist ?? false
    this.handle = 'minio-s3'
    this.journal = []
  }

  /** The backing instance of blob service client. */
  readonly minio: Client
  /** A cache of encountered container clients to optimize performance. */
  readonly containerCache: Map<string, any>
  /** The real root of this file system which will be committed to. */
  readonly root: string
  /** The file globs to apply to `snapshot` and `flush` operations. */
  readonly include: readonly string[]
  /** Whether to create a container if it does not yet exist. */
  createIfNotExist: boolean
  /** Enable or disable flushing the file system. */
  flushEnabled: boolean
  /** Log useful messages to the journal about file operations. */
  journal: JournalEntry[]
  /** The handle for this adapter, basically an id. Should be something simple but descriptive, like 'node-fs' or 'blob'. */
  handle: 'minio-s3'

  /** Returns true if root is the storage account. */
  get isGlobal (): boolean {
    return this.root === '/'
  }

  /** Snapshot of the underlying file system; an asynchronous iterable which returns an entry of path and data.
   * @returns {AsyncGenerator<[string, SnapshotEntry]>} The asynchronous iterable to get the snapshot.
   */
  async * snapshot (): AsyncGenerator<[string, SnapshotEntry]> {
    for await (const [name, client] of this.listContainers()) {
      for await (const blobItem of client.listBlobsFlat()) {
        const contents = await this.readBlob(client, blobItem.name)
        const snapshotName = this.isGlobal
          ? '/' + name + '/' + blobItem.name
          : '/' + blobItem.name

        // Need to add glob behavior to include files from the options.
        yield [snapshotName, { type: 'file', contents }]
      }
    }
  }

  /** Create a file or write the contents of a file to persistent storage. */
  async write (path: string, contents: Buffer = Buffer.alloc(0)): Promise<void> {
    const parsed = parse(path, this.root)
    const container = await this.getContainer(parsed.container)
    const blobClient = container.getBlockBlobClient(parsed.blobName)

    try {
      await blobClient.uploadData(contents)
    } catch (error) {
      // Log error to journal.
    }
  }

  /** Make a directory or directory tree in persistent storage. Technically unsupported by Microsoft, as 'directories' are virtual. */
  async mkdir (path: string): Promise<void> {}

  /** Create a link in persistent storage. Definitely unsupported by Microsoft, so we copy the file contents from an existing blob. */
  async link (linkPath: string, linkTarget: string, type: LinkType): Promise<void> {
    const parsedPath = parse(linkPath, this.root)
    const parsedTarget = parse(linkTarget, this.root)
    const containerFrom = await this.getContainer(parsedTarget.container)
    const containerTo = await this.getContainer(parsedPath.container)
    const blobFrom = containerFrom.getBlockBlobClient(parsedTarget.blobName)
    const blobTo = containerTo.getBlockBlobClient(parsedPath.blobName)

    try {
      await blobTo.syncCopyFromURL(blobFrom.url)
    } catch (error) {
      // Log error to journal.
    }
  }

  /** Remove items from persistent storage. */
  async remove (path: string, type: ItemType): Promise<void> {
    const parsed = parse(path, this.root)
    const container = await this.getContainer(parsed.container)
    const blobClient = container.getBlockBlobClient(parsed.blobName)

    switch (type) {
      case 'file':
      case 'hardlink':
      case 'softlink':
        try {
          await blobClient.deleteIfExists()
        } catch (error) {
          // Log error to journal.
        }
    }
  }

  /** Flush the underlying file system to prepare for a commit. */
  async flush (): Promise<void> {
    if (this.flushEnabled) {
      for await (const item of this.listContainers()) {
        const client = item[1]

        for await (const blobItem of client.listBlobsFlat()) {
          const blobClient = client.getBlockBlobClient(blobItem.name)

          // Need to add glob behavior to include files from the options.
          try {
            await blobClient.deleteIfExists()
          } catch (error) {
            // Log error to journal.
          }
        }
      }
    }
  }

  /** Reads a blob from blob storage. */
  private async readBlob (container: string | ContainerClient, blobName: string): Promise<Buffer> {
    const containerClient = typeof container === 'string' ? await this.getContainer(container) : container
    const blobClient = containerClient.getBlockBlobClient(blobName)

    try {
      return await blobClient.downloadToBuffer()
    } catch (error) {
      return Buffer.alloc(0)
    }
  }

  /** Get or initialize the given container by name. */
  private async getContainer (name: string, exists: boolean = false): Promise<ContainerClient> {
    let containerClient = this.containerCache.get(name)

    if (typeof containerClient === 'undefined') {
      containerClient = this.blobService.getContainerClient(this.root)

      if (!exists && this.createIfNotExist) {
        try {
          await containerClient.createIfNotExists()
        } catch (error) {
          // We don't care about this error. Hide it.
        }
      }

      this.containerCache.set(name, containerClient)
    }

    return containerClient
  }

  /** List the containers for this instance and optionally cache them. */
  private async * listContainers (): AsyncGenerator<[string, ContainerClient]> {
    if (this.containerCache.size === 0) {
      if (this.isGlobal) {
        for await (const containerItem of this.blobService.listContainers()) {
          if (typeof containerItem.deleted === 'undefined' || !containerItem.deleted) {
            yield [containerItem.name, await this.getContainer(containerItem.name, true)]
          }
        }
      } else {
        yield [this.root, await this.getContainer(this.root)]
      }
    } else {
      for (const item of this.containerCache.entries()) {
        yield item
      }
    }
  }
}
