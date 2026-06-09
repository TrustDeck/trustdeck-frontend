import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import { PrimeReactProvider } from 'primereact/api'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRouter from './core/AppRouter.tsx'
import './core/configs/i18n.ts'
import { oidcConfig } from './core/configs/oidc.ts'

const onSigninCallback = (): void => {
  //tiny fix to remove temporal
  const oidcKeys = Object.keys(window.localStorage).filter(
    (key) => key.startsWith('oidc.') && !key.startsWith('oidc.user')
  )
  // Remove all OIDC state keys except "oidc.user"
  oidcKeys.forEach((key) => localStorage.removeItem(key))

  const storedReturnTo = window.sessionStorage.getItem('trustdeck:returnTo')
  window.sessionStorage.removeItem('trustdeck:returnTo')
  const safeReturnTo =
    storedReturnTo &&
    storedReturnTo.startsWith('/') &&
    !storedReturnTo.startsWith('/auth/login') &&
    !storedReturnTo.startsWith('/logged-out')
      ? storedReturnTo
      : window.location.pathname

  window.history.replaceState({}, document.title, safeReturnTo)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrimeReactProvider>
      <AuthProvider {...oidcConfig} onSigninCallback={onSigninCallback}>
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </PrimeReactProvider>
  </StrictMode>
)
