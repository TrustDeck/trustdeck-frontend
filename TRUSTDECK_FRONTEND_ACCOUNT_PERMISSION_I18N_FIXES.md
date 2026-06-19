# TrustDeck frontend patch: account console, translations, permission view

Changes in this package:

- Added explicit German/English translations for reported Entity Manager and Identity Management empty/loading states.
- Fixed raw translation keys in Entity Builder panel titles by using explicit namespaces.
- Restored side-by-side Entity Builder visual preview and JSON import/export panels on large screens.
- Reworked Permission Management so global/project/group scopes are collapsible cards.
- Permission cards now show granted and not-granted sections side-by-side, with stable rows and status badges.
- Added an optional ACCOUNT_CONSOLE_URL runtime setting and changed the default account-console URL to the Keycloak SPA route ending in /account/#/personal-info.
- Kept the external-link icon in the user menu for the account-console entry.

Note: a 403 from Keycloak account-console requests such as /realms/<realm>/account/?userProfileMetadata=true is authorization/configuration-related in Keycloak. The frontend can open the correct URL, but Keycloak must allow the user/account-console client to access it.
