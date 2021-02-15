import { doesNotReject, strictEqual, throws } from 'assert'
import { Client } from 'minio'
import { MinioS3Adapter } from '../../packages/adapter-minio-s3/index'
import { s3rver, connection } from './helpers'
import { SnapshotEntry } from '../../packages/types/index'

const minioClient = new Client(connection)

describe('Module @jsvfs/adapter-minio-s3', () => {
  before(async function () {
    await s3rver.start()
  })

  after(async function () {
    await s3rver.stop()
  })

  it('should construct an instance', () => {
    const adapter1 = new MinioS3Adapter({
      access: connection,
      bucketName: 'fake-bucket',
      include: [],
      flushEnabled: true,
      createIfNotExist: true
    })
    const adapter2 = new MinioS3Adapter({
      access: connection,
      bucketName: 'invalid...bucket'
    })

    strictEqual(adapter1 instanceof MinioS3Adapter, true)
    strictEqual(adapter2 instanceof MinioS3Adapter, true)

    throws(() => {
      const opts: any = {}
      // eslint-disable-next-line no-new
      new MinioS3Adapter(opts)
    })
    throws(() => {
      const opts: any = { access: null }
      // eslint-disable-next-line no-new
      new MinioS3Adapter(opts)
    })
  })

  it('should handle snapshot and flush API', async () => {
    const name = 'test-buck'
    const message = 'Hello, world!'
    await minioClient.makeBucket(name, 'us-east-1')
    await minioClient.putObject(name, 'test1.txt', Buffer.alloc(0))
    await minioClient.putObject(name, 'test2.txt', Buffer.from(message))

    const adapter = new MinioS3Adapter({
      access: connection,
      bucketName: name,
      include: [],
      flushEnabled: true,
      createIfNotExist: true
    })

    const results: Array<[string, SnapshotEntry]> = []

    await doesNotReject(async () => {
      for await (const item of adapter.snapshot()) {
        results.push(item)
      }
    })

    const result1 = results[0]
    const result2 = results[1]

    strictEqual(result1[0], '/test1.txt')
    strictEqual(result1[1].type, 'file')
    strictEqual(result2[0], '/test2.txt')
    strictEqual(result2[1].contents.toString('utf8'), message)

    await doesNotReject(async () => {
      await adapter.flush()
    })
  })

  it('should handle file and folder APIs', async () => {
    const adapter = new MinioS3Adapter({
      access: connection,
      createIfNotExist: true
    })

    await doesNotReject(async () => {
      await adapter.mkdir('/nothing')
    })

    await doesNotReject(async () => {
      await adapter.write('/no-bucket/file.txt')
    })

    await doesNotReject(async () => {
      await adapter.link('/no-bucket/file2.txt', '/no-bucket/file.txt', 'softlink')
    })

    await doesNotReject(async () => {
      await adapter.remove('/no-bucket/file.txt', 'file')
    })

    console.log(adapter.journal.getEntries('all', 'error', 'crit'))
  })
})
