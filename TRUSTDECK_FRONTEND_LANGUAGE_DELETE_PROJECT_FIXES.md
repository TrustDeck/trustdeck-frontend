# TrustDeck frontend language, delete-permission, and Project Settings polish

This patch contains the follow-up UI and permission changes:

- Added extra spacing above the Project Settings danger zone.
- Increased the Project Settings danger-zone border thickness.
- Restored the project delete pre-check on the project overview and settings pages.
- Project delete buttons now disable when the current user does not appear to have `project:delete` access.
- Project delete failures now show more specific toast messages for 401, 403, 404, and backend errors.
- Added a language switcher to the top-right user menu.
- Added persistent English/German locale switching through the existing i18next setup.
- Added translations for the user menu, Project Overview, Project Settings, and project-delete messages.
- Permission lookups for the current user continue to query by username first and email as fallback.
