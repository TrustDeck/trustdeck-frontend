import { describe, expect, it } from 'vitest'
import { compareCellValues, nextSort } from './sorting'

describe('nextSort', () => {
  it('sorts a new column ascending', () => {
    expect(nextSort(null, 'psn')).toEqual({ key: 'psn', direction: 'asc' })
    expect(nextSort({ key: 'psn', direction: 'desc' }, 'idType')).toEqual({
      key: 'idType',
      direction: 'asc'
    })
  })

  it('reverses the direction of the sorted column', () => {
    expect(nextSort({ key: 'psn', direction: 'asc' }, 'psn')).toEqual({
      key: 'psn',
      direction: 'desc'
    })
    expect(nextSort({ key: 'psn', direction: 'desc' }, 'psn')).toEqual({
      key: 'psn',
      direction: 'asc'
    })
  })
})

describe('compareCellValues', () => {
  const sortValues = (values: unknown[], direction: 'asc' | 'desc') =>
    [...values].sort((left, right) => compareCellValues(left, right, direction))

  it('compares numbers within texts by value and ignores letter case', () => {
    expect(sortValues(['ID-10', 'id-2', 'ID-1'], 'asc')).toEqual([
      'ID-1',
      'id-2',
      'ID-10'
    ])
    expect(sortValues(['ID-10', 'id-2', 'ID-1'], 'desc')).toEqual([
      'ID-10',
      'id-2',
      'ID-1'
    ])
  })

  it('puts empty values last in both directions', () => {
    expect(sortValues(['b', '', null, 'a', undefined], 'asc')).toEqual([
      'a',
      'b',
      '',
      null,
      undefined
    ])
    expect(sortValues(['b', null, 'a'], 'desc')).toEqual(['b', 'a', null])
  })
})
