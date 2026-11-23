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

Authenticated runtime flow (`src/App.tsx:33-34`, `src/firebase.ts:25-34`):

1. Firebase emits the current user; Planora switches to the user-scoped local workspace (`planora-workspace-v2:user:<uid>`; guests use `...:guest`).
2. It loads `/users/{uid}/workspaces/default`. If a document exists it **replaces** the local copy (cloud wins on load); otherwise the local copy is kept.
3. A `cloudLoaded` ref flips to true only after that load succeeds. Until then no cloud write is attempted. If the load fails, the user keeps the local workspace, status becomes `error`, and `cloudLoaded` stays false, so a failed or offline load can never overwrite the stored cloud workspace with local or demo data. (This was a real bug, fixed in commit `3b634a0`.)
4. Every change is saved locally immediately; once `cloudLoaded` is true it is debounced 600 ms and written with a plain `setDoc` of the whole document `{workspace, updatedAt}`. Earlier code used a merge, which kept stale settings keys; whole-document write makes the cloud copy exactly the client state.
5. Cloud write failures keep the local copy and set the header sync state to error.
6. Sign-out switches back to the separate guest scope.

Conflict model: last write wins. Two devices editing the same account will overwrite each other's whole document; there is no merge, versioning or transaction. Planora is a single-user planner, so this is accepted.

`firestore.rules` allow read/create/update/delete only when `request.auth.uid` equals the `{userId}` path segment and the id is `default`. Create/update additionally require the exact envelope (`workspace`, `updatedAt` only), exactly the seven workspace keys, list/map types, and bounded sizes (plans 250, milestones 750, tasks 2000, resources 750, notes 750, activity 100). Rules are not covered by automated tests in this repo.

## Date model

Workspace due/start/target dates use date-only `YYYY-MM-DD` values. Product comparisons and calendar math construct local-noon dates and format back into local calendar dates rather than deriving UI dates from UTC `toISOString()` slicing. This avoids common previous/next-day errors near timezone boundaries.

Timestamps such as `createdAt`, `updatedAt`, and `completedAt` remain standard ISO instants.

## UI composition

`src/App.tsx` (one file, ~78 long lines; state is plain `useState`, no store library) owns the product workflow and view composition:

- Dashboard
- Today (overdue / due today / coming next, with total open effort)
- Plans
- Tasks / Kanban (five columns; HTML5 drag-and-drop via `dataTransfer` plus an explicit Move control for touch)
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

## Key business logic

- Plan health is derived, not stored (`health()` in `App.tsx`): Draft/Paused/Completed/Archived are kept as set; past target date with progress under 100% is `Behind`; two or more overdue open tasks is `At Risk`; otherwise `On Track` (or `Planned`).
- Progress is completed tasks / total tasks per plan and per milestone.
- "Smart starter" (`generate()`) is a deterministic template: four fixed milestones (Define, Foundation, Core work, Finish) with three tasks each, dates spread across the plan window with `spread()`, each milestone depending on the previous one. **There is no AI or LLM call anywhere in Planora**; the name is marketing for a template.
- Demo data is generated relative to the day it is opened (`src/demo.ts`) so there are always overdue, due-today and upcoming items.

## Security decisions

CSP (`default-src 'self'`, `script-src 'self' https://apis.google.com`, frame sources limited to Google sign-in hosts, `object-src 'none'`, `frame-ancestors 'none'`), HSTS, `X-Frame-Options`, `nosniff`, referrer/permissions/COOP/CORP headers (`server/index.ts:9-18`); `apis.google.com` was added in `3b634a0` because the Firebase Google popup needs it. Resource URLs are restricted to http/https at the storage boundary. `express.json` is limited to 1 MB although no write API exists.

## Testing strategy

`npm test` runs vitest over `src/`: 11 tests, 9 in `storage.test.ts` (demo fallback, malformed JSON, per-scope round-trip and isolation, reset, export, rejecting non-objects and missing arrays, normalising the demo) and 2 in `theme.test.ts`. Not covered by automated tests: `App.tsx` behaviour (health, drag-and-drop, cloud-load guard), `firebase.ts`, Firestore rules, referential-repair edge cases beyond the above. `npm run check` (typecheck, build, artifact verification) and `npm run smoke:server` cover the build and the production host; `docs/QA.md` is a manual checklist.

## CI

`.github/workflows/ci.yml` (Node 22.16.0, `npm ci`): `check`, `test`, `smoke:server` on push to `main` and on pull requests.

## Live deployment

https://planora-zlxv.onrender.com tracks `main` on Render. `/api/config` returns `{"firebase":false}` there: no Firebase environment variables are set, so the live site is the browser-storage demo. Google sign-in, Firestore sync and the cloud-load guard have not been exercised live.

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

## Known limitations

- Collaborators are metadata only; there is no sharing, invitation or realtime editing.
- Cloud sync is whole-document last-write-wins; cloud replaces local on sign-in.
- The whole workspace is one Firestore document (1 MiB limit; 2000 tasks plus notes could approach it).
- Firestore rules are untested; `App.tsx` logic is untested; no E2E tests.
- HTML5 drag-and-drop does not work on touch screens (the Move control is the touch path).
- No AI features, notifications, reminders or file upload (the `File` resource kind is a label for a link).

## Future improvements (not implemented)

Rules emulator tests; per-entity subcollections or revision field to detect cross-device conflicts; component and E2E tests; splitting `App.tsx`; real collaboration; any AI-assisted planning.
