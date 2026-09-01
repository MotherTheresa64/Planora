# Planora

**Plan clearly. Ship calmly.** Planora is a production-minded planning workspace built with React, TypeScript, Firebase, and Express. The live demo is intentionally useful without an account, while authenticated users can opt into per-user cloud sync when Firebase is configured.

**Live demo:** https://planora-zlxv.onrender.com

## Product surface

Planora models a complete planning loop instead of a collection of static dashboard screens:

**goal → plan → milestones → tasks → schedule → progress → insights**

The current application includes:

- A responsive command-center dashboard with derived progress, due-today, active-plan, open-effort, and risk signals
- Plan creation with **Smart starter** generation that turns a goal and timeline into editable milestones and starter tasks
- Plan health derived from deadlines and task completion rather than hard-coded labels
- Milestone tracking with roadmap sequencing and completion state
- A five-stage task workflow: **Backlog, To Do, In Progress, Blocked, Complete**
- Desktop drag-and-drop task movement plus explicit move controls that remain usable on touch devices
- Task creation with plan, milestone, status, priority, due date, effort estimate, tags, and notes
- Today view grouped into overdue, today, and upcoming work
- Current-month calendar populated from task due dates
- Resources attached to plans or milestones, including external references
- Workspace search across plans, tasks, milestones, resources, and notes with `Ctrl/Cmd + K` focus
- Workspace insights for completion, effort, milestone progress, and plan health
- Export and one-click demo reset
- Local-first persistence for guests and signed-out users
- Google authentication plus per-user Firestore workspace sync when Firebase environment variables are present
- Four persisted appearance themes with full component-level theming
- Branded runtime recovery instead of blank-screen failures

## Recruiter / portfolio quality pass

The public demo is designed to survive normal exploratory use rather than requiring a scripted click path.

- Responsive layouts cover wide desktop, laptop/tablet, phone, narrow phone, coarse-pointer, reduced-motion, and safe-area cases
- Mobile Kanban becomes a stacked workflow rather than forcing a desktop board into a tiny horizontal viewport
- Touch targets are enlarged for task state, milestone, delete, navigation, calendar, and primary actions
- Modals become bottom-sheet style forms on phones with native-size inputs that avoid mobile browser zoom
- Overflow, long labels, long task names, resource cards, milestones, and plan summaries are constrained so user-entered content does not tear apart the layout
- The error boundary can clear the **current versioned workspace keys**, not only legacy data
- Express removes framework disclosure and adds CSP, frame protection, HSTS, permissions restrictions, MIME sniffing protection, referrer policy, and production cache rules
- Firestore rules restrict workspace documents to the authenticated user, the expected workspace path, the expected top-level schema, and bounded collection sizes
- No application secrets are committed to the repository

## Stack

**Frontend:** React 19, TypeScript, Vite, Lucide, custom responsive/themed CSS  
**Auth / cloud persistence:** Firebase Authentication + Firestore  
**Local persistence:** versioned browser workspace with legacy migration and scoped storage  
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
2. Legacy workspace data is migrated when possible.
3. Signed-in users load their `/users/{uid}/workspaces/default` Firestore document.
4. Workspace changes are saved locally immediately and cloud-synced after a short debounce.
5. Cloud failures leave the local workspace usable and visibly report the fallback state.

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

Planora is meant to show more than visual polish. It demonstrates derived state, workflow transitions, typed domain modeling, local/cloud persistence, auth-aware state boundaries, graceful failure handling, browser-storage migration, responsive product design, accessibility considerations, defensive production hosting, security rules, CI, and deployable full-stack structure.
