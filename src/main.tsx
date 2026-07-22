/*
 * Trust Deck Services
 * Copyright 2024-2026 Armin Müller and Eric Wündisch
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import { PrimeReactProvider } from 'primereact/api'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import AppRouter from './core/AppRouter'
import './core/configs/i18n'
import { oidcConfig } from './core/configs/oidc'

/** Rejects external and protocol-relative paths before redirecting after sign-in. */
const isSafeLocalPath = (value: string | null) => {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'))
}

/** Restores a validated application path after the OIDC provider redirects back. */
const onSigninCallback = (): void => {
  const oidcKeys = Object.keys(window.localStorage).filter(
    (key) => key.startsWith('oidc.') && !key.startsWith('oidc.user')
  )
  oidcKeys.forEach((key) => localStorage.removeItem(key))

  const storedReturnTo = window.sessionStorage.getItem('trustdeck:returnTo')
  window.sessionStorage.removeItem('trustdeck:returnTo')

  const safeReturnTo =
    isSafeLocalPath(storedReturnTo) &&
    !storedReturnTo?.startsWith('/login') &&
    !storedReturnTo?.startsWith('/callback') &&
    !storedReturnTo?.startsWith('/logged-out')
      ? storedReturnTo
      : '/projects'

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
