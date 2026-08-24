# Planora QA Checklist

Use this after a local build and again against the deployed Render URL.

## Smoke

- [ ] App loads with no blank screen or uncaught console error.
- [ ] Branded favicon/title appear.
- [ ] Refresh preserves the current demo workspace.
- [ ] Invalid/blocked local storage does not prevent the UI from rendering.
- [ ] Error boundary presents a recovery screen if a render error occurs.

## Navigation

- [ ] Overview, Projects, My tasks, Calendar, and Insights all render.
- [ ] Sidebar project selection opens the correct project.
- [ ] My tasks only shows tasks assigned to `NR` and is not stuck on a prior project filter.
- [ ] Mobile sidebar opens/closes without horizontal page overflow.
- [ ] `Ctrl/Cmd+K` focuses search.

## Tasks

- [ ] New task requires a non-empty title and project.
- [ ] Estimate, tags, due date, priority, and note are saved.
- [ ] Search matches title/tags/notes as expected.
- [ ] Moving a task changes its workflow column.
- [ ] Workflow transitions persist after refresh.
- [ ] Completing/reopening a task updates project completion percentage.
- [ ] Priority queue reflects active tasks only.

## Projects

- [ ] New project requires a name.
- [ ] New project appears in sidebar and project grid.
- [ ] Project task counts reflect open tasks.
- [ ] Project completion is derived from its tasks.

## Calendar / analytics

- [ ] Calendar displays the current month/year.
- [ ] Tasks with due dates in the current month appear on matching dates.
- [ ] Completion and planned-effort metrics match workspace state.
- [ ] Status distribution updates after moving tasks.

## Authentication

Without Firebase:

- [ ] Account control clearly reports demo mode.
- [ ] Clicking sign-in does not crash.

With Firebase:

- [ ] Google popup opens.
- [ ] Successful sign-in produces confirmation feedback.
- [ ] Cancelled/failed popup produces readable error feedback.

## Production host

- [ ] `GET /api/health` -> `200` JSON.
- [ ] `GET /api/config` -> `200` JSON with correct readiness booleans.
- [ ] Unknown `/api/*` -> JSON `404`, not `index.html`.
- [ ] Hard refresh of SPA root works.
- [ ] Hashed assets have long cache headers.
- [ ] HTML is not permanently cached.
- [ ] Security headers are present.

## Accessibility

- [ ] Tab focus is clearly visible.
- [ ] Interactive controls are reachable by keyboard.
- [ ] Reduced-motion OS preference disables nonessential transitions/animations.
- [ ] Mobile touch targets are comfortably usable.

## Viewports

Test at minimum:

- [ ] 390x844 phone portrait
- [ ] 844x390 phone landscape
- [ ] 768x1024 tablet
- [ ] 1366x768 laptop
- [ ] 1920x1080 desktop
