# TrustDeck frontend project settings/edit fixes

This patch moves project editing out of the project overview dialog and into the Project settings sub-page.

## Changes

- Project overview edit button now selects the project and navigates to `/project-settings`.
- Project settings displays all user-visible `ProjectDTO` fields:
  - name
  - abbreviation
  - start date
  - end date
  - store entities
  - store pseudonyms
  - description
- Internal project ID remains hidden.
- Project settings contains an explicit **Edit project** button.
- Project settings edit mode supports saving changes for the listed DTO fields.
- Existing project image CRUD remains in Project settings.
- Sidebar project image was made slightly smaller.
- Project overview side-nav icon was changed from a magnifying glass to a folder icon.
- Entity manager side-nav icon was changed so it no longer matches Identity Management.

## Validation

- `npx tsc -b` passed.
- `vite build --debug vite:build` passed.
- `npm run lint` passed with existing warnings only.
