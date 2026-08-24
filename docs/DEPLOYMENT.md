# Planora Deployment Runbook

## 1. Preflight

Use Node `22.16.0` (the repo includes `.nvmrc`). From the repository root:

```bash
npm install
npm run typecheck
npm run build
```

A successful build should produce:

- `dist/index.html`
- `dist/assets/*`
- `dist-server/index.js`

Then verify the production host locally:

```bash
npm start
```

Open the port printed by the server and confirm `/api/health` returns JSON with `status: "ok"`.

## 2. Firebase Auth

Create a Firebase project and web application, then enable **Authentication -> Sign-in method -> Google**.

Set these values from the Firebase web app configuration:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

Never commit real values to the repository. They belong in local `.env` for development and Render environment variables for deployment.

After the Render URL exists, add its hostname to Firebase Authentication's authorized domains.

## 3. Render

Create a Blueprint from this repository. The included `render.yaml` defines one Node web service.

Expected commands:

```text
Build: npm install --include=dev && npm run build
Start: npm start
Health: /api/health
```

Enter the four `VITE_FIREBASE_*` values when Render asks for the `sync: false` variables.

## 4. First-deploy checks

Verify:

1. the root URL loads without horizontal overflow on desktop and mobile;
2. `/api/health` returns `200` JSON;
3. `/api/config` reports Firebase readiness correctly;
4. refresh works on the SPA root;
5. creating/moving a task persists after refresh;
6. project completion changes when task state changes;
7. `Ctrl/Cmd+K` focuses search;
8. Google sign-in opens and completes after Firebase is configured;
9. browser console has no uncaught errors.

## 5. Database phase

`DATABASE_URL` is reserved for the hosted persistence phase. Do not set it merely to make the health endpoint say production. When the API/database implementation is added, wire a Render PostgreSQL connection string into this variable and update health checks to verify actual database connectivity separately from process health.

## 6. After deployment

Once the final public URL is stable:

- add it to the GitHub repository homepage field;
- add it to the main README;
- capture desktop and mobile screenshots;
- update Open Graph metadata with a real preview image;
- add the live project to the portfolio and LinkedIn.

## Rollback

If a deployment regresses, use Render's previous successful deploy rather than editing secrets or infrastructure during an incident. Keep the demo mode functional so loss of Firebase configuration does not make the core portfolio experience unavailable.
