# TrustDeck frontend patch: project overview and entity builder polish

This patch includes:

- Centered the sticky New project action in the project overview.
- Added a plus icon to the New project button.
- Improved button icon spacing globally, including the entity builder Back button.
- Renamed the associated domain UI label to Associated group name.
- Removed the previous default project-abbreviation value from the associated group field.
- When no base type exists, the entity builder defaults to Base type and disables the project-specific option with a tooltip/hint.
- Seeded the entity builder with a valid person entity-type example on open.
- Synchronized the person example into the visual preview, JSON import/export textarea, and rendered preview.
- Centered the final Create entity type action so it aligns visually with the builder content.

Validation:

- npm run build: passed
- npm run lint: passed with existing warnings only
