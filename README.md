# Planora

**Plan clearly. Ship calmly.** Planora is a production-minded project-planning SaaS application built with React and TypeScript. It demonstrates real application state modeling, responsive product UI, workflow logic, optional authentication, CI, and deployable Node hosting—not just static dashboard screens.

**Live demo:** https://planora-zlxv.onrender.com

## What works today

- Responsive workspace dashboard with live completion, workload, priority, and focus metrics
- Four complete user-selectable themes — **Midnight, Aurora, Ember, and Daybreak** — with device-local persistence and browser-chrome color updates
- Theme-aware navigation, Kanban boards, calendar, analytics, forms, overlays, focus states, and mobile layouts rather than accent-only recoloring
- Multi-project Kanban workflow with Backlog, In progress, Review, and Done states
- Mobile-native Kanban layout that reformats into readable stacked workflow columns on small screens
- Project progress derived from actual task completion instead of hard-coded percentages
- Project filtering plus a true assignee-specific **My tasks** view
- Global task search across titles, tags, assignees, project names, and notes
- `Ctrl/Cmd + K` keyboard shortcut to focus search
- Task creation with project, priority, due date, estimate, tags, and notes
- Project creation with due date and configurable accent color
- Task deletion and project deletion, including cleanup of tasks owned by a deleted project
- Rolling current-month calendar populated from task due dates, with current-day highlighting and phone-friendly task indicators
- Expanded analytics with workspace health, completion, workflow distribution, project workload, priority load, open estimated hours, and upcoming deadlines
- Theme-safe dynamic completion visualization that remains numerically accurate after appearance changes
- Contextual empty states and page-specific guidance instead of placeholder screens
- Validated browser persistence with graceful recovery from malformed or blocked storage
- One-click sample-workspace reset
- Branded runtime error recovery instead of blank-screen failure
- Google sign-in support when Firebase environment variables are configured
- Installable web-app metadata, canonical production metadata, reduced-motion support, visible focus treatment, mobile navigation backdrops, and polished feedback placement
- Express production host with health/config endpoints, security headers, caching policy, API 404 handling, and SPA fallback
- Render auto-deploy from `main` with `/api/health` health checks
- GitHub Actions and Render builds gated on the same full verification command

## Stack

**Frontend:** React 19, TypeScript, Vite, Lucide, custom responsive/themed CSS  
**Auth:** Firebase Authentication (optional final integration)  
**Persistence:** typed local-first browser workspace + persisted appearance preference  
**Hosting:** Express 5 + Render  
**Quality:** strict TypeScript, GitHub Actions, deterministic pinned dependency versions

## Run locally

Requires Node `22.16+`.

```bash
npm install
npm run dev
```

The Vite client runs at `http://localhost:5173`. Planora is fully usable without credentials and stores workspace changes and theme preference in `localStorage`.

Full preflight:

```bash
npm run check
npm run smoke:server
```

`npm run check` typechecks both targets, builds the client/server, and verifies the required production artifacts. `npm run smoke:server` boots the compiled Express app and verifies the health/API contract.

## Firebase authentication

Copy `.env.example` to `.env` and configure:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Enable Google as a sign-in provider in Firebase Authentication. If these values are absent, Planora deliberately remains usable in credential-free local-first mode rather than failing at startup.

## Persistence boundary

The complete product experience currently uses a typed, versioned browser workspace for persistence. The repository isolates persistence (`storage.ts`), authentication (`firebase.ts`), domain types (`types.ts`), appearance (`theme.ts`), and production hosting (`server/index.ts`) so hosted per-user persistence can replace local storage without requiring a UI rewrite.

For cross-device user accounts, the remaining production integration is Firebase Authentication plus a hosted datastore such as Firestore keyed to the authenticated user. The current live demo intentionally keeps each browser session self-contained.

The server exposes:

- `GET /api/health` — service health and runtime mode
- `GET /api/config` — non-secret integration readiness flags

No secrets are committed to the repository.

## Engineering docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — domain model, persistence boundary, auth flow, deployment shape, and production evolution
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — local/Render/Firebase deployment runbook and first-deploy checks
- [`docs/QA.md`](docs/QA.md) — functional, responsive, accessibility, persistence, and API acceptance checklist
- [`docs/PROJECT_MAP.md`](docs/PROJECT_MAP.md) — quick map of the files that own UI, state, auth, hosting, and deployment

## Deployment

The production Render service tracks `main` with Auto-Deploy enabled. Each commit triggers:

```text
GitHub main → npm install → npm run check → Express host → /api/health → live
```

CI uses the same `npm run check` contract, keeping local, CI, and Render verification aligned.

## Portfolio intent

Planora demonstrates the parts of frontend/full-stack work that are easy to miss in tutorial projects: derived state, data integrity, workflow transitions, destructive actions, keyboard interaction, analytics, persisted personalization, responsive layouts, graceful credential handling, deployment configuration, production server behavior, and a clean path from local-first persistence to authenticated hosted data.
