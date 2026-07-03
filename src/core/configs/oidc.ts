import { WebStorageStateStore } from 'oidc-client-ts'

function configuredValue(runtimeValue?: string, buildValue?: string) {
  return runtimeValue ?? buildValue
}

function localSilentRedirectUri() {
  return `${window.location.origin}/silent-renew.html`
}

function normalizePath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function isBackendApiPath(candidateUrl: URL, apiBaseUrl?: string) {
  const candidatePath = normalizePath(candidateUrl.pathname)

  if (candidatePath === '/api' || candidatePath.startsWith('/api/')) {
    return true
  }

  if (!apiBaseUrl) return false

  try {
    const apiUrl = new URL(apiBaseUrl, window.location.origin)
    const apiPath = normalizePath(apiUrl.pathname)

    if (apiUrl.origin !== candidateUrl.origin || apiPath === '/') {
      return false
    }

    return candidatePath === apiPath || candidatePath.startsWith(`${apiPath}/`)
  } catch {
    return false
  }
}

function resolveSilentRedirectUri() {
  const configuredSilentUri = configuredValue(
    window.__ENV__?.AUTHORITY_SILENT_URI,
    import.meta.env.VITE_AUTHORITY_SILENT_URI
  )
  const fallbackSilentUri = localSilentRedirectUri()

  if (!configuredSilentUri) return fallbackSilentUri

  try {
    const candidateUrl = new URL(configuredSilentUri, window.location.origin)
    const apiBaseUrl = configuredValue(
      window.__ENV__?.API_BASE_URL,
      import.meta.env.VITE_API_BASE_URL
    )

    // OIDC silent renew must load the frontend callback document. It must never
    // target the TrustDeck backend API. When the runtime config accidentally
    // points the silent redirect URI at /api, fall back to the static frontend
    // callback to avoid repeated unauthenticated backend requests.
    if (isBackendApiPath(candidateUrl, apiBaseUrl)) {
      return fallbackSilentUri
    }

    return candidateUrl.toString()
  } catch {
    return fallbackSilentUri
  }
}

export const oidcConfig = {
  authority:
    window.__ENV__?.AUTHORITY_URL ?? import.meta.env.VITE_AUTHORITY_URL,
  client_id:
    window.__ENV__?.AUTHORITY_CLIENT ?? import.meta.env.VITE_AUTHORITY_CLIENT,
  redirect_uri:
    window.__ENV__?.AUTHORITY_REDIRECT_URI ??
    import.meta.env.VITE_AUTHORITY_REDIRECT_URI,
  silent_redirect_uri: resolveSilentRedirectUri(),
  post_logout_redirect_uri:
    window.__ENV__?.AUTHORITY_REDIRECT_URI ??
    import.meta.env.VITE_AUTHORITY_REDIRECT_URI,
  account_console_url:
    window.__ENV__?.ACCOUNT_CONSOLE_URL ??
    import.meta.env.VITE_ACCOUNT_CONSOLE_URL,
  response_type: 'code',
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  monitorSession: false,
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTimeInSeconds: 5,
  revokeTokensOnSignout: true
}
