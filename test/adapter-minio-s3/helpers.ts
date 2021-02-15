import { normalize } from 'path'
import { existsSync, mkdirSync } from 'fs'
import * as rimraf from 'rimraf'
import { Service } from 'managed-service-daemon'
import { ClientOptions } from 'minio'

export const s3rverDir = normalize('./.s3rver')
export const s3rver = new Service({
  name: 's3rver',
  command: 'node',
  args: [normalize('./node_modules/s3rver/bin/s3rver.js'), '-s', '-d', s3rverDir],
  startWait: 500,
  onStart: () => {
    if (!existsSync(s3rverDir)) mkdirSync(s3rverDir)
  },
  onStop: () => {
    rimraf.sync(s3rverDir)
  }
})
export const connection: ClientOptions = {
  endPoint: 'localhost',
  port: 4568,
  useSSL: false,
  accessKey: 'S3RVER',
  secretKey: 'S3RVER'
}
