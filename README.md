# TrustDeck Frontend

React and TypeScript single-page application for the TrustDeck platform. Vite powers local development and builds; the production image serves the static bundle with Nginx and injects public runtime settings at container startup.

## Prerequisites

- Node.js 22 or later and npm
- Docker Engine with the Compose plugin for container deployment

## Getting Started

Install dependencies, then start the Vite development server:

```bash
npm ci
npm run dev
```

The application is available at `https://localhost:5173` when `local-key.pem` and `local-cert.pem` exist; otherwise it uses HTTP.

For build and quality checks:

```bash
npm run build
npm run lint
npm run pretty
```

`npm run pretty` formats source files in place.

## Configuration

Tooling configuration is in `config/`. The application receives its public API and OpenID Connect settings from the runtime-generated `env.js` file.

### Keycloak Client

The frontend signs in through a public Keycloak client (`AUTHORITY_CLIENT`, by default `frontend`) using the Authorization Code flow. The backend only accepts access tokens whose `aud` claim contains `trustdeck`, so the client needs an audience mapper:

1. In the Keycloak admin console, open **Clients → frontend → Client scopes → frontend-dedicated**.
2. Choose **Configure a new mapper → Audience**.
3. Set **Included Client Audience** to `trustdeck` and enable **Add to access token**.

Without the mapper, every API request is answered with `401 Unauthorized`.

## Docker Deployment

All container assets are in `docker/`. The Compose file uses the repository root as its build context, so run it with an explicit file path.

1. Create the ignored deployment configuration.

```bash
cp config/environment/trustdeck-frontend.env.example config/environment/trustdeck-frontend.env
```

2. Set the public API and OIDC URLs in `config/environment/trustdeck-frontend.env`.

3. Build and start the service.

```bash
docker compose -f docker/compose.yml up --build --force-recreate -d
```

The service binds to `127.0.0.1:8082` by default. Set `FRONTEND_BIND`, for example to `0.0.0.0:8082`, only when it should be exposed directly. For reverse-proxy deployments, route requests to `http://127.0.0.1:8082`.

Useful commands:

```bash
docker compose -f docker/compose.yml logs -f
docker compose -f docker/compose.yml down
```
