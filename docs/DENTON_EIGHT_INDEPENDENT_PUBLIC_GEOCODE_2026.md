# Denton 8 school-site coordinate exceptions — independent free public address geocode probe

The public official Denton district directory supplies the eight school building street addresses, separately from the existing 2024–25 NCES/TEA school markers. This QA-only branch checks each official street address in two independent free geocoders: Esri World and US Census. It compares provider results and notes the difference from historical NCES where available, recording source failures individually without halting the remaining eight.

The output includes no private residences or student data: only school ID/name, geocoder quality and rounded distance metrics. It does not commit coordinates to the main site, change current markers, or publish a zoning polygon. Published school addresses were already inventoried in PR #176.

A strong two-provider match is classified as a review candidate, not current school-site certification. School building footprint and district campus-point master records still need verification. Hill and Martinez have conflicting ZIPs in the official 2026–27 PDF vs live school directory; this script keeps them in a district-postal-conflict state even if geocoders agree.

Review results are available in a 7-day GitHub Actions artifact. readyForProduction=false and residentialAssignmentApproved=false for all eight by design. Existing Track B main site already shows the unverified historical marker source warning via #194. This is independent research to resolve historical-point discrepancies, not authorization to release new coordinates.

GitHub Free and public endpoints only; no paid services.
