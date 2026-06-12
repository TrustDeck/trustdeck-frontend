import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import TrustDeck from '@service/TrustDeck'
import useUserStore from '../stores/UserStore'
import { hasValidOidcUser, isMarkedLoggedOut } from './authSession'

export const useSyncApiToken = () => {
  const auth = useAuth()
  const setFromAccessToken = useUserStore((state) => state.setFromAccessToken)
  const clearUser = useUserStore((state) => state.clear)

  useEffect(() => {
    if (isMarkedLoggedOut()) {
      TrustDeck.instance().clearToken()
      clearUser()
      return
    }

    const accessToken = auth.user?.access_token
    if (accessToken && hasValidOidcUser(auth.user)) {
      TrustDeck.instance().setToken(accessToken)
      setFromAccessToken(accessToken)
      return
    }

    if (!auth.isLoading && (!auth.isAuthenticated || !hasValidOidcUser(auth.user))) {
      TrustDeck.instance().clearToken()
      clearUser()
    }
  }, [auth.user, auth.user?.access_token, auth.isLoading, auth.isAuthenticated, setFromAccessToken, clearUser])

  useEffect(() => {
    const unsubscribe = auth.events.addUserLoaded((user) => {
      if (isMarkedLoggedOut()) return
      if (user.access_token && hasValidOidcUser(user)) {
        TrustDeck.instance().setToken(user.access_token)
        setFromAccessToken(user.access_token)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [auth.events, setFromAccessToken])
}
