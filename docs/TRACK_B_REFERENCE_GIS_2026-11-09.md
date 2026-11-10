# Track B — source-linked historical school GIS warnings
Date: 2026-11-09. Conditional GO candidate, pending exact integrated CI and Pages verification.

## Reference overlay
Irving: only after the viewer selects an address and clicks **참고 GIS 경계 표시 (배정 미인증)**. The existing geocoded point coordinates (not full address) are sent to the district-linked operational ArcGIS feature services; the browser draws three temporary orange dashed E/M/H polygons directly from the publisher. No GIS files are stored or rehosted.

## Warning contract
- The panel displays a high-contrast warning before the GIS lookup, in both dark and light themes.
- Every Leaflet polygon popup repeats "참고 GIS · 학교 배정 미인증", school name and original GIS vintage (elementary 2024–25, middle 2025–26, high current-year unknown).
- A separate notice explains opt-in coordinate transmission. Only exact iisd1.maps.arcgis.com is added to CSP/TrustedLinkPolicy.
- Existing ConditionalSchoolRelease stays mandatory, with empty authorization list. User-transcribed Finder comparison does not count as enrollment certification.
- Clear and re-search remove temporary reference polygons. Source change or ambiguous feature fails closed.

## Exclusions
Denton official 2026–27 GeoPDF-derived 39 polygon staging (#187) stays out of Pages pending derivative redistribution rights and near-zone-edge QA. Official district PDFs remain accessible through district links. Dallas vintage GIS, CFB estimates and Irving historical GIS are never promoted to current-year school assignments.

## Release QA
Unit tests for source drift and year flags; strict CSP and HTML bootstrap integrity; real desktop 1366/mobile 390 Chromium reference overlay with warning/popup, manual match/mismatch and clear. Public Irving school campus location only for browser QA, no household addresses stored in repository. User-approved Conditional GO covers source-linked informational references with user-visible warnings, not unlicensed GIS rehosting.
