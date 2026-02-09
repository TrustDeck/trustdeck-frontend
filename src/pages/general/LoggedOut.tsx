import React, { useEffect, useRef, useState } from 'react'
import { ProgressSpinner } from 'primereact/progressspinner'
import { useAuth } from 'react-oidc-context'
import useUserStore from '../../core/stores/UserStore'
import { useAuthStore } from '../../core/stores/AuthWebStore'
import useLayoutStore from '../../core/stores/LayoutStore'
import TrustDeck from '@service/TrustDeck'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import Panel from '../../core/components/common/Panel'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const LoggedOut: React.FC = () => {
  const auth = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const authData = useAuthStore((state) => state.data)
  const isTabActive = useLayoutStore((state) => state.isTabActive) 
  const hasRun = useRef(false)
  const navigate = useNavigate() 
  const { t } = useTranslation()

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
    <div className="min-h-screen w-full flex flex-col items-center justify-start pt-[15vh] px-4">
      {/* <div className="w-full max-w-4xl rounded-2xl bg-white shadow-lg border border-gray-100 p-8 text-center"> */}
        <Panel centered={true}>
        {isLoading ? (
          <div className="flex flex-col items-center gap-6">
            <ProgressSpinner strokeWidth="4" className="[&_.p-progress-spinner-circle]:stroke-color-blue" />
            <div className="space-y-1">
              <p className="text-gray-700 text-lg font-medium">{t('layout:logOut.loggingOut')}</p>
              <p className="text-gray-500 text-sm">{t('layout:logOut.pleaseWait')}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <ArrowRightStartOnRectangleIcon className="w-7 h-7 text-gray-500" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{t('layout:logOut.loggedOut')}</h1>
            <p className="text-gray-500">{t('layout:logOut.thankYou')}</p>
            <div className="mt-6">
              <PrimaryButton label={t('layout:logOut.button')} onClick={() => navigate('/auth/login')} />
            </div>
          </div>
        )}
        </Panel>
      {/* </div> */}
    </div>
  )
}

export default LoggedOut
