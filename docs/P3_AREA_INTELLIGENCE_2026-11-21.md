# P3 Area Intelligence — regional quick assessment enhancement

**Date:** 2026-11-21  
**Scope:** Add emergency-care and winter-hazard access to the existing six-section (formerly four-card) read-only regional quick assessment. No school assignment data, map geometry, user addresses, or traffic provider settings are changed.

## Delivered on this branch

- **Healthcare quick check:** Reuses the existing `HospitalNearbyReference.rankNearbyCMS` implementation and the 2026-11-08 CMS/Census snapshot. When the assessment becomes visible, lazily load and validate the 104-record CMS source (83 approximate Census-geocoded facilities, 21 without safe map coordinates; the currently mapped emergency-services subset is 67). For a selected ZIP, rank only CMS `emergencyServices === true` facilities with verified approximate coordinates, and report the nearest **among those mapped facilities** by straight-line miles. A link opens the existing hospital details/map and switches the detailed list to the selected ZIP nearby view.
- **Winter-hazard quick check:** Connect the existing FEMA 2025 NRI Census-tract Cold Wave / Ice Storm / Winter Weather map and the separate EIA Texas-level reliability context. Show this as **map reference**, not a computed ZIP/address risk score or blackout probability.
- **Source guardrails:** Both quick checks retain publisher, snapshot year and geography/precision limitations. Missing CMS data yields `unknown`, not a default low-risk result. Neither display claims a currently operating 24-hour ED, fastest route, 15-/30-minute isochrone or address-level power outage history.
- **UI:** Six read-only actions; existing school/NOAA/crime/commute entries preserved. Hospital data is lazy loaded, no external browser API or user-address request is added. Reference-only state has distinct styling and remains keyboard actionable.

## Verification to run before merging

1. `node --test tests/area-assessment.test.cjs tests/area-regional-coverage.test.cjs tests/p41-nearby-hospital-reference.test.cjs tests/p42-resilience-scope.test.cjs`.
2. `node scripts/verify-main-data.mjs`.
3. `node scripts/test-area-assessment-browser.cjs` at mobile 390px and desktop 1280px, plus `node scripts/test-healthcare-winter-map-browser.cjs`. Check selected ZIPs 75013 (Allen), 75034 (Frisco), 75093 (Plano) and 75006 (Carrollton); ensure non-zero school markers and no horizontal overflow.
4. After main deploy, live Pages smoke testing is required. A passing branch test is **not proof** of successful production deployment.

## Explicitly outstanding / not in this change

- Genuine routed hospital/ER travel-time and 15-/30-minute driving access, verified current ED entrances and freestanding ED/pediatric coverage.
- Address-to-utility service territory and utility-specific outage history; PUCT restricted GIS is **not** redistributed.
- Traffic-dependent commute reliability and official per-route NTTA/TEXpress toll quotes.
- P43 crime datasets remain source preparation only; do not invent new neighborhood safety ratings or publish a new severity heatmap.
- No commercial API subscription, secrets, personal-home geocoding, or housing-cost feature is introduced.

**Source files:** `features/area-assessment-core.js`, `features/area-assessment.js`, `features/healthcare/map-layer.js`, `features/resilience/winter-map.js`, `data/healthcare/cms-dfw-census-points-2026.json`, `data/resilience/fema-nri-dfw-winter-2025.json`, `HANDOFF.md`.
