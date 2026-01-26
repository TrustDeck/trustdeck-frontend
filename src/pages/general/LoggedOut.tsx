import React, { useEffect, useRef, useState } from 'react'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useAuth } from 'react-oidc-context'
import useUserStore from '../../core/stores/UserStore'
import { useAuthStore, AuthWebStorage } from '../../core/stores/AuthWebStore'
import useLayoutStore from '../../core/stores/LayoutStore' // Import useLayoutStore
import TrustDeck from '@service/TrustDeck'

const LoggedOut: React.FC = () => {
  const auth = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const authData = useAuthStore((state) => state.data)
  const isTabActive = useLayoutStore((state) => state.isTabActive) // Use isTabActive from LayoutStore
  const hasRun = useRef(false)

  async function logout_helper() {
    // Clear TrustDeck token
    TrustDeck.instance().clearToken()
    
    // Clear user store state
    useUserStore.getState().clear()
    
    // Clear auth store state (this clears localStorage 'auth-storage')
    useAuthStore.getState().clear()
    
    // Remove user from OIDC library
    await auth.removeUser()
    
    // Ensure AuthWebStorage is cleared (in case removeUser didn't trigger it)
    // Get all keys from localStorage that start with 'oidc.' and remove them
    if (typeof window !== 'undefined') {
      const oidcKeys = Object.keys(window.localStorage).filter((key) =>
        key.startsWith('oidc.')
      )
      oidcKeys.forEach((key) => window.localStorage.removeItem(key))
    }
    
    // Clear stale OIDC state
    await auth.clearStaleState()
    
    // Clear selected project
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('selected-project')
    }
    
    setIsLoading(false)
  }

  useEffect(() => {
    const logout = async () => {
      if (!hasRun.current) {
        hasRun.current = true
        if (
          isAuthenticated &&
          Object.keys(authData).length > 0 &&
          isTabActive
        ) {
          console.log('call logout')
          auth
            .signoutSilent()
            .then(async () => {
              console.log('signoutSilent')
              await logout_helper()
            })
            .catch(async (error) => {
              console.log('Error during signoutSilent process', error)
              await logout_helper()
            })
        } else {
          await logout_helper()
        }
      }
    }
    //make sure that this runs only once
    if (!hasRun.current) {
      logout()
    }
  }, [auth, isAuthenticated, authData, isTabActive])

  return (
    <div>
      {isLoading ? (
        <div>
          <ProgressSpinner />
          <p>Logging you out, please wait...</p>
        </div>
      ) : (
        <div>
          <h1>You have been logged out</h1>
          <p>Thank you for using our service.</p>
        </div>
      )}
    </div>
  )
}

export default LoggedOut
