# Planora Deployment Runbook

## 1. Preflight

Use Node `22.16.0` (the repository includes `.nvmrc`). From a clean checkout:

```bash
npm install --include=dev --no-audit --no-fund
npm run check
npm run smoke:server
```

`npm run check` must pass client/server TypeScript, automated domain tests, the Vite/Express production build, and required-artifact verification. `npm run smoke:server` boots the compiled server and verifies its operational/API contract.

Do not deploy a commit while either command fails.

## 2. Firebase

Planora can deploy without Firebase and remain usable in local guest mode. For authenticated per-user Firestore sync:

1. Create or select a Firebase project.
2. Register a Firebase **Web app**.
3. Enable **Authentication → Sign-in method → Google**.
4. Enable Firestore.
5. Deploy the repository's `firestore.rules`.
6. Configure these web-app values for the build:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

These are Firebase client configuration values. Do not put privileged service-account keys or unrelated secrets into `VITE_*` variables.

After the production hostname exists, add it to Firebase Authentication's authorized domains.

## 3. Firestore rule deployment

The application stores the authenticated workspace at:

```text
users/{uid}/workspaces/default
```

The checked-in rules require the authenticated UID to equal the `{userId}` path segment. Deploy the rules using the Firebase project associated with the client configuration.

If rule deployment is not available in the deployment environment, this is an external Firebase-console/CLI step and must be completed before claiming cloud persistence is production-ready.

## 4. Render

The included `render.yaml` defines the Node web service.

Expected contract:

```text
Build: npm install --include=dev --no-audit --no-fund && npm run check
Start: npm start
Health: /api/health
```

Configure the four `VITE_FIREBASE_*` values in Render only if cloud auth/sync is intended for that deployment. Because Vite embeds client configuration at build time, a change to those variables requires a rebuild/deploy.

The Express process does not use `DATABASE_URL`; there is no fake database phase in the current architecture.

## 5. First-deploy checks

Verify the deployed URL against `docs/QA.md`, with special attention to:

1. first-run empty state and explicit sample loading;
2. desktop/tablet/mobile layout with no horizontal page overflow;
3. task status control on touch (not just drag/drop);
4. `/api/health` returning `200` JSON with `status: "ok"` and `runtime: "static-spa"`;
5. unknown `/api/*` returning JSON `404`;
6. local guest persistence across hard refresh;
7. plan/task/milestone/resource/note create/edit/delete flows;
8. dependency blocking and destructive cleanup;
9. Google sign-in/out and Firestore sync if Firebase is configured;
10. signing in with a second test UID does not expose the first UID's workspace;
11. Firestore failure leaves local persistence usable;
12. browser console has no uncaught application errors.

## 6. Production metadata

Once the production URL is stable:

- keep the README live URL current;
- set the GitHub repository homepage field to the live application;
- use real desktop/mobile screenshots in portfolio material;
- keep Open Graph/social preview metadata aligned with the current UI;
- do not describe collaboration, file upload, or backend/database behavior that is not implemented.

## Rollback

If a production deployment regresses, restore a previous successful Render deploy or revert the offending repository commit. Do not modify Firebase rules or credentials as an ad-hoc rollback mechanism unless the incident actually originates there.

A Firebase outage or missing Firebase client configuration should degrade Planora to local behavior; it should not require taking the static application offline.
