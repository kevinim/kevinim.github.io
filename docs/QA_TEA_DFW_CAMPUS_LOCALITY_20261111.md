# TEA school campus locality vs DFW relevance — independent QA, November 11, 2026

**Verdict: CONFIRMED DATA QUALITY DEFECT IN GEOGRAPHIC INFERENCE; NO DEPLOY OF ADDRESS/LOCALITY CLAIMS UNTIL FIXED.**

This PR is independent, read-only QA evidence and tests. It does not modify `tea-ratings-2026.json`, the shared DFW school map, school assignment algorithms, TEA academic/PEIMS data, other Agent branches, or `main`.

## Primary evidence
- The live `tea-ratings-2026.json` inventory has **41** TexasWorks campuses in district **061806** and sets each record's `districtCounty` to **DENTON**.
- The official 2026 TEA Final AEA Campus List includes TEXASWORKS–SAN JUAN campus **061806015**. The operator's current campus directory places it at **1202 E Business Hwy 83, San Juan, TX 78589**, outside Dallas–Fort Worth.
- The same school network has TEXASWORKS–MESQUITE campus **061806021** at **3733 W Emporium Cir, Mesquite, TX 75150**, in DFW. **Do not exclude all 41** simply because one is out of region.
- Official campus IDs and report grades remain valid statewide identifiers; `districtCounty` records the network's administrative district affiliation, **not each branch campus's physical county or residency eligibility**.

Original references:
- 2026 TEA official final AEA campus list (page 14 for San Juan): https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-final-aea-campus-list-updated.pdf
- TexasWorks operator Find a Campus: https://texasworks.com/learning/landing-page-find-a-campus/

## Acceptance policy for geographic UI
1. Separate **official statewide TEA inventory** from **physically verified DFW school layer**; do not infer geography from school names, administrative district county, 6-digit district IDs or ratings.
2. Mark unknown-location campuses as pending; do not show unverified entries as "near my home" or local district suggestions.
3. An actual campus in DFW **does not establish residential attendance assignment**. Only current official district assignment Finder or boundary evidence may certify a searched home's school assignment.
4. Distinguish open/closed/new, special alternative/adult programs and grade spans separately; do not present dropout-recovery campuses as typical K–12 zoned schools.
5. Keep official source URL, campus ID, verified campus street address, source timestamp and 2026 record status.
6. Before merging any school-geography UI PR run actual 1280px desktop + 390px mobile/dark mode tests, and school-address search → official assigned-school Finder regression with public sample residences.

The two supplied exceptions are independently sourced examples, **not an exhaustive review** of the other 39 TexasWorks campuses or all 2,282 dashboard campuses. The helper returns `not-assessed` for any other campus; it must **not be used as a blanket filter in the live app** until broader locality evidence exists. It never returns a verified home assignment.

## Independent tests

`node --test tests/qa-tea-campus-locality.test.cjs`

Four negative/positive checks reject the incorrect county-based DFW conclusion, prevent a school location from being equated with a home-school zone, reject unverified campus/host/identity tampering and retain the genuine Mesquite locality example. All tests are offline and use the free built-in Node runner. CI is read-only with no deployment privileges.

**Release blocker:** do not approve map/nearby/home-school assignment claims until the complete school-campus locality and official attendance boundary crosswalk is validated.

## 2026-11-11 follow-up: 41-campus operator-directory locality overlay

The initial independent QA checked San Juan and Mesquite only. A separate **source-labelled, conservative informational extension** is now maintained in `data/tea-texasworks-locality-2026.json` and displayed only in the *collapsed DFW school coverage table*. This extension crosswalks the existing 41 exact 2026 TEA campus IDs and names to operator-public campus location city/ZIP listings. It does **not** change the official `tea-ratings-2026.json` source, the original 11-county administrative proxy denominator (2,182), the district guidance matrix, school/zip boundaries, or the academic/PEIMS data.

| Scope from published operator site | Campuses | Source and interpretation |
| --- | ---: | --- |
| Operator address in the 11-county DFW MSA | **6** | DeSoto, Arlington, Mesquite and Fort Worth (Southside, Camp Bowie and Jacksboro) |
| Operator address outside the specified 11 counties | **34** | Includes San Juan and Granbury; Granbury is in Hood County, outside **this 11-county definition**, even though it is in the wider North Texas region |
| Pending exact name/ID match | **1** | TEA `061806029` is **TEXASWORKS - EARLY**, but operator page labels the matching city-address facility `Brownwood` at an Early TX street address. Do not silently assert a one-to-one campus identity; keep as unresolved |

**Original source:** [TexasWorks official published campus directory](https://texasworks.com/learning/landing-page-find-a-campus/). The previous [TEA Final AEA 2026 list](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-final-aea-campus-list-updated.pdf) confirms program and TEA ID context, but **does not identify physical building coordinates or establish a residential attendance zone**.

This is **operator-address municipality and ZIP matching** rather than independent rooftop coordinate/parcel QA, and **not proof of current campus operating status**. The exact ZIP-to-11-county classification should be independently rechecked against county/point evidence before using it for geographic filters or a revised DFW numerator. This extension purposely does not rewrite 2,182 source-count records to 2,147, which would falsely imply that all other campus locations have been fully checked. The one unresolved early-campus alias and campus-county mismatch remain visible.

For safety, the dashboard panel only loads the extra file after the user opens it, validates all 41 IDs, status totals and the approved operator URL, renders content using text nodes, and fails closed to an explicit *location unverified* notice if the optional evidence is missing or malformed. Each source file change must pass Node tests, strict-CSP/XSS, mobile 390px/desktop 1366px browser regression, and post-release Pages smoke. The actual home-school assignment gate remains **NO-GO**.
