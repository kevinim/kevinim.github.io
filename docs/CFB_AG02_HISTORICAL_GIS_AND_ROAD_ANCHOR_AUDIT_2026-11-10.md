# AG02 evidence: Carrollton historical polygons and municipal intersection candidates (Nov 10, 2026)

> **Research only.** This documentation does not authorize current school attendance assignments. The official 2025–26 raster maps and current GuideK12 address Finder are different source types. Historical GIS is not 2025–26 approved school GIS.

## Primary evidence and actual execution

The public ArcGIS publisher is the City of Carrollton service directory:
https://services7.arcgis.com/o731hPfw3YndegMz/arcgis/rest/services

| Independent GIS layer | Source data last edited | CFB feature count | Valid geometry | 2025-26 outer district coverage |
| --- | --- | ---: | --- | ---: |
| \`ElementarySchoolZones/FeatureServer/0\` | 2020-03-23 18:20 UTC | 20 | all 20 valid | 74.09% |
| \`MiddleSchoolZones/FeatureServer/0\` | 2020-03-23 18:39 UTC | 6 | all 6 valid | 98.62% |
| \`HighSchoolZones/FeatureServer/0\` | 2020-03-23 18:52 UTC | 4 | all 4 valid | 99.53% |

Tested against the **distinct** Texas Legislative Council 2025–26 official CFB school-district jurisdiction from PR #208, area about 125.07 km². These E/M/H counts are historical **campus-specific** polygons, not 2025 rezoned geometries. Municipal GIS field \`SCHOOLDISTRICT\` was filtered exactly to "Carrollton-Farmers Branch ISD". Raw CFB GeoJSON is retained only in a 7-day QA artifact and never written into production \`data/\`.

### Why the 2020 source is not currently certifiable

All three school-zone GIS layers were last edited in **2020**, before the district's March 6, 2025 board-approved closures and re-zoning. The 2020 polygons include Central Elementary, Furneaux Elementary, McCoy Elementary and Dan F. Long Middle School, which are no longer standard 2025–26 default campus assignments. We cannot label these records 2025–26 or 2026–27 official campus attendance GIS. Current GuideK12 residence-based confirmation is still needed for 2025 changes.

### Independent GIS topology and historic coverage

| Grade | Area not covered by own historical CFB zones | Area overcounted by historical within-grade overlaps |
| --- | ---: | ---: |
| Elementary | 32.406 km² | 0.008 km² |
| Middle | 1.728 km² | 0.006 km² |
| High | 0.582 km² | 0.007 km² |

Elementary's largest single historic gap is **28.977 km²**, centered approximately at longitude **-96.95609, latitude 32.89615** (spatial-geometry centroid, not a house or official zone point). Including other school districts' 2020 polygons inside the current CFB outer boundary only raises elementary coverage to **74.25%**, so wrong \`SCHOOLDISTRICT\` classification is not the primary cause. Middle and high coverage reach 98.75% and 99.67% when other-district-labeled polygons are included.

### Raster versus history compare

\`scripts/cfb-ag02-map-overlay-qa.py\` overlays:
- Original CFB 2025–26 approved elementary/middle/high raster image (unchanged map);
- **Red** old 2020 per-school polygon outlines;
- **Cyan** independent 2025–26 CFB district jurisdiction outline;
- An explicit text legend stating *2020 STALE*, *2025–26 raster*, *independent geodetic GCP=0*, and *rough elementary 356 m fit*.

AG02 renders all three PNGs in ephemeral CI artifacts only. The E outline is projected with rough affine; M/H use E rough affine and image-to-image ORB homographies. Visual fit is **not** a mathematical holdout or a current zoning verification, and raster-image alignment may still be off by hundreds of metres.

### Municipal street-intersection scout for true GCP follow-up

The public \`StreetCenterlines/FeatureServer/0\` is Carrollton municipal streets, last edited July 7, **2022**. The first actual run retrieved **2,252** arterial/collector segments, extracted **180** intersections where distinct named routes meet, and selected **32** spatially separated potential public control points. Source GIS street names, object IDs and ground lat/lon were retained, with approximate projected E/M/H raster pixel positions **only as suggestions**.

All **32** have initial automated pixel predictions inside each E/M/H image, which confirms only that the rough transform maps them into image frames; it does NOT show the intersection is actually located at those pixels. The separate `scripts/cfb-ag02-road-overlay-qa.py` generates three numbered annotated publisher rasters (one per grade), with yellow markers and a road-name index for direct landmark-by-landmark visual validation. These images remain in seven-day CI research artifacts, not the live website.

These 32 are **ground coordinate candidates**, not approved ground controls: no roadway intersection has yet had its correct 2025 raster pixel independently reviewed. \`pixelVerified=false\`, \`groundVerified=false\`, \`eligibleForModelFit=false\` on each item. No record is a known 2026–27 attendance point. This process does not query any home addresses, student details or commercial geocoder.

### Reproduce using free tooling
\`\`\`bash
python3 -m pip install numpy pillow opencv-python-headless shapely pyproj
python3 tests/cfb-ag02-georef.test.py -v
python3 scripts/cfb-ag02-georeference-qa.py --fetch-images
python3 scripts/cfb-ag02-legacy-gis-audit.py
python3 scripts/cfb-ag02-map-overlay-qa.py
python3 scripts/cfb-ag02-road-gcp-scout.py
\`\`\`
The free no-deploy GitHub Actions workflow runs these in order, then fails closed if historical GIS or road candidate data are absent/unverified or if temporary overlays failed. It uploads 7-day QA-only artifacts (source hist GeoJSON, image overlays, street candidates, transform matrices, residual table and error vectors). No user address is used or stored.

## Hand-off to AG03 / AG01 / AG04

- **AG01:** Check whether this municipal 2020 school zone source has a newer officially approved replacement and obtain permission/provenance for any current-year use. Ask CFBISD for 2025–26 or 2026–27 GIS and area changes; do not promote 2020 layers.
- **AG03:** Use 2020 vector geometry as an **historic baseline** to prioritize which polygon edges changed in 2025, not as current attendance. Clip to official current CFB outer district, pay attention to the 28.977 km² elementary source gap and named closed schools. Treat overlay as rough exploratory illustration. Keep zero verified school polygons until Finder matches.
- **AG02 follow-up:** For each grade inspect at least eight separate, ground-located visible public road intersection pixels and three independent holdouts in the original source image; record pixels/evidence in \`data/cfb-ag02-{grade}-gcps.json\`. Calculate independent RMSE; compare affine/projective/quadratic. Source image resolution is small, so pixel identification error may dominate and no precision should be claimed without holdout proof.
- **AG04:** Independent live official GuideK12 address-by-address matching; generic catalog results are invalid.

**Release state:** CI tests validate pipeline behaviour and historical source provenance. \`verifiedGCP=0\` for E/M/H, \`independentHoldoutRMSE=null\`, \`validForAutomaticResidenceAssignment=false\`, no main merge/deploy. \`AG02\` must remain Draft until those gates are satisfied.
