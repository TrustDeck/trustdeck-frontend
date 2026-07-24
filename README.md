# TrustDeck Frontend

React and TypeScript single-page application for the TrustDeck platform. Vite powers local development and builds; the production image serves the static bundle with Nginx and injects public runtime settings at container startup.

## Prerequisites

- Node.js 22 or later and npm
- Docker Engine with the Compose plugin for container deployment

## Local Development

Install dependencies and start the Vite development server:

```bash
npm ci
npm run dev
```

The application is available at `https://localhost:5173` when `local-key.pem` and `local-cert.pem` exist; otherwise it uses HTTP. Create local certificates with `make gen-cert` if HTTPS is required.

For build and quality checks:

```bash
npm run build
npm run lint
npm run pretty
```

`npm run pretty` formats source files in place.

## Configuration

Tooling configuration is in `config/`. The application receives its public API and OpenID Connect settings from the runtime-generated `env.js` file.

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
make build
make compose
```

`make build` creates a local image; `make compose` rebuilds and replaces the Compose service.

## Project Layout

| Path | Purpose |
| --- | --- |
| `src/` | Application code, organized into shared `core/` modules and feature pages. |
| `public/locales/` | Translation resources. |
| `config/` | Vite, TypeScript, linting, styling, and environment templates. |
| `docker/` | Container image, Compose, Nginx, and startup assets. |
| `docs/` | Product and workflow documentation. |
