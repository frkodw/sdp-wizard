# Duckwise SDP Process Wizard

Static, public-facing GitHub Pages site that walks Duckwise project leads through the SDP (Security & Data Protection) process as a guided wizard. Phase chosen at entry → relevant decisions asked one at a time → output is a tickable checklist of actions with a copy-to-clipboard button for transferring the summary into the team's Confluence project tracker.

**No project data is ever entered into or stored by the site** — only the abstract decisions you make during the wizard. The site is safe to host because it never holds confidential information.

Live URL: https://frkodw.github.io/sdp-wizard/

## Repo layout

- `site/` — the static site (vanilla HTML / CSS / ES modules, no build step). See `site/README.md` for local dev instructions.
- `tests/` — Node-based unit tests for the pure-function lib (`node --test`, no npm dependencies).
- `.github/workflows/pages.yml` — runs tests then deploys `site/` to GitHub Pages on push to `master`.

## Run tests

From repo root. Requires Node ≥18 (uses the built-in `node --test`):

    npm test

## Run locally

    cd site && python3 -m http.server 8080

Then open http://localhost:8080.

## Deploy

Push to `master`. The Pages workflow runs the tests and then publishes `/site/`. First-time setup on a fresh repo: GitHub repo Settings → Pages → Source: **GitHub Actions**.
