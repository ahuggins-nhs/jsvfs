import * as sinon from 'sinon'
import { doesNotReject, doesNotThrow, strictEqual, throws } from 'assert'
import { dirname } from 'path'
import { VirtualFileSystem } from '../../packages/core/index'
import { NoopAdapter } from '../../packages/adapter-noop/index'

describe('Module @jsvfs/core', () => {
  const testFolderPath = 'folder/subfolder'
  const testFilePath = testFolderPath + '/file.txt'

  it('should construct a virtual file system', () => {
    const vfs = new VirtualFileSystem()

    strictEqual((vfs as any).adapter instanceof NoopAdapter, true)
    strictEqual(vfs.separator, '/')
  })

  it('should read and write file items', () => {
    const adapter = new NoopAdapter()
    const vfs = new VirtualFileSystem(adapter)
    const testMsg = 'Hello, world!'

    doesNotThrow(() => {
      vfs.write(testFilePath)
    })

    const result1 = vfs.read(testFilePath)

    strictEqual(Buffer.isBuffer(result1), true)
    strictEqual(result1.length, 0)

    doesNotThrow(() => {
      vfs.write(testFilePath, testMsg)
    })

    const result2 = vfs.read(testFilePath)

    strictEqual(Buffer.isBuffer(result2), true)
    strictEqual(result2.toString('utf8'), testMsg)

    doesNotThrow(() => {
      vfs.write(testFilePath, String(testMsg))
    })

    const result3 = vfs.read(testFilePath)

    strictEqual(Buffer.isBuffer(result3), true)
    strictEqual(result3.toString('utf8'), testMsg)

    doesNotThrow(() => {
      vfs.write(testFilePath, testMsg, true)
    })

    const result4 = vfs.read(testFilePath)

    strictEqual(Buffer.isBuffer(result4), true)
    strictEqual(result4.toString('utf8'), testMsg + testMsg)

    throws(() => {
      vfs.read(testFolderPath)
    })

    throws(() => {
      vfs.write(testFolderPath)
    })

    throws(() => {
      vfs.write(testFolderPath, '', true)
    })
  })

  it('should delete file items', () => {
    const vfs = new VirtualFileSystem()

    vfs.write(testFilePath)

    const result1 = vfs.exists(testFilePath)

    strictEqual(result1, true)

    doesNotThrow(() => {
      vfs.delete(testFilePath)
    })

    const result2 = vfs.exists(testFilePath)

    strictEqual(result2, false)

    doesNotThrow(() => {
      vfs.write(testFilePath)
    })

    doesNotThrow(() => {
      vfs.delete('/cats')
    })

    throws(() => {
      vfs.delete(testFolderPath)
    })
  })

  it('should create and remove folders', () => {
    const vfs = new VirtualFileSystem()

    doesNotThrow(() => {
      vfs.mkdir(testFolderPath)
    })

    const result1 = vfs.exists(testFolderPath)

    strictEqual(result1, true)

    doesNotThrow(() => {
      vfs.mkdir(testFolderPath)
    })

    doesNotThrow(() => {
      vfs.rmdir(testFolderPath)
    })

    const result2 = vfs.exists(testFolderPath)

    strictEqual(result2, false)

    const result3 = vfs.exists(dirname(testFolderPath))

    strictEqual(result3, true)

    doesNotThrow(() => {
      vfs.rmdir('/dogs')
    })

    doesNotThrow(() => {
      vfs.mkdir('/dogs')
    })

    vfs.write(testFilePath)

    throws(() => {
      vfs.rmdir(testFilePath)
    })
  })

  it('should list folder children', () => {
    const vfs = new VirtualFileSystem()
    const otherPath = testFolderPath + '/other'

    vfs.write(testFilePath)
    vfs.mkdir(otherPath)

    const results1 = vfs.readdir(testFolderPath)

    strictEqual(results1.length, 2)
    strictEqual(typeof results1[1], 'string')

    const results2 = vfs.readdir(testFolderPath, true)

    strictEqual(results2.length, 2)
    strictEqual(typeof results2[0].type, 'string')

    const results3 = vfs.readdir(otherPath, true)

    strictEqual(results3.length, 0)

    const results4 = vfs.readdir('/squirrel', true)

    strictEqual(results4.length, 0)

    throws(() => {
      vfs.readdir(testFilePath)
    })
  })

  it('should handle links', () => {
    const vfs = new VirtualFileSystem()
    const linkFolderPath = '/link1'
    const linkFilePath = '/link2.log'

    vfs.mkdir(testFolderPath)
    vfs.write(testFilePath)

    doesNotThrow(() => {
      vfs.link(linkFolderPath, testFolderPath)
    })

    doesNotThrow(() => {
      vfs.link(linkFilePath, testFilePath, 'hardlink')
    })

    const result1 = vfs.link(linkFilePath, testFilePath)

    strictEqual(result1, false)

    const result2 = vfs.link(linkFilePath + '/nah', testFilePath)

    strictEqual(result2, false)

    const result3 = vfs.unlink(linkFilePath)

    strictEqual(result3, true)

    const result4 = vfs.unlink(linkFilePath + '/nope')

    strictEqual(result4, false)

    const result5 = vfs.unlink(testFilePath)

    strictEqual(result5, false)

    doesNotThrow(() => {
      vfs.link(linkFilePath, testFilePath, 'hardlink')
      vfs.delete(linkFilePath)
    })

    doesNotThrow(() => {
      vfs.write(testFilePath)
      vfs.link(linkFilePath, testFilePath)
      vfs.delete(linkFilePath)
    })

    doesNotThrow(() => {
      vfs.link(linkFolderPath, testFolderPath)
      vfs.rmdir(linkFolderPath)
    })

    doesNotThrow(() => {
      vfs.mkdir(testFolderPath)
      vfs.link(linkFolderPath, testFolderPath, 'hardlink')
      vfs.rmdir(linkFolderPath)
    })
  })

  it('should snapshot a persistent storage and commit changes', async () => {
    const adapter = new NoopAdapter()
    const vfs = new VirtualFileSystem(adapter)
    const fakeFolder = '/doobie'
    const fakeFile = '/blunt.txt'
    const fakeLink1 = '/blunt.hardlink.txt'
    const fakeLink2 = '/blunt.softlink.txt'

    sinon.stub(adapter, 'snapshot').callsFake(async function * snapshot () {
      yield [fakeFolder, { type: 'folder' }]
      yield [fakeFile, { type: 'file', contents: Buffer.alloc(0) }]
      yield [fakeLink1, { type: 'hardlink', contents: fakeFile }]
      yield [fakeLink2, { type: 'softlink', contents: fakeFile }]
    })

    await doesNotReject(async () => {
      await vfs.snapshot()
    })

    const result1 = vfs.exists(fakeFolder)
    const result2 = vfs.exists(fakeFile)

    strictEqual(result1, true)
    strictEqual(result2, true)

    vfs.delete(fakeFile)

    await doesNotReject(async () => {
      await vfs.commit()
    })
  })
})
