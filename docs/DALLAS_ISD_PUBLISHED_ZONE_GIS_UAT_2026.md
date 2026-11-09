# Dallas ISD published attendance polygons — provisional GIS UAT

As of 2026-11-09. This change is **Draft only** and not a legally certified school assignment.

## Source acquired: three district-publisher ArcGIS feature services

The Dallas Independent School District's public ArcGIS publisher account exposes live polygon layers for elementary, middle and high school attendance areas under one `services.arcgis.com` account. Source records were inspected via a read-only GitHub Actions run, not rehosted in this repo.

| Level | REST Feature Layer | District polygon features | Distinct campus IDs | Last edit (UTC) |
| --- | --- | ---: | ---: | --- |
| Elementary | https://services.arcgis.com/RfrtTbYxQ8YIhjWT/ArcGIS/rest/services/Elementary_Attendance_Boundaries/FeatureServer/0 | 135 | 135 | 2026-07-22T16:47:26Z |
| Middle | https://services.arcgis.com/RfrtTbYxQ8YIhjWT/ArcGIS/rest/services/Middle_Attendance_Boundaries/FeatureServer/0 | 30 | 30 | 2026-07-22T16:49:31Z |
| High | https://services.arcgis.com/RfrtTbYxQ8YIhjWT/ArcGIS/rest/services/High_Attendance_Boundaries/FeatureServer/0 | 22 | 22 | 2026-07-22T16:50:23Z |

**187 readable GIS polygons and campus IDs**, all within the approximate Dallas region. Source validation requires all three grades, minimum expected campus counts, editable source update epoch not older than July 2026, latitude/longitude bounds, campus number, polygon geometry, and absence of partial/truncated source output. A failed dependency rejects the entire Dallas GIS source; it does not silently fall back to an unrelated zone or district outline. Field `SLN`, `MID_SLN`, `HIGH_SLN` is normalized to TEA campus ID prefix `057905`.

**Crucial limitation:** A layer edited in July 2026 does **NOT**, by itself, establish that its polygons are approved 2026–27 assignment zones. The published fields have no explicit school-year attribute, and an independent house address + school-grade check against the district's SchoolSite Locator / authoritative PowerSchool street directory is not complete. No zone is labeled `current` or `finder-current` by this PR; the output state is `publisher-provisional`. 2026–27 PDF maps at https://www.dallasisd.org/departments/demographic-studies/attendance-zone-maps are useful independent comparison references, but PDF existence is not a machine-readable endorsement of this exact polygon layer.

Dallas official SchoolSite Locator https://www.dallasisd.org/departments/demographic-studies/find-your-school/schoolsite-locator-interactive-map explicitly says schools must verify and enroll by their PowerSchool street directory; magnet/choice exceptions apply.

## Browser UAT

- The dashboard **reads the 3 public polygon layers only**, with HTTPS and `connect-src https://services.arcgis.com`; no new outbound user address request, geocoding or stored residence.
- Only after all 3 source endpoints pass does it enable candidate point-in-polygon for the Dallas district (`057905`).
- Selecting a user-provided address may highlight **candidate** zoned elementary, middle, high schools, draw their live-publisher polygons in **orange dashed provisional style** on the map and show the conspicuous unverified-year caution. School click shows source caution too.
- Source outages, invalid IDs, malformed polygon, boundary uncertainty, district overlap, and not-assigned specialty/choice schools must NOT be promoted to confirmed current-year results.
- This school-map overlay is built on parent PR #162's address-selection component. It has no overlap with Finder-derived interpolation engine #154 or CFB #155, where publisher-provided polygons are not yet available.
- Integration with in-flight registry #158 and parent link chain #141…#160 must preserve all their source dates and footnotes. Do not blindly merge conflicts.

## Safety and licensing

Service metadata is publicly queryable; this PR uses read-only client requests from the official published host. **The public service listing has no explicit redistribution license, so this PR does not copy or rehost the 187 polygon geometries**. Confirm district reuse/attribution terms before deploying broadly. No service API key needed; none is embedded. We do not submit user addresses to this GIS source. The app's pre-existing geocoder privacy notice still applies.

## Independent UAT release criteria (NOT YET MET)

1. Confirm official GIS source ownership and that the July 2026 polygons are the district's **approved 2026–27** zone set, not only an older layer edited in 2026.
2. Independently verify public-facility/nonprivate control addresses across elementary, middle, high SchoolSite responses with holdout addresses and edge cases (apartments, specialty and boundaries), and compare campus identifiers against this source.
3. Verify all 187 polygons connect to correct nonretired campuses; record exceptions and missing links in a district-specific census.
4. Run required security, 390px mobile / 1366px desktop and address→official Finder→school→visible polygon gate #148 before a production signoff.
5. Respect permissions/licensing; obtain official confirmation if redistribution or automated query reuse is restricted.

**Results: new source discovered, downloaded in memory, its GIS schema and map candidate integration in Draft PR. Exact residence→legally enrolled school accuracy remains unknown.**
