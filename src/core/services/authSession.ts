import type { User } from 'oidc-client-ts'

const LOGGED_OUT_KEY = 'trustdeck:logged-out'
const RETURN_TO_KEY = 'trustdeck:returnTo'
const LOGGED_OUT_MARKER_MAX_AGE_MS = 30 * 60 * 1000

type LogoutReason = 'manual' | 'timeout'

type LoggedOutMarker = {
  reason: LogoutReason
  timestamp: number
}

function readLoggedOutMarker(): LoggedOutMarker | null {
  const raw = window.localStorage.getItem(LOGGED_OUT_KEY)
  if (!raw) return null

  // Old frontend versions stored the literal string "true". Treat that as
  // stale so an old marker cannot keep routing a returning user to /logged-out.
  if (raw === 'true') {
    window.localStorage.removeItem(LOGGED_OUT_KEY)
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LoggedOutMarker>
    if (parsed.reason !== 'manual' && parsed.reason !== 'timeout') return null
    if (typeof parsed.timestamp !== 'number') return null
    if (Date.now() - parsed.timestamp > LOGGED_OUT_MARKER_MAX_AGE_MS) {
      window.localStorage.removeItem(LOGGED_OUT_KEY)
      return null
    }
    return { reason: parsed.reason, timestamp: parsed.timestamp }
  } catch {
    window.localStorage.removeItem(LOGGED_OUT_KEY)
    return null
  }
}

export function markLoggedOut(reason: LogoutReason = 'manual') {
  const marker: LoggedOutMarker = { reason, timestamp: Date.now() }
  window.localStorage.setItem(LOGGED_OUT_KEY, JSON.stringify(marker))
}

export function clearLoggedOutMarker() {
  window.localStorage.removeItem(LOGGED_OUT_KEY)
}

export function isMarkedLoggedOut() {
  return readLoggedOutMarker() !== null
}

export function getLoggedOutReason() {
  return readLoggedOutMarker()?.reason ?? null
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
