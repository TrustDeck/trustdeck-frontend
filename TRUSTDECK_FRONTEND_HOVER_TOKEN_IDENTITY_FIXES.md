# TrustDeck frontend hover/token/identity fixes

This patch includes:

- User menu hover panel is positioned absolutely so it no longer pushes page content down.
- Identity Management shows an empty-state hint when the selected project has no entity types, with a button to open the Entity Builder.
- Project Settings Danger Zone border is thicker.
- TrustDeck API client refuses to send backend requests when no access token is currently available, preventing unauthenticated `/api` requests from the frontend.
- Permission Management current-user lookup now prefers the user's full name, then email, then username when querying `/api/permissions/users?query=...`.
- Breadcrumb and sidebar navigation to Projects explicitly clears the selected project.
- Fresh login also clears any persisted selected project so project-dependent pages require a new project selection.
