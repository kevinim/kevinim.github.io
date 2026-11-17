# TX dashboard Liberty + map-first split — implementation handoff (2026-11-17)

Repository: `kevinim/kevinim.github.io`  
PR: #318 (`feat/liberty-redfin-split-20261117`)

## Scope and design

- User selected **OpenFreeMap Liberty** and a **Redfin-like desktop split**.
- Main dashboard only: desktop >= 1060px left column has filter controls, school list, region table and detail; right side has a large, sticky map and ZIP insights. 721–1059px collapses to one column; <=720px preserves existing map-first CSS ordering.
- This is an **independent visual redesign**, not a Redfin tiles, code, branding, listing-data or API integration. The site's own school and city data remains the data source.

## Safe architecture

- `features/map-first-split.css`: all new presentation rules. Edit CSS custom properties `--tx-rail-width`, `--tx-map-gap`, `--tx-map-height`; breakpoint at 1060px. Avoid changing `index.html`'s large historical inline style.
- `features/map/liberty-basemap.js`: lazy loading of pinned MapLibre GL JS 5.5.0 and @maplibre/maplibre-gl-leaflet 0.1.4 on first Liberty selection. Full vector style: `https://tiles.openfreemap.org/styles/liberty`. WebGL style must finish loading before OSM fallback tile layer is removed.
- `dashboard-main.js`: `setBaseMap` supports `liberty`/OSM/Esri. `baseMapGeneration` invalidates stale asynchronous completions after rapid style switching. If MapLibre/CDN/style/WebGL fails, it leaves OSM visible, selects OSM, and provides a status message. Leaflet remains the map object, including every campus marker, verified/reference polygon, FEMA/crime/hospital overlay and address selection.
- Leaflet resize observer schedules school marker/label recomputation when actual map container dimensions change. Otherwise the larger desktop canvas can retain old visible-school clusters after a style height change.
- `index.html`: Liberty selector and MapLibre adapter are production-only; UAT entry points without a Liberty option remain on OSM. Adds style and script links. Narrow CSP additions: `tiles.openfreemap.org` in `img-src` and `connect-src`; `worker-src 'self' blob:` for the pinned v5 MapLibre worker. No blanket `*`, `unsafe-inline` scripts, API keys, tokens or browser address persistence.

## Free-provider and attribution constraints

OpenFreeMap public service currently offers no API key, account or per-request fee and requires OSM/OpenMapTiles attribution. It does not promise an SLA. Retain attribution and the OSM/Esri fallback; do not silently repurpose the public instance for bulk offline downloads. Re-check provider terms before public commercialization or major traffic expansion.

Sources: https://openfreemap.org/quick_start/ ; https://openfreemap.org/ ; https://github.com/maplibre/maplibre-gl-leaflet .

## Regression and QA

1. `node --test tests/map-first-liberty.test.cjs tests/csp-network-allowlist.test.cjs tests/first-render-css-bundle.test.cjs tests/tx-deferred-script-order.test.cjs tests/externalized-main-bootstrap.test.cjs`.
2. `scripts/test-externalized-main-browser.cjs`: offline CDN failure -> OSM fallback and browser layout at mobile 325/390 and desktop 1280px.
3. `scripts/test-responsive-school-ui.cjs`: 320–1280px, school control grouping, CSS bundle counts, mobile order, desktop left/right split.
4. `scripts/test-map-viewport-sync-browser.cjs`: hidden-to-visible, zoom, drag, school markers, container resize, 75013/75093 and selected school focus.
5. All branch-protection CI, public-provider/security/CSP, current-TEA/rating, GIS/residency guardrails, Redfin and Map-First UAT.
6. After any merge, check `https://kevinim.github.io/` on desktop and mobile: style selector defaults Liberty when available, OSM on vector failure, map markers and A/B filters stay correct, official school assignment warnings remain.

## Rollback / maintenance

- First rollback for runtime map problems: select **OpenStreetMap** in Map Background without changing any family/TEA data.
- If UI causes a regression, remove only the `features/map-first-split.css` link or revert PR #318; no school record, polygon, geocoder or GIS source needs to change.
- For a full rollback, revert the exact merged PR commit on a tested branch, retain earlier verified public `main` baseline and re-run required CI. Do not push unverified UAT code or replace provider keys.

## Explicit non-goals

- No redesign of school assignment eligibility/certification, no inferred polygons, no automatic Redfin listings/scraping, no paid provider, no authentication/PII changes, and no Cloudflare/Pages migration.
