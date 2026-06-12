import type { User } from 'oidc-client-ts'

const LOGGED_OUT_KEY = 'trustdeck:logged-out'
const RETURN_TO_KEY = 'trustdeck:returnTo'

export function markLoggedOut() {
  window.localStorage.setItem(LOGGED_OUT_KEY, 'true')
}

export function clearLoggedOutMarker() {
  window.localStorage.removeItem(LOGGED_OUT_KEY)
}

export function isMarkedLoggedOut() {
  return window.localStorage.getItem(LOGGED_OUT_KEY) === 'true'
}

export function clearStoredOidcState() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith('oidc.'))
    .forEach((key) => window.localStorage.removeItem(key))

  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith('oidc.'))
    .forEach((key) => window.sessionStorage.removeItem(key))
}

export function clearReturnTo() {
  window.sessionStorage.removeItem(RETURN_TO_KEY)
}

export function setReturnTo(value: string) {
  window.sessionStorage.setItem(RETURN_TO_KEY, value)
}

export function getReturnTo() {
  return window.sessionStorage.getItem(RETURN_TO_KEY)
}

export function isTimestampExpired(timestampMs: number | null | undefined, skewMs = 0) {
  if (!timestampMs) return true
  return timestampMs <= Date.now() + skewMs
}

export function isOidcUserExpired(user: User | null | undefined, skewSeconds = 0) {
  if (!user) return true
  if (user.expired) return true
  if (!user.expires_at) return false
  return user.expires_at <= Math.floor(Date.now() / 1000) + skewSeconds
}

export function hasValidOidcUser(user: User | null | undefined) {
  return Boolean(user?.access_token && !isOidcUserExpired(user, 0))
}
