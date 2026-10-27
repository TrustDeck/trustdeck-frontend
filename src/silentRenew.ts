import { UserManager, type UserManagerSettings } from 'oidc-client-ts'

import { oidcConfig } from './core/configs/oidc'

// Completes a silent sign-in inside the hidden iframe. This is a separate build entry
// (instead of an inline script) so that it works with the bundler and a strict CSP.
new UserManager(oidcConfig as UserManagerSettings).signinSilentCallback().catch((error: unknown) => {
  console.error('Silent renew error:', error)
})
