# Planora Project Map

```text
.
├── src/
│   ├── App.tsx                    Application shell, views, forms, CRUD/edit flows, interaction state
│   ├── domain.ts                 Domain invariants, normalization, dates, progress, dependencies, deletion logic
│   ├── domain.test.ts            Regression tests for integrity-critical domain behavior
│   ├── types.ts                  Persisted Workspace/Plan/Milestone/Task/Resource/Note types
│   ├── demo.ts                   Explicit optional sample workspace
│   ├── storage.ts                Versioned/scoped local snapshots, migration, import/export
│   ├── firebase.ts               Optional Firebase Auth + per-UID Firestore snapshot adapter
│   ├── theme.ts                  Persistent four-theme appearance controller
│   ├── ErrorBoundary.tsx         Runtime recovery with guest-only local-data reset
│   ├── styles.css                Core visual system
│   ├── product-upgrade.css       Product view styling
│   ├── production-hardening.css  Final responsive/touch/long-content hardening overrides
│   ├── final-polish.css          Existing responsive/product polish layer
│   ├── themes.css                Theme palettes and theme-aware surfaces
│   ├── theme-aliases.css         Token bridge for theme coverage
│   ├── release-polish.css        Presentation/micro-interaction layer
│   ├── theme-layout.css          Theme-control/toast layout safeguards
│   └── accessibility.css         Focus visibility and reduced-motion defaults
├── server/
│   └── index.ts                  Express production static host and operational endpoints
├── scripts/
│   ├── verify-build.mjs          Required production-artifact verifier
│   └── smoke-server.mjs          Compiled-server smoke test
├── docs/
│   ├── ARCHITECTURE.md           Domain, persistence, auth, synchronization, tradeoffs
│   ├── DEPLOYMENT.md             Render/Firebase deployment runbook
│   ├── QA.md                     Functional/responsive/accessibility torture checklist
│   └── PROJECT_MAP.md            This file
├── firestore.rules               UID-isolated Firestore authorization
├── .github/workflows/ci.yml      Pull-request/main quality gate
├── render.yaml                   Render build/start/health configuration
└── package.json                  Runtime versions and validation scripts
```

## Where behavior belongs

| Change | Primary files |
| --- | --- |
| Add/change entity invariants or deletion behavior | `src/domain.ts`, `src/domain.test.ts`, `src/types.ts` |
| Change plan/task/milestone/resource/note forms | `src/App.tsx`, then domain validation if the rule affects persisted data |
| Change Dashboard/Today/Insights calculations | `src/domain.ts` first; `src/App.tsx` for presentation only |
| Change date semantics | `src/domain.ts`, `src/domain.test.ts` |
| Change task dependency behavior | `src/domain.ts`, `src/domain.test.ts`, `src/App.tsx` |
| Change browser persistence/migrations/import-export | `src/storage.ts`, `src/domain.ts` normalization |
| Change Firebase identity/cloud snapshot behavior | `src/firebase.ts`, `src/App.tsx` reconciliation |
| Change Firestore authorization | `firestore.rules` |
| Change optional sample content | `src/demo.ts` |
| Change theme choices/persistence | `src/theme.ts` |
| Change core layout/design | `src/styles.css` |
| Add final touch/responsive hardening | `src/production-hardening.css` after checking existing style layers |
| Change accessibility defaults | `src/accessibility.css`, semantic markup in `src/App.tsx` |
| Change production operational/static-host behavior | `server/index.ts` |
| Change automated release gate | `package.json`, `.github/workflows/ci.yml`, `scripts/*` |
| Change Render deployment | `render.yaml`, `docs/DEPLOYMENT.md` |

## Design rule

Do not put integrity rules only in a React click handler. If a rule determines whether persisted workspace data is valid, put it in `domain.ts` (and normally a regression test) so import, browser storage, Firestore, and UI workflows share the same definition.

## Verification

```bash
npm run check
npm run smoke:server
```

After those pass, execute the browser/device scenarios in `docs/QA.md` before changing production screenshots or portfolio claims.
