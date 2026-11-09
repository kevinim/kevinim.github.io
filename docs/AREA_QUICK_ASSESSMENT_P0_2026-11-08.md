# TX P0 — Existing dataset inventory and quick assessment (2026-11-08)

## Purpose
Replace redundant four top demographic KPI cards **visually** with a small ZIP-level evidence summary under the existing address search. Do **not** infer individual rental property conditions, school assignment or a combined neighborhood suitability/safety score. Rental/real-estate cost is explicitly deferred.

## Verified against repository main source (not independent publisher recertification)

| Existing asset | Recorded coverage | UI handling | Provenance / limitation |
|---|---|---|---|
| `dfw-demographics.json` | 292 ACS 2024 ZIP/ZCTA profiles | Remains in map/detail/comparison, not repeated as top KPI | 2020–2024 ACS; ZIP estimates |
| `tea-ratings-2026.json` | 2,282 preliminary campus records: A 543, B 733, C 554, D 247, F 67, Not Rated 138 | Only **schools located inside the selected ZIP boundary** are counted; unique verified rating match | Location is not student assignment; unrated/missing match excluded from rated denominator |
| `school-data-provenance.json` | 6 primary ISDs with separate source status | Existing boundary + official Finder remain the authoritative inspection flow | Frisco/Prosper 2026–27; Plano/Lewisville current-Finder-linked with vintage caveats; Allen historical geometry only; CFB address Finder only |
| `data/dfw-crime-zip-cities-2023-2025.json` | 310 ZIP overlap profiles / 133 cities; FBI 2023–2025 | Major municipality's 2025 violent/property reports per 100k, **only when >=50% ZIP overlap** and sufficient reporting; otherwise unknown/mixed | City-level police data is **NOT** ZIP/address-level safety. No new P43 map/score |
| `data/noaa-storm-events-dfw-2024-2025.json` | 90 county/year/category rows, 12 counties, 5 event categories | Selected ZIP's primary county: 2024–25 hail/flood reported event counts | NOAA event reports, not risk probability, non-reporting != safety |
| `county-scopes.json` | ZIP-to-primary county mapping | Identify NOAA county | Cross-county ZIPs are approximate |
| `jpm-road-times-2026-11-04.json` | 292 ZIP representative point road times | Show only when user-selected destination exactly equals cached JPM Plano destination | OSRM/OSM, retrieved 2026-11-04, excludes traffic |
| `data/phase2a-fema-nri-dfw-2025.geojson` | 2025 NRI tract-level map already in app | **Map navigation only**; this P0 UI does not generate a risk score from tract geometry | Census tract risk is not address/parcel flood designation; dataset's feature count not reverified in this audit |
| NFHL on-demand query / existing school maps | Live providers and historical reference geometry | Keep unchanged; only turn on existing map layers through user click | Network/provider data may differ from repo snapshot |

## Rule thresholds, explained
- School counts use existing school location points + existing ZIP polygons, and uniquely linked 2026 TEA grades. They do not indicate assignment or school suitability.
- Major-city FBI summary requires municipality coverage share >= 50% and outside-city coverage < 50%. Otherwise label mixed/unknown; never translate missing rates into safe/low.
- NOAA counts cannot be mapped to an individual ZIP or property; they are reported for the *primary county*. Zero reported is not zero risk.
- Existing FEMA/NFHL and school boundary source labels and toggles are not modified.
- Commute static baseline applies **only** to the exact cached JPM office; for other destinations the user must use route calculations.
- No composite danger rating; no “safe”/“good school” claims; no rent, purchase cost, HOA or insurance calculation.

## UI and regression requirements
1. Keep `k-zip`, `k-area`, `k-korean`, `k-households`, `k-income` in the DOM to avoid breaking `renderData()`; hide only the obsolete visual KPI group.
2. Independent files loaded after main bootstrapping; no edits to marker, polygon, geocoder or selected-area map zoom logic.
3. Read-only summary per selected ZIP, and action buttons to scroll to existing school/flood/crime/commute map controls; do not automatically fetch external providers.
4. Unavailable source or missing school polygons/rating matches => '확인 필요'; never 0 as risk.
5. Desktop/mobile and Allen marker/boundary regressions are release blockers; review after PR #88 security bootstrap refactor is reconciled.
6. No merge or Pages deployment from this PR until CI, browser checks and dependency review complete.

## Out of scope / audit confidence
Dataset counts above were computed by parsing tracked repository JSON, **not by rechecking publishers live**. The huge FEMA GeoJSON source was not reparsed for independent tract count here. County-level NOAA and city-level FBI do not certify a region's relative safety or an individual's property. A later dedicated data QA can revisit spatial overlaps and period freshness.
