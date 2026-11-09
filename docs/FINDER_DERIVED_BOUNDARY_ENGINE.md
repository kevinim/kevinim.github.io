# Reusable Finder-derived school attendance boundary engine (pilot)

Status **candidate-only**. This is NOT a current school-zone GIS source and creates NO publishable map layers.

## Why this is safe to reuse
An official district address Finder returns an authoritative *address-specific* answer. It does not necessarily provide licensed polygon geometry. This generator treats approved, independently checked residential point outcomes as sparse observations; it only interpolates very small triangles with three training points of the same campus and **three distinct independent inside-triangle holdout checks**, all matching at the same grade level. Maximum edge: 180 m (absolute cap: 250 m). It never fills a ZIP/district outline, infers an assignment from a school address, guesses unsupported space, or claims completeness.

For CFB specifically, the public GuideK12 Finder has been observed returning K–5, 6–8, 9–12 campus names for two public addresses; one is an apartment building's **base address, not a unit-specific student assignment**. These observations alone are NOT sufficient to generate any verified neighborhood polygon.

## Required permission and acquisition
GuideK12 terms restrict reverse engineering and require conspicuous attribution upon redistribution (see https://app.guidek12.com/ahsd/school_search/2022/terms_and_conditions.html). No crawler, hidden endpoint discovery, bulk requesting, automated address harvesting, or source redistribution is implemented. **Permission to derive/publish geometry from district Finder outputs is NOT confirmed for CFB.** Request the district's 2025+ campus geometry / licensed source, or explicit approved export/query terms before real inputs. Do not infer permission from public page access.

## Privacy and school-year constraints
- Real observations must come from lawfully obtained, publicly reusable *residential parcel* sample points validated against the **correct school year and school level**.
- Sample records contain opaque case IDs, longitude/latitude, ZIP, authoritative school IDs, approval evidence IDs, and verification flags. No street strings, household names, unit numbers, or user addresses are allowed.
- Input records are kept **outside** public git; note that precise coordinates may still be sensitive. Only reviewed aggregate geometry, not underlying sample points, may be considered for a future public release, subject to legal/privacy review.
- Special campuses, school-choice, unit-specific placement, and street-range exceptions are not inferred from nearby coordinates.

## Commands (synthetic-only demonstration)
Run:
~~~bash
node --test tests/finder-derived-estimate-engine.test.cjs
node scripts/generate-finder-derived-estimates.cjs --demo tests/fixtures/finder-derived-synthetic.json artifacts/finder-derived/cfb-synthetic.json
node scripts/render-finder-derived-demo-svg.cjs artifacts/finder-derived/cfb-synthetic.json artifacts/finder-derived/cfb-synthetic-preview.svg
~~~
The output is **6 small synthetic candidate triangles** (two hypothetical school groups × elementary/middle/high). Campus names are explicitly fictitious, and coordinates do not represent real enrollment claims. It writes only to artifacts/finder-derived/, never deployable data/; every feature is \`reviewed:false\`, \`publishable:false\`, \`finder-derived-unreviewed\`. A failed run logs error codes, not addresses.

## Acceptance before any real map display
1. Verified source permission/licensing for collection, derivative generation and redistribution; correct district and year.
2. Demonstrated coverage and adequate sample density across district-specific ZIPs, including adversarial boundary and apartment exceptions. A triangle is **local interpolation**, not a certified attendance zone.
3. Independent held-out real address assignment checks for every *displayed* piece, and manual official Finder crosschecks; no hidden mismatches or cross-school overlaps.
4. Source provenance, uncertainty gaps, geometry topology, timestamp and extra independent reviewer sign-off, linked to release-gate PR #148.
5. Add a **separate reviewed publication converter** to opt in only approved geometry, and render with the explicit nonofficial footnote from PR #149; never load these candidate artifacts directly into production.
6. Keep the official Finder per-address confirmation as the only resident-level authority. If uncertain, leave holes / Finder-only; do not close them with invented boundaries.

## Extending to any DFW ISD
Use a district code in \`districtCode\`, one official \`finderUrl\`, a school-year marker and a campus registry (campus IDs and grade levels). Supply approved, redacted training/holdout observations; run the same engine and CI. This is district-agnostic, but NOT a generic license to harvest other districts' Finder data. Each source needs its own rights, year, and exception audit.

## Provenance of CFB investigation
- District official school search: https://www.cfbisd.edu/students/school-maps-locator-system
- District 2025–26 board-approved changes: https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning
- Existing public-functionality test: tests/cfb-official-resident-finder-verified-2026-11-07.json
- GIS investigation: tests/cfb-2026-geometry-source-audit.json

**Current CFB outcome:** 0 real triangles verified or published; the engine demonstrates the candidate method using synthetic data only. Data reuse permission and actual parcel samples remain blockers.

## 2026-11-09 CFB official rezoning research targets (non-geospatial)

New inputs:
- \`data/cfb-rezoning-boundary-review-targets-2026.json\`: **14** verified *2025–26 published rezoning narrative targets* — nine elementary, two middle, three high. These are **not 2026–27 Finder-verified assignments**, not addresses, and not polygon points.
- \`data/finder-derived-source-rights-2026.json\`: explicitly **not-cleared** CFB GuideK12 data reuse/derivative-geometry grant. The engine refuses non-demo input even if the input falsely claims an approval URL.
- \`scripts/audit-finder-derived-research-targets.cjs\`: produces \`artifacts/finder-derived/cfb-rezoning-review-plan.json\`, with a rights-pending status and no coordinates.

Specific high-risk boundaries in the district's March 2025 adopted plan include Brookhaven Hills West on either side of Valwood Parkway (different elementary assignments), the former Furneaux zone with a Woodlake/Frankford exception, plus apartment-sensitive neighborhood changes. Morningside's documented elementary/middle/high changes create a useful cross-grade test cluster. All 14 are **sampling priorities for future independent checks**, not a license to infer an enrollment polygon.

Reference: https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning

The 2025–26 narrative and current Finder cannot be assumed to agree in 2026–27 without explicit verification. The Texas Legislative Council's district-outline shapefile (CC BY) is licensed background geography, **not** a school-specific attendance polygon and must never be used as one.

### Permission request status
**No district/provider written permission obtained; no request has been sent automatically.** A release manager may contact \`enroll@cfbisd.edu\` (listed on district School Search) to ask for a district-issued current-year GIS download/export, approved derived-data conditions, and any permitted bulk/address testing policy. No paid service is required for the synthetic-only pilot. If rights are denied, restrict to link-only official Finder and do not train/publish derived polygons from GuideK12 data.

### Verified stage
The public CI test proves that the generator rejects fake rights, samples with private street addresses, sample mismatches and unreviewed outputs. It **does not** prove any CFB campus geometry has been regenerated. The map-release gate in #148 remains separate and NO-GO pending independent residential checks.
