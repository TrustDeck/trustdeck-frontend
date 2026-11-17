import { describe, expect, it } from 'vitest'
import { collectEntityColumns, defaultColumnPaths } from './entityColumns'

const attributes = [
  { name: 'firstName', type: 'string', labels: { en: 'First name' } },
  {
    layout: 'row',
    attributes: [
      { name: 'lastName', type: 'string', required: true },
      { name: 'age', type: 'number', sortIndex: true }
    ]
  },
  {
    layout: 'group',
    name: 'address',
    repeatable: true,
    attributes: [
      { name: 'city', type: 'string', required: true },
      { layout: 'col', attributes: [{ name: 'zip', type: 'string' }] }
    ]
  },
  { name: 'firstName', type: 'string' }
]

describe('collectEntityColumns', () => {
  it('collects single-value attributes with paths through named groups only', () => {
    const columns = collectEntityColumns(attributes, 'en')
    expect(columns.map((column) => column.path)).toEqual([
      'firstName',
      'lastName',
      'age',
      'address.city',
      'address.zip'
    ])
    expect(columns[0].label).toBe('First name')
    expect(columns[2]).toMatchObject({ type: 'number', sortIndex: true })
  })
})

describe('defaultColumnPaths', () => {
  it('shows required attributes first and three columns at most', () => {
    expect(defaultColumnPaths(collectEntityColumns(attributes, 'en'))).toEqual([
      'lastName',
      'address.city',
      'firstName'
    ])
  })
})
