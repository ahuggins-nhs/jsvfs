import { Readable } from 'stream'
import { PathParseResult } from './types'

/** Parses a given path into a bucket and object name. */
export function parse (path: string, root: string): PathParseResult {
  if (root === '/') {
    const parts = path.split('/')

    if (parts[0] === '') {
      return {
        bucketName: parts[1],
        objectName: parts.slice(2).join('/')
      }
    }

    return {
      bucketName: parts[0],
      objectName: parts.slice(1).join('/')
    }
  }

  return {
    bucketName: root,
    objectName: path[0] === '/' ? path.substring(1) : path
  }
}

/** Convert a Readable stream to an Async Generator. Based on https://www.derpturkey.com/nodejs-async-generators-for-streaming */
export async function * streamToAsyncGenerator<T> (reader: Readable, chunkSize?: number): AsyncGenerator<T> {
  const signalEnd = new Promise<void>(resolve => {
    reader.once('end', resolve)
  })

  while (!reader.readableEnded) {
    while (reader.readable) {
      const val: T = typeof chunkSize === 'number'
        ? reader.read(chunkSize) ?? reader.read()
        : reader.read()

      if (typeof val !== 'undefined' && val !== null) {
        yield val
      } else {
        break
      }
    }

    const signalReadable = new Promise<void>(resolve => {
      reader.once('readable', resolve)
    })

    await Promise.race([signalEnd, signalReadable])
  }
}
