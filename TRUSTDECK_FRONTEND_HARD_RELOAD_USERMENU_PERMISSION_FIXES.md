# TrustDeck frontend patch: hard reload, user menu, permissions, settings polish

Changes in this patch:

- Prevented project overview and sidebar image lookups from attempting backend calls before the OIDC access token has been synced into the TrustDeck API client after a hard reload.
- Suppressed expected local "No access token available" console noise for image/entity/project loading paths that can briefly run during auth restoration.
- User menu hover panel is now fixed-position/overlayed, so opening it no longer pushes page content downward.
- Project Settings: moved the "Edit project" action to the bottom center of the Project information panel.
- Project Settings: added vertical spacing between the Project image panel headline and content.
- Project Settings: made the Danger zone border thicker.
- Permission Management: current-user backend lookup now queries by username first and only falls back to email if no matching operator is found.
- Identity Management: added a stronger fallback hint on the registration page when no entity type is selected, with shortcuts back to entity selection and to the entity builder.
