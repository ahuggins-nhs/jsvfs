/**
 * [[include:packages/errors/README.md]]
 * @packageDocumentation
 * @module @jsvfs/errors
 */
import { JournalEntry, JSON_SCHEMA } from '@jsvfs/types'
import Ajv from 'ajv'

type JournalOp = JournalEntry['op']

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true })
const validate = ajv.compile<JournalEntry>(JSON_SCHEMA.JournalEntry)

/** Journal class for error handling, extending built-in Array class. */
export class Journal<T extends JournalEntry> extends Array<T> {
  /** Constructs an instance of Journal with the given length. */
  constructor (length: number)
  /** Constructs an instance of Journal; typical usage will not pass options, and if options are passed they will be validated. */
  constructor (...items: T[])
  constructor (...inputs: [number] | T[]) {
    if (inputs.length === 1 && typeof inputs[0] === 'number') {
      super(inputs[0])
    } else {
      super()
    }

    if (inputs.length > 0 && typeof inputs[0] === 'object') {
      this.push(...inputs as T[])
    }
  }

  private validate (data: any): data is T {
    return validate(data)
  }

  /** Get all journal entries matching an operation and optionally a certain level. */
  getEntries (op: JournalOp | 'all', ...level: Array<JournalEntry['level']>): T[] {
    return this.filter(entry => {
      if (Array.isArray(level) && level.length > 0) {
        return (op === 'all' || entry.op === op) && level.includes(entry.level)
      }

      return op === 'all' || entry.op === op
    })
  }

  /** Does the journal have one or more errors. */
  get hasError (): boolean {
    return this.errors.length > 0
  }

  /** Get the highest level of journal entry in this journal. */
  get maxLevel (): JournalEntry['level'] {
    switch (true) {
      case this.critical.length > 0:
        return 'crit'
      case this.errors.length > 0:
        return 'error'
      case this.warnings.length > 0:
        return 'warn'
      default:
        return 'info'
    }
  }

  /** List all critical errors. */
  get critical (): T[] {
    return this.getEntries('all', 'crit')
  }

  /** List all errors including critical. */
  get errors (): T[] {
    return this.getEntries('all', 'error', 'crit')
  }

  /** List all information entries. */
  get info (): T[] {
    return this.getEntries('all', 'info')
  }

  /** List all warning entries. */
  get warnings (): T[] {
    return this.getEntries('all', 'warn')
  }

  /** Get critical errors by operation name. */
  getCritical (op: JournalOp): T[] {
    return this.getEntries(op, 'crit')
  }

  /** Get errors, including critical, by operation name. */
  getErrors (op: JournalOp): T[] {
    return this.getEntries(op, 'error', 'crit')
  }

  /** Get information by operation name. */
  getInfo (op: JournalOp): T[] {
    return this.getEntries(op, 'info')
  }

  /** Get warnings by operation name. */
  getWarnings (op: JournalOp): T[] {
    return this.getEntries(op, 'warn')
  }

  /** Only valid journal entries will be added to the array; invalid entries will be dropped. If no entry `id` is provided, it will be added. */
  push (...entries: T[]): number {
    for (const entry of entries) {
      const result = this.validate(entry)

      if (result) {
        if (typeof entry.id === 'undefined') {
          entry.id = this.length
        }

        super.push(entry)
      }
    }

    return this.length
  }
}
