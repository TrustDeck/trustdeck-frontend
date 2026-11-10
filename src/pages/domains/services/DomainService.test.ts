import { describe, expect, it, vi } from 'vitest'
import type { Algorithm } from '../../../core/types/Domain'
import { buildAlgorithm } from './DomainService'

// buildAlgorithm does not call the backend; keep the HTTP client out of the test
vi.mock('@service/TrustDeck', () => ({
  default: {},
  TrustDeckHttpError: class TrustDeckHttpError extends Error {}
}))

describe('buildAlgorithm pseudonym length', () => {
  it('omits the length when the field is empty, so the backend calculates it', () => {
    const algorithm = buildAlgorithm({ algorithm: 'RANDOM_LET', psnlength: '' })

    expect(algorithm).not.toHaveProperty('pseudonymLength')
    expect(JSON.parse(JSON.stringify(algorithm))).not.toHaveProperty(
      'pseudonymLength'
    )
  })

  it('sends an explicitly entered length', () => {
    expect(
      buildAlgorithm({ algorithm: 'RANDOM_LET', psnlength: '12' })
        .pseudonymLength
    ).toBe(12)
  })

  it('does not resend the stored length of an existing domain while the field is empty', () => {
    const stored: Algorithm = { name: 'RANDOM_LET', pseudonymLength: 9 }

    expect(
      buildAlgorithm({ algorithm: 'RANDOM_LET', psnlength: '' }, stored)
    ).not.toHaveProperty('pseudonymLength')
  })

  it('keeps the length of hash algorithms, which the form fills from the stored value', () => {
    expect(
      buildAlgorithm(
        { algorithm: 'MD5', psnlength: '32' },
        { name: 'MD5', pseudonymLength: 32 }
      ).pseudonymLength
    ).toBe(32)
  })
})
