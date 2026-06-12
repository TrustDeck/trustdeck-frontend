# TrustDeck frontend follow-up fixes

Implemented in this package:

- Added a durable local logout marker so removing `/logged-out` from the URL after a timeout cannot revive an expired in-memory OIDC session.
- Protected routes now require a valid, non-expired token and ignore OIDC session restoration while the local logout marker is set.
- Login and callback clear the local logout marker only when a fresh login starts/completes.
- Breadcrumbs now use React Router navigation instead of full-page anchor reloads, fixing the project overview losing its project list after returning via Home.
- Project overview refetches projects once the OIDC/user token is available, avoiding empty lists caused by early unauthenticated requests after navigation/reload.
- Permission cache now extracts roles from realm and all client role sections in the token and recognizes broader project CRUD/admin role naming patterns.
- Permission cache now handles several effective-permission response shapes (`action`, `operation`, resource/project fields, and allow/deny decisions).
- Automatic logout countdown is larger and shows minutes plus seconds.
- Added a dark-mode switch to the hover user menu.
