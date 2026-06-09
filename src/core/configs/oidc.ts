import { WebStorageStateStore } from 'oidc-client-ts'

export const oidcConfig = {
  authority: window.__ENV__?.AUTHORITY_URL ?? import.meta.env.VITE_AUTHORITY_URL,
  client_id: window.__ENV__?.AUTHORITY_CLIENT ?? import.meta.env.VITE_AUTHORITY_CLIENT,
  redirect_uri: window.__ENV__?.AUTHORITY_REDIRECT_URI ?? import.meta.env.VITE_AUTHORITY_REDIRECT_URI,
  silent_redirect_uri: window.__ENV__?.AUTHORITY_SILENT_URI ?? import.meta.env.VITE_AUTHORITY_SILENT_URI,
  post_logout_redirect_uri: window.__ENV__?.AUTHORITY_REDIRECT_URI ?? import.meta.env.VITE_AUTHORITY_REDIRECT_URI,
  response_type: 'code',
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  monitorSession: true,
  automaticSilentRenew: true,
  checkSessionIntervalInSeconds: 5,
  accessTokenExpiringNotificationTimeInSeconds: 5,
  revokeTokensOnSignout: true
}
