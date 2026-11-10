# Denton GeoPDF-native geometry — independent boundary-edge sensitivity

This is a follow-up child of Draft PR #187. The parent has 39 PDF-derived 2026–27 school attendance polygon candidates (26 E, 9 M, 4 H). They are *not* the district native GIS export. The three official GeoPDFs contain geospatial control points and vector drawing paths. The reported calibration error of <=0.21m is only transform fit residual at the four PDF control points; it DOES NOT certify any residence-level boundary or effective assignment.

## New quantitative QA

Regenerate the PDFs and all 39 staging polygons using the pinned prior pipeline without committing GeoJSON. For **every detached school polygon part** greater than 100 square meters, generate deterministic synthetic points at seven boundary fractions, each offset by plus/minus 3m and 30m normal to the extracted line, then report local edge sensitivity counts. These are topology/geometry stress samples, NEVER actual homes or official Finder assignments.

For the three already independently Finder-observed public street addresses (nine E/M/H observations in parent QA), compute distance from a free Census street-interpolated location to each matching **derived** school polygon boundary in a meters-based UTM projection. Categorize <25m, <100m, 100–250m, >=250m; even a large margin only means street-location interior, not parcel boundary legal proof. The output summary contains *no* points or polygon arrays, just school IDs and distance measures.

All 39 campus IDs, source metadata flags, same-grade topology and nine prior address/grade observations remain prerequisites. Every generated output explicitly retains:
- approvedForProduction=false
- reusePermissionVerified=false
- officialOriginalGIS=false
- edgeParcelHoldoutsOfficialFinderVerified=0
- residenceAssignmentCertified=false

No PDF/vector/polygon artifact is retained or published by this child QA job, only the short-retention numerical boundary-risk summary. Parent #187 remains STAGING (NO DEPLOY) until the actual native district school GIS/rights response and official Finder edge-parcel corroboration are available. This new QA never authorizes an address auto school assignment.

Status: independent technical evidence, not permission to republish.
