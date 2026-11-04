import { describe, expect, it, vi } from 'vitest'
import { ErrorResponse, ErrorTimeout } from 'oidc-client-ts'
import { isSessionEndedError, onSessionEnded, reportSessionEnded } from './authSession'

describe('isSessionEndedError', () => {
  it('detects refused renewals of an ended Keycloak session', () => {
    expect(isSessionEndedError(new ErrorResponse({ error: 'invalid_grant' }))).toBe(true)
    expect(isSessionEndedError(new ErrorResponse({ error: 'login_required' }))).toBe(true)
    expect(isSessionEndedError(new ErrorResponse({ error: 'interaction_required' }))).toBe(true)
  })

  it('ignores network errors, timeouts, and other OIDC errors', () => {
    expect(isSessionEndedError(new TypeError('Failed to fetch'))).toBe(false)
    expect(isSessionEndedError(new ErrorTimeout())).toBe(false)
    expect(isSessionEndedError(new ErrorResponse({ error: 'server_error' }))).toBe(false)
    expect(isSessionEndedError(null)).toBe(false)
    expect(isSessionEndedError(undefined)).toBe(false)
  })
})

describe('onSessionEnded', () => {
  it('notifies registered listeners until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = onSessionEnded(listener)

    reportSessionEnded()
    unsubscribe()
    reportSessionEnded()

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
