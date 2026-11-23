import { isSessionEndedError } from './authSession'

/** Translation keys of the readable messages shown for a failed sign-in. */
export type LoginErrorMessageKey =
  | 'common:login.errors.accessDenied'
  | 'common:login.errors.serviceUnavailable'
  | 'common:login.errors.unreachable'
  | 'common:login.errors.generic'

/**
 * react-oidc-context wraps the error of oidc-client-ts and keeps the original one
 * in `innerError`. Returns the original error if there is one.
 */
function unwrap(error: unknown): unknown {
  if (error && typeof error === 'object' && 'innerError' in error) {
    const inner = (error as { innerError?: unknown }).innerError
    if (inner) return inner
  }
  return error
}

/** Returns the OIDC error code (e.g. `login_required`) of a sign-in error, if it has one. */
export function getOidcErrorCode(error: unknown): string | null {
  const code = (unwrap(error) as { error?: unknown } | null | undefined)?.error
  return typeof code === 'string' && code ? code : null
}

/**
 * Decides which message the login page shows for a sign-in error.
 * Returns null when the error only means that the user is not signed in
 * (e.g. `login_required` after a failed silent sign-in): the sign-in button is enough then.
 */
export function getLoginErrorMessageKey(error: unknown): LoginErrorMessageKey | null {
  if (!error) return null

  const original = unwrap(error)
  if (isSessionEndedError(original)) return null

  switch (getOidcErrorCode(original)) {
    case 'access_denied':
    case 'unauthorized_client':
      return 'common:login.errors.accessDenied'
    case 'server_error':
    case 'temporarily_unavailable':
      return 'common:login.errors.serviceUnavailable'
  }

  const name = (original as { name?: unknown } | null | undefined)?.name
  // Network failures of fetch() are TypeErrors; oidc-client-ts reports timeouts as ErrorTimeout.
  if (name === 'ErrorTimeout' || name === 'TypeError' || original instanceof TypeError) {
    return 'common:login.errors.unreachable'
  }

  return 'common:login.errors.generic'
}
