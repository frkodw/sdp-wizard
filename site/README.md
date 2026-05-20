# SDP Process Wizard — `/site/`

Static site that guides Duckwise project leads through the SDP process.

## Run locally

Open `index.html` directly, or serve the folder:

    python3 -m http.server 8080 --directory .

Then visit http://localhost:8080.

## Edit the process

All decisions, branches, and action items live in `process.json`. Edit, refresh — no build step.

## Publish

A push to `master` automatically deploys to GitHub Pages via `.github/workflows/pages.yml`. Before the first deploy: Settings → Pages → Source: **GitHub Actions**.

## Outstanding URLs

`process.json` ships with placeholder `REPLACE_WITH_CONFLUENCE_URL` strings on these action links. Replace each with the real Confluence URL when available — the UI flags any unfilled link with a yellow "link not configured" badge so they're easy to find.

- Duckwise Article 30 register (used by `start-article-30-row`, `close-article-30`)
- Duckwise Project Categories (used by `fill-classification-files`, `set-project-category`)
- Annual cycle BU page Dec 2025 – Nov 2026 (used by `team-signoff-row`)
- Duckwise systems list (used by `list-tools-on-levels`, `list-client-accounts-level-3`)
- `Samtykke_Brugerindsigt.docx` location (used by `draft-consent`)
- `Aftale om brug af hjælpeværktøjer.docx` (used by `fill-ai-tools-agreement`)
- `DBA Trifork - Okt 2025 - DK.docx` (used by `create-dpa`)

## Tests

Pure-function unit tests live in `/tests/` at repo root. Run them from repo root:

    npm test

Requires Node ≥18 (uses the built-in test runner — no installs needed).
