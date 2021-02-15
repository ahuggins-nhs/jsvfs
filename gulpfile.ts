import { readdirSync } from 'fs'
import { join } from 'path'
import * as del from 'del'
import * as shell from 'gulp-shell'
import { series } from 'gulp'

export async function cleanup (): Promise<void> {
  await del([
    'packages/**/*.d.ts',
    'packages/**/*.js',
    'packages/**/*.js.map'
  ], {
    ignore: ['**/node_modules/**']
  })
}

export async function lint (): Promise<void> {
  await shell.task('ts-standard --report codeframe')()
}

export async function fix (): Promise<void> {
  await shell.task('ts-standard --fix --report codeframe')()
}

export async function compile (): Promise<void> {
  const packages = readdirSync('packages')

  for (const dir of packages) {
    await shell.task('tsc', { cwd: join('packages', dir) })()
  }
}

export async function mocha (): Promise<void> {
  await shell.task('mocha')()
}
export async function nyc (): Promise<void> {
  await shell.task('nyc mocha')()
}

export const test = series(cleanup, mocha)
export const coverage = series(cleanup, nyc)

export async function typedoc (): Promise<void> {
  await shell.task('typedoc')()
}

export const postpack = series(cleanup, typedoc)
