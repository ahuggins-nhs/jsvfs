import { normalize } from 'path'
import { existsSync, mkdirSync } from 'fs'
import * as rimraf from 'rimraf'
import { Service } from 'managed-service-daemon'

export const azuriteDir = normalize('./.azurite')
export const azurite = new Service({
  name: 'azurite',
  command: 'node',
  args: [normalize('./node_modules/azurite/dist/src/blob/main'), '-s', '-l', azuriteDir],
  startWait: 500,
  onStart: () => {
    if (!existsSync(azuriteDir)) mkdirSync(azuriteDir)
  },
  onStop: () => {
    rimraf.sync(azuriteDir)
  }
})
export const connection = `DefaultEndpointsProtocol=http;
AccountName=devstoreaccount1;
AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;
EndpointSuffix=false;
BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;
QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;
TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;`.replace(/[\r\n]*/gu, '')
