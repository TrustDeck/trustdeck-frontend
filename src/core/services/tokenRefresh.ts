import type { AuthContextProps } from 'react-oidc-context'
import TrustDeck from './TrustDeck'
import useUserStore from '../stores/UserStore'
import { hasValidOidcUser, isMarkedLoggedOut } from './authSession'

const MIN_REFRESH_INTERVAL_MS = 30_000
let lastRefreshAttemptAt = 0
let inFlightRefresh: Promise<boolean> | null = null

export async function refreshAccessTokenForNavigation(
  auth: AuthContextProps,
  options?: { force?: boolean }
): Promise<boolean> {
  if (isMarkedLoggedOut() || !auth.isAuthenticated) return false

  const now = Date.now()
  const force = options?.force ?? false
  if (!force && now - lastRefreshAttemptAt < MIN_REFRESH_INTERVAL_MS) {
    return false
  }

  if (inFlightRefresh) return inFlightRefresh

  lastRefreshAttemptAt = now
  inFlightRefresh = auth
    .signinSilent()
    .then((user) => {
      const accessToken = user?.access_token
      if (accessToken && hasValidOidcUser(user)) {
        TrustDeck.instance().setToken(accessToken)
        useUserStore.getState().setFromAccessToken(accessToken)
        return true
      }
      return false
    })
    .catch((error) => {
      console.warn('Silent token refresh on navigation failed', error)
      return false
    })
    .finally(() => {
      inFlightRefresh = null
    })

  return inFlightRefresh
}
