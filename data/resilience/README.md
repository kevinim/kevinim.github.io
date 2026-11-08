# P42 — Winter Storm / Electric Grid resilience research-only staging

**Status updated 2026-11-08:** Texas-state EIA reliability remains a standalone **informational panel** (PR #63). FEMA NRI December 2025 relative Cold Wave / Ice Storm / Winter Weather **Census tract map layer** is now deployed (PR #66). There is still no licensed verified utility delivery-territory layer, local historical outage duration, neighborhood blackout probability or address score. The ERCOT event reference remains a staged regional source.

## Actual data saved

1. `eia-texas-grid-reliability-2024-2025.json`: Texas-state Form EIA-861 Electric Power Annual Table 11.3 (2024 and 2025). Official https://www.eia.gov/electricity/annual/table.php?t=epa_11_03.html; report published Oct 21 2026.
   - 2024: all-events SAIDI **1270.6 minutes**, SAIFI **2.114**; without major events SAIDI **129.4 minutes**, SAIFI **1.218**.
   - 2025: all-events SAIDI **223.5 minutes**, SAIFI **1.704**; without major events SAIDI **128.7 minutes**, SAIFI **1.287**.
   - These are **Texas statewide aggregates**, not an estimate for Oncor/CoServ/individual homes. The strong all-events change is sensitive to 2024 major storms, NOT proof any particular neighborhood became safer.
2. `ercot-2021-regional-event.json`: official ERCOT Feb 15 2021 announcement that load shedding reached **about 10,500 MW at the highest point**. https://www.ercot.com/news/release?id=9c552983-008a-3906-8066-8b76315ed3e7 . ERCOT-wide, not a DFW geospatial outage table or household outage duration.
3. `source-status-2026.json`: source catalog and unfinished cold-wave, ice-storm, winter-weather, and utility-level reliability acquisition gaps.

## Existing app assets to reuse

- `phase2a-fema-hazards.js`, `data/phase2a-fema-nri-dfw-2025.geojson`: existing inland flood/wildfire/hurricane Census tract layer. Do not rewrite.
- `noaa-storm-history.js`, `data/noaa-storm-events-dfw-2024-2025.json`: existing limited 2024/2025 county storm events.
- No source currently justifies assigning a **home-specific outage probability**.

## Explicitly missing, next tasks

1. Obtain cold wave / ice storm / winter weather Census tract indicators from the current FEMA NRI/RAPT source. Verify source risk-year and attribute codes; do not use hurricane or flood as a proxy.
2. Download EIA Form 861 utility-level reliability rows and confirm reporting method / major-event exclusions. Source: https://www.eia.gov/electricity/data/eia861/ . Verify Oncor, CoServ (Denton County Electric Cooperative), municipal utilities, etc by regulator + service territory **before** associating utility data with a selected home.
3. Find verified historical 2021 winter storm and later event outage footprints if obtainable, at what geography, and privacy/licensing terms; absence of evidence is NOT zero outage.
4. Keep **weather hazard**, **utility supply reliability**, **regional supply emergency**, and **local outage history** as separate panels, not a fabricated combined score.
5. When independently verified local data exist, implement an isolated layer into latest main after Claude handoff/layout changes; preserve school markers and other map state.
6. Conduct source, test, UI and deployed smoke before claiming production completion.

Test: `node --test tests/p42-resilience-scope.test.cjs` — refuses to display statewide data as ZIP/address/utility outage score.

This branch does **not** edit `index.html`, `HANDOFF.md`, school, crime, or layout files.

## PR #66 mapped FEMA winter weather (not electric outages)

- `fema-nri-dfw-winter-2025.json` contains 1,734 FEMA NRI December 2025 Census tracts joined to the already deployed `data/phase2a-fema-nri-dfw-2025.geojson` geometry by exact tract FIPS; fields CWAV, ISTM, WNTW risk scores and published rating categories. No-color means missing or unrated, **not zero**.
- `features/resilience/winter-map.js` is now deployed as a separate Leaflet risk layer, sharing existing polygon shape without changing school or flood geography; explicit controls for Cold Wave, Ice Storm and Winter Weather.
- **Do not confuse this map with a distribution-system outage map.** Statewide EIA reliability cannot be mapped to a ZIP without utility-specific evidence. PUCT unofficial service territory polygons include licensed-source/Platts restrictions in metadata. The public Oncor service-area map is a safer external lookup until licensing and address-level utility verification are resolved.
