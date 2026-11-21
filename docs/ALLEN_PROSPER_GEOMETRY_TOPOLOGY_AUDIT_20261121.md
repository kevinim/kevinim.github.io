# Allen + Prosper existing attendance GIS topology — read-only P0 audit

Date: 2026-11-21. Tracker: [Issue #376](https://github.com/kevinim/kevinim.github.io/issues/376).

## Scope and limits

- This is a deterministic **local GeoJSON structure + spatial-grid consistency audit**. It cannot certify an individual residence or legal enrollment. No PII and no external address or API request are used.
- Tested source files remain **unchanged**. Neither older GIS nor current-year GIS is silently rewritten, and no school grade is filled by ZIP centroid/nearest marker.
- Run `node --test tests/school-polygon-linkage-topology.test.cjs` and `node scripts/school-polygon-linkage-topology.cjs` from repo root. The output is `artifacts/school-linkage/school-geometry-topology-audit.json`, uploaded via the existing school-polygon-linkage CI job (no new workflow).
- Deterministic 120 × 120 grid over each valid source's bounding rectangle, slightly off-axis to reduce false boundary-on-edge equality. Distances are short-range planar WGS84 approximations for **triage**, not surveying-grade measurements. The audit does not estimate the prevalence of errors among homes, nor assert gaps are residential.

## Allen — historical source, not current enrollment

- `allen-attendance-historical.geojson`: 20 zone features, 16 E / 3 M (2023) / 1 H (2019); no broken WGS84 point/ring in preliminary source inspection.
- Prior independent grid sampling flagged same-grade historical overlap candidates around **Kerr ↔ Green** and **Green ↔ Cheatham**. Output now records counts and bounded sample coordinates reproducibly.
- Do **not** compare 2019 high and 2023 elementary/middle polygons as a same-year cross-grade completion claim.
- Official Allen ISD parent [Find A School](https://www.allenisd.org/page/findaschool) includes street and unit exceptions. Allen ISD hosts [2024–25 color-coded attendance zone map](https://www.allenisd.org/documents/for-parents/school-boundaries-map/461313) marked updated December 2024. City of Allen publishes [school attendance boundary MapServer](https://gismaps.cityofallen.org/arcgis/rest/services/ReferenceData/School_Attendance_Boundary_Elementary/MapServer/0), with elementary layer metadata updated 11/2021; this is **not evidence of an up-to-date 2026–27 map**.
- **Decision pending:** map visual and historical source geometry provenance comparison; if overlapping regions cannot be resolved to address-level official rules, retain the dated historical polygons with explicit uncertainty and block autonomous assignment.

## Prosper — current 2026–27 source, not proven residence assignment

- `prosper-attendance-2026.geojson`: 31 official-sourced 2026–27 E/M/H features (20 / 7 / 4), complete campus ID and closed-ring basic structural checks.
- Preliminary 120 × 120 grid sampling of current pinned sources identified **293 cells with at least one grade polygon but not all three**; **133** of those were more than **200 meters** from the nearest missing-grade boundary. Sampled same-grade overlaps: zero. These are **geometry inconsistencies**, not verified enrolled-address failures.
- Example synthetic grid coordinate: longitude -96.89480697 / latitude 33.23102431, high school geometry only; this is not an actual residence.
- Compare grade union footprint to Prosper's [official 2026–27 boundaries](https://www.prosper-isd.net/documents/about-us/attendance-boundaries/16505278) and exact official [Infofinder](https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1) where permitted. Check whether mismatched cells are uninhabited / outside school attendance jurisdiction / border artifacts. Do **not** infer nonexistent elementary/middle schools from other polygons.
- Separate future update: Prosper board approved **2027–28** middle/high zones on **2026-11-16**. These must not replace the 2026–27 active layer before its effective year.

## CI behavior and follow-up

- Invalid geometry, bad coordinate, unsupported grade or missing campus name is an **audit failure**.
- **Known sampled overlaps and missing-grade regions are review findings**, not automatic CI failures: otherwise we would permanently block all maintenance before the official source comparison. Report status is `REVIEW_REQUIRED`, not `certified`.
- Synthetic negative fixtures test open rings, WGS84 validation, polygon holes, same-grade overlaps, cross-grade shortfalls and three matching grades.
- After authoritative layer reconciliation, freeze an independently reviewed baseline/tolerance and fail the workflow on newly introduced geometry regressions. No arbitrary gap interpolation, no permission to scrape or republish restricted GIS. Use a separately reviewed PR for geometry change if the source actually needs correction.
- Existing runtime address-grant registry remains empty. Official address-to-grade result still needs independent residence holdouts for any auto-certification.

## Coordination

- Related GIS-source inventory PRs #364 and #366, address-reference UI PR #368. This QA PR touches neither their source manifests nor production UI.
- Complete this P0 only after comparing actual polygon differences and documenting source year, corner cases and disposition, **not** merely because an automated sample job is green.
