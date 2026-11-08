# P41 — CMS hospital and emergency access data (2026-11-08)

**Status updated 2026-11-08:** CMS facility **city-search listing** (PR #63) and **separate hospital map layer** (PR #66) are deployed. Census address-range coordinates available for 83 of 104 facilities; 21 remain unmatched. DSHS verified 288 state-designated trauma facilities and EXACT name/city/ZIP matches for 34 CMS registrations. Actual driving times, precise ED entrance coordinates, verified 24/7 status and unmatched trauma designations are still unavailable.

## Official CMS acquisition

- Dataset: https://data.cms.gov/provider-data/dataset/xubh-q36u (Last modified July 22, 2026; released August 13, 2026).
- API: https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0
- Query: two equality conditions, `state = TX` and `countyparish = COUNTY`, 1000 row limit; count reconciled for each county.
- Scope: Collin, Dallas, Denton, Tarrant, Rockwall, Ellis, Johnson, Kaufman, Parker, Wise, Hood, Hunt.
- Results: 104 distinct CMS facility IDs; 87 marked Emergency Services = Yes, 17 No.
- **CMS IDs can be alphanumeric:** for example, 45066F. Do not cast them to numbers.
- `data/healthcare/cms-dfw-hospitals-2026.json` preserves public identity, address, phone, hospital type and emergency-services yes/no. All trauma levels, geocodes and operating-hours fields are null.
- **Zero CMS records in Wise County does not mean no emergency services there.** CMS registered hospitals omit freestanding ED, non-Medicare or other care services.

## Separate Texas trauma source

Texas DSHS Texas Trauma Facilities: https://www.dshs.texas.gov/dshs-ems-trauma-systems/trauma-system-development/texas-trauma-facilities — dated October 28, 2026 at retrieval. Level I–IV designations and facility names/ZIPs are on that page. **Not yet parsed or matched to CMS facility IDs**, and identity matching must be reviewed.

## Access measurement core

`features/healthcare/access-core.js` exports `summarizeEmergencyAccess(facilities, travelMinutesByFacility)`.
- Route-minute values must come from a verified routing provider; **no coordinates/ETA are inferred**.
- 15-minute and 30-minute ED counts are **lower bounds** when routing is incomplete. `nearestKnown` is not a verified nearest actual emergency facility unless data coverage is complete.
- Test: `node --test tests/p41-healthcare-inventory.test.cjs`.

## Remaining work

1. Source and reconcile DSHS trauma facility list to hospitals by city/address/ZIP; no automatic guess from hospital brand.
2. Geocode addresses with quality indicators and deduplicate campus locations.
3. Expand care coverage to freestanding EDs and pediatric facilities using separately verified sources; ED flag is not a guarantee of 24/7 services.
4. Integrate actual driving-time routing (OSRM traffic-free if suitable; traffic-aware only when available and licensed); do not label straight-line distance driving time.
5. Add an isolated hospital layer after the Claude layout/handoff session stops changing shared files.
6. Browser QA, existing school/hazard/crime overlays regression, eventual production deploy.

This branch has no modifications to index.html, HANDOFF.md, crime, school, FEMA, or P40 files.

## PR #66 completed additions / pending QA

- `cms-dfw-census-points-2026.json`: official U.S. Census interpolated locations for 83/104 CMS entries, 21 unmatched and deliberately unplotted. **Census geocoder produces address-range estimates**; not verified facility entrances or drive-time destinations.
- `dshs-trauma-facilities-2026.json`: 288 DSHS facility rows, 22/31/62/173 Level I/II/III/IV. `dshs-cms-exact-matches-2026.json`: 34 strict verified matches; missing join means **unknown**, not No.
- `features/healthcare/map-layer.js` browser map uses these files, filtering ED flag and selected city. UI is already deployed; earlier 'add hospital layer' steps above are now obsolete. Validate current operations before working on route ETA or trauma enrichment.
