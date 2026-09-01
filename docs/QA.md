# Planora QA Checklist

Run this after a local production build and again against the deployed Render URL.

## Core smoke

- [ ] App loads without a blank screen or uncaught render failure.
- [ ] Branded title, favicon, install metadata, and social preview metadata appear.
- [ ] Guest workspace changes survive refresh.
- [ ] Invalid or blocked browser storage falls back to a usable demo.
- [ ] Error boundary presents branded recovery controls if rendering fails.
- [ ] Error-boundary reset removes current `planora-workspace-v2*` data without clearing unrelated browser storage.
- [ ] Sidebar Reset restores the sample workspace only after confirmation.
- [ ] Export downloads valid JSON for the current workspace.

## Navigation and search

- [ ] Dashboard, Today, Plans, Tasks, Roadmap, Calendar, Resources, Insights, and Settings all render.
- [ ] Active-plan links in the sidebar open the correct plan.
- [ ] Mobile sidebar opens without horizontal page overflow.
- [ ] Mobile drawer stays above the app and visually separates underlying content.
- [ ] `Ctrl/Cmd + K` focuses workspace search.
- [ ] Search finds matching plans, tasks, milestones, resources, and notes.
- [ ] Selecting a plan, task, milestone, resource, or note result navigates to the relevant plan.
- [ ] Empty search results render intentionally.
- [ ] Escape closes active modal and mobile navigation layers.

## Plans and milestones

- [ ] New plan requires a name and main goal.
- [ ] Target date cannot precede the selected start date.
- [ ] Smart starter creates ordered milestones and starter tasks.
- [ ] Manual plan creates a plan without generated work.
- [ ] Existing plans can be edited without changing their ID or created timestamp.
- [ ] Plan status can be changed from the plan view.
- [ ] Plan completion is derived from its tasks.
- [ ] Health moves to At Risk / Behind when deadlines and open work warrant it.
- [ ] New milestones can be added to manual or generated plans.
- [ ] Milestone completion toggles correctly.
- [ ] Milestone progress reflects linked task completion.
- [ ] Roadmap orders milestones and keeps dependency flow readable.
- [ ] Plan deletion requires confirmation and removes related milestones, tasks, resources, notes, and stale references.

## Tasks

- [ ] New task requires a title and plan.
- [ ] Optional milestone, status, priority, due date, estimate, tags, and notes persist.
- [ ] Existing tasks can be edited without changing unrelated fields.
- [ ] Workflow contains Backlog, To Do, In Progress, Blocked, and Complete.
- [ ] Clicking a task status control advances the task state.
- [ ] Desktop drag-and-drop moves a task to the dropped workflow column.
- [ ] Explicit Move controls remain usable without drag-and-drop.
- [ ] Completing a task updates dashboard and plan completion metrics.
- [ ] Blocked tasks update dashboard blocked-work counts.
- [ ] Deleting a task requires confirmation and removes stale dependency references.
- [ ] Long titles and notes wrap or truncate without breaking cards.

## Today

- [ ] Open work is grouped into Overdue, Today, and Coming next.
- [ ] Completed work is excluded from focus groups.
- [ ] Open-effort summary reflects current incomplete work.
- [ ] Empty groups remain visually intentional.
- [ ] State changes immediately update the relevant group.

## Calendar

- [ ] Calendar displays the current month/year.
- [ ] Previous, Today, and Next controls work.
- [ ] Tasks appear on matching due dates.
- [ ] Monday/Sunday week-start setting changes weekday ordering correctly.
- [ ] Today receives a distinct visual state.
- [ ] Phone layout remains readable without desktop-width horizontal scrolling.
- [ ] Phone layout uses compact event indicators without overflowing day cells.

## Resources and notes

- [ ] Resource creation requires a title and plan.
- [ ] Resource can optionally target a milestone.
- [ ] Type, URL, and notes persist.
- [ ] Invalid persisted resource URL protocols are discarded during normalization.
- [ ] External links open in a new tab with `noreferrer` protection.
- [ ] Resources can be deleted without affecting unrelated workspace data.
- [ ] Plan notes can be created and deleted.
- [ ] Long resource and note content does not overflow the grid.

## Insights

- [ ] Workspace completion percentage matches completed tasks.
- [ ] Open effort matches non-complete task estimates.
- [ ] Completed milestone count is accurate.
- [ ] Workspace health reacts to At Risk / Behind plans.
- [ ] Active-plan progress list matches task-derived completion values.
- [ ] Insight cards collapse to a readable single column on phones.

## Settings

- [ ] Week-start selection persists and updates the calendar.
- [ ] Default task estimate persists and pre-populates new tasks.
- [ ] Compact-mode preference persists and only tightens desktop density.
- [ ] Attention notifications setting controls the header attention indicator.
- [ ] Settings remain usable and visually consistent on phones.

## Authentication and persistence

Without Firebase:

- [ ] Account control clearly reports demo/local behavior.
- [ ] Clicking the account control does not crash.
- [ ] Guest state remains scoped to the guest workspace.

With Firebase:

- [ ] Google sign-in popup opens under the production CSP.
- [ ] Successful sign-in loads the authenticated user's workspace or local fallback.
- [ ] Cloud save transitions through syncing to synced state.
- [ ] Cloud failure leaves local persistence usable and reports fallback state.
- [ ] Sign-out returns to the guest workspace without leaking the authenticated user's data into guest state.

Persistence integrity:

- [ ] Malformed JSON falls back without crashing.
- [ ] Duplicate plan/milestone/task IDs are deduplicated.
- [ ] Orphaned milestones, tasks, resources, and notes are safely dropped or detached.
- [ ] Invalid task/milestone dependency references are repaired.
- [ ] Invalid enums, dates, timestamps, and settings receive safe defaults.
- [ ] Oversized persisted collections are bounded before rendering.

## Production host and security

- [ ] `GET /api/health` -> `200` JSON with `status: ok` and `service: planora`.
- [ ] `GET /api/config` -> `200` JSON with non-secret Firebase readiness only.
- [ ] Unknown `/api/*` -> JSON `404`, not `index.html`.
- [ ] Hard refresh of the SPA still serves the app.
- [ ] Hashed `/assets/*` responses use immutable long caching.
- [ ] HTML uses no-store / revalidation behavior.
- [ ] `X-Powered-By` is absent.
- [ ] CSP, HSTS, frame protection, MIME sniffing protection, permissions policy, referrer policy, and cross-origin headers are present.
- [ ] Firestore denies unauthenticated workspace reads/writes.
- [ ] Firestore denies one user from reading or writing another user's workspace.
- [ ] Firestore only accepts the expected `default` workspace document shape.

## Accessibility and interaction

- [ ] Keyboard focus is clearly visible.
- [ ] Buttons, links, fields, and selects are reachable by keyboard.
- [ ] Primary icon-only controls expose meaningful accessible labels.
- [ ] Reduced-motion preference suppresses nonessential movement.
- [ ] Pointer/touch targets are comfortably usable.
- [ ] User-entered long text does not create horizontal viewport overflow.
- [ ] Forms remain usable at 200% browser zoom.
- [ ] Destructive actions are visually distinct from primary actions.

## Mobile-specific pass

- [ ] Header controls remain reachable at 320–390px widths.
- [ ] Search remains usable without forcing browser input zoom.
- [ ] Page action buttons become full-width when space is tight.
- [ ] Dashboard metrics stack cleanly on narrow phones.
- [ ] Plan metadata moves from two columns to one on narrow phones.
- [ ] Task row edit controls remain touch-friendly without crowding content.
- [ ] Kanban columns reflow vertically instead of requiring horizontal drag scrolling.
- [ ] Drag affordance is visually removed from phone task cards while Move controls remain present.
- [ ] Calendar becomes compact without losing date navigation.
- [ ] Resource actions remain reachable with touch.
- [ ] Settings cards collapse to a single readable column.
- [ ] Modals become bottom-sheet style and account for safe-area insets.
- [ ] Toasts remain above the bottom safe area.
- [ ] Sidebar scrolls independently when phone height is short.

## Viewports

Test at minimum:

- [ ] 320x568 narrow phone
- [ ] 360x800 small Android portrait
- [ ] 390x844 modern phone portrait
- [ ] 844x390 phone landscape
- [ ] 768x1024 tablet portrait
- [ ] 1024x768 tablet landscape
- [ ] 1366x768 laptop
- [ ] 1920x1080 desktop
