# Prosper 2026–27 — GIS reference school versus new-student actual placement

Date: 2026-11-21. Tracker: Issue #376 (P0 enrollment exception / TX-P0-01, TX-P1-01). This is an **informational-only UX warning**, not an official residence-enrollment adapter, rights grant, program transfer or automatic certified assignment.

## Direct official evidence

Prosper ISD [Campuses Closed to New Student Enrollment](https://www.prosper-isd.net/page/closed-to-enrollment), current published 2026–27 section:

| Current GIS zone candidate (from official 2026–27 Infofinder) | Official new-enrollment exception (2026–27) | Campus identity |
| --- | --- | --- |
| Christie Elementary | New students except Kindergarten attend Thomson Elementary; Kindergarten students are not in this closure rule | 043912117 / 117 |
| Reynolds Middle | New students attend Rushing Middle (renovation-related closure) | 043912042 / 042 |
| Moseley Middle | New students attend Rushing Middle | 043912046 / 046 |

The source explicitly says a student withdrawn from Prosper ISD and reenrolling is treated as a new student. It monitors Bryant Elementary, Johnson Elementary, and Hall Elementary for potential restriction, **not yet closed**. Never infer a current closure for these monitored schools.

The actual zone source is still the district's 2026–27 Infofinder i, 31 schools (20 E/7 M/4 H), as linked in `prosper-attendance-2026.geojson`. Direct source-redecode comparison on 2026-11-21 returned **31/31** exactly equal campus polygons and **1,706 / 1,706** identical vertex coordinates (max delta zero). The recorded 293 cross-grade footprint mismatch sample cells are published source-level differences, **not converter errors**. Whether a differing sample cell is an eligible residential parcel is not yet established.

## Implemented change

- `features/school-reference-preview.js`: after matching an eligible official 2026–27 Prosper campus ID and school code, add the specific new-enrollment warning for affected GIS reference candidate; do **not** substitute the previewed GIS school or alter certified assignment. Use official source link and documented kindergarten/returning-student distinctions.
- Harden `campusId === '043912'+schoolCode` so an internally inconsistent but regex-formatted campus code cannot trigger an exception or an accepted GIS preview.
- The direct official `Closed to Enrollment` link appears only when such an affected source-backed campus is selected, validated by the existing official outbound allowlist.
- `tests/school-reference-preview.test.cjs`: three affected campuses, kindergarten / returners, unrelated Rucker not falsely closed, source-vintage and campus-code spoofing rejection, no automatic grant and untrusted link rejection.
- Bump the existing static script cache version 3→4 on the four dashboard/UAT pages, reconcile bootstrap assertions. No new JS bundle, external data fetch, server, webhook, visitor address storage or workflow.

## Acceptance and safety

Run exact-head required CI (main bootstrap, CSP/XSS, trusted links, unit, live browser mobile/desktop) before merge; confirm Pages upload and postdeploy smoke after merge. Source evidence is official publicly published policy, **not the result of the same household's official Finder**. The notice must explicitly say GIS zone candidate versus new-enrollment placement; the former is retained for map context. No 2027–28 proposed boundary is promoted to active 2026–27 and no false automated school assignment grant is created.

A selected residence still requires same address + unit + school year + grade and new/returning student status confirmation with the district registrar before a lease/purchase decision.
