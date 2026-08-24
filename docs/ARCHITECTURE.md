# Planora Architecture

## Goals

Planora is intentionally structured as a production-style single-page application that remains fully demonstrable without external credentials. The current browser persistence layer is an adapter, not a requirement of the UI, so a hosted API/database can replace it without rebuilding the product surface.

## Runtime shape

```text
Browser
  React 19 + TypeScript
      |
      +-- Workspace domain model
      +-- storage.ts -> localStorage demo persistence
      +-- firebase.ts -> optional Google authentication
      |
Express production host
      +-- /api/health
      +-- /api/config
      +-- static Vite build / SPA fallback
```

The same Node process serves the compiled client and lightweight operational endpoints on Render. This keeps the portfolio deployment simple while leaving room to split the API into its own service later.

## Domain model

`Workspace` is the top-level client domain object and contains typed `Project` and `Task` collections. Tasks reference projects by ID rather than embedding project data, which avoids duplicated state and makes filtering, analytics, and future API normalization straightforward.

Project progress shown in the UI is derived from task completion rather than trusted as a manually maintained display value. That keeps workflow transitions and dashboard metrics consistent.

## Persistence

`src/storage.ts` is the persistence boundary. It:

- validates persisted JSON before accepting it;
- falls back to a cloned demo workspace when storage is absent or malformed;
- tolerates quota/privacy errors without breaking rendering;
- exposes a small load/save/reset API to presentation code.

A production repository can implement the same conceptual operations against PostgreSQL/API endpoints while keeping most UI components unchanged.

## Authentication

`src/firebase.ts` initializes Firebase only when all required `VITE_FIREBASE_*` values exist. Demo mode therefore remains credential-free. Google popup authentication becomes available once a Firebase web application and provider are configured.

Authentication is intentionally separate from workspace persistence today. A production migration should exchange Firebase ID tokens with the API, map them to application users/workspaces, and authorize every server-side resource request.

## Deployment

Vite compiles the browser application to `dist/`. TypeScript compiles the Express server to `dist-server/`. The production server:

- disables framework identification;
- applies baseline security headers;
- exposes health/config endpoints;
- returns JSON 404s for unknown API paths;
- applies immutable caching only to hashed Vite assets;
- prevents stale `index.html` caching;
- shuts down gracefully on Render termination signals.

## Production evolution

The natural next architecture is:

```text
Firebase Auth
      |
React client
      |
REST/JSON API
      |
PostgreSQL
```

Recommended server entities are users, workspaces, memberships, projects, tasks, tags, and activity events. Optimistic client updates can remain for workflow movement while the server becomes the source of truth.

## Tradeoffs

Local-first demo persistence is deliberately used instead of a fake backend so reviewers can interact with the entire product without registration or secrets. The tradeoff is that data is browser-local and not collaborative until a database/API is connected. That limitation is isolated at explicit integration boundaries rather than spread throughout the component tree.
