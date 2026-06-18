# TrustDeck frontend auth route and timeout fixes

This patch changes unauthenticated routing and logged-out handling:

- The in-app login route is now `/login` instead of `/auth/login` to avoid clashes with reverse-proxy Keycloak `/auth` routes.
- Protected routes with missing/expired auth redirect to `/login?returnTo=...`.
- `/logged-out` is only shown when a recent frontend logout marker exists.
- Manual logout writes a `manual` logout marker.
- Access-token timeout during an active frontend session writes a `timeout` logout marker.
- Stale logout markers and markers from older frontend builds are ignored, so returning to an old tab after hours no longer keeps routing the user to `/logged-out`.
