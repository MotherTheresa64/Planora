# Design and theming notes

Why Planora looks the way it does, and how four appearances stay consistent.

## The product shape

Planora is built around one loop:

**goal → plan → milestones → tasks → schedule → progress → insights**

Every screen is a view onto that loop rather than a separate demo. The dashboard summarises the loop, Today narrows it, Plans and Tasks operate on it, Roadmap and Calendar place it in time, Resources keep the supporting material, and Insights measures it. That is why the navigation is task-shaped instead of feature-shaped.

## Visual direction

- **A quiet command centre.** Deep navy or ink surfaces, one luminous accent for actions and progress, and a soft glow behind the page rather than decorative illustration.
- **Type does the hierarchy work.** Manrope for headings and numbers, DM Sans for controls and body copy, tabular figures for dates and effort. One page title, one section title rhythm, no competing display styles.
- **Cards are containers, not decoration.** 14–16px radii, one border, one shadow. Status lives in small pills and progress bars, so a dense dashboard still scans in one pass.
- **Density is deliberate.** The product holds many small facts: estimates, due dates, milestones, health. Spacing opens up at wide widths and collapses in clear steps at 1100, 760 and 520px instead of shrinking every control.

## Appearance system

Four dark appearances — **Midnight**, **Aurora** (default), **Ember**, **Graphite** — are data, not builds. Each one supplies the same tokens:

| Token group | Examples | Used for |
| --- | --- | --- |
| Canvas | `--theme-bg`, `--theme-sidebar` | Page, navigation column |
| Surfaces | `--theme-surface`, `--theme-surface-2/3` | Cards, inputs, raised blocks |
| Lines | `--theme-line` | Borders, dividers, tracks |
| Text | `--theme-text`, `--theme-muted`, `--theme-on-accent` | Reading text, metadata, ink on accent |
| Meaning | `--theme-accent`, `--theme-accent-2`, `--theme-positive`, `--theme-warm` | Actions, progress, confirmed, attention |
| Depth | `--theme-shadow`, `--theme-glow` | Shadows, focus rings, page glow |

Switching appearance changes `html[data-theme]`, updates `color-scheme` and the browser `theme-color`, persists the choice under `planora-theme-v2`, and repaints. Layout, spacing, type scale and component geometry are declared once, so nothing reflows.

### Layer order

The appearance stack is loaded in a deliberate order:

1. `styles.css` — base layout and components.
2. `themes.css` — the four palettes and the first token-driven surface pass.
3. `showcase-design.css` — visual direction (depth, emphasis, proportions) expressed in tokens only.
4. `theme-fixes.css` — token coverage for older rules that still carried literal palette values, plus the board/task-row/mobile track contract.

The last two layers are the migration seam: the original stylesheet used literal indigo values, and rewriting it in one pass would have risked the whole product. Instead, later layers re-declare those surfaces from tokens. Every appearance therefore shares one layout and differs only in colour.

## Responsive behaviour

| Width | Behaviour |
| --- | --- |
| ≥ 1101px | Sidebar + five-column Kanban; three plan cards across; four-up stat band |
| ≤ 1100px | Five fixed 240px workflow columns scroll horizontally; two-up plan cards |
| ≤ 760px | Off-canvas navigation, stacked Kanban, single-column content, bottom-sheet forms |
| ≤ 520px | Two-up compact stats, full-width page actions, stacked task controls |

The phone layout keeps every action available; it changes arrangement, not capability.

## Accessibility

- `color-scheme: dark` on every appearance, so native controls do not flash light.
- Keyboard focus is visible on every control; icon-only buttons carry labels.
- Status is written as a word as well as colour.
- `prefers-reduced-motion` removes transitions and transforms.
- Destructive actions are separated, confirmed, and visually distinct from primary actions.
