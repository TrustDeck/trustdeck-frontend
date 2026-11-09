import { describe, expect, it } from 'vitest'
import {
  estimateMinimumPseudonymLength,
  isRandomAlgorithm
} from './pseudonymLength'

const estimate = (
  desiredSize: number | null,
  successProbability: number | null,
  alphabetSize: number,
  checkDigitReplacesLastCharacter = false,
  retries?: number
) =>
  estimateMinimumPseudonymLength({
    desiredSize,
    successProbability,
    alphabetSize,
    checkDigitReplacesLastCharacter,
    retries
  })

describe('estimateMinimumPseudonymLength', () => {
  it('matches the backend calculation for known parameters', () => {
    expect(estimate(1_000_000_000, 0.999999998, 36)).toBe(8)
    expect(estimate(100_000_000, 0.99999998, 26)).toBe(8)
    expect(estimate(1_000_000_000, 0.999999998, 10)).toBe(12)
  })

  it('does not add a character at exact powers of the alphabet size', () => {
    // One retry and T = 0.5 give k = 2n = 36^4 exactly
    expect(estimate(839_808, 0.5, 36, false, 1)).toBe(4)
    expect(estimate(839_809, 0.5, 36, false, 1)).toBe(5)
  })

  it('adds one character when the check digit replaces the last one', () => {
    expect(estimate(1_000_000_000, 0.999999998, 36, true)).toBe(9)
  })

  it('returns null when no length can be calculated', () => {
    expect(estimate(null, 0.99, 36)).toBeNull()
    expect(estimate(1000, null, 36)).toBeNull()
    expect(estimate(0, 0.99, 36)).toBeNull()
    expect(estimate(1000, 1, 36)).toBeNull()
    expect(estimate(1000, 0.99, 1)).toBeNull()
  })
})

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
