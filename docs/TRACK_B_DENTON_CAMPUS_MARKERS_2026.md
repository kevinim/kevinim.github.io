# Denton 39 campus marker reference and provenance (Track B)

Exact educational institution campus ID and 2026–27 school-specific PDF source links are now associated in the **selected school detail panel**. The data does not provide residential boundary or a new school address-location accuracy certification.

The existing dashboard already loads NCES 2024–25 coordinates for 39 Denton PDF roster campuses; do **not** add another set of duplicate markers. The original #174 independently examined 31 campus geocoder points and NCES markers within 250m and 8 separately documented exceptions. This release imports the independent 31-point provenance catalog and exact 8 official campus street addresses, with the original exclusion metadata intact, and labels every selected Denton campus with its actual source review status.

- 31: TEA/NCES public 2024–25 school building points, two-source historical check. These are still not current 2026–27 building coordinates.
- 8: public current campus address corroboration, but independent current coordinate proof missing. The UI explicitly warns "마커 좌표 미인증." Hill and Martinez district directory/PDF postal ZIP contradictions also remain visible. The user is never shown unverified points as certified; known historical NCES marker remains a **reference**.
- The selected-school panel uses the 9-digit exact TEA ID and district 061901 to identify the official school-specific 2026–27 PDF; never infers a school by ZIP, nearest campus or household address.
- The sole grade classification correction is based on exact current district PDF ID; coordinates and attendance-zone state are **not modified**, and all residential assignment grants remain zero.

This is intentionally independent of the older #162/#164/#174 stacked runtime and the derivative GeoPDF zone polygons in #187. It neither rehosts official PDFs nor the 39 generated GeoJSON zone shapes. This branch adds no external API origins, secrets, user addresses or paid tools.

Required QA: 39 exact campuses and independent 31/8 census; explicit warnings; existing dashboard and CSP hash-pinned bootstrap; real 390/1366 Chromium marker click for Bell/Navo/Braswell/Cheek, exact official PDF link, zero invented GIS, no JS errors. Clear/selected-school transition must never preserve old source details.

Unresolved: 8 current **coordinates** and their official school-site addresses need independent school-site point proof; PDF geometry rights and edge-parcel holdouts remain distinct; actual residential admission never authorized.
