import { ErrorResponse, ErrorTimeout } from 'oidc-client-ts'
import { describe, expect, it } from 'vitest'
import { getLoginErrorMessageKey, getOidcErrorCode } from './loginError'

/** Wraps an error the way react-oidc-context exposes it as `auth.error`. */
const asAuthError = (innerError: Error) => ({
  name: innerError.name,
  message: innerError.message,
  innerError,
  source: 'signinSilent'
})

describe('getLoginErrorMessageKey', () => {
  it('shows nothing when there is no error', () => {
    expect(getLoginErrorMessageKey(null)).toBeNull()
    expect(getLoginErrorMessageKey(undefined)).toBeNull()
  })

  it('shows nothing when the error only means that the user is not signed in', () => {
    for (const error of ['login_required', 'interaction_required', 'invalid_grant']) {
      expect(getLoginErrorMessageKey(new ErrorResponse({ error }))).toBeNull()
      expect(getLoginErrorMessageKey(asAuthError(new ErrorResponse({ error })))).toBeNull()
    }
  })

  it('maps a refused access to a readable message', () => {
    expect(getLoginErrorMessageKey(asAuthError(new ErrorResponse({ error: 'access_denied' })))).toBe(
      'common:login.errors.accessDenied'
    )
    expect(getLoginErrorMessageKey(new ErrorResponse({ error: 'unauthorized_client' }))).toBe(
      'common:login.errors.accessDenied'
    )
  })

  it('maps errors of the sign-in service to a readable message', () => {
    expect(getLoginErrorMessageKey(new ErrorResponse({ error: 'server_error' }))).toBe(
      'common:login.errors.serviceUnavailable'
    )
    expect(getLoginErrorMessageKey(asAuthError(new ErrorResponse({ error: 'temporarily_unavailable' })))).toBe(
      'common:login.errors.serviceUnavailable'
    )
  })

  it('maps network failures and timeouts to a readable message', () => {
    expect(getLoginErrorMessageKey(new TypeError('Failed to fetch'))).toBe('common:login.errors.unreachable')
    expect(getLoginErrorMessageKey(asAuthError(new ErrorTimeout('Network timed out')))).toBe(
      'common:login.errors.unreachable'
    )
  })

  it('falls back to a generic message for other errors', () => {
    expect(getLoginErrorMessageKey(new Error('No matching state found in storage'))).toBe(
      'common:login.errors.generic'
    )
    expect(getLoginErrorMessageKey(asAuthError(new ErrorResponse({ error: 'invalid_request' })))).toBe(
      'common:login.errors.generic'
    )
  })
})

describe('getOidcErrorCode', () => {
  it('reads the code of plain and wrapped OIDC errors', () => {
    expect(getOidcErrorCode(new ErrorResponse({ error: 'login_required' }))).toBe('login_required')
    expect(getOidcErrorCode(asAuthError(new ErrorResponse({ error: 'access_denied' })))).toBe('access_denied')
  })

  it('returns null for errors without a code', () => {
    expect(getOidcErrorCode(new TypeError('Failed to fetch'))).toBeNull()
    expect(getOidcErrorCode(null)).toBeNull()
  })
})
