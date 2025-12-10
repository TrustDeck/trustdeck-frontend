import { WebStorageStateStore } from 'oidc-client-ts'
import { AuthWebStorage } from '../stores/AuthWebStore.tsx'

export const oidcConfig = {
  authority: (window.__ENV__?.AUTHORITY_URL ?? import.meta.env.VITE_AUTHORITY_URL),
  client_id: (window.__ENV__?.AUTHORITY_CLIENT ?? import.meta.env.VITE_AUTHORITY_CLIENT),
  redirect_uri: (window.__ENV__?.AUTHORITY_REDIRECT_URI ?? import.meta.env.VITE_AUTHORITY_REDIRECT_URI),
  silent_redirect_uri: (window.__ENV__?.AUTHORITY_SILENT_URI ?? import.meta.env.VITE_AUTHORITY_SILENT_URI),
  userStore: new WebStorageStateStore({ store: new AuthWebStorage() }),
  monitorSession: true, //TODO show in console if it works as soon this works in a test env with ssl certs
  automaticSilentRenew: true,
  checkSessionIntervalInSeconds: 5, //this is the minimum allowed by oidc-client-ts
  accessTokenExpiringNotificationTimeInSeconds: 5, //this is the minimum allowed by oidc-client-ts
  revokeTokensOnSignout: true
}
