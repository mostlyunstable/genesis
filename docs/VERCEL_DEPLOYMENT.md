# Deploying Genesis with Vercel

The Vercel project hosts the React/Vite frontend. The current FastAPI service,
database, queue, and Ollama model run on a separate persistent backend server.

## Current prerequisite

There is currently no hosted backend URL. Complete backend hosting before the
first Vercel production deployment. The Vercel build intentionally stops with an
actionable configuration error if VITE_API_BASE_URL is missing or points to a
local, insecure, or placeholder address. This prevents publishing a UI wired to
a visitor's localhost or a static HTML fallback.

## Backend

For the free-only deployment path, follow [the cloud backend guide](FREE_CLOUD_BACKEND.md).

1. Run the repository's Docker Compose stack on a persistent server behind HTTPS.
   The existing stack includes PostgreSQL, Redis, Ollama, and model initialization.
2. Set POSTGRES_PASSWORD, JWT_SECRET, and FORWARDER_API_KEY using independently
   generated values. Use .env.production.example as the variable list.
3. Configure CORS_ORIGINS as a JSON array containing the exact Vercel frontend
   origin. For example, replace the placeholder in:
   CORS_ORIGINS=["https://YOUR-PROJECT.vercel.app"]
   Add preview origins individually if previews should access the backend.
4. Provision an administrator through:
   docker compose run --rm backend python -m backend.app.create_admin
5. Check the public HTTPS /health endpoint and authenticate against
   /api/v1/auth/login. Confirm /api/v1/chat/model reports the model available.

The public backend origin can point to the HTTPS proxy in front of the existing
stack. Keep database, queue, and Ollama ports private.

## Vercel project

- Import mostlyunstable/genesis with production branch main.
- Root directory is the repository root.
- Framework is Vite. vercel.json configures installation, build, and output.
- Node version is 26.x, matching package.json and .nvmrc.
- Set VITE_API_BASE_URL to the real public HTTPS backend origin, such as the
  actual API domain supplied by your backend host. Use the origin only, without
  /api/v1, a path, credentials, or a query string.
- Set the variable for both Production and any Preview environments you use.
- Redeploy after changing the value because Vite embeds public configuration
  during the build.

VITE_* variables are visible to browser users. Store JWT secrets, database
passwords, and forwarder keys only on the backend.

## Deployment verification

Open /copilot, /response, /audit, and /settings directly and refresh each page.
Sign in with the provisioned account. Confirm overview metrics load, then send a
chat message, upload a sample log, stop a reply, reload, and retry a selected
answer. The browser should contact the configured HTTPS API origin.

Configuration validation checks URL syntax and rejects known unsuitable local
origins. It does not establish that a backend is reachable or healthy. Live
backend connectivity and the complete deployed workflow require verification
after hosting is available.

## References

- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vite.dev/guide/env-and-mode
