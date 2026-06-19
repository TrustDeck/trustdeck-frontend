# TrustDeck frontend permission-current-access fix

This patch updates the Permission Management current-access section so it no longer renders a flat list of permission chips.

## Changes

- Replaced the current user's effective-permissions chip list with collapsible scope cards.
- Each scope card shows granted and not-granted permissions separately.
- Missing permissions are calculated from backend permission definitions when available.
- If permission definitions are not available, the UI explains that only granted permissions can be shown.
- Added German and English translations for the missing-permissions fallback texts.

## Validation

- `npx tsc -b --pretty false` passed.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
