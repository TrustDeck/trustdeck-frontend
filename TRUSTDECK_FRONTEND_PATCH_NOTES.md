# TrustDeck frontend patch notes

This patch focuses on the requested usability and workflow fixes:

- account-menu issue documented separately as a Keycloak realm/client-role configuration fix;
- project overview no-project message rewritten;
- project overview filtering improved and hidden when no projects are available;
- global permissions moved into the side navigation and renamed to permission management;
- permission management now shows the current user's token roles and effective permissions before the user-search/grant UI;
- side navigation is available on authenticated pages, including overview/new-project/permission-management pages;
- side navigation shows the project name rather than abbreviation and truncates long names with an ellipsis;
- project creation date pickers now support time selection;
- harmless 404s for newly created projects with no entity types or no project image are handled silently;
- entity manager now shows a helpful empty state with a direct button to the entity builder;
- entity manager can export existing project entity types as JSON;
- entity builder now supports visual field creation, JSON import/export, rendered JSON preview, base-vs-project-specific target selection, and success/error toasts;
- Backend admin route removed from navigation; the major user-facing functions are represented in their natural workflow areas instead.

Validation:

- `npm run build` succeeds.
- `npm run lint` succeeds with pre-existing React hook dependency warnings only.
