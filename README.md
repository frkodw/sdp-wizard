# Duckwise SDP Process Wizard

Static, public-facing GitHub Pages site that walks Duckwise project leads through the SDP (Security & Data Protection) process as a guided wizard. Phase chosen at entry → relevant decisions asked one at a time → output is a tickable checklist of actions with a copy-to-clipboard button for transferring the summary into the team's Confluence project tracker.

**No project data is ever entered into or stored by the site** — only the abstract decisions you make during the wizard. The site is safe to host because it never holds confidential information.

Live URL: https://frkodw.github.io/sdp-wizard/

## Repo layout

The site lives at the repo root so GitHub Pages can serve it directly.

- `index.html`, `styles.css`, `app.js` — the page
- `process.json` — content (phases, decisions, actions, rules)
- `lib/` — pure-function modules (rules engine, markdown formatter, router)
- `assets/` — static assets
- `tests/` — Node-based unit tests (`node --test`, no npm dependencies)
- `.github/workflows/pages.yml` — runs tests then deploys to GitHub Pages

## Edit the process

All decisions, branches, and action items live in `process.json`. Edit, refresh — no build step.

## Run locally

    python3 -m http.server 8080

Then open http://localhost:8080.

## Run tests

Requires Node ≥18 (uses the built-in `node --test`):

    npm test

## Deploy

Push to `master`. The Pages workflow runs the tests and then publishes the root. First-time setup on a fresh repo: GitHub repo Settings → Pages → Source: **GitHub Actions**.
