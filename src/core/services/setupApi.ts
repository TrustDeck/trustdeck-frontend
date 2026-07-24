import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import TrustDeck from '@service/TrustDeck'
import useUserStore from '../stores/UserStore'
import { hasValidOidcUser, isMarkedLoggedOut } from './authSession'
import { clearPermissionCache } from './PermissionCache'

export const useSyncApiToken = () => {
  const auth = useAuth()
  const setFromAccessToken = useUserStore((state) => state.setFromAccessToken)
  const clearUser = useUserStore((state) => state.clear)

  useEffect(() => {
    if (isMarkedLoggedOut()) {
      TrustDeck.instance().clearToken()
      clearPermissionCache()
      clearUser()
      return
    }

    const accessToken = auth.user?.access_token
    if (accessToken && hasValidOidcUser(auth.user)) {
      TrustDeck.instance().setToken(accessToken)
      clearPermissionCache()
      setFromAccessToken(accessToken)
      return
    }

    if (!auth.isLoading && (!auth.isAuthenticated || !hasValidOidcUser(auth.user))) {
      TrustDeck.instance().clearToken()
      clearPermissionCache()
      clearUser()
    }
  }, [auth.user, auth.user?.access_token, auth.isLoading, auth.isAuthenticated, setFromAccessToken, clearUser])

  useEffect(() => {
    const unsubscribe = auth.events.addUserLoaded((user) => {
      if (isMarkedLoggedOut()) return
      if (user.access_token && hasValidOidcUser(user)) {
        TrustDeck.instance().setToken(user.access_token)
        clearPermissionCache()
        setFromAccessToken(user.access_token)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [auth.events, setFromAccessToken])
}
