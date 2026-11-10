import { describe, expect, it } from 'vitest'
import { isRandomAlgorithm } from './pseudonymLength'

describe('isRandomAlgorithm', () => {
  it('recognises the random algorithms only', () => {
    expect(isRandomAlgorithm('RANDOM')).toBe(true)
    expect(isRandomAlgorithm('random_sym')).toBe(true)
    expect(isRandomAlgorithm('RANDOM_SYM_BIOS')).toBe(true)
    expect(isRandomAlgorithm('MD5')).toBe(false)
    expect(isRandomAlgorithm('CONSECUTIVE')).toBe(false)
    expect(isRandomAlgorithm(undefined)).toBe(false)
  })
})
