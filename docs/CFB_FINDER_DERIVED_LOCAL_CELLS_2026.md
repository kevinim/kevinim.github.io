# CFB official Finder → small evidence-backed reference cells (offline pilot)

**Status on 2026-11-09: engineering and negative QA only; zero real CFB estimated polygons generated, reviewed, published or released. NO-GO.** Separate PR #149 contains the UI provenance distinction; this implementation adds a deterministic offline candidate generator without querying GuideK12 or publishing map layers. This four-file, QA-only module is independent of the closed/unmerged #149 UI proposal. It does not change the dashboard's map or its district school assignment policy.

## Sources: boundary vs actual school-zone authority

- [CFB official School Search](https://www.cfbisd.edu/students/school-maps-locator-system): district-operated Finder reflects Board-approved attendance zones from **March 6, 2025**; 2026–27 registration is advertised. The exact current applicability for each grade and special program still needs source verification.
- [CFB 2025–26 approved attendance zone changes](https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning) contains **school-by-school** changes, but image maps are not a verified current-year GIS data export.
- [TEA School District Locator FAQ](https://tea.texas.gov/families-and-students/school-district-locator/school-district-locator-faq) clarifies that **ISD district borders and individual campus attendance zones are different** and TEA does not collect the latter. Do not use TEA or county district polygons as elementary/middle/high zones.
- [GuideK12 Terms](https://app.guidek12.com/ahsd/school_search/2022/terms_and_conditions.html) describe intellectual-property restrictions, prohibit reverse engineering of the service, and require conspicuous GuideK12 attribution for redistributed information. This linked historical terms page is *not* proof of current bulk sampling permission for CFB. Obtain written district/vendor permission, confirm exact allowed collection/derivation/publication, and respect limits **before** any automated/bulk sample collection.

## Baseline evidence already in the repository

`tests/cfb-official-resident-finder-verified-2026-11-07.json` records two **public-property** test addresses for which GuideK12 native address autocomplete was used correctly. One is a public school campus (not residential), and one is an advertised apartment complex base address (the exact unit is not verified). Both are in ZIP 75006. These are useful source sanity checks but provide **only one potentially qualifying public-residential base address**. A single point, no independent residential holdouts, no multiple ZIPs, and no area-wide sample grid cannot support a claimed attendance polygon. Current observed CFB campus polygons: **0/30** in the earlier browser reference; this count is not a DFW-wide polygon measurement.

2025–26 approval documentation explicitly lists Lux on Main for Carrollton Elementary and Smith feeder changes, consistent in direction with the apartment-base official Finder sample for Carrollton/Perry/Newman Smith. This cross-document consistency is limited to that public address and cannot resolve the separate Farmers Branch elementary feeder disagreement described in the source audit.

## Implemented conservative candidate generation

`scripts/build-cfb-finder-derived-cells.cjs` reads a **separately authorized, noncommitted** file from `artifacts/`. It makes **no API requests**. It requires:

1. Independently reviewed written sampling/derived-visualization permission with a verifiable authority reference, a current source year and fresh metadata.
2. Only publicly listed residential **base** properties without unit numbers or personal address text; record an opaque sample ID, public Finder native-autocomplete proof reference, timestamp, coordinates, and exact assigned TEA campus identities at elementary/middle/high levels.
3. Every candidate rectangle is 20–125 metres on each side and lies inside a conservative CFB-region bounding box. Geographic points must cover all **four corners and center** (5 training observations), with at least **3 separately reviewed spatially diverse holdouts** per cell.
4. All training/holdout addresses must return the exact same assigned campus **for each level**. One mismatch, a missing source, reused address/point, overlapping cell, old evidence, different source, unit-specific residence, or private address field fails **closed**.
5. Geometry is emitted only for **small tested cells**. All other geography stays **unknown** and transparent: never close a full attendance boundary around point clouds, interpolate across missing areas, apply ZIP polygons, or use nearest school/Voronoi/city/district borders.
6. Even when the geometry tests pass, the result has `provenance=finder-derived-estimate`, `officialGIS=false`, `current=false`, `reviewed=false`, `publishable=false`. An additional independent reviewer and the residential E2E release gate in PR #148 are required before any publication. The pilot cannot self-certify.

Run **only after permission and independent evidence exist**, on a private local environment:

```sh
node scripts/build-cfb-finder-derived-cells.cjs artifacts/cfb-approved-samples.json artifacts/cfb-review-only-candidate.json
```

Both files remain in gitignored `artifacts/`; generated estimated cells and source points are **not** committed or sent to CI. The CLI emits a count and non-public output path only. School-click UI must show a footnote with source, academic year, address sample count, holdout evidence, remaining unverified areas and a clear statement that the official Finder—not the estimate—determines eligibility.

## Unresolved blocking items

- Written permission/scope for GuideK12 bulk querying, derived-map reconstruction and redistribution is **not verified**.
- Insufficient current-year public-residential address coverage; need source-consented geographic sampling, at least 2 ZIPs for the separate residential release gate, 3 independent residential addresses per focus ISD, and new-construction/apt-unit exceptions.
- No candidate can pass the PR #148 mandatory 7-ISD residential address → official Finder → exact campus → click → visible polygon gate yet; a user-approved alternate **estimate-only** release policy would need to be explicitly documented instead of bypassing required checks.
- Allen's historical 2019–2023 campus GIS and distinct street-range source require their own source-year audit, not silent reconstruction.

**Current result:** a reproducible, intentionally strict engineering tool and test suite; **no truthful basis yet to draw a CFB school-specific polygon**. Continue official source/GIS licensing acquisition and legally permitted evidence collection before generating real reference data. GitHub Free / no paid provider.

## Integration disposition (2026-11-10)

PR #149's separate UI provenance prototype was archived. This isolated four-file module now targets the current `main` tree **without importing #149's old UI or its self-attested publication validator**. Synthetic generation remains offline only; no production changes, no 2026–27 boundary or source-rights certification, and zero CFB actual derived polygons. The synthetic tests assert that candidate artifacts always have `publishable=false`, `reviewerApproved=false`, and `officialGIS=false`. Any later proposal to expose a real CFB-derived boundary requires a new, independent publisher authorization review and the separately approved residential verification gate. Never treat a successful PR QA check as license/permission approval.
