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
