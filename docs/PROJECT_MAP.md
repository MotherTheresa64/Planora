# Planora Project Map

```text
.
├── src/
│   ├── App.tsx             Product UI, task/project CRUD, calendar, analytics, navigation
│   ├── types.ts            Workspace / Project / Task domain types
│   ├── demo.ts             Seed workspace for credential-free review
│   ├── storage.ts          Validated local persistence boundary
│   ├── firebase.ts         Optional Firebase Google-auth adapter
│   ├── theme.ts            Persistent four-theme appearance controller
│   ├── ErrorBoundary.tsx   Runtime recovery and local-data reset path
│   ├── styles.css          Core visual system
│   ├── final-polish.css    Responsive/mobile and product overrides
│   ├── themes.css          Theme palettes and theme-aware surface system
│   ├── theme-aliases.css  Legacy token bridge for full-theme coverage
│   ├── release-polish.css Final presentation/micro-interaction layer
│   ├── theme-layout.css   Theme-control/toast layout safeguards
│   └── accessibility.css Focus visibility and reduced-motion rules
├── server/
│   └── index.ts            Express production host and operational endpoints
├── scripts/
│   ├── verify-build.mjs    Required production-artifact verifier
│   └── smoke-server.mjs    Compiled-server integration smoke test
├── docs/
│   ├── ARCHITECTURE.md     Architecture and production evolution
│   ├── DEPLOYMENT.md       Render/Firebase deployment runbook
│   ├── QA.md               Acceptance and responsive QA checklist
│   └── PROJECT_MAP.md      This file
├── .github/workflows/ci.yml
├── render.yaml
└── package.json
```

## Where to make common changes

| Goal | Primary files |
| --- | --- |
| Add or change task/project behavior | `src/App.tsx`, `src/types.ts` |
| Change calendar/analytics behavior | `src/App.tsx` |
| Change demo seed content | `src/demo.ts` |
| Change browser persistence | `src/storage.ts` |
| Change theme choices/persistence | `src/theme.ts` |
| Change theme palettes/surfaces | `src/themes.css`, `src/theme-aliases.css` |
| Change final presentation details | `src/release-polish.css`, `src/theme-layout.css` |
| Connect/replace authentication | `src/firebase.ts` |
| Add hosted per-user data | new data adapter/API plus `src/firebase.ts` identity |
| Change core layout/design | `src/styles.css` |
| Change final mobile/responsive behavior | `src/final-polish.css` |
| Change accessibility defaults | `src/accessibility.css` |
| Change production server/config output | `server/index.ts` |
| Change Render deployment | `render.yaml` |
| Change CI/preflight behavior | `package.json`, `scripts/*`, `.github/workflows/ci.yml` |

## Verification commands

```bash
npm run check
npm run smoke:server
```

Use `docs/QA.md` after those automated checks pass, including theme coverage and a physical-phone pass before publishing screenshots.
