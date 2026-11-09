# Finder-derived attendance boundary pilot — CFB first

Status: RESEARCH / NO ESTIMATED POLYGON PUBLISHED. No GIS boundary is created by this PR.

## Evidence and permission gate
1. Confirm the official district finder permits automated or bulk access, or obtain written permission / licensed data. Respect rate limits; do not bypass access restrictions.
2. Use legitimate, public, independently geocoded residential parcel/address samples; never commit private household addresses or unit-level personal data. Sampling ZIPs alone is insufficient. District and parcel location must be verified.
3. Query official finder for school year and grade; capture campus IDs, source URL, timestamp, and anonymized case IDs. Separate elementary/middle/high and school-choice/special exceptions.
4. Generate candidate polygons only within sampled coverage. Do not use ZIP polygons, Voronoi nearest-campus, city limits, or a district border as attendance boundaries.
5. Adaptive sampling around candidate transitions; retain unsupported edges as unknown rather than closing arbitrary polygons.
6. Hold out independent addresses for each campus and boundary-adjacent area. Reject any mismatch. Validate topology (no self intersections, no fabricated full coverage), source year, and exception behavior.
7. Only a reviewed approved dataset may be rendered using displayMode='finder-derived-reviewed'; label it '공식 Finder 결과 기반 추정 경계' with visible uncertainty and source date. Unreviewed geometries must never display.
8. Official Finder remains the only assignment authority. The school release gate remains NO-GO until independently reviewed evidence is supplied; this pilot does not override it.

## CFB-specific blocker
GuideK12 official address lookup is operational, but campus GIS export is not verified. Need official bulk-query permission and independent sampling; do not scrape the service by default. Without permission or adequate coverage, show official Finder link only.

## Allen
City ArcGIS polygons are historical; check each feature's YearUpdated and district official address ranges before considering any updated reference. Never silently relabel historical GIS as 2026–27.
