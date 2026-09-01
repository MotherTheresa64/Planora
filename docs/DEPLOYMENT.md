# Planora Deployment Runbook

## 1. Preflight

Use Node `22.16.0` (the repo includes `.nvmrc`). From the repository root:

```bash
npm install
npm run check
npm run smoke:server
```

`npm run check` typechecks both TypeScript targets, builds the Vite client and Express server, and verifies these required artifacts:

- `dist/index.html`
- `dist-server/index.js`

`npm run smoke:server` then boots the compiled production server on a temporary local port, verifies `/api/health`, confirms an unknown `/api/*` route returns JSON `404`, and shuts the process down.

For manual production-host inspection after those checks:

```bash
npm start
```

## 2. Firebase Auth and Firestore

Create a Firebase project and web application, then enable **Authentication → Sign-in method → Google**.

Set these values from the Firebase web app configuration:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

Never commit real values to the repository. They belong in local `.env` for development and Render environment variables for deployment.

Create Firestore for the same Firebase project and deploy the checked-in `firestore.rules` before treating authenticated persistence as production-ready. The rules restrict access to the matching signed-in UID and the `/users/{uid}/workspaces/default` workspace document envelope used by Planora.

After the Render URL exists, add its hostname to Firebase Authentication's authorized domains.

## 3. Render

Create a Blueprint from this repository. The included `render.yaml` defines one Node web service.

Expected commands:

```text
Build: npm install --include=dev --no-audit --no-fund && npm run check
Start: npm start
Health: /api/health
```

Enter the four `VITE_FIREBASE_*` values when Render asks for the `sync: false` variables. When those values are absent, Planora intentionally remains a fully usable local-first demo instead of failing to start.

## 4. First-deploy functional checks

Verify:

1. the root URL loads without horizontal overflow on desktop and mobile;
2. `/api/health` returns `200` JSON;
3. `/api/config` reports Firebase readiness correctly without exposing secrets;
4. refresh works on the SPA root;
5. creating, editing, moving, and deleting a task behaves correctly;
6. Smart starter and Manual plan creation both work;
7. existing plans can be edited and status-changed;
8. plan deletion requires confirmation and cleans related data;
9. manual milestones can be created and toggled;
10. resources and notes can be added and deleted;
11. plan/task completion updates Dashboard and Insights values;
12. Calendar reflects due dates and the selected week-start setting;
13. Settings persist after refresh;
14. `Ctrl/Cmd + K` searches plans, tasks, milestones, resources, and notes;
15. Google sign-in opens and completes after Firebase is configured;
16. authenticated changes sync to the user's Firestore workspace;
17. browser console has no uncaught errors.

## 5. Mobile release checks

At minimum inspect `320x568`, `360x800`, `390x844`, and phone landscape.

Confirm:

- the drawer, header, search, and account controls remain reachable;
- touch targets are comfortable;
- task edit/move/delete controls do not collide;
- Kanban stacks vertically rather than forcing a desktop board into a phone viewport;
- Calendar uses compact event markers without horizontal overflow;
- Plan/Settings metadata collapses cleanly;
- Resources and Notes remain readable;
- modals behave as bottom sheets and respect safe-area insets;
- long user-entered strings do not break cards or the viewport.

Use `docs/QA.md` for the full acceptance matrix.

## 6. Presentation / showcase checks

The public project is intended to be shared in job applications, LinkedIn posts, and portfolio links. Before publishing a release:

- verify the live demo URL in the README;
- verify the canonical URL and Open Graph/Twitter metadata in `index.html`;
- verify `/social-preview.svg` loads publicly;
- capture current desktop and mobile product screenshots for the portfolio/LinkedIn post;
- make sure the sample workspace still demonstrates plans, tasks, milestones, risk, resources, notes, and insights without requiring a login;
- avoid screenshots with debug tools, browser warnings, or stale failed-deploy indicators.

## 7. Hosted database phase

Planora currently uses authenticated Firestore workspace documents plus local backup. `DATABASE_URL` remains reserved for a future dedicated API/PostgreSQL phase and should not be set merely to make infrastructure look more production-like.

If the architecture later moves to a server-owned database, the natural evolution is:

```text
Firebase Auth identity/token
        ↓
Express REST API
        ↓
PostgreSQL
```

The current client domain model and persistence boundary are intentionally isolated so that migration does not require rebuilding the product UI.

## Rollback

If a deployment regresses, use Render's previous successful deploy rather than editing secrets or infrastructure during an incident. Keep demo/local mode functional so loss of Firebase configuration does not make the core portfolio experience unavailable.
