# TrustDeck frontend entity-builder, permissions, account-console fixes

## Changes

- Entity Builder now keeps the visual preview and JSON import/export panels side-by-side on wide screens.
- Entity Builder panel titles use the loaded translation namespaces directly, preventing raw keys such as `visualPreview`, `jsonImportExport`, or `createEntityType` from being displayed.
- Added missing German/English translation keys discovered during a literal `t(...)` key pass.
- Permission Management cards are collapsible per scope and now show granted and not-granted rights in separate columns with consistent rows instead of uneven chips.
- Permission rows now show readable action names plus the raw backend action as a small technical reference.
- Account Console menu item now shows an external-link icon and opens the Keycloak Account Console at `${AUTHORITY_URL}/account/#/`.

## Validation

- `npm run build` passed.
- `npm run lint` passed with the existing React hook dependency warnings only.
