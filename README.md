<!--
  Trust Deck Services
  Copyright 2024-2026 Armin Müller and Loic Khodarkovsky

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->

# trustdeck-frontend

## Structure

The frontend is organized by feature below `src/pages`. Feature-specific components,
services, stores, types, and utilities stay with their feature. `src/core` contains
only application-wide concerns such as routing, API access, shared stores, and
feature-independent components.

The active project feature is `src/pages/projects`. Do not add files to the retired
singular `pages/project` layout. Services that do not render JSX use the `.ts`
extension; React components use `.tsx`.

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

## Docker production deployment

The production Docker image builds the frontend inside Docker and serves the generated `dist/` directory with Nginx. You do not need to run `npm ci` or `npm run build` manually on the server.

1. Create the ignored deployment env file:

```bash
cp trustdeck-frontend.env.example trustdeck-frontend.env
nano trustdeck-frontend.env
```

2. Build and start the container:

```bash
docker compose --env-file trustdeck-frontend.env up --build --force-recreate -d
```

When the frontend runs behind a host-level reverse proxy on the same server, keep `FRONTEND_BIND=127.0.0.1:8082` and point the host reverse proxy to `http://127.0.0.1:8082/`.
