# Track B Dallas official-source GIS reference — Conditional GO

As of 2026-11-09. Final production status depends on exact-commit PR QA, merge and GitHub Pages deployment.

## Data
Official Dallas ISD publisher ArcGIS services (July 22, 2026 last edit):
* Elementary: 135 features, ELEM_DESC / SLN
* Middle: 30 features, MIDDLE / MID_SLN
* High: 22 features, HIGH / HIGH_SLN
**187 published GIS attendance boundary polygons are available at the official source.** A 2026 edit date does NOT mean the publisher GIS is certified for 2026–27 enrollment.

Source registry only (not downloaded to public repo):
https://services.arcgis.com/RfrtTbYxQ8YIhjWT/ArcGIS/rest/services/

## Track B feature
A viewer with a chosen Dallas, TX point must intentionally click "Dallas 참고 GIS 경계 표시 (배정 미인증)". Exact ArcGIS service metadata and 2026 edit date are checked, then each of 3 grade services is queried with point coordinates only; no full address is submitted to Dallas ISD. Each matching polygon is rendered temporarily in orange dashed low-fill style, with source school name and explicit year-unverified warning in the popup. A prominent warning appears in the school review panel before any lookup. Light/dark map filters already display a global reference-zone warning. Clear/reset removes all Dallas layers. No local geometry files or derived polygons are published, stored, or cached.

The school assigned to a real household is NOT certified by this map. The separate ConditionalSchoolRelease policy remains immutable, with zero authorized residential district grants. Even when a user enters a Finder school name, the compare result cannot authorize enrollment.

Official Dallas ISD SchoolSite Locator:
https://www.dallasisd.org/departments/demographic-studies/find-your-school/schoolsite-locator-interactive-map

Official 2026–27 school maps and locations:
https://www.dallasisd.org/departments/demographic-studies/district-maps

Enrollment must be checked with the PowerSchool street directory and school staff; magnet, choice and transfer exceptions can change outcomes.

## Limits and QA
Publisher GIS lacks a verified schoolYear attribute and redistribution license. This deployment uses opt-in read-only remote API queries; it does not rehost data or certify 2026–27 school assignments. The GIS service is dependent on external API reachability and response CORS; network failures show official Finder fallback. Browser QA uses a synthetic nonresidential GIS polygon interior point only, not a real home or student.

Release gate: source count 135+30+22; exact source host and three unique grade-level matches at selected point; WGS84 validity and source freshness; CSP exact-host allowlist; stored-data/non-residential checks; 390/1366 real Chromium overlay+popup+warning+clear; all existing security/privacy CI. No paid service.
