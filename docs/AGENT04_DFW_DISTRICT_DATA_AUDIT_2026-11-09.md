# Agent 04 — DFW 108 ISD independent integrity audit (2026-11-09)

**Scope:** read-only metadata, campus ID/point integrity and non-certification gates.
**Branch target:** main. Do not merge #173 (QA-only), modify GIS or address assignment code,
or infer user home addresses. Agent 01/02/03 and CFB GIS work remain untouched.

## Verified baselines and important denominator split

| Measurement | Current main | Composite Draft #173 (not main) |
| --- | ---: | ---: |
| DFW TEA district-of-record codes | 152 | 152 |
| Public ISDs | 108 | 108 |
| Other TEA LEAs | 44 | 44 |
| DFW TEA campus records | 2,182 | 2,182 |
| Public ISD campus records | 1,941 | 1,941 |
| Official parent route registered | 29/108 | 107/108 |
| Route not registered | 79/108 | 1/108 (Chico 249904) |
| School-by-school current-year GIS percent | UNKNOWN | UNKNOWN |
| Exact residential assignment certified | UNKNOWN / NO-GO | UNKNOWN / NO-GO |

Dataset identities compared by **nine-digit TEA campus ID**, not by city/ZIP:
- The source 2026 preliminary TEA file contains 2,282 rows in total; **2,182**
  are in the selected 11-county administrative district-of-record proxy.
- The 2024–25 NCES file contains 2,213 school point rows across a different scope.
  Among the 2,182 in-scope TEA rows, **2,113 have an NCES ID point**, 69 do not.
- Crucially, within **108 public ISDs / 1,941 TEA records**, 1,935 have a
  historical NCES ID point and **six lack one**. The remaining 63 of 69 gaps
  are in the separately classified 44 other TEA LEAs, not ordinary zoned ISDs.
- Allen ISD: 23/23 TEA campus IDs have corresponding NCES historical points.
  A historical point is not a proof the map actually rendered a visible marker.

**Six public-ISD NCES point exception IDs:** `057907114` (Duncanville),
`184908002` (Peaster), `184909103` (Brock), `220902014` (Birdville),
`220905258` (Fort Worth), `249902104` (Boyd). These remain investigation
items; do not invent points or auto-label them active zoned campuses.

## Distinct quality dimensions in generated JSON

`node scripts/audit-dfw-district-integrity.cjs` produces
`artifacts/agent04-dfw-district-integrity.json`, with **one district row per
108 public ISDs** and individual campus records keyed by TEA ID. Fields:

| Required measure | Report field | Meaning |
| --- | --- | --- |
| Official Finder availability | `officialFinderAvailability` | Approved route registered or missing; LIVE operation unknown |
| GIS availability | `gisAvailability` | Dashboard source configured, not all publicly existing GIS |
| GIS school coverage | `gisSchoolCoverage` | Seven browser directory reference minima; exact TEA coverage NULL |
| Campus coordinate verification | `campusCoordinateVerification` | Historical NCES ID points vs independently verified current points (zero) |
| School-to-boundary linkage | `schoolToBoundaryLinkage` | Exact current-year campus linkage NOT certified |
| Assignment verification | `assignmentVerification` | No independent residence/year/grade holdout certification |
| Data year | `dataYear` | TEA/NCES and available source geometry vintage kept separate |
| Missing reason | `missingReason`, `exceptionIds` | P0 link, P1 point/GIS/year; campus exceptions |
| Release classification | `disposition` | NO_GO until independently reviewed |

The script also writes `campusRecords[]` with grade-range gaps, original
source year, lifecycle exceptions, school polygon/assignment limitation and
status. A local directory `type` hint is **never** promoted to an official
min/max grade range; a 2024–25 NCES point is **never** current-year verified.

Seven existing school polygon **browser-reference** district mappings include
CFB (no polygons). They are *not* seven certified current GIS districts.
Configured dashboard campus-zone data exists for a smaller group and is distinct
from the number of reference records. Static TEA IDs alone cannot establish
whether a Leaflet marker or attendance polygon is drawn.

## Live official-link audit, carefully scoped

`node scripts/probe-dfw-official-links.cjs` (default) records **not probed**.
Use `node scripts/probe-dfw-official-links.cjs --live` only when an operator
wants the **read-only** HTTP HEAD, followed by GET on 405/501, to each
allowlisted official URL. Redirects are not followed; blocked/429, redirect,
network failure and 404/410 are separate states, **not school assignments**.

GitHub Actions supports `workflow_dispatch` with `live_http_probe=true`.
The report is `artifacts/agent04-dfw-finder-link-http.json`. Reachability does
not prove a parent search form loads, accepts an address, gives the correct
school, honors current year, or grants permissions to use GIS. Actual
browser/Finder residential certification belongs to Agent 03 and #148.

## Independent QA and regression rules

- Fail when the TEA ID list has duplicates or the per-district count differs
  from the committed matrix, including a school silently deleted.
- Fail when the 108 public-ISD denominator changes without a reviewed source
  update; preserve separate 44 other LEA denominator and 11-county caveat.
- Fail when the historical NCES match floor of 1,935 drops or Allen falls below
  its existing minimum visible-reference floor of 20 *point IDs*. A Leaflet
  browser marker visibility check still belongs to the existing E2E suite.
- Fail on unapproved parent URLs or premature global GIS/address percentages.
- Record expired/historical zone vintages, old campus points, missing school
  grade ranges and retired/reconfigured campuses as unverified, never GO.
- CI is GitHub Free read-only, pinned, does not merge/deploy, stores JSON for
  seven days and includes negative tests.

## Prioritized exceptions and ownership

**P0:** No independent actual residential assignment certification for 108
districts. Keep #148 release NO_GO. On current main, 79 parent routes are
unregistered; the **107/108 route improvement is staged** in #160/#173. After
that stack is reviewed, Chico 249904 is the remaining unverified parent route.

**P1:** Six public-ISD records lack matched historical NCES location IDs.
Evaluate current campus status and official location before modifying point
datasets. The audit intentionally does not touch Denton 8-camps coordinate
verification being handled under #174/#176.

**P1:** Most districts have no configured school-specific polygon source.
Do not confuse this with no GIS existing on the public internet.
Allen historical data, Plano 2025–26 named layer, Lewisville mixed vintage,
CFB official locator-only and provisional Dallas polygons are separate
year/reuse/independent-assignment blockers. GIS collection belongs to Agent 01
and CFB/Denton independent agents.

**P2:** Resolve exact academic grade range, closures/renames/repurposed schools
and school-ID crosswalk at campus level from official year-specific records.
Preliminary TEA ratings and 2024–25 NCES do not form a current active enrollment
roster. Check future-year Carroll Durham separately from closures effective
in 2026–27.

**Not certified by this PR:** live Finder operations, authorized polygon reuse,
school markers actually visible in Chromium, residential choice/enrollment
accuracy, or production sign-off. Success of this PR is only a source/identity
integrity PASS, not a release GO.
