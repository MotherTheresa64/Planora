# Planora Project Map

```text
.
├── src/
│   ├── App.tsx                 Product UI, CRUD workflows, search, calendar, insights, settings
│   ├── types.ts                Workspace / Plan / Milestone / Task / Resource / Note domain types
│   ├── demo.ts                 Seed workspace for credential-free review
│   ├── storage.ts              Validated local persistence, migration, normalization, repair
│   ├── firebase.ts             Optional Google Auth + per-user Firestore workspace sync
│   ├── theme.ts                Persistent four-theme appearance controller
│   ├── ErrorBoundary.tsx       Runtime recovery and Planora-only local-data reset path
│   ├── styles.css              Core visual system
│   ├── accessibility.css       Focus visibility and reduced-motion rules
│   ├── final-polish.css        Responsive/mobile product overrides
│   ├── themes.css              Theme palettes and theme-aware surface system
│   ├── theme-aliases.css       Legacy token bridge for full-theme coverage
│   ├── release-polish.css      Final presentation/micro-interaction layer
│   ├── theme-layout.css        Theme-control/toast layout safeguards
│   ├── product-upgrade.css     Product-level visual refinements
│   ├── recruiter-polish.css    Showcase, overflow, touch, and narrow-screen hardening
│   └── workflow-completion.css Final edit/settings/notes workflow styling
├── public/
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   └── social-preview.svg      Branded 1200×630 sharing artwork
├── server/
│   └── index.ts                Express production host, security headers, operational endpoints
├── scripts/
│   ├── verify-build.mjs        Required production-artifact verifier
│   └── smoke-server.mjs        Compiled-server integration smoke test
├── docs/
│   ├── ARCHITECTURE.md         Domain, persistence, auth, security, and production shape
│   ├── DEPLOYMENT.md           Render/Firebase/release runbook
│   ├── QA.md                   Full functional, responsive, accessibility, and security matrix
│   └── PROJECT_MAP.md          This file
├── firestore.rules             Authenticated workspace authorization/shape constraints
├── firebase.json
├── index.html                  SEO, install, Open Graph, and Twitter metadata
├── .github/workflows/ci.yml
├── render.yaml
└── package.json
```

## Where to make common changes

| Goal | Primary files |
| --- | --- |
| Add or change plan/task/milestone/resource/note behavior | `src/App.tsx`, `src/types.ts` |
| Change calendar, Today, search, insights, or settings behavior | `src/App.tsx` |
| Change demo seed content | `src/demo.ts` |
| Change browser persistence, migration, normalization, or repair | `src/storage.ts` |
| Change Google auth / Firestore sync | `src/firebase.ts` |
| Change Firestore authorization constraints | `firestore.rules` |
| Change theme choices/persistence | `src/theme.ts` |
| Change theme palettes/surfaces | `src/themes.css`, `src/theme-aliases.css` |
| Change core layout/design | `src/styles.css` |
| Change final responsive/mobile behavior | `src/final-polish.css`, `src/recruiter-polish.css`, `src/workflow-completion.css` |
| Change final presentation/micro-interactions | `src/release-polish.css`, `src/theme-layout.css`, `src/product-upgrade.css` |
| Change accessibility defaults | `src/accessibility.css` |
| Change SEO/social/install metadata | `index.html`, `public/manifest.webmanifest`, `public/social-preview.svg` |
| Change production server/config/security headers | `server/index.ts` |
| Change Render deployment | `render.yaml` |
| Change CI/preflight behavior | `package.json`, `scripts/*`, `.github/workflows/ci.yml` |

## Verification commands

```bash
npm run check
npm run smoke:server
```

Use `docs/QA.md` after those automated checks pass, including the narrow-phone and physical-device pass before publishing new screenshots or application links.
