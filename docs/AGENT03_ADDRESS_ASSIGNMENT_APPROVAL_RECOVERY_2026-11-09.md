# Agent 03 — Concrete path from NO-GO to individually reviewed address-school evidence
Date: 2026-11-09. QA-only child of #162, tracked in Draft #178. No production code or GIS source changed.

## Independent gates (do not conflate them)

| Gate | Test & evidence | Decision |
|---|---|---|
| UI stability | 6 public apartment base addresses × 2 Chromium viewports; 6 clear/re-search/cancel scenarios | PASS_TECHNICAL_QA_ONLY when all 18 tests green |
| Default apartment zoning | Complex name or street/base location; no blanket unit number required | A unit is needed only for a district-published split applying to that complex |
| Exact official address resolution | Selected precise street and ZIP in the district-published current-year school locator; map center must match geocoded dashboard point within 75m | Else NO-GO for that sample; never trust random map clicks |
| Official school-grade labels | Official Finder attendance-zones popup as actually rendered, compared separately for elementary/middle/high (and 9th/senior where applicable) | Unambiguous school names must match; mismatch is a failure, not an automatic suggestion |
| Current-year GIS source | Visible actual campus polygon for every level with 2026–27 authority; no 2025–26 promotional relabeling | Older/unknown GIS remains map reference, NO-GO for current-year boundary certification |
| Production/family release | PR #148 seven-ISD 3 publicly verifiable residential examples each, ZIP diversity where geography permits, independent reviewer, exact integration SHA, all upstream CI | Remains NO-GO until separate owner review and explicit merge/deploy approval |

## Current technical evidence

Original #178 head a8f1050e (GitHub Actions #42678475015) passed both jobs: actual dashboard address browser 18/18; 3/3 official district locator portals accessible. McKinney and Lewisville map popups exposed elementary/middle/high candidate school labels for four public addresses. This is **not yet** a certified match to the selected address: the test clicked a fixed screen offset and did not confirm the point position. Plano Welcome carousel blocked its school-list selection. Do not count such popups as verified merely because the names appear.

## Changes to close the remaining testability gaps

1. Convert visible official attendance-zone popup text into an explicit three/four-level school comparison; reject missing grades, incomplete popup, ambiguous or differing school names.
2. Capture the official locator map center through its in-browser ArcGIS map object and the dashboard's live Esri address point. Enforce <=75m geospatial agreement before an official-popup school comparison can be counted.
3. Compare the source-year label for each campus separately. McKinney publishes 2026–27. Plano dashboard linked polygons still say 2025–26. Lewisville high layer says 2025–26 and elementary/middle layers are unverified. Historic geometry must not be treated as current.
4. Inspect the Plano welcome-overlay DOM; click a verified live control and confirm it disappears before entering the address. If still blocked, retain NO-GO with screenshot and reproducible reason.
5. Collect short-retention GitHub Actions JSON/screenshot evidence. Never store a person's actual apartment unit, or push secrets, addresses or PII of real private residents. Public leasing-office complex addresses are permitted in fixtures.
6. Have #148 and Agent 07 review the final upstream integrated SHA and gate after this QA child produces clean evidence. Do not merge Draft #178 to main merely on green QA.

## Outcome classification

- OFFICIAL_UI_AND_DASHBOARD_CURRENT_GIS_CORROBORATED: official district UI actually produced school names at the selected exact point AND current GIS matched. This is a strong address-level **corroboration only**, not student enrollment eligibility or seven-ISD release approval; source vendor may be shared.
- SCHOOLS_MATCH_BUT_GIS_YEAR_NOT_CERTIFIED: school names match, but old/unknown polygon vintage prevents current-year boundary signoff.
- OFFICIAL_FINDER_DASHBOARD_SCHOOL_MISMATCH: definite discrepancy; block that address.
- OFFICIAL_MAP_CENTER_NOT_ADDRESS_VALIDATED: cannot prove the district popup was at the intended house/complex; do not count match.
- Missing Finder output / incomplete school grades / unavailable map / browser error: NO-GO with exact reason, not an assumed school.

No user action, payments, GIS polygon fabrication, or draft branch merge is authorized by this QA activity.
