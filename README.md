# trustdeck-frontend

## Installation

Prerequisites:
- Docker (Engine & Compose)
- Node.js (LTS)
- npm
- make (optional, used by project Makefile)

Steps:
1. Clone this repository
2. Run `make install`
3. Adjust environment variables in `docker-compose.yml` (or point to a `.env` file if used).
4. Start the stack: `make compose` **Note: This uses Docker/Compose to build and run services.**
5. The app should be available on http://localhost:9000
6. Configure your proxy (nginx, Traefik, or other) to forward incoming requests to the container port (e.g., localhost:9000).

## Quick start (development)
- Install dependencies: `npm install`
- Start the frontend dev server (if applicable): `npm run dev`

## Development

### Routes — adding a new route
To add a new page and route:

1. Create the React page component, e.g. `src/pages/IdentityManagementPage.tsx`:

   ```tsx
   import React from 'react';

   const IdentityManagementPage: React.FC = () => (
     <div>
       <h1>Identity Management</h1>
       {/* Page content */}
     </div>
   );

   export default IdentityManagementPage;
   ```

2. Import the component in the routes config: `src/core/configs/routes.ts`

   ```ts
   import IdentityManagementPage from '../../pages/IdentityManagementPage';
   ```

3. Add a route entry to the routes array:

   ```ts
   {
     path: '/identitaetsmanagement',
     titleKey: 'layout:menu.identityManagement',
     component: IdentityManagementPage,
     Icon: IdentificationIcon,
     isProtected: true,
     isSidebar: true,
     sidebarOrder: 1,
   }
   ```

Route attributes:
- `path`: URL path for the route.
- `titleKey`: i18n key used for the label (use the namespace prefix).
- `component`: React component to render.
- `Icon`: Sidebar icon component.
- `isProtected`: true if authentication is required.
- `isSidebar`: true to show the route in the sidebar.
- `sidebarOrder`: numeric ordering for sidebar placement.

Files involved:
- `src/core/configs/routes.ts`
- `src/pages/IdentityManagementPage.tsx`

### Translations — adding a new namespace
To add a namespace for i18n:

1. Create a new JSON file in `public/locales/<lang>/`, e.g. `public/locales/en/identitymanagement.json`:

   ```json
   {
     "panel": {
       "login": "Login",
       "logout": "Logout"
     }
   }
   ```

2. Register the namespace in your i18n config (e.g. `src/core/configs/i18n.ts`):

   ```ts
   const namespaces = ['layout', 'common', 'search', 'identitymanagement'];
   ```

3. Use translations in code:

   ```tsx
   import { useTranslation } from 'react-i18next';

   function LoginButton() {
     const { t } = useTranslation();
     return <button>{t('identitymanagement:panel.login')}</button>;
   }
   ```

Files involved:
- `public/locales/en/identitymanagement.json`
- `src/core/configs/i18n.ts`
- Components using `useTranslation` or `t`

---

Following these steps will get the environment running and document how to add pages, routes and translations. Adjust the commands and ports to match your local configuration.
