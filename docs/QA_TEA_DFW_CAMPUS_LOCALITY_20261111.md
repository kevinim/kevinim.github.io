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
