# TrustDeck Frontend - Web Interface for Identity Management in Translational Medicine

[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://github.com/TrustDeck/trustdeck-frontend/releases/tag/1.0.0)
[![License](https://img.shields.io/badge/License-Apache_2.0-green)](https://github.com/TrustDeck/trustdeck-frontend/blob/main/LICENSE)

The TrustDeck frontend is the web interface of [TrustDeck](https://github.com/TrustDeck/trustdeck-backend), an open-source service for pseudonymization and identity management in research projects. It lets trusted third party personnel and project staff manage projects, pseudonym domains, pseudonyms, and entities such as study participants, cases, and biosamples, without using the REST interface directly. It is a single-page application built with React, TypeScript, and Vite; users sign in through Keycloak, and the production image serves the static bundle with Nginx.

## Features

- Create projects and select the project to work in
- Manage pseudonym domains, including domain hierarchies with inherited settings
- Create, import, and search pseudonyms
- Define entity types and register, search, and edit entities, with duplicate detection
- Grant and revoke permissions per project, pseudonym domain, entity type, and globally
- Sign in with Keycloak (OpenID Connect), with sessions limited to the browser tab
- English and German user interface, light and dark mode
- Public help page for visitors who are not signed in

## Prerequisites

- Docker Engine with the Compose plugin, for container deployment
- A running [TrustDeck backend](https://github.com/TrustDeck/trustdeck-backend) and its Keycloak instance

## Setup & Installation

General instructions for setting up TrustDeck are in the official [documentation](https://github.com/TrustDeck/trustdeck-docs). The user documentation of the frontend is in [`docs/`](docs).

### Docker Deployment

All container files are in `docker/`.

1. Create the deployment configuration:
   ```bash
   cp config/environment/trustdeck-frontend.env.example config/environment/trustdeck-frontend.env
   ```
2. Set the public URLs of the backend and of Keycloak in `config/environment/trustdeck-frontend.env` (`API_BASE_URL`, `AUTHORITY_URL`, `AUTHORITY_CLIENT`, `AUTHORITY_REDIRECT_URI`, `AUTHORITY_SILENT_URI`).
3. Build and start the service:
   ```bash
   docker compose -f docker/compose.yml up --build --force-recreate -d
   ```

The service listens on `127.0.0.1:8082`; set `FRONTEND_BIND` (e.g. `0.0.0.0:8082`) to expose it directly. Behind a reverse proxy, route requests to `http://127.0.0.1:8082`. The container writes the settings into a runtime-generated `env.js` at startup, so one image works for every environment.

### Keycloak Client

The frontend signs in through a public Keycloak client (`AUTHORITY_CLIENT`, `frontend` by default) using the Authorization Code flow. Configure it as follows:

- **Audience mapper:** the backend only accepts tokens whose `aud` claim contains `trustdeck`. Under **Clients → frontend → Client scopes → frontend-dedicated**, choose **Configure a new mapper → Audience**, set **Included Client Audience** to `trustdeck`, and enable **Add to access token**. Without it, every API request is answered with `401 Unauthorized`.
- **Valid redirect URIs:** `AUTHORITY_REDIRECT_URI` and `AUTHORITY_SILENT_URI`
- **Valid post logout redirect URIs:** `https://<frontend>/logged-out` (or `AUTHORITY_POST_LOGOUT_REDIRECT_URI`)
- **Web origins:** the frontend's origin

Tokens are kept in the browser's `sessionStorage`, so a session belongs to one tab. New tabs sign in silently with the Keycloak session; logging out ends the Keycloak session for all tabs. A short access token lifespan in Keycloak limits how long an ended session remains usable.

### Content Security Policy

The container sends a `Content-Security-Policy` header built from `API_BASE_URL` and `AUTHORITY_URL`: scripts only from the frontend, network requests only to the frontend, the backend, and Keycloak, and frames only for the silent sign-in. Set `CONTENT_SECURITY_POLICY` to replace it with a complete header value of your own.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
