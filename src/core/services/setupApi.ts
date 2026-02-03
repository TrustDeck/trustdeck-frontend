import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import TrustDeck from '@service/TrustDeck'

export const useSyncApiToken = () => {
  const auth = useAuth()

  // Sync token when user object changes (initial load, login)
  useEffect(() => {
    if (auth.user?.access_token) {
      TrustDeck.instance().setToken(auth.user.access_token)
    }
  }, [auth.user])

  // Listen for token refresh events to ensure TrustDeck is updated when tokens are silently renewed
  useEffect(() => {
    const handleUserLoaded = () => {
      if (auth.user?.access_token) {
        TrustDeck.instance().setToken(auth.user.access_token)
      }
    }

    // Listen for when user is loaded/refreshed (includes silent renew)
    const unsubscribe = auth.events.addUserLoaded(handleUserLoaded)

    return () => {
      unsubscribe()
    }
  }, [auth.user, auth.events])
}