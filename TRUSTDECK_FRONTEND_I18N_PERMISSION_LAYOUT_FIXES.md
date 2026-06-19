# TrustDeck frontend patch: i18n, permission layout, user timer, entity builder alignment

Implemented changes:

- Added and wired additional German/English translations for login, project-required hints, entity builder, permission management, and permission visualization.
- Fixed several German translation typos and untranslated labels in navigation/search/project/group language files.
- Changed permission management permission lists into collapsible cards per global/project/group scope.
- Added granted/not-granted counts to each permission scope card.
- Added consistent permission tiles with clear granted/not-granted labels so long permission names no longer create uneven row layouts.
- Translated permission scope labels and subgroup labels.
- Changed the top-right logout timer to use a monospaced/tabular layout so it no longer shifts every second.
- Centered the avatar/timer content in the collapsed user menu.
- Aligned the Entity Builder JSON import/export panel with the other builder panels by using a single full-width stack.
- Added dark-mode-compatible styling to the Entity Builder panels and JSON preview areas.
