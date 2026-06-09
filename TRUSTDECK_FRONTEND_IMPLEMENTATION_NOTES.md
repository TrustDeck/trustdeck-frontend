# TrustDeck frontend implementation notes

## What changed

- Reworked `src/core/services/TrustDeck.ts` into a broader backend API client.
- Fixed broken endpoint paths, including domain hierarchy, biosample creation, project permissions, and project image response handling.
- Added API-client coverage for:
  - project CRUD/statistics/image delete
  - domain CRUD, hierarchy, subtree, attributes, salt update
  - base entity types and project entity type lifecycle
  - entity instance create/read/search/update/delete, record linkage, entity pseudonyms
  - pseudonym single/batch create/read/search/update/delete, validation, linked pseudonyms
  - permission create/read/update/delete for domain/project/global scopes
  - API ping and maintenance endpoints
- Added `src/pages/general/Login.tsx` and `/auth/login`.
- Changed protected-route behavior so entering the site shows the portal login page instead of immediately redirecting to Keycloak.
- Login still uses the configured Keycloak/OIDC client; the Keycloak redirect starts only after the user clicks the login button.
- Preserves the intended return path through OIDC callback via `trustdeck:returnTo` session storage.
- Added `src/pages/admin/AdminCenter.tsx` and `/admin` as an advanced UI for endpoints that do not yet have polished workflow pages.
- Removed the obsolete split `ProjectStore.tsx` implementation by turning it into a re-export of the real persisted project store.
- Fixed project creation fallback dates so the frontend no longer sends `"test"` to date-time backend fields.
- Fixed direct pseudonym details routes so the domain can be included in the URL: `/search/pseudonym/:domainName/:pseudonymId`.

## Validation run

- `npm run build` succeeds.
- `npm run lint` succeeds with warnings only. The remaining warnings are pre-existing React hook dependency warnings in existing components.

## Deployment note for Keycloak

The login page calls `auth.signinRedirect()` with the existing `AUTHORITY_*` configuration. Make sure the Keycloak frontend client has the configured `AUTHORITY_REDIRECT_URI` registered as a valid redirect URI. No backend changes were required for the login page because the existing bearer-token flow is preserved.

## Login/callback update

The login page is intentionally minimal and only displays the login box. Authentication is still delegated to Keycloak through the configured OIDC client.

Use `/callback` as the frontend redirect URI. Register it in Keycloak, for example:

- `https://your-trustdeck-host/callback`
- `https://your-trustdeck-host/*` if you use wildcard redirects during testing

The app now uses the standard `oidc-client-ts` localStorage-backed user store and synchronizes the TrustDeck API bearer token and local user store from `react-oidc-context`. This avoids the previous issue where the browser could return from Keycloak but remain on the login page because the local app auth state was not populated reliably.

## Login session prompt update

The login page no longer restores or redirects based on an existing local OIDC user before the user clicks **Sign in**. Starting a login now clears local TrustDeck/OIDC state and sends `prompt=login` plus `max_age=0` to Keycloak so users can authenticate with different credentials instead of being silently reused from an existing browser SSO session.

`monitorSession` is disabled in the OIDC configuration to avoid Keycloak check-session lookups from the login page. Silent token renewal after login remains enabled.
