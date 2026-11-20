# Prosper 2026–27 GIS reference overlay after home address selection

Date: 2026-11-20 (America/New_York)
Repository: kevinim/kevinim.github.io
Owner approval: explicit user approval in TX relocation project, 2026-11-20.

## Important separation of states

- **Board-approved zone year:** Prosper district 2026–27 school boundaries. The distinct 2027–28 middle/high board vote does not replace these 2026–27 shapes.
- **Public source available:** prosper-attendance-2026.geojson contains 31 district-zone polygons (E20/M7/H4). BOUNDARIES.md records 31 interior + 12 boundary coordinate checks (43/43), not residence-specific validated enrollment.
- **Address-derived GIS reference (this change):** after a precisely geocoded residential address is selected, the already existing SchoolReferencePreview.plan and E/M/H source identity checks must produce exactly three distinct official 2026–27 Prosper GIS polygons. The dashboard shows dashed, low-fill **reference** boundaries on the map, alongside the already deployed address-first school cards and campus reference markers. This is a local GIS intersection, not a vendor live address search. Missing, border-ambiguous, low-precision, mixed-year, duplicate or conflicting IDs prevent auto overlay.
- **Official address-specific result:** not automated in GitHub Pages. The third-party Infofinder SearchAddress endpoint is blocked by browser CORS; the official linked Finder remains available for user confirmation.
- **Enrollment certification:** still NO-GO; ConditionalSchoolRelease.APPROVED_AUTO_DISTRICTS remains an empty list. This feature neither alters home.assignment nor marks address-bound candidates as certified enrollment.

## Release change and rollback

- dashboard-main.js: independent Prosper in-memory reference boundary layer. The group is cleared on new address, redraw, or removal; no extra third-party requests, persistence, or address logging. Reference style is dashed and not interactive, distinct from the certified enrollment map.
- index.html main JS cache pin v19 -> v20, plus corresponding exact version assertions.
- tests/address-school-focus.test.cjs: current official source/year/campus ID/grade and negative conditions.
- tests/externalized-main-bootstrap.test.cjs: only this audited map function is normalized in historical integrity checks.

Do not decommission the official residential release gate. It remains necessary for the different claim of independently certified enrollment. User approval applies to *reference geometry*, not to circumventing CORS, removing privacy guardrails, or granting new redistribution rights.

## Validation / acceptance

1. Static and Node tests, including tests/address-school-focus.test.cjs, tests/conditional-school-release.test.cjs and tests/externalized-main-bootstrap.test.cjs.
2. Site/app desktop (1366px) and mobile (390px) smoke with exactly one reference school per E/M/H for a usable Prosper interior address. Boundary-edge and ambiguous geocode should not show a reference overlay. Exact address should never appear in source/API logs.
3. Clearing or selecting a non-Prosper address removes prior Prosper outlines. Default school grade filters, school rail and school marker remain intact.
4. GitHub PR checks then merge and Pages deployment; separately verify live site uses v20 and labels reference-only. If checks or Pages QA fail, keep PR unmerged and record the failure.

Source references:
- BOUNDARIES.md
- docs/PROSPER_OFFICIAL_ADDRESS_CERTIFICATION_GATE_20261118.md
- https://www.infofinderi.com/ifi/?cid=PI5FFG7RYZ1
- GitHub issues #342 and #125.
