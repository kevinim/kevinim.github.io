# DFW school-zone source gaps and real public single-family address crosschecks — 2026-11-09

## Scope / duplicate-work prevention
- **Depends on PR #160** (107/108 district parent source paths). Current production / PR #166 currently display fewer registered links; do not confuse staged future coverage with deployed coverage.
- **Do not duplicate PR #165**: it already tests Frisco public apartments and separately listed Frisco single-family property map candidates with live Esri.
- **Do not duplicate PR #167**: Dallas school campus IDs, Northwest stale GIS quarantine, ArcGIS false-positive source research. Dallas official polygons are being staged in #164.
- **CFB single-family official Finder only:** new test uses at most two explicitly advertised, publicly listed single-family properties, no name/student/unit and no bulk derivative GIS harvesting.
- **Allen listed residences:** compare six public active listing street addresses against the official district street-range data cached from 2026-11-06; source year is not stated, so this validates *row coverage* but not 2026-27 enrollment or current map geometry.
- No merges, production sign-off, paid GIS, license waivers, or personal household data.

## 108 ISD source-cause counts from PR #160
Run `node scripts/audit-dfw-108-school-zone-root-causes.cjs`. Output: `artifacts/dfw-cause-audit/full-108-district-root-causes.json`, including all 108 district codes, official link status, reason category, source-vintage caveats, and next action.

| Classified dashboard problem | ISDs | Interpretation |
|---|---:|---|
| Parent route connected; campus geometry not onboarded | 100 | **Not imported in this map**; this is NOT evidence no public GIS exists |
| Historical GIS only | 1 (Allen) | Old campus polygons must not be certified 2026–27 |
| District Finder-linked layer year not independently confirmed | 2 (Plano / Lewisville) | Current Finder exists, but geometry provenance/year requires review |
| Existing 2026–27 geometry source requires fresh check | 2 (Frisco / Prosper) | Known source with reference-year evidence, not residential enrollment proof |
| Dynamic Finder source may drift | 1 (McKinney) | Recheck its current web GIS service before relying on snapshot |
| Student choice rather than default street-zone model | 1 (Garland) | Not every school is assigned by an attendance polygon |
| Parent route still unverified | 1 (Chico) | Official family route/manual inquiry not yet verified |
| **Total** | **108** | No districtwide household assignment certification |

The 100 includes Dallas and CFB (where parallel GIS work exists). These counts are *dashboard source integration statuses*, not proof of source availability at the district. **No 108-district exact-address accuracy percentage can be asserted.** The 11-county TEA county-of-record denominator has cross-county limitations.

## Public single-family QA scope
**CFB live native Finder**: `2705 Raintree Dr` and `2201 Yosemite Ct`, Carrollton TX 75006. Source listings: [HAR recently listed](https://www.har.com/just-listed-homes-for-sale-75006) and [HAR 75006](https://www.har.com/zipcode_75006/realestate/for_sale). A 3-level result is counted only if an actual GuideK12 suggestion is clicked and one explicit Assigned school K-5 / MS 6-8 / HS 9-12 is returned. No geometry is imported or inferred. If the browser service is unavailable or doesn't recognize the exact address, record INCONCLUSIVE, not no assigned school.

**Allen public listed houses**: six single-family addresses sourced from [HAR Allen listings](https://www.har.com/houses-for-sale-75013) and [HAR Allen city page](https://www.har.com/allen/realestate/for_sale). Address-to-numbered-street-range matches from the district [Find a School](https://www.allenisd.org/page/findaschool) snapshot are recorded with **school year unspecified**. School names and range must remain independent of historic Allen campus polygon shapes. This does not certify current 2026–27 status.

## Release conclusion
- Official source path ≠ district-level attendance polygon ≠ property assignment ≠ enrolled student eligibility.
- All evidence here is for free read-only QA; it is **not** a substitute for the independent reviewed residential evidence required by #148.
- Current public map continues to show CFB as Finder-only with no fabricated polygons.
- No direct residential applicant identity is needed or collected.

## Executed evidence — latest CI

[Free GitHub Actions run 42655279646](https://github.com/kevinim/kevinim.github.io/actions/runs/42655279646): **three jobs passed**. Artifacts: `dfw-all-108-root-causes-and-allen-public-listings`, `allen-public-single-house-real-browser`, `cfb-listed-single-family-official-finder`.

- **District missing-reason census:** 108 public ISDs, 107 registered parent guidance routes, Chico sole unregistered (three TEA campus records). 100 districts contain 1,582 TEA campus rows for which this dashboard has no onboarded campus GIS; *this is not proof GIS is unavailable*. Historical-only Allen = 1 district; current layer-year unknown Plano/Lewisville = 2; live dynamic McKinney reference = 1; current-year Frisco/Prosper source requires refresh = 2; Garland choice system = 1.
- **Allen residential source-table test:** six publicly advertised single-family homes, **6/6** matched exactly one district street-number-range row. `1808 Port Isabel Dr, Allen, TX 75013` independently passed actual Chromium dashboard input using **live Esri geocode**, in both **390px and 1366px** views. The app mapped source-table candidates Evans ES/Ereckson MS/Lowery freshman/Allen HS, displayed 4 matching campus labels, and a real school-list button click rendered an **historical** boundary polygon with a disclaimer. **The official table's academic year is unspecified; no current 2026–27 assignment, historic GIS currency or enrollment eligibility is certified.**
- **CFB actual publicly advertised single-family houses checked with native, live district GuideK12 UI:** `2705 Raintree Dr` -> Country Place Elementary / Polk Middle / Newman Smith High; `2201 Yosemite Ct` -> Blanton Elementary / Perry Middle / Newman Smith High. Each native autocomplete result was clicked and one explicit Assigned school was read at each of elementary/middle/high. **2/2 successful address-specific official Finder UX samples; 0 independently verified current campus polygons and 0 confirmed student enrollment cases**. Source UI year not explicit. The current dashboard must remain Finder-only for CFB; do not draw inferred outlines or claim automatic address assignment.
- A previous early CI `42654547946` classified CFB Finder results as INCONCLUSIVE because the test had not waited for delayed native input hydration; the test was corrected and subsequent live runs 42654864966 and 42655279646 observed explicit 3-grade native results. Never count the earlier inconclusive attempt as a failed enrollment match.

**Release decision remains NO-GO.** Next missing work is independent 2026–27 vintage confirmation, official GIS and redistribution permission where needed, and cross-source residential holdouts for all 3-4 grade bands. Cross-PR compatibility with #164/#167/#165 is not automatically established by this dependent branch.
