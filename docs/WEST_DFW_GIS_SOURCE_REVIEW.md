# West DFW school attendance GIS — provenance and release gate

**Checked 2026-11-09 UTC. Draft PR; local/source-only review. No school polygon downloaded, imported, rendered or deployed.**

## Current result

| District (LEA ID) | Evidence | Reuse-ready current-year GeoJSON? | Dashboard outcome |
| --- | --- | --- | --- |
| Carroll ISD (`220919`) | District 2026–27 enrollment page and official **address-based campus locator** (see official FAQ) | **Not verified** | Official link only |
| Keller ISD (`220907`) | City of Keller ArcGIS REST MapServer offers boundary polygon layers 2–5; their distinct `SCHL_YEAR` attribute is **2018-19 in every layer** | **No**. Stale 2018–19 and redistribution permission not checked | Visible 2018–19 warning; no polygon |
| Northwest ISD (`061911`) | Official district board approved 2026–27 boundaries on 2026-01-12, current map accessible by selecting school year | **Not verified**. Current official viewer exists, no authorized GIS vector extract verified | Official link only |
| Grapevine-Colleyville ISD (`220906`) | District elementary/middle/high printable attendance area maps with disclaimer | **Not verified**. School year of raw polygon/redistribution permission unconfirmed | Official link only |

### Actual Keller attribute query (no geometry)

City GIS base endpoint: https://arcgis.cityofkeller.com/arcgis/rest/services/Kellermaps/KEL_KISD_AGO/MapServer

| Layer | Level | Name field | School year field | Observed distinct year | Observed feature count |
| ---: | --- | --- | --- | --- | ---: |
| 2 | Elementary | `ELEM_NAME` | `SCHL_YEAR` | **2018-19** | 23 |
| 3 | High school | `HIGH_NAME` | `SCHL_YEAR` | **2018-19** | 4 |
| 4 | Intermediate | `INT_NAME` | `SCHL_YEAR` | **2018-19** | 7 |
| 5 | Middle school | `MID_NAME` | `SCHL_YEAR` | **2018-19** | 7 |

**41 is the total number of returned polygon features across the four levels, not 41 distinct schools.** The service exposes campus IDs and supports GeoJSON, but those technical facts establish neither 2026–27 accuracy nor republication permission.

Exact metadata-only query pattern for each ID:

```text
https://arcgis.cityofkeller.com/arcgis/rest/services/Kellermaps/KEL_KISD_AGO/MapServer/{2|3|4|5}/query?where=1%3D1&outFields=SCHL_YEAR&returnGeometry=false&returnDistinctValues=true&f=json
```

Verified year values come from querying server attributes, **not** the publication time of the service web page. No home addresses or geometry were requested.

## Additional enrollment caveats

- Carroll ISD's 2026–27 enrollment page distinguishes zoned residents from transfer-eligible Southlake/Westlake residents. **Carroll enrollment page year does not certify each source polygon's vintage.** Confirm each prospective address in the district school search.
- Keller district's October 29, 2026 board meeting recap discusses 2027–28 campus consolidation and proposed future boundary adjustments. Do not promote proposed 2027–28 lines to 2026–27.
- Northwest ISD's **approved 2026–27** zones include Romer Elementary and Barksdale Middle, which opened in August 2026. The separately displayed 2027–28 high school changes remained **proposals** at this audit date; a future proposal is not the present attendance assignment.
- GCISD's official page states its printable map images are guidance, and residents should call the district for any boundary-near address. Dove Elementary consolidation began in 2026–27; cached PDFs could require confirmation.
- School locations (TEA/NCES) and ZIP/ZCTA area statistics **do not** establish legal attendance boundaries or guaranteed admission.

## New safety artifacts

- `data/west-dfw-zone-source-audit-2026.json`: typed evidence inventory and explicit `link-only` release flags.
- `scripts/audit-west-dfw-zone-sources.cjs`: offline **fail-closed** source/ID/year/license guards across the manifest, existing four ISD registry entries and UI source manifest.
- `scripts/probe-west-dfw-keller-year.cjs --live`: optional, **explicit** public metadata-only query of `SCHL_YEAR` for layers 2, 3, 4 and 5. Never fetches polygon geometries or address data. Unexpected years trigger review, not a release.
- `tests/audit-west-dfw-zone-sources.test.cjs`, `tests/probe-west-dfw-keller-year.test.cjs`: negative unit tests for year upgrades, hijacked source URLs and early polygon activation.
- `.github/workflows/west-dfw-gis-source-audit.yml`: PR validation and artifact upload; optional manual metadata query when an explicitly selected workflow input is enabled. No deployment permissions.
- Existing West DFW UI: Keller source warning (`2018–19`) is displayed beside official links. No map zone data is loaded for any of the four districts.

## Commands

```bash
node scripts/audit-west-dfw-zone-sources.cjs
node --test tests/audit-west-dfw-zone-sources.test.cjs tests/probe-west-dfw-keller-year.test.cjs
# Explicit read-only live verification (optional):
node scripts/probe-west-dfw-keller-year.cjs --live
```

Source evidence report: `artifacts/west-dfw/west-dfw-zone-provenance-report.json`. No personal home data. The optional live query writes `artifacts/west-dfw/keller-gis-year-probe.json`. An unavailable source returns an inconclusive result; nothing is silently deemed current.

## Preconditions before adding a live school-specific boundary layer

1. Confirm 2026–27 **current school-year** via official district Finder or board-approved GIS for **each** elementary/middle/intermediate/high polygon and campus identifier; flag all exceptions.
2. Obtain authoritative machine-readable polygons with source URL, acquisition date and valid district license/reuse permission. Public REST access does not imply republishing rights.
3. Check grade transitions, school closures/openings, districtwide coverage, topology and exact-name/campus-ID matching; run official address-based crosschecks on public facilities (not private residences).
4. Validate any special campus, charter, transfer, rezoning and feeder exceptions separately; never infer from ZIP, campus location or city limits.
5. Enable in a separate reviewed GIS-data PR after private UAT verification and owner approval; run desktop/mobile and school marker guardrails, never force deployment.

## References

- Keller: https://arcgis.cityofkeller.com/arcgis/rest/services/Kellermaps/KEL_KISD_AGO/MapServer
- Keller ISD maps and school finder: https://www.kellerisd.net/about-kisd/maps
- Carroll official address lookup FAQ: https://www.southlakecarroll.edu/district-information/district-departments/student-services/online-enrollment-portal/frequently-asked-questions
- Northwest approved 2026–27: https://www.nisdtx.org/departments/facilities/attendance-boundaries/proposed-2026-2027-boundaries
- Northwest 2027–28 proposals: https://www.nisdtx.org/departments/facilities/attendance-boundaries/2027-2028-boundaries
- GCISD official maps: https://www.gcisd.net/page/attendance-area-maps/

## Status and dependencies

Draft, stacked on PR #90 (West DFW UI) which depends on Draft #86 → #84 → #79 → #78 → #72. This PR **does not change** `main`, the currently published GitHub Pages site, school matching data, authentication, cloud resources or deployment settings. The new source vetting file is a public evidence manifest, not private student data.
