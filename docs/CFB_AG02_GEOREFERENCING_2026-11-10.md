# AG 02 — CFB 2025–26 raster georeferencing QA (research only)

**Source:** CFBISD board-approved 2025–26 elementary, middle and high school zone illustrations; links in \`data/cfb-approved-zone-raster-reference-2026.json\`. Current CFBISD GuideK12 address Finder is a separate authoritative address lookup. Neither source alone provides verified 2026–27 school attendance polygons.

## Scope and integration
This is a stacked Draft PR against #208, using only \`scripts/cfb-ag02-georeference-qa.py\`, \`tests/cfb-ag02-georef.test.py\`, and \`data/cfb-ag02-*-gcps.json\`. It does not edit AG03 polygons, AG05 UI, production data or GitHub Pages.
- Output is generated only in \`artifacts/cfb-ag02-georef\` and as seven-day GitHub Actions artifacts; it is **not** added to website assets.
- The script downloads publisher images only during the opt-in \`--fetch-images\` run. Source images are not committed.
- The official jurisdiction polygon from Texas Legislative Council is a district **outer** boundary, not any elementary/middle/high attendance-zone edge. It cannot be used as 8 independent image anchors unless an exact corresponding identifiable feature is present in the actual raster.

## Reproduction
\`\`\`bash
python3 -m pip install numpy pillow opencv-python-headless
python3 tests/cfb-ag02-georef.test.py -v
python3 scripts/cfb-ag02-georeference-qa.py --fetch-images
\`\`\`
Without \`--fetch-images\`, geometry model diagnostics run on stored anchors and report the map-download state as \`NOT_FETCHED\`. The Free GitHub Actions workflow \`cfb-ag02-georeference-qa.yml\` runs the real public CDN image-fetch/SIFT trial, reports failures explicitly and uploads research artifacts for 7 days.

## GCP evidence contract (each grade independently)
All pixels use **the exact downloaded original raster frame** measured from its top-left origin, with pixel centers as coordinate references. Do not measure on a browser-scaled screenshot unless the pixel scale and crop are reconciled with the original.

The elementary \`data/cfb-elementary-raster-calibration-draft.json\` has **14 rough campus-symbol anchors**, \`pixelConfidence = rough-visual\`; these are neither visually confirmed nor independent road controls. To replace them with verified controls, create \`data/cfb-ag02-elementary-gcps.json\` with the same shape as the initially empty middle/high templates. For each verified point, supply:

\`\`\`json
{
  "id": "unique-road-intersection-identifier",
  "pixel": [100.0, 200.0],
  "latlon": [32.95, -96.90],
  "role": "fit",
  "pixelVerified": true,
  "groundVerified": true,
  "pixelEvidence": "public official map URL plus landmark and pixel measurement process",
  "groundSourceUrl": "public verifiable GIS/map source URL",
  "groundSource": "road intersection or identifiable fixed landmark",
  "reviewer": "reviewer identifier",
  "reviewDate": "YYYY-MM-DD"
}
\`\`\`
**The values above are schema illustrations, not measured points; do not insert them as observations.** Use \`role: "independent-holdout"\` for geographically dispersed verification landmarks, and do not reuse a fit landmark as a holdout. Min target: **8 fully evidenced fit GCPs and 3 independently measured holdouts per grade**. More holdouts near extremities, skewed outlines, and split zones are strongly preferred. Do not reuse identical 2024–25 NCES campus marker approximations as if independently reviewed road intersections. For reproducible coordinate validation, groundSourceUrl must identify a public, independently checkable location.

For each grade, set \`rasterPixelSize\` to the actual \`[width,height]\` of the original downloaded source image (not a preview). A size mismatch blocks worldfile creation. The script requires documented pixel and ground evidence as well as verification flags, but flags are **not** a substitute for independent human checking; review the evidence.

## Model selection and data products
- Fit in local east/north metres near CFB (WGS84 latitude/longitude origin), report fit RMSE for affine, projective, and quadratic.
- A 4-quadrant spatially withheld subset of the *same rough fit controls* is an **internal proxy**, NOT independent validation.
- A true independent holdout RMSE is reported only when separately labelled, evidenced and excluded-from-fit \`independent-holdout\` points exist.
- \`{level}-calibration.json\` contains model coefficients, provenance, status, and a strict no-residence-assignment flag. \`{level}-residuals.csv\` lists per-point errors. \`{level}-independent-holdout.csv\` is emitted if genuine holdouts exist. \`{level}-residuals.svg\` plots error vectors scaled for inspection (1 displayed px=25 metres of error; not map scale).
- An affine \`{level}-DRAFT-REVIEW-ONLY.wld\` is emitted **only** if the actual source pixel frame matches the declared frame; E rough models may still emit an explicitly unverified draft worldfile. Worldfile coordinates are WGS84/EPSG:4326 pixel-centre longitude/latitude. For reference: the six worldfile lines are \`A,D,B,E,C,F\`. Do not interpret the worldfile as a precision certificate.
- \`cross-grade-automated-candidates.json\` records SIFT/RANSAC elementary-to-middle/high possible image matching. A \`UNVERIFIED_CANDIDATE\` means the image features align numerically, **not** that 8 independent ground coordinates have been checked. \`INSUFFICIENT_MATCHES\` and \`REJECTED_WEAK_DISTRIBUTION\` are useful failed experimental outcomes, not grounds for fabricated matches.
- Non-affine models are compared in metrics but their rational/polynomial coefficients cannot be represented by a six-parameter worldfile. They require a separate warping/grid resampling stage, with independent fit/holdout validation, before any GeoTIFF claim.

## Current evidence and release gate
Existing elementary baseline from #208: 14 approximate campus markers; **0 verified image GCPs**, affine fit RMSE ≈356.4 m. Recomputed leave-one-out on these same rough points: affine ≈476.0 m, quadratic ≈856.3 m. These CV numbers are preliminary rough-anchor diagnostic results, not true independently validated geographic errors.

The placeholders for M/H are intentionally empty. They are not calibrated, even if image-to-image candidate matching succeeds. The official 2025–26 raster source cannot be labelled 2026–27 official campus GIS. Geometry extraction and all address-to-school assignment remain blocked until AG03 topology and AG04 current GuideK12 residential holdouts pass separately. No production release or main merge is authorised here.
