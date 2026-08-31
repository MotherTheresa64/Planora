# Planora

**Plan clearly. Ship calmly.** Planora is a production-minded project-planning SaaS concept built with React and TypeScript. It is designed to demonstrate real application state modeling, responsive product UI, workflow logic, optional authentication, CI, and deployable Node hosting—not just static dashboard screens.

**Live demo:** https://planora-zlxv.onrender.com

## What works today

- Responsive workspace dashboard with live completion, workload, priority, and focus metrics
- Multi-project Kanban workflow with Backlog, In progress, Review, and Done states
- Project progress derived from actual task completion instead of hard-coded percentages
- Project filtering plus a true assignee-specific **My tasks** view
- Global task search across titles, tags, assignees, project names, and notes
- `Ctrl/Cmd + K` keyboard shortcut to focus search
- Task creation with project, priority, due date, estimate, tags, and notes
- Project creation with due date and configurable accent color
- Rolling current-month calendar populated from task due dates
- Dynamic insights generated from the active workspace state
- Validated browser persistence with graceful recovery from malformed/blocked storage
- Branded runtime error recovery instead of blank-screen failure
- Google sign-in support when Firebase environment variables are configured
- Installable web-app metadata and responsive accessibility safeguards
- Express production host with health/config endpoints, security headers, caching policy, and SPA fallback
- Render Blueprint and GitHub Actions gated on the same full verification command

## Stack

**Frontend:** React 19, TypeScript, Vite, Lucide, custom CSS  
**Auth:** Firebase Authentication (optional)  
**Hosting:** Express 5, Render Blueprint  
**Quality:** strict TypeScript, GitHub Actions, deterministic pinned dependency versions

## Run locally

Requires Node `22.16+`.

```bash
npm install
npm run dev
```

The Vite client runs at `http://localhost:5173`. Planora is fully usable without credentials and stores demo workspace changes in `localStorage`.

Full preflight:

```bash
npm run check
```

That command typechecks both targets, builds the client/server, and verifies the required production artifacts. Afterward, `npm start` serves the compiled SPA through Express.

## Firebase authentication

Copy `.env.example` to `.env` and configure:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

Enable Google as a sign-in provider in Firebase Authentication. If these values are absent, Planora deliberately stays in credential-free demo mode rather than failing at startup.

## Production boundary

The complete product experience currently uses a typed, versioned browser workspace for persistence. The repository already isolates persistence (`storage.ts`), authentication (`firebase.ts`), domain types (`types.ts`), and production hosting (`server/index.ts`) so a remote database/API layer can replace local persistence without requiring a UI rewrite.

The server exposes:

- `GET /api/health` — service health and runtime mode
- `GET /api/config` — non-secret integration readiness flags

No secrets are committed to the repository.

## Engineering docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — domain model, persistence boundary, auth flow, deployment shape, and production evolution
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — local/Render/Firebase deployment runbook and first-deploy checks
- [`docs/QA.md`](docs/QA.md) — functional, responsive, accessibility, persistence, and API acceptance checklist

## Deployment

`render.yaml` defines a Node web service with a pinned Node runtime, explicit dev-tool installation for builds, health checks, and Firebase environment placeholders.

On Render, the intended flow is:

```text
GitHub repo → npm install → npm run check → Express host → health check
```

CI uses the same `npm run check` contract, keeping local, CI, and Render verification aligned.

## Portfolio intent

Planora demonstrates the parts of frontend/full-stack work that are easy to miss in tutorial projects: derived state, data integrity, keyboard interaction, responsive layouts, graceful credential handling, deploy configuration, production server behavior, and a clear path from local-first demo persistence to a hosted data layer.
