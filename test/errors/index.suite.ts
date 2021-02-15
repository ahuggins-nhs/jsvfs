import { doesNotThrow, strictEqual } from 'assert'
import { Journal } from '../../packages/errors/index'

describe('Module @jsvfs/errors', () => {
  it('should construct a journal', () => {
    const result1 = new Journal()
    const result2 = new Journal(3)
    const result3 = new Journal({
      level: 'info',
      op: 'write',
      message: ''
    })

    strictEqual(result1.length, 0)
    strictEqual(result2.length, 3)
    strictEqual(result3.length, 1)
  })

  it('should manage entries', () => {
    const journal = new Journal()
    const invalid: any = {
      level: 'info',
      op: 'write',
      message: 30
    }

    doesNotThrow(() => {
      journal.push(
        {
          level: 'info',
          op: 'write',
          message: ''
        },
        {
          id: '14',
          level: 'error',
          op: 'write',
          message: ''
        },
        {
          level: 'warn',
          op: 'write',
          message: ''
        },
        invalid
      )
    })

    strictEqual(journal.hasError, true)
    strictEqual(journal.maxLevel, 'error')

    journal.push({
      level: 'crit',
      op: 'write',
      message: ''
    })

    strictEqual(journal.maxLevel, 'crit')

    journal.splice(journal.findIndex(item => item.level === 'crit'), 1)
    journal.splice(journal.findIndex(item => item.level === 'error'), 1)

    strictEqual(journal.maxLevel, 'warn')

    journal.splice(journal.findIndex(item => item.level === 'warn'), 1)

    strictEqual(journal.maxLevel, 'info')
    strictEqual(journal.info.length, 1)
    strictEqual(Array.isArray(journal.getCritical('flush')), true)
    strictEqual(Array.isArray(journal.getErrors('flush')), true)
    strictEqual(Array.isArray(journal.getInfo('flush')), true)
    strictEqual(Array.isArray(journal.getWarnings('flush')), true)
    strictEqual(Array.isArray(journal.getEntries('all')), true)
    strictEqual(Array.isArray(journal.getEntries('flush')), true)
  })
})
