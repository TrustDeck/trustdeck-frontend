import { useEffect } from 'react'
import { useAuth } from 'react-oidc-context'
import TrustDeck from '@service/TrustDeck'

export const useSyncApiToken = () => {
  const auth = useAuth()

  useEffect(() => {
    if (auth.user?.access_token) {
      TrustDeck.instance().setToken(auth.user.access_token)
    }
  }, [auth.user])
}