# Planora QA Checklist

Use this after a local build and again against the deployed Render URL.

## Smoke

- [ ] App loads with no blank screen or uncaught console error.
- [ ] Branded favicon/title appear.
- [ ] Refresh preserves the current workspace.
- [ ] Invalid/blocked local storage does not prevent the UI from rendering.
- [ ] Error boundary presents a recovery screen if a render error occurs.
- [ ] Reset restores the sample workspace without clearing unrelated browser storage.

## Navigation

- [ ] Overview, Projects, My tasks, Calendar, and Insights all render.
- [ ] Sidebar project selection opens the correct project.
- [ ] My tasks only shows tasks assigned to `NR` and is not stuck on a prior project filter.
- [ ] Mobile sidebar opens/closes without horizontal page overflow.
- [ ] `Ctrl/Cmd+K` focuses search.
- [ ] Escape closes active modal/mobile-navigation layers.

## Tasks

- [ ] New task requires a non-empty title and project.
- [ ] Estimate, tags, due date, priority, and note are saved.
- [ ] Search matches title/tags/notes/project/assignee as expected.
- [ ] Moving a task changes its workflow column.
- [ ] Workflow transitions persist after refresh.
- [ ] Completing/reopening a task updates project completion percentage.
- [ ] Priority queue reflects active tasks only.
- [ ] Deleting a task removes only the intended task and persists after refresh.
- [ ] Empty workflow columns render a useful empty state.

## Projects

- [ ] New project requires a name.
- [ ] New project appears in sidebar and project grid.
- [ ] Project task counts reflect open tasks.
- [ ] Project completion is derived from its tasks.
- [ ] Selecting a single project exposes the delete-project action.
- [ ] Project deletion requires confirmation and removes tasks owned by that project.

## Calendar

- [ ] Calendar displays the current month/year.
- [ ] Current date is visually highlighted.
- [ ] Tasks with due dates in the current month appear on matching dates.
- [ ] Phone layout remains readable without horizontal calendar scrolling.
- [ ] Phone layout uses compact task indicators without overflowing day cells.

## Insights

- [ ] Workspace health responds to high/urgent open work.
- [ ] Completion percentage matches Done tasks.
- [ ] Workflow distribution changes after moving tasks.
- [ ] Open estimated hours match non-Done task estimates.
- [ ] Project workload rows match each project's open estimated hours and completion.
- [ ] Upcoming deadlines list the nearest open tasks in date order.
- [ ] Insights stack into a readable single-column layout on phones.

## Authentication

Without Firebase:

- [ ] Account control clearly reports local/demo mode.
- [ ] Clicking sign-in does not crash.

With Firebase:

- [ ] Google popup opens.
- [ ] Successful sign-in produces confirmation feedback.
- [ ] Cancelled/failed popup produces readable error feedback.

## Production host

- [ ] `GET /api/health` -> `200` JSON.
- [ ] `GET /api/config` -> `200` JSON with correct readiness values.
- [ ] Unknown `/api/*` -> JSON `404`, not `index.html`.
- [ ] Hard refresh of SPA root works.
- [ ] Hashed assets have long cache headers.
- [ ] HTML is not permanently cached.
- [ ] Security headers are present.

## Accessibility / mobile

- [ ] Tab focus is clearly visible.
- [ ] Interactive controls are reachable by keyboard.
- [ ] Reduced-motion OS preference disables nonessential transitions/animations.
- [ ] Mobile touch targets are comfortably usable.
- [ ] Kanban columns reflow vertically on a phone rather than requiring desktop-width horizontal scrolling.
- [ ] Modals fit within the viewport and remain scrollable on small screens.

## Viewports

Test at minimum:

- [ ] 360x800 small Android portrait
- [ ] 390x844 phone portrait
- [ ] 844x390 phone landscape
- [ ] 768x1024 tablet
- [ ] 1366x768 laptop
- [ ] 1920x1080 desktop
