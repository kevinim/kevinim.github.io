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
The GitHub Actions job runs `node scripts/probe-dfw-official-links.cjs --live`
on every PR update to check read-only HTTP HEAD, followed by GET on 405/501,
for each allowlisted official URL. Operators may invoke it manually as well. Redirects are not followed; blocked/429, redirect,
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

## Six public-ISD missing historical NCES point records: investigated, not invented

Machine-readable official-source evidence and a school-ID regression inventory:
`data/dfw-public-isd-missing-point-evidence-2026.json`.
Each record preserves a preliminary identity/exception classification,
official source URL(s), the published address when one is available,
and **both** `verifiedCurrentCoordinates:false` and
`standardAttendancePolygonVerified:false`.

| TEA ID | School | Source-based disposition | Remaining certification |
| --- | --- | --- | --- |
| `057907114` | Glenn C Hardin EL / Duncanville | District reconfigured campus to elementary in 2025; current address listed | Verify current geocoded point and 2026–27 school-level zone |
| `184908002` | Parker County JJAEP / Peaster | County-operated juvenile justice alternative; not standard parcel-zoned enrollment | Confirm current program location if point shown; do not manufacture zone |
| `184909103` | Brock Learning Academy / Brock | Official district directory lists school address; no NCES ID-point match | Exact point, grade/program model, current assignment rules |
| `220902014` | Collegiate Academy of Birdville (ECHS) | District documents a weighted admissions lottery; not a default neighborhood attendance zone | Official current point; separate choice-enrollment logic |
| `220905258` | Neighborhood PreK / Fort Worth | TEA campus administrative address is not established as a single classroom site | Verify actual instructional locations before any marker; no fictitious polygon |
| `249902104` | Boyd PRI / Boyd | Historical TEA/meal roster identifies campus; current separate primary-campus status unresolved | Independent 2026–27 campus roster, move/closure decision, point |

**Identity is not map placement.** The 2024–25 NCES point inventory has
zero records for these six exact TEA IDs. Some missing records are
nonstandard programs; counting all six as missing neighborhood school
zones would be misleading. We have not edited points, polygons, admissions
rules or school-year status in production.

**Chico safety check:** the sole pending district after composite #173 is
`249904` (Chico ISD, **Texas**, three preliminary TEA records). Search
engines often suggest Chico Unified School District in *California*, which
must not be accepted as Texas parent-source evidence. The Texas district's
older HTTP site is not a verified approved HTTPS attendance Finder;
registration remains unverified, not a fabricated official route.

## CI interpretation and operational follow-through

The pinned GitHub Actions job runs an **offline fail-closed static audit**
followed by a low-volume, read-only HTTP liveness probe for every currently
registered source URL. An HTTP 200 is recorded as `HTTP_RESPONDED_FINDER_NOT_TESTED`;
redirects, blocked providers, 404s, rate limits and network errors remain
separate evidence statuses, not student enrollment claims. CI only fails on
structural regression, not on temporary external-provider network issues.
An opt-in operator can also rerun the probe separately. The default `main`
registry has 29 routes; the 107-route candidate #173 is not yet part of
`main`, so 107-live-URL coverage cannot be claimed by this independent PR.

Outstanding independent responsibilities are kept explicit:
- Agent 01: approved source acquisition and campus polygons for broader DFW
- Agent 02: Denton 8 marker-coordinate exceptions and current GIS original
- Agent 03: actual browser residence-to-official-Finder campus crosschecks
- CFB separate owner: locator/derived geometry rights and residency proof

The merge gate still requires a correctly sourced 2026–27 residence, grade,
campus and visible polygon check, including exceptions and independent
review under #148. The user has not authorized merge or deployment.

## Independent live HTTP census of 107 **staged** source routes (PR #173)

Since `main` still has only 29 approved links, relying on the current registry
alone would miss 78 pending sources. We therefore also pinned the exact
**unmerged** QA candidate (PR #173, SHA
`e5bcae64b154abf4d2ff36bb2599780f5a82b38b`) as the *separate,
read-only* audit inventory
`data/dfw-107-parent-route-qa-candidate-2026.json`.
It cannot change the dashboard registry or Production.

`node scripts/probe-dfw-107-candidate-routes.cjs --live`
checks actual HTTP reachability for all **107** candidate URLs with four
concurrent HEAD requests (GET only for 405/501), 10-second per-request
timeout, no redirect following, zero student addresses. The CI job runs it
automatically and emits
`artifacts/agent04-pr173-107-official-http.json`.
`tests/dfw-107-candidate-route-probe.test.cjs` rejects unapproved
HTTP/private hosts, lost district codes, duplicate URLs, fabricated Chico
source, and drift in the 29 links already present in `main`.

- A `2xx` status means an HTTP response only; **not a functioning native
  address-to-school lookup**.
- A redirect means that the next location needs manual review, not failure
  of the school district itself. 403/429, 404, TLS and timeouts retain
  separate statuses, with inconclusive categories preserved.
- The one 108th district, Texas Chico ISD `249904`, remains missing a
  verified official parent-source path.
- Actual independently reconciled school assignment is still **NO_GO**,
  under Agent 03/#148. These 107 URLs do not replace that verification.

Whenever PR #173 changes its registered URLs, its candidate manifest must
be regenerated from that exact new PR head before calling the 107-record
list current. The pinned source SHA makes such review auditable.

## Actual 107-route HTTP audit result and recommended source repairs

GitHub Actions run
[42675395619](https://github.com/kevinim/kevinim.github.io/actions/runs/42675395619)
probed all 107 candidate links from PR #173, using their exact URLs
without changing the current live dashboard registry:

| HTTP-only outcome | URLs |
| --- | ---: |
| 2xx (web server responded, Finder operation NOT verified) | 101 |
| 302 redirect, destination not followed | 4 |
| HTTP 500, service inconclusive | 1 |
| HTTP 404, registered landing URL broken at check time | 1 |
| **Total** | **107** |

These six records remain outstanding; the results are
**request-time observations, not permanent district outages**.

| Priority | District (TEA code) | Probe | Next source-only action |
| --- | --- | --- | --- |
| **P0 URL** | Midlothian `070908` | 404 | Existing registered URL `https://www.midlothianisd.org/enrollment/school-boundaries` is stale; district's live **Find My School** page is `https://www.midlothianisd.org/enrollment/find-my-school`. Official enrollment page also links to it. Update in source PR owner branch; review direct-address behavior separately |
| **P1 service** | Cedar Hill `057904` | 500 | Registered endpoint `https://enroll.chisd.net/enrollment/` returned server error; district's working parent entry `https://www.chisd.net/services/lacy-enrollment-center` links to its School Finder ArcGIS viewer. Consider navigation-source substitution only after source owner review; native Finder and residence result unverified |
| **P2 redirect** | Farmersville `043904` | 302 | Follow source-approved canonical destination in manual/browser check; no automatic redirect or source overwrite |
| **P2 redirect** | Avalon `070901` | 302 | Same; canonical destination not independently certified |
| **P2 redirect** | Quinlan `116908` | 302 | Same; canonical destination not independently certified |
| **P2 redirect** | Weatherford `184903` | 302 | Same; canonical destination not independently certified |

**Official source evidence:** Midlothian district 2026–27 enrollment page
`https://www.midlothianisd.org/enrollment` and current Find My School page
`https://www.midlothianisd.org/enrollment/find-my-school` (address lookup
and year/grade caution). Cedar Hill district enrollment center at
`https://www.chisd.net/services/lacy-enrollment-center` links to the
external Metro Study GIS School Finder. We verified the landing page and
linked target, **not** a live residential school allocation.

No changes were made to #173's 107 entries, their URLs in registry,
AG01/AG02/AG03 scope, or Production. Owners of the 107-link source PR
should review the two proposed URL repairs. The four redirects are not
automatically broken or verified. The six observations and 101 other
2xx results cannot certify address/year/grade correctness, and #148
remains production **NO_GO**.

## Independent security-gate observation outside Agent 04 scope

A separate GitHub Action `TX public release security gate (no deployment)`
in this period has had a failure in its **all-refs/full-Git-history Gitleaks**
job: one redacted history-level finding. The **PR-change secret scan** and
privacy checks for this draft passed, but the exact origin of the
all-refs finding has **not** been isolated by Agent 04. A full-history
security failure is a release blocker and should be routed to the
independent security workstream; do not suppress it or reinterpret
the Agent 04 source-audit green status as permission to deploy.
