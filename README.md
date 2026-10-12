# The Logbook: Zain Ali's portfolio

An explorable 3D logbook on a desk for desktops, and a purpose-built paper
version for phones, tablets, small windows and anyone who prefers it.
Both read from one content file, `src/content/content.ts`.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the contact details
npm run dev                  # http://localhost:5173
```

- `/?simple=1` forces the paper version, `/?3d=1` forces the 3D book.
- `/?test=1` is test mode: no animations, fixed camera, fallback off.
- `/?dev=book` and `/?dev=desk` are development harnesses for the 3D parts.

## Build

```bash
npm run build:pages   # renders the page images for the 3D book (needs the dev server or starts one)
npm run build         # type-check, bundle, render the paper version to static HTML (no browser needed) and sitemap.xml
npm run test          # unit tests (vitest)
npm run test:e2e      # Playwright: paper version (desktop and iPhone 15), the 3D book in test mode, the version decision
```

Re-run `npm run build:pages` after changing anything in `content.ts`, so the
3D book's pages match the paper version; the images live in
`public/assets/pages/` and are committed.

Lighthouse on the paper version (mobile, production build): Performance 94,
Accessibility 100, Best practices 100, SEO 100.

## Where things are

| Path | What |
| --- | --- |
| `src/content/content.ts` | Every word and number on the site |
| `src/config/features.ts` | Feature switches |
| `src/app/` | Version decision (3D book or paper) and the app shell |
| `src/paper/` | The paper version and the chapter pages (also used in the reading sheet) |
| `src/interactive/` | DroneMedic replay, IMC replay, AMS pipeline, About filter |
| `src/book/` | The 3D book: engine, input, desk, loading, audio, reading sheet |
| `src/data/` | Replay datasets pulled from the project folders |
| `scripts/` | Asset preparation, page rendering and prerendering |

The contact details come from environment variables (`VITE_CONTACT_EMAIL`,
`VITE_CONTACT_PHONE`, `VITE_LINKEDIN_URL`, `VITE_GITHUB_URL`) and never sit in
the repository.
