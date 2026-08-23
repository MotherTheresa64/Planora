# Planora

**Plan clearly. Ship calmly.** Planora is a polished project-planning SaaS concept built to demonstrate production-minded React/TypeScript engineering, thoughtful interaction design, persistent client state, optional Firebase authentication, and Render-ready deployment.

## Product highlights

- Responsive executive dashboard with workspace metrics and weekly momentum
- Multi-project Kanban board with search, filtering, priorities, estimates, tags, and workflow transitions
- Project creation and task capture flows with durable local persistence
- Calendar and analytics views built from shared domain data
- Credential-free demo mode so reviewers can use the product immediately
- Firebase Google sign-in adapter activates automatically when environment variables are provided
- Express production server, health/config endpoints, SPA fallback, and `render.yaml`

## Stack

React 19 · TypeScript · Vite · Express · Firebase Auth (optional) · Lucide · CSS design system

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The app is fully usable without credentials and stores demo changes in `localStorage`.

## Production

```bash
npm ci
npm run build
npm start
```

The Express server serves the compiled SPA and exposes `GET /api/health`. Render can deploy directly from the included Blueprint.

### Firebase

Copy `.env.example` to `.env` and fill the four `VITE_FIREBASE_*` values from a Firebase web app. Enable Google authentication in Firebase Authentication. Without them, the user control intentionally remains in demo mode.

## Architecture notes

The UI is driven by a typed `Workspace` domain model rather than page-local mock fragments. Persistence is isolated in `storage.ts`, authentication in `firebase.ts`, and the production web process in `server/index.ts`, making it straightforward to replace local persistence with a remote repository later without rewriting presentation components.
