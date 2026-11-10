# AG03 — CFBISD 2025–26 campus attendance zone reconstruction (Draft only)

**Working branch**: `ag03/cfb-boundary-reconstruction-qa-20261110`  
**Dependency**: stacked on the Phase-1 Draft PR #208; **NOT** a production/main change.  
**Release gate**: `DRAFT_UNVERIFIED_VISUAL_ONLY` for *every* geometry and report.

## Verified source inventory

- [CFBISD board-approved 2025–26 E/M/H illustrated maps](https://www.cfbisd.edu/departments/facility-support-services/facility-planning-advisory-group/2025-2026-rezoning); approved March 6, 2025.
- [CFBISD current GuideK12 search](https://www.cfbisd.edu/students/school-maps-locator-system); independent actual-address assignment is the required later check.
- The three exact raster URLs are maintained in `data/cfb-approved-zone-raster-reference-2026.json`.
- The Texas Legislative Council 2025–26 CFB **district outer polygon**, stored in `data/carrollton-three-isd-boundaries-2025.geojson`, is **not a school attendance polygon**.
- The pre-existing 14 elementary marker controls are **rough** (`verifiedPixelAnchors=0`); Phase 1 reported affine training RMSE ≈ 356.4 m. Middle/high calibration has not been independently supplied.

## Delivered implementation

| Deliverable | File / artifact | What is and isn't supported |
| --- | --- | --- |
| Shared E/M/H pipeline | `scripts/cfb-ag03-reconstruct.py` | consumes Phase-1 **image pixel only** color contours, clips against CFB district, emits research-only 4326 candidate geometry **if grade controls exist** |
| Grade identity checklist | `data/cfb-ag03-zone-roster-review.json` | 21 E / 5 M / 4 H *research candidates*, excludes Central/Furneaux/McCoy E and Long M (closed 2025), excludes Early College; must be manually reconciled with raster legend |
| Reviewed contour label crosswalk | `data/cfb-ag03-contour-label-review.json` | intentionally empty until an independent human reads labels on exact official raster and records visible evidence; **school building points are not used to auto-name polygons** |
| Method comparison | `scripts/cfb-ag03-method-comparison.py` | color quantization vs pixel-coordinate vector contour simplification vs manual registration; quantifies limitations, NOT validation |
| Geometry QA | `tests/test_cfb_ag03_reconstruct.py` | synthetic affine/projective controls, rejected self-intersecting ring, fragment overlap, empty middle/high, invalid-source, no-implicit-release gates |
| Free CI | `.github/workflows/cfb-ag03-boundary-reconstruction-qa.yml` | offline tests and public-raster exploratory artifact; no publication to site `data/`, no deployment, 7-day artifact expiry |

### Per-grade outputs (in GitHub Actions **artifacts only**, NEVER in the public website)

- `artifacts/cfb-ag03/cfb-elementary-DRAFT_UNVERIFIED.geojson`
- `artifacts/cfb-ag03/cfb-middle-DRAFT_UNVERIFIED.geojson`
- `artifacts/cfb-ag03/cfb-high-DRAFT_UNVERIFIED.geojson`
- `artifacts/cfb-ag03/cfb-{elementary,middle,high}-coverage-qa.json`
- `artifacts/cfb-ag03/cfb-ag03-summary.json`
- `artifacts/cfb-ag03/cfb-method-comparison.json`

The reports include candidate fragment count, projected gap/overlap *estimates*, accepted self-intersection count (always zero), rejected invalid geometry, manually mapped campus IDs, TEA roster mismatches, missing-school candidate list, registration metrics and independent GuideK12/Finder blocker. All geometry and gap estimates are **unverified reconstruction QA**, not measured school-zone coverage. Gap metrics are against the jurisdiction *envelope* and are not a claimed campus assignment topology.

**Important missing-input behavior:** If a grade has no matching calibration file, its GeoJSON is a real, valid **empty** FeatureCollection with an explicit `AG02_CALIBRATION_MISSING` blocker, rather than fabricated coordinates. E can contain rough candidates using the Phase-1 elementary controls, but none can be published. If official raster retrieval fails, all grades still produce fail-closed schemas and an input-missing report.

## Reproduction (Linux/macOS/Python 3)

```bash
python3 -m venv .venv-cfb-ag03
. .venv-cfb-ag03/bin/activate
python -m pip install numpy shapely opencv-python-headless pillow
python -m unittest discover -s tests -p 'test_cfb_ag03_reconstruct.py' -v
# The following uses ONLY approved, public CFB image URLs:
python scripts/extract-cfb-approved-raster-pixels.py
python scripts/cfb-ag03-reconstruct.py
python scripts/cfb-ag03-method-comparison.py
```

No API keys, paid GIS platforms, bulk address scraping or household information is used. Pipeline is independent of the `AG 02` file locations; **DO NOT modify** AG 02's files. To consume independent AG 02 controls when ready, pass paths on command line:

```bash
python scripts/cfb-ag03-reconstruct.py \
  --control elementary=/path/to/verified-E.json \
  --control middle=/path/to/verified-M.json \
  --control high=/path/to/verified-H.json
```

Each grade calibration input must contain `level`, `rasterPixelSize` matching the exact source image, `controlPoints` with `pixel: [x,y]` and `latlon: [latitude,longitude]`, and `verifiedPixelAnchors`. Current projective fit is an experimental comparison; no extrapolative warp is certified. Avoid editing or copying AG02's source controls into the app. All transforms remain research-only until independent road controls and held-out error verification are present.

## Comparison of free methods

| Method | Advantage | Failure mode | Use in AG03 |
| --- | --- | --- | --- |
| OpenCV HSV + k-means color segmentation | Fast, reproducible segmentation of painted regions | Ink, legend, roads, colors/labels can merge or split areas; no school name inherent | Exploratory seed contours only |
| Vector contour tracing/simplification | Allows Polygon validity, holes and topology metrics | Smooth-looking vectors are **still** inaccurate if raster line or color detection is wrong | Research polygons with defect report |
| Manually reviewed street intersections / independent controls | Better geographic anchor accuracy where verifiable | Time intensive; school markers are not reliable road intersections; image versions/scales differ | Calibration input per grade, not automatic sign-off |

## Missing cases and AG04 contract

Current campus-grade label mapping is **0 independently raster-verified assignments**. Before accepting **any** school-specific polygon:

1. Independently confirm every expected campus name on the exact *approved* grade map (not the superseded “proposed” or “current” alternatives). Correct the roster only when source evidence exists; do not manufacture a label.
2. Review each contour with a school name; record manual evidence in `data/cfb-ag03-contour-label-review.json`: numeric contour index -> `{ "teaCampusId": "057903111", "reviewStatus": "human_label_read_unverified_zone", "evidence": "pixel x/y, visible name and source image url" }`. This is still **not** a certified GIS assignment.
3. AG02: supply at least 8 independently checked *road/landmark* coordinates per grade in the schema above; compare held-out residuals and raster fit across extent, particularly borders.
4. AG04: for each candidate school zone check multiple **public permitted base residential addresses** in the official GuideK12 UI; select the **actual matching address autocomplete suggestion**, then read assigned E/M/H schools. Generic “Matching Results” catalogs are **not** school assignment observations. No private addresses or student data. Record explicit failures for stale year, wrong campus, boundary ambiguity, geometry gap/overlap.
5. Do not use the two historical Finder fixtures as polygon cross-check successes; current independent geometry-vs-Finder holdout count remains **zero**.
6. Keep `currentYear2026_27Verified=false`, `residentialAssignmentEnabled=false`, `releaseEligible=false` through validation. The 2025–26 map age must be explicit even where CFB's 2026–27 Finder reflects the March 2025 zoning decisions.

### Practical handoff to AG04

Read the ephemeral CI `CFB-AG03-DRAFT-UNVERIFIED-geometry-E-M-H` artifact. Use `cfb-*-coverage-qa.json` to prioritize unlabeled, overlapping, gap, and missing campuses. **Do not point the dashboard at artifact GeoJSON** or call a school assignment from a geospatial point-in-polygon check until the district, school and grade have current official Finder matches, precision and licensing independently approved.

**No UI changes, no auto assignment switch, no main merge, no user-address persistence.**
