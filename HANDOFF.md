# TX Relocation Dashboard — Agent Handoff / Future Roadmap

**Project:** North Dallas Neighborhood Explorer  
**Production:** https://kevinim.github.io/  
**Repository:** `kevinim/kevinim.github.io` (`main`)  
**Decision captured:** 2026-11-07, America/New_York  
**Status updated 2026-11-08:** P40–P42 have **partially implemented, deployed UI** with explicit source limitations; city-level FBI Crime Map already exists separately from P43 source-native data preparation. No address-specific outage score, automatic NTTA quote, nearest-ED time, or P43 severity score is implemented. Read the 2026-11-08 addendum before new development.

## 0. Read this before making changes

1. Read `BOUNDARIES.md` and the active school-data provenance and test files first. Current school assignment is a primary feature.
2. Inspect **current** GitHub branches, open PRs, deployments, and production regressions. At the time of this note, PR #53 (`refactor/district-registry-20261107`) was open; do not assume its current status.
3. Address outstanding P0 regressions (especially **Allen schools/markers disappearing or showing 0 results**) before adding new map layers. Earlier fixes/tests did not always prevent production recurrence. Verify the deployed site, not only unit tests.
4. Existing commute datasets and hazard modules (`jpm-road-times-2026-11-04.json`, `jpm-60min-isochrone-2026-11-04.geojson`, `phase2a-fema-hazards.js`, `phase2a-nfhl-flood.js`) should be examined before extending or duplicating logic.
5. P40–P43 below are **proposed work labels**, not proof that GitHub issues, PRs, or implementation branches exist. Check for naming collisions before registering.

## 1. Approved goals and order

The user approved four proposed capabilities:

| ID | Feature | Order / Release policy | Current status |
| --- | --- | --- | --- |
| **P40** | Vehicle commute and DFW toll cost simulation, peak congestion | Extend only verified route pricing/peak data | Monthly toll/fuel/parking cost UI **deployed**; manual NTTA/TEXpress quote inputs and OSRM route-distance prefill. Automatic toll and traffic still missing. |
| **P41** | Hospital / emergency-care accessibility | Verify official ED/trauma and travel-time coverage | CMS DFW 12-county **city-filtered hospital directory deployed**; nearest ED and 15/30 minute ETA remain unimplemented. |
| **P42** | Cold-wave, winter storm and electric-grid resilience | Acquire FEMA cold wave + utility data separately | EIA Texas-state 2024–2025 SAIDI/SAIFI **context panel deployed**. Local winter/utility/outage risk still unimplemented. |
| **P43** | Official police crime dataset ingestion / normalization | Continue source reconciliation; **do not publish P43 severity maps/safety scores yet** | Existing FBI city Crime Map is already in production (`crime-city-map.js`). Separately, P43 police source-native aggregates are staged for five cities; not normalized/merged into map. |

Preserve existing school, school-boundary, address lookup, and FEMA flood work. These new features are additional decision-support layers, not replacements.

## 2. P40 — Vehicle commute + Toll simulator

### User-facing outcome
From an origin or selected neighborhood/address to a chosen workplace/destination:
- Compare toll-enabled and toll-avoiding routes, when defensible route data are available.
- Display peak AM/PM driving-time **range/variability**, not only a single optimistic ETA; identify key bottlenecks with documented measurements.
- Estimate tolls by route and month, clearly distinguishing **NTTA TollTag vs. ZipCash/non-tag** prices and independently operated / variable-price **TEXpress** lanes.
- Show editable monthly office days, vehicle MPG, gasoline price, toll assumption, distance, parking (optional), and calculate monthly toll, fuel and total outlay.
- Explicitly label user-entered assumptions, sample estimates, dated rates and live/observed conditions. Never call an illustrative toll value an official quote.

### Calculation / engineering rules
- For repeated symmetrical round trips, monthly toll = (outbound toll + return toll) × commute days; monthly fuel = (outbound + return miles) × commute days ÷ MPG × $/gallon. Allow routes with asymmetric tolls/distances.
- Dynamic TEXpress prices must be treated as time-sensitive or a range, not a fixed NTTA rate. No hidden routing API keys or paid services without an integration plan.
- Reuse existing commute views/data where valid. If live route data cannot be licensed or obtained, start with explicitly labeled estimates/manual inputs rather than fabricate travel times or tolls.
- Potential sources to verify: NTTA official toll calculator and rate sheets; TxDOT mobility/reliability datasets; official TEXpress operator rate information; licensed routing API if available.
- Suggested QA: zero workdays, toll-free route, one-way vs. round-trip, rate vintage, missing traffic data, variable pricing, weekday AM/PM, rerouting, numeric input validation.

### Definition of done
Reproducible formulas + tested route/cost assumptions + date/source disclosure + correct toll vs no-toll comparison + no regressions in school markers or existing map behavior.

## 3. P41 — Healthcare / emergency accessibility

### User-facing outcome
- Locate nearest **hospital emergency department** and major hospitals, optionally pediatric facilities.
- Show **drive time** and the number of emergency facilities within indicative 15-/30-minute travel windows when genuine route-time coverage is available.
- Distinguish ordinary hospitals, open emergency departments, trauma designations (Texas DSHS Level I–IV), and pediatric capability; do not equate general hospital star ratings with emergency/trauma capability.
- When only geometric proximity is available, label it **straight-line distance**, not estimated driving time. Confirm emergency service status before claiming 24/7 availability.

### Candidate sources / implementation
- CMS Care Compare / Provider of Services datasets: facility address, type, emergency-service indicator, source vintage.
- Texas DSHS designated trauma facilities and pediatric designations, as available.
- Geocode/QA facilities, de-duplicate locations, join drive-time service separately. Store provider IDs, coordinates, type, ED availability verification, designation, source URL and `asOf` date.
- QA: hospital without ED, duplicate campus, closed/renamed facilities, out-of-scope locations, missing coordinates, routing failure, cross-border access.

### Definition of done
Accurate facility taxonomy and provenance, useful proximity/ETA labels, verified ED/trauma claims, and clean unavailable-state UI.

## 4. P42 — Winter storm / power resilience

**Do not collapse these into one false-precision neighborhood score.** Keep independent dimensions and provenance.

1. **Cold weather / winter storm hazard exposure** — FEMA National Risk Index / RAPT or successor, using the available relevant hazard categories and their actual geography, vintage and methodology. Risk is not the same as historical outages.
2. **Utility reliability** — EIA distribution utility reliability statistics (e.g., SAIDI/SAIFI), with utility/year coverage and metric caveats. Verify utility service territory by address before assigning a utility-level figure; ERCOT wholesale grid is not an address-level distribution utility.
3. **Historical storm outage footprint** — research 2021 winter storm and subsequent event reports from utilities, PUCT/official incident reports and defensible spatial records. Only show street/neighborhood-level outage claims with verifiable local evidence; otherwise `unavailable` / broader-area context.

### UX and source-quality rules
- Display three separate cards/metrics with **source, geography, reporting year, uncertainty, and coverage**.
- Prefer neutral/no fill for missing data; progressively redder as validated adverse risk increases.
- Do not conflate ERCOT grid-level incidents with actual outage durations at a particular residence; do not derive an exact neighborhood score from utility-wide figures.
- Confirm any existing FEMA flood/hazard styling and source semantics to avoid mixing flood risk with winter risk.

### Definition of done
Documented geographic attribution, accurate data vintage, separate indicators, and no misleading local outage assertions.

## 5. P43 — Crime Map DATA PREPARATION ONLY

**Scope now:** discover, obtain (if permitted), inventory and normalize official data. **OUT OF SCOPE now:** public map, geocoded resident safety score, city rankings, visual crime heatmap, or release.

### Source candidates to verify
- Texas DPS Crime Portal: https://txucr.nibrs.com/
- FBI Crime Data Explorer: https://cde.ucr.cjis.gov/
- City of Dallas police incident open data: https://www.dallasopendata.com/Public-Safety/Police-Incidents/qv6i-rri7/about_data
- Fort Worth Police Crime Data Center: https://police.fortworthtexas.gov/Crime-Public-Info/Crime-Data-Center
- Frisco GIS crime map service: https://maps.friscotexas.gov/gis/rest/services/Public/Crime_Mapping_View__Dashboard/FeatureServer
- McKinney crime statistics: https://www.mckinneytexas.org/1199/Crime-Statistics
- Plano crime statistics: https://www.plano.gov/crime-statistics
- Allen: source with incident-level coordinate coverage **not confirmed**; research further. Do not state data are absent merely because not yet found.

### Data contract
Capture `sourceAuthority`, `sourceUrl`, `downloadedAt`, `incidentDate`, `reportDate`, `offenseCode`, `offenseCategory`, `geographyType`, `geoPrecision`, `latitude/longitude (if lawfully available)`, `city`, `coverageStart/End`, `aggregation`, `redactionPolicy`, `reportingStandard`, and `license`. Keep raw data immutable and normalized data versioned.

Prefer comparable **2021–2025** annual periods plus **2026 provisional** data if available. Separate violent from property crimes. Track NIBRS vs older/UCR or city-specific classification and the year of transitions. Record complete vs incomplete city participation, missing months, duplicate/corrected incidents, privacy-obfuscated points and source refresh cadence. Where comparability fails, store the data but **do not issue a cross-city ranking or per-capita comparison**. Missing data ≠ zero incidents or low risk.

### Definition of done for data preparation
A documented per-city/source coverage matrix, permitted raw downloads or machine-readable connectors, normalized sample sets, reproducible ingest scripts, QA/reporting checks, provenance manifest, and a list of unresolved gaps; **no visual layer deployment yet**.

## 6. Cross-feature design / guardrails

- Site is GitHub Pages / static frontend: favor separated data-generation scripts and versioned static outputs; evaluate external API licensing/CORS/cost before embedding runtime requests.
- Existing map schools must remain visible when non-school layers fetch, fail, toggle or refresh. New overlay components must not overwrite school feature collections, marker state, map source IDs or default viewport logic.
- Respect selected area on default zoom / initial view. Don't change existing geographic selection precedence as a side-effect.
- Production **P0 marker-count guardrail**: test Allen and other school selections with expected nonzero marker/campus coverage and visible layers; include an explicit loaded vs empty vs failed state. Never silently replace nonempty school data with empty results upon fetch error or state change.
- A previous map-marker fix was reported as passing tests but production later showed 0 schools. Require deployed-site smoke tests with the same selection/zoom states and cache considerations, not just passing unit tests.
- Data confidence: include source URL, publisher, update/check date, reference period, geographic resolution, completeness, limitations, and interpretation note for every derived layer.
- Cartography: missing data remains **unfilled/neutral**; increasing verified adverse risk moves toward **red**. Never merge `unrated` with `no data` in one legend entry; avoid blue-to-red ambiguous scales.
- Accessibility and performance: independent lazy-loadable overlays; loading/error/empty status; keyboard-friendly toggles; responsive legend; avoid loading nationwide incident point clouds on initial map. Use spatial simplification/tiles or aggregation only where statistically valid.
- No fabricated numbers, artificial ranking, inferred person-level claims, or precise claims derived from coarse aggregates.
- Record source-to-transformation-to-UI lineage and include regression tests in each feature PR.

## 7. Recommended execution sequence for the next Claude/GPT agent

1. Inspect `main`, active PRs/issues and deployed `https://kevinim.github.io/` and revalidate school P0 problems and current school map; **do not mistake this roadmap for completed work**.
2. Create separate issue/branch for P40 only after checking roadmap/numbering and the existing commute implementation. Source viability / API pricing first; then UI + formulas + coverage tests.
3. P41: CMS/DSHS source audit and facility model; route-time service only if licensed and available.
4. P42: geospatial join feasibility and utilities geography, publish only defensible indicators.
5. P43: build source inventory and ingest/QA pipeline only; reserve any safety visualization for a separately approved phase.
6. For each shipped feature: review source freshness and ethics/privacy, run automated tests plus deployed smoke tests, document deltas and actual commit/PR/deploy status. Do **not** auto-promote plans to completed states.

## 8. Status at handoff creation

- Approval: conceptual feature priorities and boundaries accepted by user.
- Done in this task: written agent handoff only.
- Not done in this task: public datasets downloaded, API integrations, UI/code updates, new tests, PR merges, production deployments.
- Existing active PRs, code state, data freshness and deployment status can change; re-check before executing.

This document is an execution backlog and context bridge, not a claim of built features.

## P43 pilot acquisition status — update 2026-11-07

The original handoff above recorded planning decisions before acquisition. A subsequent **P43 data-only pilot** now stages seven source-specific aggregate files under [data/crime/](data/crime/) and a provenance matrix in [data/crime/README.md](data/crime/README.md):

- Dallas: 2021–2026 published offense-category counts (317 groups); 2025 ZIP × category counts (1,216 groups), with small cells suppressed. **Not full crime coverage** due to source public-release exclusions.
- Fort Worth: 2021–2026 published offense-type counts (3,764 groups); 2025 Police Beat totals (104 retained groups). A `Beat × Offense` API grouped query silently ignored paging offsets, so **do not use it** until redesigned.
- Frisco: 2025–2026 offense group aggregates (54 groups), only Nov 2025–Nov 2026 represented in current source; both years partial.
- Plano and McKinney: 2021–2025 annual totals transcribed from official police year-end PDF reports (5 rows each); category definitions are **not fully comparable across cities**.
- **Unresolved:** Allen authoritative counts and conflicting secondary-source numbers; Prosper/Celina/Lewisville/CFB and other DFW; sub-city geometries, normalization, source licensing/refresh policies, population denominators, completeness by offense/year.

Reproducible snapshot validation: `node scripts/check-crime-staging.mjs`; GitHub Actions `.github/workflows/verify-crime-staging.yml` (PR/push data-only QA). The row count is **5,465 aggregate groups**, not incidents. No names, incident IDs, precise addresses or coordinates saved; no JS map integration/deployment authorized. This addendum documents **partial progress only**, not completion of P43 or the map.

## 2026-11-08 implementation update — Work marker + P40/P41/P42 user panels

**Production target:** https://kevinim.github.io/ — source commit `7ba5f1c6675fc8e96829165d825506641a7d7bae` via PR #63; page build/deployment succeeded, full PR browser tests succeeded. Always revalidate the current main when resuming.

### What is built, not merely proposed

- **Map work-destination pin:** `features/commute/workplace-marker.js` creates one recognizable blue briefcase `직장` marker, reused by `index.html` for ZIP-to-office and `home-lookup-v2.js` for house-to-office routes. Prior map layer and school functions retain their IDs and handlers.
- **Monthly commute + toll:** `features/commute/cost-model.js` (from PR #57) plus the collapsible `통행료 · 월 출퇴근 비용` section in `features/dashboard-extras.js`. The user must supply per-direction NTTA TollTag quotes, can select TollTag/ZipCash/ZipCash AutoPay, input separately quoted variable TEXpress lanes, office days, MPG/fuel and parking. Existing OSRM route distance fills a **clearly labeled symmetric return-distance assumption**, editable by the user; stale automatically filled miles are cleared when ZIP/destination changes. **No automatic NTTA quote or toll-free alternate route or peak traffic forecast.** A missing toll quote yields no final total rather than a fabricated $0.
- **Healthcare:** `data/healthcare/cms-dfw-hospitals-2026.json` contains 104 CMS registrations across 12 DFW counties (87 labeled emergency services). The new `병원 · 응급실` panel lists by **facility city** and ED flag and offers external Maps links. This is **not** distance ranking, 24/7 certification, pediatric/trauma designation or verified 15/30-minute emergency travel time. The standalone `features/healthcare/access-core.js` is preserved for later time-calculation coverage.
- **Electric grid / winter:** `data/resilience/eia-texas-grid-reliability-2024-2025.json` and the `겨울한파 · 전력 인프라` panel show statewide SAIDI/SAIFI with/without major events. **No utility service territory, local outage duration or Winter Storm Uri address score.** Existing FEMA/NOAA data remains separate and should not be relabeled as electricity outages.
- **Already deployed surrounding UI:** PR #60 colored existing map hazard/crime controls; PR #61 school settings regrouping and inline address search clear; PR #62 CSS cache bust. Existing FBI Crime Map is present independently from P43 police source ingestion.

### Evidence

- Previously staged backend/source PRs: #57 (toll cost core), #58 (CMS facility inventory), #59 (Texas EIA/ERCOT scope metadata), all merged.
- UI integration: #63, commit `7ba5f1c`. Seven GitHub Actions checks passed, including real Chromium browser interaction for toll math, missing quote behavior, CMS city filter, EIA two-year display, mobile widths and legacy school/FEMA/Crime overlay regression.
- `features/dashboard-extras.css`, `features/dashboard-extras.js` and `features/commute/workplace-marker.js` contain the actual UI/marker code; avoid a second competing UI implementation.
- The marker is shared by `drawSelectedRoute()` and `calculateHomeCommute()`. The latter's cache-busted source is `home-lookup-v2.js?v=15` as of this release.

### Remaining development candidates — not completed

1. **Toll:** licensed or official per-gantry NTTA route calculator integration and accurate outbound/reverse-route tolls; independent TEXpress time-sensitive prices; genuinely toll-free routes; historical AM/PM traffic and bottleneck reliability from suitable provider.
2. **Healthcare:** DSHS trauma-level identity matching, facility location geocoding/quality review, freestanding ED + pediatric facilities, verified provider status; accurate routed 15/30-minute ED accessibility for selected home/ZIP.
3. **Resilience:** FEMA 2025 cold-wave/ice-storm/winter-weather hazard at known geography, EIA Form 861 utility-level rows, actual service territories, verified 2021/other storm outage footprints. Never infer a neighborhood blackout score from Texas state averages.
4. **Crime:** reconcile FBI city data against local agency records and missing periods, preserve source definitions, obtain comparable sub-city polygons; severity model and any new heatmap need separate user approval.
5. Keep P0 Allen schools and map viewport/marker-count smoke tests gating releases; no new overlays may clear school layers.

This addendum supersedes the historical **'no implementation'** status lines above where they conflict. The earlier architectural acceptance criteria remain useful for unfinished subfeatures.

### Post-deployment smoke check (2026-11-08)

- GitHub Pages deployment for `7ba5f1c`: **success** (run #42509138767).
- Independent live-browser check: the TollTag sample (20 office days, roundtrip 20/25 miles, 30 MPG, $3/gallon, $1.25/$1.75 per-direction TollTag) produced **$150/month** ($60 toll + $90 fuel); clearing return toll produced `미확인`, not $0.
- Live CMS city filter: **PLANO displayed 7 emergency-service-flagged CMS entries** with links (not necessarily every operating ER in Plano).
- Live EIA panel: **2024 & 2025 Texas-state SAIDI/SAIFI displayed** with the explicitly statewide-only disclaimer.
- The live-browser run **did not draw a real commute route** or switch from West Plano to Allen ZIP 75013; do **not** misreport this run as visual confirmation of work destination pin placement or Allen-specific live school markers. The shared work-pin source and marker constructor passed unit/browser integration checks, and school/viewport regression passed in the PR Chromium suite. If needed, run targeted production route+Allen smoke separately.
- Exact smoke log: https://agent.tinyfish.ai/runs/4e9545bf-35c2-4f86-8c55-214b7b2e7d48

