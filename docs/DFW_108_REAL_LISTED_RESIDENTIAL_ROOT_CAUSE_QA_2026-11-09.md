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
