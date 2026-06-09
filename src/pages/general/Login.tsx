import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useLocation, useNavigate } from 'react-router-dom'
import { ProgressSpinner } from 'primereact/progressspinner'
import {
  ArrowRightEndOnRectangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  ServerStackIcon
} from '@heroicons/react/24/outline'
import PrimaryButton from '@component/form/buttons/PrimaryButton'
import PrimaryOutlinedButton from '@component/form/buttons/PrimaryOutlinedButton'
import { oidcConfig } from '../../core/configs/oidc'
import useUserStore from '../../core/stores/UserStore'

const getReturnTo = (search: string) => {
  const params = new URLSearchParams(search)
  const value = params.get('returnTo')
  if (!value || !value.startsWith('/')) return '/projects'
  if (value.startsWith('/auth/login') || value.startsWith('/logged-out')) return '/projects'
  return value
}

const Login: React.FC = () => {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const [loginError, setLoginError] = useState<string | null>(null)
  const returnTo = useMemo(() => getReturnTo(location.search), [location.search])

  useEffect(() => {
    if (auth.isAuthenticated || isAuthenticated) {
      navigate(returnTo, { replace: true })
    }
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
    <div className="min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:flex-row lg:items-center lg:gap-12">
        <section className="flex-1 py-10 lg:py-0">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-color-blue shadow-sm ring-1 ring-slate-200">
            <ShieldCheckIcon className="h-5 w-5" />
            TrustDeck secure portal
          </div>
          <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-slate-950 md:text-6xl">
            Manage identities, pseudonyms and project data securely.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Sign in with your institutional account to access project workspaces, entity registration, pseudonymization and permission management.
          </p>
          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              ['Keycloak SSO', 'Uses the configured OpenID Connect client.'],
              ['Backend tokens', 'Passes the access token to TrustDeck APIs.'],
              ['No forced redirect', 'The portal is shown before Keycloak login.']
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur">
                <ServerStackIcon className="mb-3 h-6 w-6 text-color-blue" />
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-color-blue/10">
            <LockClosedIcon className="h-9 w-9 text-color-blue" />
          </div>
          <h2 className="text-2xl font-bold text-slate-950">Welcome to TrustDeck</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Continue through Keycloak only when you are ready to authenticate. The standard Keycloak page is no longer opened automatically when someone enters the site.
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
              label={auth.isLoading ? 'Checking session...' : 'Sign in with Keycloak'}
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
      </div>
    </div>
  )
}

export default Login
