# TrustDeck frontend patch: navigation token refresh, permissions, and project images

This patch contains the follow-up UI and auth fixes requested on 2026-06-15.

## Changes

- User menu now opens fully on mouse-over, not only on click.
- Dark-mode toggle still collapses the menu immediately after toggling.
- Automatic logout countdown uses a larger font and shows minutes/seconds.
- Main side-navigation route changes now trigger a silent access-token refresh.
- Token refreshes on navigation are throttled to at most one request every 30 seconds.
- Permission management now refreshes the access token before loading permission definitions.
- Permission management font sizes were increased.
- Permission management now contains global permissions plus project/group permissions when a project is selected.
- Project settings no longer contains the permission-management box.
- Project image handling in project settings now supports reading, previewing selected files, upload/update, and delete.
- Project images are shown in the project overview and in the sidebar project header.
- Sidebar project image size was reduced.

## Validation

- `npx tsc -b` passed.
- `./node_modules/.bin/vite build --debug vite:build` passed.
- `npm run lint` passed with the existing React hook warnings only.
