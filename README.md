# Planora

**Plan clearly. Ship calmly.** Planora is a production-minded project-planning SaaS concept built with React and TypeScript. It is designed to demonstrate real application state modeling, responsive product UI, workflow logic, optional authentication, CI, and deployable Node hosting—not just static dashboard screens.

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
- Persistent browser demo data with one-click reset
- Google sign-in support when Firebase environment variables are configured
- Express production host with health/config endpoints and SPA fallback
- Render Blueprint and GitHub Actions typecheck/build validation

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

Useful checks:

```bash
npm run typecheck
npm run build
npm start
```

`npm start` serves the compiled SPA through Express after a production build.

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

## Deployment

`render.yaml` defines a Node web service with a pinned Node runtime, explicit dev-tool installation for builds, health checks, and Firebase environment placeholders.

On Render, the intended flow is:

```text
GitHub repo → npm install → typecheck/build → Express host → health check
```

The included CI workflow separately verifies TypeScript and confirms both the frontend and server build artifacts are produced.

## Portfolio intent

Planora demonstrates the parts of frontend/full-stack work that are easy to miss in tutorial projects: derived state, data integrity, keyboard interaction, responsive layouts, graceful credential handling, deploy configuration, production server behavior, and a clear path from local-first demo persistence to a hosted data layer.
