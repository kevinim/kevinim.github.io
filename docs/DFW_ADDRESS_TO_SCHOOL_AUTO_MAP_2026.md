# DFW 2026–27: residential address → school candidate → map

Status: **Draft PR; no production deployment.** Audited 2026-11-09.

## Actual code baseline — important correction

The dashboard's DFW source registry contains 108 public ISDs in its 11-county TEA administrative proxy. **Only 6** are configured with campus-specific boundary data sources. The remaining **102** have no app-registered attendance polygon source even if parent-facing official web links have been added. Across the 6:
- **2** (Frisco and Prosper) have locally identified 2026–27 GIS source years, subject to runtime availability and apartment/transfer exceptions.
- **3** (Plano, Lewisville, McKinney) can use the district's Finder-linked polygon material if it loads and passes the relevant checks. Plano/Lewisville source vintages are mixed or not independently current-year; McKinney requires a live 2026–27 reference.
- **1** (Allen) uses the official address-range table to identify school candidates; its local GIS is from 2019/2023 and must **not** be auto-presented as 2026–27.
- **0** districtwide official exact-residence/grade assignment accuracy rates have been established. A matchable polygon is not a student's legal assignment.
- **CFB** has a public official resident Finder but no permitted school-specific polygon feed in the current app; its separate consent-gated candidate pipeline is managed by PRs #149/#154/#155 and not duplicated here.
- **Garland** is a school-choice system; automatic address-based campus assignment is an incorrect assumption.
- **Current main** has 29/108 official parent guidance entries. Drafts #141→#144→#147→#150→#157→#159→#160 could raise them to 107/108; none of those additional **links** provides school GIS.

Run the structural census:

```bash
node scripts/audit-dfw-home-automation-readiness.cjs
node --test tests/dfw-home-automation-readiness.test.cjs
```

The result explicitly separates polygon candidates, historical address tables, links only, and unavailable current-year data. It does **not** collect or log house addresses.

## Address-selection UX improvement in this PR

- The app already geocodes a user-submitted address using ArcGIS, calculates available source-backed home zone candidates, and adds a house pin.
- Previously, `drawBoundary()` only displayed the **school's** zone when a school item was clicked. Candidate school markers were drawn only if their points happened to be inside the viewport and passed filters.
- Now, after the user selects the home candidate, `drawHomeAssignmentMap()` displays available trusted polygon candidates directly on a **separate** map layer. It shows a source-specific message on the home card and keeps candidate campus markers visible across ZIP/viewport and rating filters. It optionally fits the view to the home and campus markers, capped to avoid wrong-district pan.
- When GIS is historical, missing, conflicting, geocode quality poor, source year cannot be established or academic feeder paths disagree, it fails closed: no falsely current polygon is painted. For Allen, only candidates from its official address table may be highlighted; old polygons remain hidden from home auto-assignment.
- Existing toggles, explicit campus selection and house-clear behavior remain intact. No new request sends a home address or coordinates to any district Finder. Existing address geocoding is unchanged.

## Official Finder GIS acquisition — do not counterfeit boundaries

For an ISD without suitable campus-specific school GIS, the **correct acquisition priority** is:

1. Search its official district map and *published download endpoint* for 2026–27 elementary, middle, high (sometimes freshman and senior high) campus polygon sources. Validate school IDs, authoritative provenance, date, allowed reuse, coverage and special campuses.
2. If only a live official address Finder exists, obtain permission/license details before bulk querying, extracting or rehosting address/grade results. Independent validation addresses should be public facilities or properly consented addresses; holdouts must be separate from generation samples.
3. When the Finder returns approved geospatial areas, ingest them as a proper current-year source, preserving source timestamp and year. If it returns only discrete address assignments, the synthetic-boundary engine #154 can create **estimated candidates**, subject to explicit permission, independent holdout testing, topology checks, address sampling density and clear footnotes. Never call such a polygon official or extrapolate outside validated cells.
4. When the Finder is a closed application, manual address-specific official lookup remains necessary. An informational link alone is not an API integration. District outer polygons published by TEA/NCES are **not** campus boundaries.
5. Before public release, PR #148's fail-closed address→official Finder→campus→visible polygon gate must be met. Campus name matching and UI-only tests are insufficient.

## Public authoritative source findings (November 9, 2026)

| ISD | Official source found | Publicly machine-readable 2026–27 campus GIS verified? | Next action |
| --- | --- | --- | --- |
| Frisco | https://www.friscoisd.org/page/2026-2027-zones/ | Existing app uses district's 2026–27 zone JSON | Compare live Finder responses and exceptions across levels |
| Prosper | https://www.prosper-isd.net/page/attendance-boundaries/ | Existing 31 local school shapes with source metadata | Independent address/grade confirmations and year changes |
| Plano | https://www.pisd.edu/district-resources/schools-facilities/schools-other-facilities/schoolfinder | Finder-connected geometry exists; original 2025–26 label | Confirm 2026–27 source and all grade/feeder cases |
| Lewisville | https://www.lisd.net/resources/families/school-locator | Finder-connected mixed source years | Separate apartment and secondary-grade lookup; verify refresh |
| McKinney | https://www.mckinneyisd.net/page/attendance-zones-maps/ | Live 2026–27 Finder geometry if load succeeds | More independent residence/grade holdouts |
| Allen | https://www.allenisd.org/page/findaschool | Official street range table; local zone geometry historical | Request current GIS; do not republish 2019/23 as current |
| CFB | https://www.cfbisd.edu/students/school-maps-locator-system | No configured permitted per-school GIS | Continue separate permission-backed pilot; cannot guess zones |
| Dallas | https://www.dallasisd.org/departments/demographic-studies/attendance-zone-maps | District publishes 2026–27 PDF maps; no reviewed GeoJSON feed in app | Ask Demographic Studies for a machine-readable, authorized current-year layer |
| Denton | https://www.dentonisd.org/families/attendance-zones | Current 2026–27 PDF boundary maps; no reviewed GeoJSON feed in app | Ask GIS/transportation team for current campus feature layers |
| Rockwall | https://www.rockwallisd.com/new-student/new-student/school-attendance-areas | 2026–27 maps and official inquiry, no ingested GIS | Seek downloadable zone geometry and compare inquiry results |

The official TEA policy (https://tea.texas.gov/families-and-students/school-district-locator/school-district-locator-faq) confirms TEA does not collect school attendance zones and that districts determine assignments. Dallas ISD states its final enrollment is validated by the district's PowerSchool street directory; a SchoolSite GIS candidate does not supplant that process.

## QA and release

Unit: `tests/home-assignment-map.test.cjs` + `tests/dfw-home-automation-readiness.test.cjs`.
Browser: `scripts/test-home-assignment-map-browser.cjs` renders only a synthetic school polygon/marker in a local snapshot at 390px and 1366px; checks reset, source state and unsafe geocode failure. This does not certify any home's real assignment.

This PR changes only address map UX, safe policy, audits, tests and documentation. Existing PR #148 is still a production NO-GO on real address-to-campus verification, so this PR remains Draft.

## 2026-11-10 Track B integration constraints
The latest main privacy/security releases, Dallas/Irving reference GIS and Allen UI fixes remain intact. Address-derived automatic marker highlighting, zone rendering and viewport focus require an explicit immutable `ConditionalSchoolRelease` verified district grant. Current grant count is zero: visitor addresses show an official Finder warning instead of unapproved assigned school polygons. Synthetic `HomeAssignmentMap.plan` fixtures are only future component tests, never enrollment certification.
