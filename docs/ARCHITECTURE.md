# Planora Architecture

## Product boundary

Planora is a structured planning and execution workspace for individuals today. Its domain supports collaborator metadata, but the product does **not** claim shared editing, invitations, presence, comments, or real-time collaboration.

The architecture is intentionally a single React application with explicit domain and persistence boundaries. There is no artificial microservice, API, queue, or database layer that the current product does not need.

## Runtime shape

```text
Browser
  React 19 + TypeScript
      |
      +-- App.tsx
      |     application shell, view composition, transient UI state, forms
      |
      +-- domain.ts
      |     normalization, validation, relationship invariants,
      |     dependency rules, dates, progress, health, destructive operations
      |
      +-- storage.ts
      |     versioned/scoped local snapshots, migrations, import/export
      |
      +-- firebase.ts
      |     optional Google auth + UID-isolated Firestore snapshot sync
      |
      +-- theme.ts
            device-local appearance preference

Express 5 production host
  +-- health/capability endpoints
  +-- static Vite assets
  +-- SPA fallback
```

The Express process is a production host, not a pretend application backend. Product data is owned by the browser/local-first persistence layer and optional Firestore client integration.

## Domain model

`Workspace` is the persisted root:

```text
Workspace
  plans[]
  milestones[]  -> planId, dependency milestone IDs
  tasks[]       -> planId, optional milestoneId, dependency task IDs, subtasks[]
  resources[]   -> planId, optional milestoneId
  notes[]       -> planId, optional taskId
  activity[]    -> optional planId/taskId
  settings
```

### Important invariants

- A milestone must belong to an existing plan.
- A task must belong to an existing plan.
- A task's milestone, when present, must belong to the same plan.
- Task dependencies must exist inside the same plan.
- A task cannot depend on itself.
- Circular task dependency chains are rejected/removed.
- Milestone dependency references are restricted to the same plan and cycles are pruned during normalization.
- A resource must belong to an existing plan; an optional milestone must belong to that plan.
- A note must belong to an existing plan; an optional task must belong to that plan.
- Plan target dates cannot precede plan start dates.
- User-entered milestone dates must fall within the plan timeline.
- Task due dates cannot precede an optional task start date.
- Persisted estimates are finite and non-negative.
- External resource URLs are HTTP/HTTPS only.

`normalizeWorkspace()` is the trust boundary for browser storage, imports, and Firestore loads. Untrusted persisted JSON is converted into a valid `Workspace` or rejected; orphan entities and invalid references are not blindly cast into application state.

## Derived state

Planora deliberately avoids storing display percentages.

- Plan progress = completed plan tasks / all plan tasks.
- Milestone progress = completed milestone tasks / all milestone tasks; a taskless milestone can represent manual completion.
- When a milestone has tasks, `syncDerivedState()` derives its status from those tasks so a separate milestone toggle cannot silently contradict child work.
- Plan health combines plan lifecycle state, target-date completion, and overdue task pressure.
- Dashboard/Today/Insights calculations reuse the same domain helpers so the same workspace does not produce competing progress/date definitions across views.

## Dates and timezones

Calendar-only values use `YYYY-MM-DD` keys interpreted in local calendar time. `localDateKey()` uses local year/month/day fields instead of `toISOString().slice(0, 10)`, avoiding the common near-midnight UTC boundary bug.

A date key is parsed at local noon for formatting/calendar arithmetic, which avoids daylight-saving midnight edge behavior while preserving the intended calendar date.

## Dependency behavior

Task dependencies are directional IDs: if task A lists task B, B must be complete before A can move to **In Progress** or **Complete** through the primary status flow.

The application prevents:

- self-dependency;
- duplicate dependency IDs after normalization;
- cross-plan dependency references;
- missing dependency references;
- circular chains.

Deleting a task removes references to that task from surviving task dependencies. Notes attached to the deleted task remain as plan notes instead of being destroyed.

## Destructive operations

Destructive behavior lives in domain functions:

- **Delete task** — removes the task, cleans dependency references, detaches task-linked notes, and removes activity entries directly tied to the deleted task.
- **Delete milestone** — removes the milestone, cleans milestone dependency references, and keeps its tasks/resources by reassigning them to the whole plan.
- **Delete plan** — cascades the plan's milestones, tasks, resources, notes, and plan/task activity while retaining unrelated workspace data.

The UI asks for confirmation before these destructive actions.

## Local persistence

`src/storage.ts` writes a versioned snapshot envelope:

```ts
{
  schemaVersion: 3,
  workspace: Workspace,
  savedAt: ISO_TIMESTAMP
}
```

Keys are scope-specific:

- guest workspace: `planora-workspace-v3:guest`
- signed-in account: `planora-workspace-v3:user:<uid>`

This prevents a guest workspace or one signed-in user's local cache from being silently reused as another user's data.

The storage layer migrates the previous Planora schemas where possible. New installations start empty. Sample data is loaded only through an explicit user action.

## Authentication and Firestore

Firebase initializes only when the required client configuration exists. Authentication uses Google popup sign-in with browser-local Firebase auth persistence.

Authenticated cloud state is stored at:

```text
users/{uid}/workspaces/default
```

`firestore.rules` authorizes read/write only when `request.auth.uid == userId`.

Both local and Firestore snapshots contain `savedAt`. During auth initialization Planora:

1. loads the UID-scoped local snapshot;
2. attempts to load the UID's Firestore snapshot;
3. validates both through the domain normalizer;
4. picks the newest valid snapshot;
5. writes that snapshot back to the older side when appropriate.

Normal edits save locally immediately and cloud-save after a short debounce. If Firestore is unavailable, local persistence remains active and the UI exposes the cloud error state.

### Conflict tradeoff

This is last-saved-snapshot reconciliation, not a CRDT or field-level merge. Simultaneous offline edits on multiple devices can result in the newest whole snapshot winning. That is an explicit limitation of the current single-user/local-first scope.

## Import/export

Workspace export is a JSON envelope with schema metadata and export timestamp. Import does not trust TypeScript types; it passes through the same workspace normalization boundary before replacing current state.

## Error handling

- Application render failures are caught by `ErrorBoundary`.
- Error recovery can clear guest local data only; it does not erase UID-scoped account caches or Firestore data.
- Browser storage exceptions are caught so private/hardened browser modes do not blank the app.
- Firebase load/save errors surface a cloud state while preserving local use.
- Form validation errors stay in the dialog and explain the invalid relationship/date/value.
- Unknown production `/api/*` routes return JSON 404 responses instead of the SPA document.

## Security boundary

- Firestore authorization is enforced by Firestore rules, not React filtering.
- Local storage is treated as untrusted persistence, never as authorization.
- Persisted/imported/cloud state is normalized.
- Resource links are restricted to HTTP/HTTPS and use `noopener noreferrer`.
- Workspace text is rendered through React; there is no workspace-content `dangerouslySetInnerHTML` path.
- Firebase web configuration is client configuration; privileged service-account/server secrets must never be committed or placed in `VITE_*` variables.
- The Express host disables framework identification and applies baseline browser security headers.

## Responsive interaction model

Desktop can use pointer drag/drop on Kanban cards. Mobile/touch usability does not depend on drag support: every task card also exposes an explicit status control plus edit/delete actions with larger touch targets. Under phone breakpoints the board becomes a vertical workflow rather than a desktop-width horizontal strip.

The calendar removes forced desktop minimum width on small screens and uses compact day indicators; a separate month agenda preserves the actual event text.

Dialogs have bounded viewport height and internal scrolling. Long plan/task/note/resource text uses wrapping/truncation rules instead of expanding fixed layouts indefinitely.

## Testing and build gates

The repository's automated domain suite targets invariants that can corrupt a workspace: normalization, dates, dependency cycles, cascade cleanup, progress derivation, milestone synchronization, schedule metrics, URL sanitization, and local/cloud conflict selection.

`npm run check` executes client/server type checking, the domain tests, the production build, and artifact verification. GitHub Actions uses that same contract, followed by a compiled-server smoke test.

## Why this architecture

The technically interesting part of Planora is not infrastructure volume. It is that the product has one coherent domain truth shared by creation/editing, persistence, search, planning views, analytics, destructive operations, and synchronization. The architecture keeps those rules testable without forcing an enterprise backend into a product that does not currently require one.
