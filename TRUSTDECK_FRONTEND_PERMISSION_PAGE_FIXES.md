# Permission page crash fix

This patch fixes a runtime crash on `/permissions` and makes permission-management API failures visible instead of blanking the whole application.

Changes:

- Reworked the permission-management page so HTTP 403 responses from `/api/permissions` are handled gracefully.
- The page now always renders the current user/token role summary even when the backend refuses permission-management endpoints.
- Added a route-level error boundary inside the authenticated layout so a broken sub-page cannot remove the side navigation/header.
- Added a guard to breadcrumb state updates to avoid redundant layout updates.
- The management panel now shows an explicit message when the current account is not allowed to read or manage permission definitions.

Validation:

- `npm run build` passes.
- `npm run lint` passes with the existing React hook warnings only.
