# CFBISD public map assets and derived-reference GIS plan — 2026-11-10

## Official publisher
- [2025–26 approved attendance zones: visual maps and named-neighborhood changes](https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning)
- [Current district School Search](https://www.cfbisd.edu/students/school-maps-locator-system): CFB district says its current finder follows attendance boundaries approved by the board March 6, 2025.
- The page has **six publicly accessible raster map images** and detailed text tables. These are NOT verified machine-readable campus GIS polygons and no PDF download was observed on the specific page.
- Published page labels distinguish **Current** (before the 2025–26 rezoning) vs **Approved** (new after rezoning). Only APPROVED is a feasible baseline for an up-to-date *reference*, pending confirmation against live SchoolSearch and 2026–27 exceptions.

## EXACT public raster map asset URLs discovered via live official-page browser inspection

| Grade band | Prior/Current (pre-rezoning) | Board-approved (effective 2025–26) |
|---|---|---|
| Elementary | https://resources.finalsite.net/images/f_auto,q_auto,t_image_size_2/v1738880969/cfbisdedu/axgbvqropwt8seoc8h4r/CurrentElementaryAttendanceZones-01.png | https://resources.finalsite.net/images/f_auto,q_auto/v1750789234/cfbisdedu/m03d0jbfr3hqfnrg7eka/elementary-zones.jpg |
| Middle | https://resources.finalsite.net/images/f_auto,q_auto,t_image_size_3/v1738880934/cfbisdedu/iozjx0b5jflwo4ik89pb/CurrentMiddleSchoolAttendanceZones-01.png | https://resources.finalsite.net/images/f_auto,q_auto,t_image_size_3/v1738861157/cfbisdedu/raatffwyo1ypgwihngcu/middleschoolproposed-02.png |
| High | https://resources.finalsite.net/images/f_auto,q_auto,t_image_size_3/v1738880885/cfbisdedu/weocxvqxhnluhmsbvb63/CurrentHighSchoolAttendanceZones-01.png | https://resources.finalsite.net/images/f_auto,q_auto,t_image_size_3/v1738861128/cfbisdedu/lhksclpohnt5xm2zvgsq/highschoolproposed-02.png |

Exact CDN image delivery/quality may vary by browser. Before using for geometry trace, fetch native full-resolution assets, record pixel dimensions, inspect georeferencing and publisher reuse terms; the `t_image_size_3` variants may be downscaled.

## Key named-zone facts (not a substitute for full zones)

Official March 2025 rezoning text includes:
- Elementary: `Villas of Josey Ranch / Josey Ranch` → Carrollton Elementary, `Carling on Frankford` → Rainwater, `Carrollton Highlands` / `Perry Estates` / `Lux on Main` / `Union at Carrollton Square` / `Lyv Broadway` → Carrollton Elementary.
- Middle: `Dutch Village` / `Brookhaven Apartments` → Perry; `Morningside` / `Centerpoint` / `Woodlake` → Blalack; `Old Mill Court` / `Renaissance` → Polk; `Country North` / `Jackson Place` → Perry.
- High: `Morningside` / `Centerpoint` → Creekview, `Carrollton Highlands` / `Perry Estates` / `Lux on Main` / `Union at Carrollton Square` / `Lyv Broadway` → Newman Smith.
- `Central Elementary`, `Furneaux Elementary`, `McCoy Elementary` and `Long Middle` were consolidated under March 6, 2025 board approval; do not revive historical default zone candidates. The page's neighborhood list is **change-only**; it does not cover every dwelling and grade.

## Low-complexity 'connect the dots' plan (public/no-paid-API)

1. **Immediate visual reference**: show three approved image links/previews per grade band, with explicit 'official 2025–26 approved map image, not exact geolocated GIS' labeling. This is first-party source display only; check publisher hotlink/reuse policy before embedding/rehosting.
2. **Approximate geo overlay**: align each approved raster to its real road/street intersections using at least 4–8 distributed independent geocontrol points. Begin with semi-transparent Leaflet `imageOverlay` / georeferenced raster, not school-level polygon claims. A simple lat/lon bounding rectangle can distort non-axis-aligned source images; use proper transformation and inspect road alignment/overlaps.
3. **Manual verified tracing**: digitize visible zone boundaries per grade into a separate three-layer GeoJSON file, with provenance per feature: `source_url`, `source_effective_year='2025-26'`, `status='approximate_reference'`, `georef_method`, `uncertainty_meters` (measured; no invented values), `live_finder_crosscheck_status`. Build from road intersections, neighborhoods and official March 2025 change text. Do not extrapolate hidden/noisy line work.
4. **Address interaction**: point-in-polygon may generate **reference school candidate only**. Annotate unverified/boundary-adjacent, never silently mark automatic school assignment as final. District city/ZIP doesn't guarantee CFBISD. Existing Conditional School Release policy remains unchanged until proper validation/owner acceptance.
5. **Quality gates**: sampled public address base points per grade and distinct zones must match live GuideK12; test apartment subdivisions explicitly, school closure lists, polygon no-overlap/no-gap, source year and school marker counts. Mismatches stay "source review" without fabricated data. Preserve the original approved maps as selectable layer if tracing cannot be validated.

## What not to claim
- Three raster maps ≠ complete, exact or already-digitized GeoJSON.
- A 2025–26 approved publication ≠ independent 2026–27 polygon recertification.
- Neighborhood change list ≠ full address-school coverage.
- Other similarly named `CFISD` maps (Cypress-Fairbanks ISD), generic school-point ArcGIS layers, and unrelated attendance-zone FeatureServers are **not CFB boundaries**.
- School campus point ≠ a residential attendance polygon.
