import { describe, expect, it } from 'vitest'
import { backendVersionFrom, readBackendVersion } from './backendVersion'
import { TrustDeckHttpError } from '../services/TrustDeck'

describe('backendVersionFrom', () => {
  it('returns the version of the response', () => {
    expect(backendVersionFrom({ version: 'v2.10.0' })).toBe('v2.10.0')
    expect(backendVersionFrom({ version: ' v2.10.0 ' })).toBe('v2.10.0')
  })

  it('returns null for responses without a usable version', () => {
    expect(backendVersionFrom({})).toBeNull()
    expect(backendVersionFrom({ version: '' })).toBeNull()
    expect(backendVersionFrom({ version: 2 })).toBeNull()
    expect(backendVersionFrom('v2.10.0')).toBeNull()
    expect(backendVersionFrom(null)).toBeNull()
  })
})

describe('readBackendVersion', () => {
  it('returns the version the backend reports', async () => {
    await expect(
      readBackendVersion(async () => ({ version: 'v2.10.0' }))
    ).resolves.toBe('v2.10.0')
  })

  it('returns null when an older backend does not know the endpoint', async () => {
    await expect(
      readBackendVersion(async () => {
        throw new TrustDeckHttpError('Request failed: 404 ', 404, '')
      })
    ).resolves.toBeNull()
  })

  it('returns null when the request fails', async () => {
    await expect(
      readBackendVersion(() => Promise.reject(new TypeError('Failed to fetch')))
    ).resolves.toBeNull()
  })
})
