# Planora

**Plan clearly. Ship calmly.** Planora is a production-minded planning workspace built with React, TypeScript, Firebase, and Express. The live demo is intentionally useful without an account, while authenticated users can opt into per-user cloud sync when Firebase is configured.

**Live demo:** https://planora-zlxv.onrender.com

## Product surface

Planora models a complete planning loop instead of a collection of static dashboard screens:

**goal → plan → milestones → tasks → schedule → progress → insights**

The application includes:

- A responsive command-center dashboard with derived progress, due-today, active-plan, open-effort, risk, and recent-activity signals
- Plan creation with **Smart starter** generation that turns a goal and timeline into editable milestones and starter tasks
- Manual plans that can be built up with first-class milestone creation
- Plan editing, status transitions, archive/completion states, and confirmed cascade deletion
- Plan health derived from deadlines and task completion rather than hard-coded labels
- Milestone tracking with roadmap sequencing and completion state
- A five-stage task workflow: **Backlog, To Do, In Progress, Blocked, Complete**
- Task creation and editing with plan, milestone, status, priority, due date, effort estimate, tags, and notes
- Confirmed task deletion with dependency/reference cleanup
- Desktop drag-and-drop task movement plus explicit move controls that remain usable on touch devices
- Today view grouped into overdue, due-today, and upcoming work with open-effort context
- Current-month calendar populated from task due dates with configurable Monday/Sunday week starts
- Resources attached to plans or milestones, plus first-class plan notes
- Workspace search across plans, tasks, milestones, resources, and notes with `Ctrl/Cmd + K` focus
- Workspace insights for completion, effort, milestone progress, plan health, and per-plan progress
- Workspace settings for week start, default estimates, compact desktop density, and attention indicators
- Workspace export and confirmed one-click demo reset
- Local-first persistence for guests and signed-out users
- Google authentication plus per-user Firestore workspace sync when Firebase environment variables are present
- Four persisted appearance themes with full component-level theming
- Branded runtime recovery instead of blank-screen failures

## Recruiter / portfolio quality pass

The public demo is designed to survive normal exploratory use rather than requiring a scripted click path.

- Responsive layouts cover wide desktop, laptop/tablet, phone, narrow phone, coarse-pointer, reduced-motion, zoom, and safe-area cases
- Mobile Kanban becomes a stacked workflow rather than forcing a desktop board into a tiny horizontal viewport
- Touch targets are enlarged for task state, edit/delete actions, milestone, navigation, calendar, resources, and primary actions
- Modals become bottom-sheet style forms on phones with native-size inputs that avoid mobile browser zoom
- The phone calendar becomes a compact seven-column calendar instead of a forced desktop-width scroller
- User-entered long labels, task names, resources, notes, milestones, and plan summaries are constrained so content does not tear apart the layout
- Destructive plan/task/reset operations require confirmation and plan deletion cleans related domain references
- Persisted JSON is normalized entity-by-entity, malformed references are repaired or dropped, invalid URLs/dates are contained, and workspace collection sizes are bounded before use
- The error boundary can clear current versioned workspace keys, not only legacy data
- Local calendar/date calculations use local calendar dates rather than UTC string slicing in the product UI
- Express removes framework disclosure and adds CSP, frame protection, HSTS, permissions restrictions, MIME sniffing protection, referrer policy, and production cache rules
- Firestore rules restrict workspace documents to the authenticated user, expected workspace path, expected top-level schema, and bounded collection sizes
- No application secrets are committed to the repository

## Stack

**Frontend:** React 19, TypeScript, Vite, Lucide, custom responsive/themed CSS  
**Auth / cloud persistence:** Firebase Authentication + Firestore  
**Local persistence:** versioned browser workspace with legacy migration, entity normalization, referential repair, and scoped storage  
**Hosting:** Express 5 on Render  
**Quality:** strict TypeScript, GitHub Actions, deterministic dependency versions, production build verification, and server smoke testing

## Run locally

Requires Node `22.16+`.

```bash
npm install
npm run dev
```

The Vite client runs at `http://localhost:5173`. Planora remains fully usable without credentials and stores guest workspace changes locally.

Full preflight:

```bash
npm run check
npm run smoke:server
```

`npm run check` typechecks both TypeScript targets, creates the production client/server builds, and verifies required build artifacts. `npm run smoke:server` boots the compiled Express host and checks the production health/API contract.

## Firebase configuration

Copy `.env.example` to `.env` and configure:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Enable Google as a sign-in provider in Firebase Authentication and deploy the repository's `firestore.rules` before using Firestore in production.

When Firebase is not configured, authentication controls degrade into a clearly labeled local demo instead of causing startup failure.

## Persistence model

Planora uses a local-first strategy:

1. Guest state is read from a versioned, scoped `localStorage` workspace.
2. Persisted content is normalized before it reaches the UI; malformed entities and dangling references are repaired or discarded safely.
3. Legacy workspace data is migrated when possible.
4. Signed-in users load their `/users/{uid}/workspaces/default` Firestore document.
5. Workspace changes are saved locally immediately and cloud-synced after a short debounce.
6. Cloud failures leave the local workspace usable and visibly report the fallback state.

This keeps the public portfolio demo frictionless while demonstrating a realistic authenticated persistence boundary.

## Production host

The Express server exposes:

- `GET /api/health` — service health and runtime mode
- `GET /api/config` — non-secret Firebase readiness

Static assets receive long-lived immutable caching, the SPA document remains uncached, API responses are `no-store`, and unknown `/api/*` paths return JSON 404s instead of falling through to the SPA.

## Engineering docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — domain model, state ownership, auth/persistence boundaries, and production shape
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — local, Render, and Firebase deployment runbook
- [`docs/QA.md`](docs/QA.md) — functional, responsive, accessibility, persistence, and API acceptance checklist
- [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md) — quick map of the files that own UI, state, auth, hosting, and deployment

## Deployment

The repository is configured for Render with Node `22.16.0`, a full `npm run check` build gate, `npm start`, and `/api/health` health checks. GitHub Actions runs the same build contract plus the production server smoke test on pushes and pull requests.

## What this project demonstrates

Planora is meant to show more than visual polish. It demonstrates derived state, workflow transitions, typed domain modeling, editable CRUD flows, safe destructive operations, local/cloud persistence, auth-aware state boundaries, graceful failure handling, browser-storage migration and repair, responsive product design, accessibility considerations, defensive production hosting, Firestore authorization rules, CI, and deployable full-stack structure.
