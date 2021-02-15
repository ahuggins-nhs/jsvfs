import { doesNotReject, strictEqual, throws } from 'assert'
import { BlobServiceClient } from '@azure/storage-blob'
import { AzureBlobAdapter } from '../../packages/adapter-azure-blob/index'
import { azurite, connection } from './helpers'
import { SnapshotEntry } from '../../packages/types/index'

const blobService = BlobServiceClient.fromConnectionString(connection)

describe('Module @jsvfs/adapter-azure-blob', () => {
  before(async function () {
    await azurite.start()
  })

  after(async function () {
    await azurite.stop()
  })

  it('should construct an instance', () => {
    const adapter1 = new AzureBlobAdapter({
      access: {
        connectionString: connection
      },
      container: 'fake-container',
      include: [],
      flushEnabled: true,
      createIfNotExist: true
    })
    const adapter2 = new AzureBlobAdapter({
      access: {
        storageAccount: '',
        storageKey: ''
      },
      container: 'invalid.container'
    })

    strictEqual(adapter1 instanceof AzureBlobAdapter, true)
    strictEqual(adapter2 instanceof AzureBlobAdapter, true)

    throws(() => {
      const opts: any = {}
      // eslint-disable-next-line no-new
      new AzureBlobAdapter(opts)
    })
    throws(() => {
      const opts: any = { access: {} }
      // eslint-disable-next-line no-new
      new AzureBlobAdapter(opts)
    })
  })

  it('should handle snapshot and flush API', async () => {
    const name = 'test-contain'
    const { containerClient } = await blobService.createContainer(name)
    const blob = containerClient.getBlockBlobClient('test.txt')

    await blob.uploadData(Buffer.alloc(0))

    const adapter = new AzureBlobAdapter({
      access: {
        connectionString: connection
      },
      container: name,
      include: [],
      flushEnabled: true,
      createIfNotExist: true
    })

    let result: [string, SnapshotEntry]

    await doesNotReject(async () => {
      for await (const item of adapter.snapshot()) {
        result = item
      }
    })

    strictEqual(result[0], '/test.txt')
    strictEqual(result[1].type, 'file')

    await doesNotReject(async () => {
      await adapter.flush()
    })
  })

  it('should handle file and folder APIs', async () => {
    const adapter = new AzureBlobAdapter({
      access: {
        connectionString: connection
      },
      createIfNotExist: true
    })

    await doesNotReject(async () => {
      await adapter.mkdir('/nothing')
    })

    await doesNotReject(async () => {
      await adapter.write('/no-container/file.txt')
    })

    await doesNotReject(async () => {
      await adapter.link('/no-container/file2.txt', '/no-container/file.txt', 'softlink')
    })

    await doesNotReject(async () => {
      await adapter.remove('/no-container/file.txt', 'file')
    })
  })
})
