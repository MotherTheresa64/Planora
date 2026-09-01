# Planora

**Plan clearly. Execute deliberately.** Planora is a structured planning and execution workspace for turning an idea into a plan, goals and milestones, actionable tasks, scheduled work, and measurable progress.

It is intentionally smaller and more personal than enterprise project-management software. The product is designed for an individual workspace today, while keeping collaborator metadata in the domain model without pretending that real-time shared collaboration, invitations, comments, or presence are implemented.

**Live deployment:** https://planora-zlxv.onrender.com

## What Planora does

- **Dashboard** — active plans, real completion, due-now/overdue/unscheduled work, remaining estimates, plan risk, next tasks, and recent activity.
- **Today** — separates overdue, due-today, upcoming, and unscheduled work using local calendar dates rather than UTC date slicing.
- **Plans** — create and edit plans with goals, descriptions, timelines, status, priority, category, tags, milestones, tasks, notes, resources, and collaborator metadata.
- **Structured starter** — optionally generates a neutral, editable milestone/task skeleton for a new plan; it does not claim to be AI planning.
- **Tasks / Kanban** — Backlog, To Do, In Progress, Blocked, and Complete workflow states with drag/drop on pointer devices and an independent status control for touch/keyboard use.
- **Task detail** — optional scheduling, estimates, assignee label, tags, notes, subtasks, and same-plan task dependencies.
- **Dependency protection** — rejects self/cross-plan/circular dependencies, removes dangling references during cleanup, and prevents dependent work from being advanced while blockers remain incomplete.
- **Roadmap** — chronological plan milestones and derived milestone progress.
- **Calendar** — month view plus agenda for task due dates and milestone targets, with Monday/Sunday week-start support in the workspace settings model.
- **Resources** — attach links, documentation, articles, references, files/notes metadata, and contextual notes to a plan or milestone. External URLs are restricted to HTTP/HTTPS.
- **Notes** — plan notes can optionally reference a task and remain attached to the plan if that task is deleted.
- **Insights** — real workspace completion, remaining estimates, schedule pressure, per-plan progress/health, and open-work priority distribution.
- **Search** — case-insensitive workspace search across plans, tasks, milestones, resources, and notes. `Ctrl/Cmd + K` focuses search.
- **Import / export** — validated JSON workspace export and replacement import for portable backups.
- **Explicit sample data** — a sample workspace can be loaded on demand; new users start with an empty real workspace.
- **Four themes** — Midnight, Aurora, Ember, and Daybreak, persisted locally with reduced-motion and focus-visible support.

## Architecture

```text
Browser
  React 19 + TypeScript
      |
      +-- App.tsx        product flows / presentation state
      +-- domain.ts      invariants, validation, calculations, safe destructive operations
      +-- storage.ts     versioned + scoped local snapshots / import-export migration
      +-- firebase.ts    optional Google Auth + per-UID Firestore workspace snapshot
      +-- theme.ts       device-local appearance preference
      |
Express 5 production host
      +-- /api/health
      +-- /api/config    capability description only; no fake database API
      +-- Vite static assets + SPA fallback
```

`Workspace` is the persisted domain root. Plans own milestones, tasks, resources, and notes by ID. Tasks may point to a milestone and to same-plan dependency task IDs. Notes may optionally point to a task. Relationship cleanup lives in domain operations instead of relying on UI filtering.

Progress is derived from task completion; it is not stored as a mutable percentage. Milestone status is synchronized from its child task state when tasks exist.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the invariants and persistence flow.

## Persistence and authentication

Planora is **local-first**:

1. Guest data is stored under a guest-scoped, versioned local key.
2. Authenticated data uses a UID-scoped local key so one account's browser cache is not loaded into another account.
3. If Firebase is configured, Google Authentication is available.
4. The authenticated workspace is stored at `users/{uid}/workspaces/default` in Firestore.
5. Both local and cloud snapshots carry `savedAt`; on authentication/loading, Planora chooses the newer valid snapshot and reconciles the other side.
6. Every loaded/imported/cloud workspace is normalized before use so malformed entities, dangling IDs, invalid enum values, unsafe URLs, invalid dates, cross-plan references, and dependency cycles do not enter active state unchanged.

Firestore rules enforce that the authenticated UID must match the user document path. Frontend filtering is not used as authorization.

If Firebase is absent or temporarily unavailable, Planora remains usable in local guest mode and cloud failures fall back to the scoped browser copy rather than blanking the application.

## Firebase setup

Copy `.env.example` to `.env` and provide the Firebase web-app configuration:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Then:

1. Create/choose a Firebase project and Web app.
2. Enable **Google** in Firebase Authentication providers.
3. Create Firestore if it is not already enabled.
4. Deploy the repository's `firestore.rules`.
5. Add every deployed hostname to Firebase Authentication's authorized domains.

Firebase web configuration is client configuration, not a server secret. Do not commit actual privileged credentials, service-account keys, or unrelated secrets.

## Local development

Requires Node **22.16+** (the project currently accepts Node 22–24).

```bash
npm install
npm run dev
```

- Client: `http://localhost:5173`
- Express development server: `http://localhost:8787`
- Vite proxies `/api` to the local Express process.

Planora does not require Firebase credentials for local use.

## Quality gates

Run the complete repository verification:

```bash
npm run check
npm run smoke:server
```

`npm run check` runs:

1. strict TypeScript checks for client and server;
2. automated domain tests;
3. the production Vite + server build;
4. production artifact verification.

`npm run smoke:server` boots the compiled Express server and verifies the health endpoint plus JSON API-404 behavior.

The domain suite specifically covers relationship cleanup, plan/milestone/task destructive operations, dependency cycles and cross-plan dependencies, local-date semantics, progress derivation, schedule metrics, unsafe URLs, normalization of malformed data, and local/cloud conflict selection.

GitHub Actions runs the same check contract on pull requests and on pushes to `main`.

## Production build and hosting

```bash
npm run build
npm start
```

Vite builds the client to `dist/`. TypeScript builds the Express host to `dist-server/`. The host serves hashed assets with immutable caching, keeps the SPA document uncached, returns JSON for unknown `/api/*` routes, exposes a health check, applies baseline security headers, and handles shutdown signals.

`render.yaml` configures the Render deployment around the same build/check contract. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Security considerations

- Firestore access is UID-isolated by rules in `firestore.rules`.
- Persisted/imported/cloud workspace data is normalized before becoming application state.
- External resource URLs are limited to HTTP/HTTPS and open with `noopener noreferrer`.
- React renders user text normally; Planora does not use `dangerouslySetInnerHTML` for workspace content.
- Express disables `x-powered-by` and sets `nosniff`, frame denial, referrer, permissions, and cache policies.
- Browser local storage is treated as untrusted persistence, not an authorization boundary.
- No server-side secret is required for the current architecture; privileged credentials should never be placed in `VITE_*` variables.

This is a practical security pass, not a claim that the application is universally secure.

## Current limitations

- **Collaboration is not a shared-workspace system yet.** Collaborator metadata exists, but there are no invitations, membership authorization, comments, presence, notifications, or multi-user real-time editing.
- Firestore stores one workspace snapshot document per user rather than normalized per-entity documents. That is appropriate for this portfolio/local-first scope but not intended as an infinite-scale collaboration backend.
- Conflict resolution is last-saved-snapshot based; there is no field-level merge when two devices edit offline concurrently.
- Automated tests concentrate on the domain/persistence invariants most likely to corrupt data. The repository does not yet claim full browser end-to-end coverage of Google popup authentication or real Firestore network behavior.
- File-type resources are metadata entries; Planora does not upload binary files.

## Repository map

- `src/App.tsx` — application shell, views, forms, and interaction flows.
- `src/domain.ts` — validation, normalization, progress/health/date calculations, dependencies, and relationship-safe destructive operations.
- `src/types.ts` — persisted domain types.
- `src/storage.ts` — versioned local snapshots, migrations, import/export, sample loading.
- `src/firebase.ts` — optional Firebase initialization, auth, Firestore snapshot loading/saving.
- `src/theme.ts` — appearance control and theme persistence.
- `src/ErrorBoundary.tsx` — application-level render recovery.
- `server/index.ts` — production static host and operational endpoints.
- `firestore.rules` — per-UID Firestore authorization.
- `src/domain.test.ts` — core domain regression suite.
- `docs/` — architecture, deployment, QA, and project-map documentation.

## Why this project exists

Planora is a portfolio project built to demonstrate a non-trivial React/TypeScript product without architecture cosplay: normalized domain relationships, derived state, validation, asynchronous auth/persistence behavior, local/cloud recovery, security boundaries, responsive interaction design, accessibility basics, automated invariant testing, and deployable production hosting.
