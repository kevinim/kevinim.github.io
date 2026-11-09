# Agent 05 — Map UI and browser E2E QA (2026-11-09)

## Scope and dependency

- This branch is based on Draft PR #162, not `main`. It tests the address-to-school UI without absorbing parallel Dallas, Denton, CFB or wider GIS acquisition changes.
- Changes: Leaflet non-animated viewport transitions; scoped dark-mode map controls and grouped school-filter contrast; an independent desktop/mobile Chromium regression with fail-on-zero Allen markers and before/after screenshots.
- No official GIS, district polygons, enrollment logic, school data, geo source provenance or credentials are modified.
- Source baseline for before/after: `127b6200b6229abc00a431ba05fcc82a694050d5` (#162).

## Automated browser checks

The free GitHub Actions workflow `.github/workflows/agent05-map-ui-e2e.yml` serves both the unchanged baseline and the proposal in real Chromium at **390px and 1366px**. It saves `before-390.png`, `after-390.png`, `before-1366.png`, `after-1366.png` (or failure screenshots), plus machine-readable `report.json`, under the `agent05-map-ui-before-after` Actions artifact.

The browser test asserts:
- Selected Allen ZIP 75013 returns the map to the selected area; Leaflet is not stuck animating, and loaded Allen campus markers within its visible viewport are **nonzero**.
- Elementary/all filters, school-marker on/off toggles, and school click -> historical/available boundary or explicit missing reason.
- X clearing of typed address and any home overlays.
- Dark-by-default, computed foreground/background contrast **at least 4.5:1** for targeted map button/control text.
- At 390px: no document horizontal overflow, filter/map/detail overlap or Leaflet zoom-control spillover.
- Existing presentation policy never draws an unverified home assignment boundary.

**Limits:** This is real Chromium UI E2E, but does not independently certify a real residence's official 2026–27 school assignment; #148 and Agent 03's district Finder crosschecks remain required. The initial workflow result and screenshots must be reviewed; failure/pending is **QA NO_GO**. Baseline images are comparison evidence, not a claim that #162 passed all tests.

## Release gates

- `main` untouched; no Production deployment or merge.
- Do not mark the PR Ready until the current head's workflow(s) pass and before/after screenshots are inspected.
- If any GIS data branch is subsequently merged, rerun against its final integration SHA (the PR #162 base is not a universal merged-candidate certification).
