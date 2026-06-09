import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import TrustDeck from '@service/TrustDeck'
import useUserStore from '../stores/UserStore'

export const useSyncApiToken = () => {
  const auth = useAuth()
  const setFromAccessToken = useUserStore((state) => state.setFromAccessToken)
  const clearUser = useUserStore((state) => state.clear)

  useEffect(() => {
    const accessToken = auth.user?.access_token
    if (accessToken) {
      TrustDeck.instance().setToken(accessToken)
      setFromAccessToken(accessToken)
      return
    }

    if (!auth.isLoading && !auth.isAuthenticated) {
      TrustDeck.instance().clearToken()
      clearUser()
    }
  }, [auth.user?.access_token, auth.isLoading, auth.isAuthenticated, setFromAccessToken, clearUser])

  useEffect(() => {
    const unsubscribe = auth.events.addUserLoaded((user) => {
      if (user.access_token) {
        TrustDeck.instance().setToken(user.access_token)
        setFromAccessToken(user.access_token)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [auth.events, setFromAccessToken])
}
