# TrustDeck frontend: project overview filter/edit fixes

## Changes

- Moved the Project Overview filter button to the left side below the page title/intro.
- Made the Project Overview edit icon open Project Settings without requiring an update-permission pre-check.
  - The icon now behaves as a navigation/details action.
  - Actual update authorization remains enforced when saving in Project Settings by the backend.
- Added dark-mode styles to the Project Overview filter button.

## Validation

- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
