# Planora Architecture

## Goals

Planora is intentionally structured as a production-style single-page planning application that remains fully demonstrable without external credentials. The browser workspace is not a fake collection of static screens: it is a typed domain model with local persistence, optional authenticated Firestore synchronization, safe recovery, and derived workflow metrics.

## Runtime shape

```text
Browser
  React 19 + TypeScript
      |
      +-- Workspace domain model
      +-- storage.ts -> versioned local persistence + normalization/repair
      +-- firebase.ts -> Google Auth + per-user Firestore workspace sync
      +-- theme.ts -> device-local appearance persistence
      |
Express production host
      +-- /api/health
      +-- /api/config
      +-- security headers
      +-- static Vite build / SPA fallback
```

The same Node process serves the compiled client and lightweight operational endpoints on Render. Firebase provides the optional authenticated identity and hosted workspace document while the guest demo remains self-contained.

## Domain model

`Workspace` is the top-level client domain object. It contains:

- plans and collaborators;
- ordered milestones and milestone dependencies;
- tasks, subtasks, task dependencies, estimates, actuals, status, priority, dates, tags, and notes;
- plan resources;
- plan notes;
- activity history;
- workspace behavior settings.

References use stable IDs rather than embedding duplicated entities. Progress, plan health, open effort, overdue counts, milestone completion, and insights are derived from current domain state instead of stored display values.

## State integrity

`src/storage.ts` is the defensive persistence boundary. Before persisted content reaches the UI it:

- validates the top-level workspace shape;
- normalizes plans, collaborators, milestones, tasks/subtasks, resources, notes, activity, and settings;
- applies safe enum/default values and length limits;
- validates calendar dates and timestamps;
- accepts only HTTP/HTTPS resource URLs;
- removes duplicate IDs;
- drops entities whose parent plan no longer exists;
- repairs invalid milestone/task references;
- removes dangling task dependencies and self-dependencies;
- bounds collection sizes to the same practical limits used by Firestore rules;
- falls back to a cloned demo workspace when browser data is absent or unusable;
- tolerates malformed JSON, storage quota failures, privacy restrictions, and legacy storage.

Destructive actions in the product also maintain referential integrity immediately. Deleting a plan removes its milestones, tasks, resources, notes, stale activity, and references from surviving dependencies. Task deletion removes surviving dependency references and detaches note references.

## Local-first persistence

Guest/signed-out workspaces are scoped under versioned `localStorage` keys. Every workspace mutation is persisted locally.

The local layer serves three purposes:

1. frictionless recruiter/demo use without registration;
2. immediate resilience when cloud connectivity fails;
3. a local backup for authenticated workspace changes.

Legacy `planora-workspace-v1` and prior unscoped v2 data can be migrated/read without preventing startup.

## Authentication and Firestore sync

`src/firebase.ts` initializes Firebase only when all required `VITE_FIREBASE_*` values exist. Google popup authentication becomes available once Firebase is configured; otherwise Planora remains a credential-free local demo.

Authenticated runtime flow:

1. Firebase emits the current user.
2. Planora switches to a user-scoped local workspace.
3. The authenticated `/users/{uid}/workspaces/default` Firestore document is loaded when available.
4. UI state changes are saved locally immediately.
5. Authenticated changes are debounced before Firestore writes.
6. Cloud failures leave the local workspace usable and move the header state to local-backup mode rather than losing work.
7. Sign-out switches back to the separate guest scope.

The checked-in `firestore.rules` restrict reads/writes to the matching authenticated UID, the `default` workspace document, the expected top-level schema, and bounded collection sizes.

## Date model

Workspace due/start/target dates use date-only `YYYY-MM-DD` values. Product comparisons and calendar math construct local-noon dates and format back into local calendar dates rather than deriving UI dates from UTC `toISOString()` slicing. This avoids common previous/next-day errors near timezone boundaries.

Timestamps such as `createdAt`, `updatedAt`, and `completedAt` remain standard ISO instants.

## UI composition

`src/App.tsx` owns the product workflow and view composition:

- Dashboard
- Today
- Plans
- Tasks / Kanban
- Roadmap
- Calendar
- Resources + notes
- Insights
- Settings
- global search
- plan/task/milestone/resource/note forms

Visual behavior is layered through the CSS files. `recruiter-polish.css` covers final responsive/interaction hardening and `workflow-completion.css` styles the completed editing/settings/notes workflows. Theme files continue to own palette/surface tokens.

## Production host

Vite compiles the browser application to `dist/`. TypeScript compiles the Express server to `dist-server/`. The production server:

- disables framework identification;
- applies CSP, frame denial, HSTS, permissions policy, MIME sniffing protection, referrer policy, and cross-origin policy headers;
- exposes only non-secret health/config data;
- returns JSON 404s for unknown API paths;
- applies immutable caching only to hashed Vite assets;
- prevents stale `index.html` caching;
- shuts down gracefully on Render termination signals.

## Build and verification

GitHub Actions and Render use the same build contract:

```text
npm install
npm run check
npm run smoke:server   # CI/manual production-host smoke
```

`npm run check` typechecks client/server TypeScript, builds both targets, and verifies required output artifacts. The server smoke test starts the compiled server, checks health, validates the API 404 contract, and terminates cleanly.

## Tradeoffs

Planora intentionally stores a single workspace document per authenticated user instead of implementing a multi-tenant collaboration backend. Collaborator metadata exists in the domain/UI, but there is no claim that the current portfolio deployment provides live multi-user invitations or realtime shared editing.

That boundary keeps the live demo deployable and reliable while still demonstrating account isolation, persistence design, domain integrity, workflow state, responsive product engineering, and a clear path to a multi-workspace/team API later.
