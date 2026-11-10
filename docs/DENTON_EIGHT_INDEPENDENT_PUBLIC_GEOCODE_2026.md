# Denton 8 school-site coordinate exceptions — independent free public address geocode probe

The public official Denton district directory supplies the eight school building street addresses, separately from the existing 2024–25 NCES/TEA school markers. This QA-only branch checks each official street address in two independent free geocoders: Esri World and US Census. It compares provider results and notes the difference from historical NCES where available, recording source failures individually without halting the remaining eight.

The output includes no private residences or student data: only school ID/name, geocoder quality and rounded distance metrics. It does not commit coordinates to the main site, change current markers, or publish a zoning polygon. Published school addresses were already inventoried in PR #176.

A strong two-provider match is classified as a review candidate, not current school-site certification. School building footprint and district campus-point master records still need verification. Hill and Martinez have conflicting ZIPs in the official 2026–27 PDF vs live school directory; this script keeps them in a district-postal-conflict state even if geocoders agree.

Review results are available in a 7-day GitHub Actions artifact. readyForProduction=false and residentialAssignmentApproved=false for all eight by design. Existing Track B main site already shows the unverified historical marker source warning via #194. This is independent research to resolve historical-point discrepancies, not authorization to release new coordinates.

GitHub Free and public endpoints only; no paid services.

## Executed real Esri + US Census result — run 42731944805 (2026-11-10 UTC)

Read-only GitHub Actions completed **success**. All eight public school addresses were attempted; 8 valid Esri candidate matches and 5 Census geocode matches were returned, a total of 13 provider results. Three schools reached the cautious two-service street-geocode review-candidate threshold (<=200 meters separation and Esri score at least 95), **zero** current school site coordinates were certified, and **zero** attendance-zone polygons or home assignments were approved.

| School | Census match | Esri–Census distance | Esri–historical NCES distance | Decision |
| --- | --- | ---: | ---: | --- |
| Denton High | Yes | 217 m | 5 m | Review, two providers >200 m |
| Calhoun Middle | No | N/A | 11 m | Independent second source missing |
| Rodriguez Middle | Yes | 198 m | 25 m | Street-location review candidate only |
| Reeves Elementary | Yes | 161 m | 43 m | Street-location review candidate only |
| Cheek Middle | No | N/A | 11 m | Independent second source missing |
| Sandbrock Ranch Elementary | Yes | 161 m | 17 m | Street-location review candidate only |
| Hill Elementary | No | N/A | 67 m | Official district PDF/directory ZIP conflict |
| Martinez Elementary | Yes | 143 m | 23 m | Official district PDF/directory ZIP conflict |

The two-provider separation is measured between independently geocoded **street address estimates**, not building entrances, school footprints or verified school-campus GIS. The prior 2024–25 TEA vs NCES source discrepancy is a different comparison; a small Esri-to-NCES offset does not resolve current-school-site certification.

**Next evidence:** ask the district for its effective 2026–27 campus location/master-site points and correction to Hill/Martinez ZIP labels, independently verify Calhoun/Cheek/Hill street addresses, and check the border/campus location imagery. Do NOT replace historical production marker positions based on this probe.

Evidence: https://github.com/kevinim/kevinim.github.io/actions/runs/42731944805 and 7-day sanitized artifact https://github.com/kevinim/kevinim.github.io/actions/runs/42731944805/artifacts/13724568654.
