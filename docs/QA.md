# Planora QA Checklist

Use this against a clean local install and again against the deployed production URL. Automated checks protect domain/build invariants; this checklist covers browser interaction and responsive behavior that still needs human observation.

## Automated gate

```bash
npm install --include=dev --no-audit --no-fund
npm run check
npm run smoke:server
```

A release is not acceptable if any command fails.

`npm run check` must pass client/server TypeScript, `src/domain.test.ts`, production build, and artifact verification.

## First run / empty workspace

- [ ] A first-time guest sees an empty workspace, not silently inserted sample data.
- [ ] Dashboard explains what Planora is and offers **Create first plan**.
- [ ] **Load sample workspace** is explicit and visibly separate from real data.
- [ ] Creating the first plan makes task/resource actions available.
- [ ] Empty Today, Roadmap, Resources, Insights, and task columns remain understandable.

## Authentication and persistence

### Local guest mode

- [ ] Plan/task/note/resource changes survive a hard refresh.
- [ ] Guest data is stored only in the guest-scoped Planora key.
- [ ] Clear workspace asks for confirmation and does not remove unrelated browser storage.
- [ ] Export produces readable JSON with schema/export metadata.
- [ ] Import validates the workspace and asks before replacing non-empty data.
- [ ] Malformed import shows a readable error instead of replacing the workspace.

### Firebase configured

- [ ] Existing Firebase session is restored on refresh.
- [ ] Google sign-in succeeds from signed-out state.
- [ ] Cancelled/failed popup leaves Planora usable and shows readable feedback.
- [ ] Signing out returns to the guest scope rather than retaining the account workspace in view.
- [ ] A second Firebase UID does not load the first UID's local workspace cache.
- [ ] Firestore workspace is read from `users/{uid}/workspaces/default`.
- [ ] Firestore rules reject a user attempting another UID's workspace path.
- [ ] When local and cloud snapshots differ, the newer `savedAt` snapshot wins.
- [ ] Firestore read/write failure leaves the local scoped workspace usable and shows cloud-unavailable state.

## Plans

- [ ] Plan create requires name, goal, valid start, and target date.
- [ ] Target date cannot precede start date.
- [ ] Manual plan creates an empty plan without fake tasks.
- [ ] Structured starter produces editable milestones/tasks and does not present itself as AI.
- [ ] Plan edit persists name, goal, description, dates, priority, status, category, tags, and accent.
- [ ] Shortening a plan timeline is rejected if an existing milestone would fall outside it.
- [ ] Plan progress equals actual completed plan tasks.
- [ ] Deleting a plan requires confirmation and removes its tasks, milestones, resources, notes, and related activity only.
- [ ] Deleting one plan does not alter another plan's data.

## Milestones

- [ ] Milestone create/edit requires a name and target inside the selected plan timeline.
- [ ] Milestones appear chronologically in Roadmap.
- [ ] A milestone with tasks derives status/progress from child task state.
- [ ] Deleting a milestone requires confirmation.
- [ ] Deleting a milestone keeps child tasks/resources in the plan but clears their milestone reference.
- [ ] Milestone dependency cleanup never leaves a deleted ID referenced.

## Tasks

- [ ] Task create/edit requires a title and valid plan.
- [ ] Optional task start/due dates can be empty.
- [ ] Due date cannot precede task start date.
- [ ] Estimate accepts zero and positive finite values only.
- [ ] Tags are trimmed and de-duplicated through persistence normalization.
- [ ] Assignee label, description, notes, subtasks, and tags persist.
- [ ] Same-plan dependencies can be selected.
- [ ] Self-dependency cannot be introduced.
- [ ] Cross-plan dependencies cannot be introduced.
- [ ] Circular dependencies cannot be introduced.
- [ ] Task cannot move to In Progress/Complete while an incomplete dependency remains.
- [ ] Completing a task records completion and updates plan/milestone progress.
- [ ] Reopening a completed task clears completion state and updates derived progress.
- [ ] Task deletion requires confirmation and removes dependency references from surviving tasks.
- [ ] A note attached to a deleted task remains as a plan note.

## Kanban / touch workflow

- [ ] Pointer drag/drop moves a task to the intended column.
- [ ] Explicit status select moves the same task without drag/drop.
- [ ] Status select is usable by keyboard.
- [ ] Status select is comfortably touchable on a phone.
- [ ] Filter by plan and priority can be combined.
- [ ] Empty workflow columns remain visible/understandable.
- [ ] Board becomes stacked vertical columns on mobile; no desktop-width board is required.
- [ ] Long task names/notes do not escape cards.

## Today and date behavior

Use dates around local midnight as well as ordinary daytime values.

- [ ] Overdue excludes completed tasks.
- [ ] Due Today uses the local calendar date.
- [ ] Future work appears in Coming next in date order.
- [ ] Tasks without a due date appear in Unscheduled.
- [ ] End-of-month and year-boundary dates sort correctly.
- [ ] Leap-day date keys render without invalid-date output.
- [ ] No `YYYY-MM-DD` task is shifted to the previous/next day by UTC conversion.

## Calendar

- [ ] Current month/year is correct.
- [ ] Previous/next month controls cross year boundaries correctly.
- [ ] Today button returns to the current month.
- [ ] Current local date is highlighted.
- [ ] Task due dates render in the correct day.
- [ ] Milestone targets render distinctly.
- [ ] Monday/Sunday week-start model produces correct column offsets.
- [ ] Mobile calendar has no forced 700px horizontal canvas.
- [ ] Compact mobile event dots are supplemented by readable Month Agenda entries.

## Resources

- [ ] Resource create/edit requires title and valid plan.
- [ ] Optional milestone belongs to the same plan.
- [ ] HTTP and HTTPS URLs are accepted.
- [ ] `javascript:`, `file:`, malformed, and other unsafe schemes are rejected/removed.
- [ ] External links open in a new tab with `noopener noreferrer`.
- [ ] Resource delete requires confirmation.

## Notes

- [ ] Plan note create/edit requires title and body.
- [ ] Optional related task belongs to the same plan.
- [ ] Multiline text and long words wrap without escaping the card.
- [ ] Note deletion requires confirmation.

## Search

- [ ] Search is case-insensitive.
- [ ] Partial plan/task/milestone/resource/note matches appear.
- [ ] Task tags, notes, description, and assignee contribute to matches.
- [ ] Empty query returns to the active view.
- [ ] No-results state is clear.
- [ ] Apostrophes, quotes, ampersands, emoji, and ordinary punctuation do not break search.
- [ ] `Ctrl/Cmd + K` focuses search.

## Insights

- [ ] Completion matches completed workspace tasks.
- [ ] Open effort sums estimates from open tasks only.
- [ ] Overdue/due-today/unscheduled counts match Today.
- [ ] Plan progress matches Plans/Dashboard.
- [ ] Plan health uses the same calculation as Dashboard/Plans.
- [ ] Priority distribution excludes completed work.
- [ ] Zero-task workspace displays 0%, not NaN/Infinity.

## Themes / appearance

- [ ] Midnight, Aurora, Ember, and Daybreak are selectable by pointer and keyboard.
- [ ] Theme survives refresh.
- [ ] Browser `theme-color` updates.
- [ ] Text, borders, inputs, modals, selected states, calendar, board, and Insights remain legible in every theme.
- [ ] Theme switching does not change workspace data.
- [ ] Escape closes the theme panel.
- [ ] Reduced-motion preference suppresses nonessential transitions.

## Accessibility

- [ ] Tab focus is always visible.
- [ ] Native buttons/links/selects are used for primary actions.
- [ ] Icon-only buttons have accessible names.
- [ ] Form fields have visible associated labels.
- [ ] Dialogs expose `role=dialog` and `aria-modal=true`.
- [ ] Escape closes Planora dialogs/navigation layers.
- [ ] Form validation messages use alert semantics.
- [ ] Toast feedback uses status/live-region semantics.
- [ ] No essential operation requires hover or drag alone.

## Error recovery

- [ ] A render exception shows Planora's recovery screen instead of a blank page.
- [ ] Reload option does not mutate data.
- [ ] Clear-guest-data option warns before deletion.
- [ ] Clear-guest-data does not remove UID-scoped local caches or Firestore data.
- [ ] Blocked/quota-exceeded localStorage does not prevent basic rendering.

## Production host

- [ ] `GET /api/health` -> `200` JSON containing `status=ok`, `service=planora`, and `runtime=static-spa`.
- [ ] `GET /api/config` describes the actual local-first/optional-Firebase capability only.
- [ ] Unknown `/api/*` -> JSON `404`, not `index.html`.
- [ ] Hard refresh on SPA routes/root works.
- [ ] Hashed assets have immutable long-cache headers.
- [ ] HTML is not permanently cached.
- [ ] `x-powered-by` is absent.
- [ ] `X-Content-Type-Options`, frame denial, referrer, and permissions headers are present.

## Responsive torture pass

Test at minimum:

- [ ] 320px narrow-phone boundary
- [ ] 360x800 small Android portrait
- [ ] 390x844 phone portrait
- [ ] 844x390 phone landscape
- [ ] 768x1024 tablet portrait
- [ ] 1024x768 tablet landscape
- [ ] 1366x768 laptop
- [ ] 1920x1080 desktop

At each narrow viewport verify:

- [ ] No accidental horizontal page overflow.
- [ ] Sidebar is off-canvas and usable.
- [ ] Header controls remain tappable.
- [ ] Page actions do not overlap headings.
- [ ] Forms/dialogs remain inside viewport and scroll internally when needed.
- [ ] Toolbars wrap/stack without clipped actions.
- [ ] Calendar remains usable.
- [ ] Kanban is usable without drag.
- [ ] Long plan/task/resource/note text cannot force the layout wider than the viewport.
