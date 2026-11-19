import { describe, expect, it } from 'vitest'
import { searchMatchFor } from './searchMatch'

describe('searchMatchFor', () => {
  it('matches anywhere when every part has at least three characters', () => {
    expect(searchMatchFor('4711')).toBe('contains')
    expect(searchMatchFor('Erika Mustermann')).toBe('contains')
    expect(searchMatchFor('  PSN-0047  ')).toBe('contains')
  })

  it('matches the beginning when a part is too short for the backend to match anywhere', () => {
    expect(searchMatchFor('ab')).toBe('prefix')
    expect(searchMatchFor('Max K')).toBe('prefix')
  })

  it('treats the wildcard and an empty query as a search for everything', () => {
    expect(searchMatchFor('*')).toBe('contains')
    expect(searchMatchFor('')).toBe('contains')
  })
})
