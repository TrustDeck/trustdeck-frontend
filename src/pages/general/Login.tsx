import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useLocation, useNavigate } from 'react-router-dom'
import { ProgressSpinner } from 'primereact/progressspinner'
import {
  ArrowRightEndOnRectangleIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import { oidcConfig } from '../../core/configs/oidc'
import useUserStore from '../../core/stores/UserStore'
import TrustDeck from '@service/TrustDeck'

const isSafeLocalPath = (value: string | null | undefined) => {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

const getReturnTo = (search: string) => {
  const params = new URLSearchParams(search)
  const value = params.get('returnTo')
  if (!isSafeLocalPath(value)) return '/projects'
  if (value?.startsWith('/auth/login') || value?.startsWith('/callback') || value?.startsWith('/logged-out')) {
    return '/projects'
  }
  return value ?? '/projects'
}

const getReturnToFromState = (state: unknown, fallback: string) => {
  if (
    state &&
    typeof state === 'object' &&
    'returnTo' in state &&
    typeof (state as { returnTo?: unknown }).returnTo === 'string' &&
    isSafeLocalPath((state as { returnTo: string }).returnTo)
  ) {
    return (state as { returnTo: string }).returnTo
  }
  return fallback
}

const Login: React.FC = () => {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const setFromAccessToken = useUserStore((state) => state.setFromAccessToken)
  const [loginError, setLoginError] = useState<string | null>(null)
  const returnTo = useMemo(() => getReturnTo(location.search), [location.search])

  useEffect(() => {
    if (!auth.user?.access_token) return

    setFromAccessToken(auth.user.access_token)
    TrustDeck.instance().setToken(auth.user.access_token)
    navigate(getReturnToFromState(auth.user.state, returnTo), { replace: true })
  }, [auth.user?.access_token, auth.user?.state, navigate, returnTo, setFromAccessToken])

  useEffect(() => {
    if (!auth.isAuthenticated && !isAuthenticated) return
    navigate(returnTo, { replace: true })
  }, [auth.isAuthenticated, isAuthenticated, navigate, returnTo])

  const handleLogin = async () => {
    setLoginError(null)
    try {
      window.sessionStorage.setItem('trustdeck:returnTo', returnTo)
      await auth.signinRedirect({
        redirect_uri: oidcConfig.redirect_uri,
        state: { returnTo }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start login'
      setLoginError(message)
    }
  }

  const handleRetry = () => {
    auth.clearStaleState().finally(() => void handleLogin())
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-surface px-6 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-color-blue/10">
          <LockClosedIcon className="h-9 w-9 text-color-blue" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">Welcome to TrustDeck</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in with your institutional account to continue.
        </p>

        {auth.error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {auth.error.message}
          </div>
        )}
        {loginError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {loginError}
          </div>
        )}

        <div className="mt-8 space-y-3">
          <PrimaryButton
            label={auth.isLoading ? 'Checking session...' : 'Sign in'}
            onClick={handleLogin}
            loading={auth.isLoading}
            icon={<ArrowRightEndOnRectangleIcon className="mr-2 h-5 w-5" />}
            className="w-full justify-center"
          />
          {(auth.error || loginError) && (
            <PrimaryOutlinedButton
              label="Clear stale login state and retry"
              onClick={handleRetry}
              className="w-full justify-center"
            />
          )}
        </div>

        {auth.isLoading && (
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
            <ProgressSpinner style={{ width: '24px', height: '24px' }} strokeWidth="6" />
            Restoring an existing session if one is available.
          </div>
        )}
      </section>
    </main>
  )
}

export default Login
