# TrustDeck frontend UI/permission/entity polish

This patch contains follow-up fixes for dark mode dialogs, permission-management retry feedback, username-based permission lookup, sidebar dark mode, project-selection reset behavior, and entity-builder/manager empty-state hints.

## Included changes

- Fixed dark-mode PrimeReact confirmation dialog footer/background styling.
- Added a dark-red border around the whole Project Settings danger-zone panel.
- Permission Management retry now shows loading state and success/warning/error toasts.
- Current-user permission lookup now prefers the token username (`preferred_username`) over email.
- UserStore now stores `preferred_username` as `username` when present, falling back to `sub`.
- Collapsed sidebar now has explicit dark-mode classes.
- User menu is rendered as one connected hover panel instead of two visually detached boxes.
- Opening `/projects` clears the selected project so the entity builder cannot reuse an old project after returning Home.
- Project-required sections now show a toast hint before redirecting to Project Overview when no project is selected.
- Entity Manager empty-state hint received dark-mode styling and includes the existing button to the Entity Builder.
