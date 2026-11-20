import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useLocation } from 'react-router-dom'
import {
  ArrowRightEndOnRectangleIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import { oidcConfig } from '../../core/configs/oidc'
import useUserStore from '../../core/stores/UserStore'
import TrustDeck from '@service/TrustDeck'
import useProjectStore from '../../core/stores/ProjectStore'
import { clearLoggedOutMarker, clearStoredOidcState, setReturnTo } from '../../core/services/authSession'
import { useTranslation } from 'react-i18next'
import { getLoginErrorMessageKey, getOidcErrorCode } from '../../core/services/loginError'

const isSafeLocalPath = (value: string | null | undefined) => {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

const getReturnTo = (search: string) => {
  const params = new URLSearchParams(search)
  const value = params.get('returnTo')
  if (!isSafeLocalPath(value)) return '/projects'
  if (value?.startsWith('/login') || value?.startsWith('/callback') || value?.startsWith('/logged-out')) {
    return '/projects'
  }
  return value ?? '/projects'
}



/** Writes the technical details of a sign-in error to the console; the page only shows a readable message. */
const logLoginError = (context: string, error: unknown) => {
  console.error(`${context} (${getOidcErrorCode(error) ?? 'no OIDC error code'})`, error)
}

const Login: React.FC = () => {
  const auth = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const returnTo = useMemo(() => getReturnTo(location.search), [location.search])
  const [loginError, setLoginError] = useState<unknown>(null)
  const [isStartingLogin, setIsStartingLogin] = useState(false)

  const clearLocalAuthState = async () => {
    clearLoggedOutMarker()
    TrustDeck.instance().clearToken()
    useProjectStore.getState().clearSelectedProject()
    useUserStore.getState().clear()

    try {
      await auth.removeUser()
    } catch {
      // Local cleanup should continue even if the OIDC user store is already empty.
    }

    clearStoredOidcState()

    try {
      await auth.clearStaleState()
    } catch {
      // Stale state cleanup is best-effort only.
    }
  }

  const handleLogin = async () => {
    setLoginError(null)
    setIsStartingLogin(true)

    try {
      await clearLocalAuthState()
      setReturnTo(returnTo)

      await auth.signinRedirect({
        redirect_uri: oidcConfig.redirect_uri,
        state: { returnTo },
        extraQueryParams: {
          prompt: 'login',
          max_age: '0'
        }
      })
    } catch (error) {
      logLoginError('Could not start the sign-in', error)
      setLoginError(error ?? new Error('Could not start the sign-in'))
      setIsStartingLogin(false)
    }
  }

  // A failed silent sign-in leaves e.g. "login_required" in auth.error. That only means
  // that the user has to sign in, so no error is shown for it.
  const authErrorKey = getLoginErrorMessageKey(auth.error)
  const loginErrorKey = loginError ? getLoginErrorMessageKey(loginError) ?? 'common:login.errors.generic' : null
  const errorKey = loginErrorKey ?? authErrorKey

  useEffect(() => {
    if (auth.error && getLoginErrorMessageKey(auth.error)) logLoginError('Sign-in failed', auth.error)
  }, [auth.error])

  const handleRetry = () => {
    void handleLogin()
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-surface px-6 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-color-blue/10">
          <LockClosedIcon className="h-9 w-9 text-color-blue" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">{t('common:login.welcome')}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t('common:login.subtitle')}
        </p>

        {errorKey && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loginErrorKey && <p className="font-semibold">{t('common:login.couldNotStart')}</p>}
            <p>{t(errorKey)}</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <PrimaryButton
            label={isStartingLogin ? t('common:login.opening') : t('common:login.signIn')}
            onClick={handleLogin}
            loading={isStartingLogin}
            icon={<ArrowRightEndOnRectangleIcon className="mr-2 h-5 w-5" />}
            className="w-full justify-center"
          />
          {errorKey && (
            <PrimaryOutlinedButton
              label={t('common:login.clearAndRetry')}
              onClick={handleRetry}
              className="w-full justify-center"
            />
          )}
        </div>
      </section>
    </main>
  )
}
export default Login
