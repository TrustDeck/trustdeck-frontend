import React, { useEffect, useMemo } from 'react'
import { useAuth } from 'react-oidc-context'
import { useNavigate } from 'react-router-dom'
import { ProgressSpinner } from 'primereact/progressspinner'
import useUserStore from '../../core/stores/UserStore'
import TrustDeck from '@service/TrustDeck'
import useProjectStore from '../../core/stores/ProjectStore'
import { clearLoggedOutMarker, clearReturnTo, getReturnTo } from '../../core/services/authSession'

const isSafeLocalPath = (value: unknown): value is string => {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
}

const readReturnTo = (userState: unknown): string => {
  if (
    userState &&
    typeof userState === 'object' &&
    'returnTo' in userState &&
    isSafeLocalPath((userState as { returnTo?: unknown }).returnTo)
  ) {
    return (userState as { returnTo: string }).returnTo
  }

  const storedReturnTo = getReturnTo()
  if (isSafeLocalPath(storedReturnTo)) return storedReturnTo

  return '/projects'
}

const AuthCallback: React.FC = () => {
  const auth = useAuth()
  const navigate = useNavigate()
  const setFromAccessToken = useUserStore((state) => state.setFromAccessToken)
  const clearSelectedProject = useProjectStore((state) => state.clearSelectedProject)
  const returnTo = useMemo(() => readReturnTo(auth.user?.state), [auth.user?.state])

  useEffect(() => {
    if (!auth.user?.access_token) return

    clearLoggedOutMarker()
    clearReturnTo()
    clearSelectedProject()
    setFromAccessToken(auth.user.access_token)
    TrustDeck.instance().setToken(auth.user.access_token)
    navigate(returnTo, { replace: true })
  }, [auth.user?.access_token, clearSelectedProject, navigate, returnTo, setFromAccessToken])

  if (auth.error) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-surface px-6">
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold text-slate-950">Login could not be completed</h1>
          <p className="mt-4 text-sm leading-6 text-red-700">{auth.error.message}</p>
          <button
            type="button"
            onClick={() => navigate('/auth/login', { replace: true })}
            className="mt-8 w-full rounded-xl bg-color-blue px-4 py-3 font-semibold text-white hover:opacity-90"
          >
            Back to login
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-surface px-6">
      <section className="flex w-full max-w-md flex-col items-center rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
        <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="6" />
        <h1 className="mt-6 text-2xl font-bold text-slate-950">Completing login</h1>
        <p className="mt-3 text-sm text-slate-600">Preparing your TrustDeck session.</p>
      </section>
    </main>
  )
}

export default AuthCallback
