# Denton ISD 2026–27 — GeoPDF → WGS84 GeoJSON Proof of Concept

**Date:** 2026-11-09  
**Repository:** `kevinim/kevinim.github.io`  
**PR:** [#187](https://github.com/kevinim/kevinim.github.io/pull/187) (Draft child of #176)  
**Source of geometry:** Denton ISD *published official* 2026–27 aggregate GeoPDF maps.  
**Classification:** `DERIVED_FROM_OFFICIAL_GEOPDF` **STAGING, not original district GIS and not certified residence assignment.**

## What was actually implemented and verified

1. Download the three versioned publicly published Denton ISD **high, middle, elementary** GeoPDF files, using only the official Finalsite host. No private geocoder credentials or paid API.
2. Inspect 85,781 native vector drawing paths. These PDFs **are geospatially referenced**, not merely scanned maps: `/VP` contains a `/Measure` dictionary with `/Subtype /GEO`, four `/GPTS` (geographic lat/lon) control points and `/LPTS` (local map points), plus StatePlane NAD83 Texas North Central (US survey feet, EPSG:2276) WKT.
3. Calibrate native PDF page drawing x/y → projected StatePlane coordinates using four embedded control pairs, then transform to EPSG:4326 (longitude/latitude). Control-point reprojection **RMS 0.116 meters** for high/middle and **0.209 meters** for elementary. **Important:** these are only fit residuals at four map control points, not measured accuracy of each attendance boundary or home address.
4. Extract and label **4 high + 9 middle + 26 elementary** school-colored native fill paths, preserving holes, detached islands, and source drawing provenance. The 26 elementary map-colored paths are matched to 26 school IDs using PDF map text label anchors and native drawing-path index; this prevents ambiguous shared colors from aliasing Rivera and W.S. Ryan.
5. Repair native PDF self-touching rings with a bounded max area-change threshold; apply the PDF's actual opaque paint order so later school fills mask earlier overlaps.
6. Validate **39/39 official TEA campus IDs**, polygon/multipolygon validity, plausible WGS84 bounds, and **zero substantial same-grade polygon overlaps**. All 39 features have explicit source lineage, school-year label, `approvedForProduction=false`, `officialOriginalGIS=false` and `reusePermissionVerified=false`.
7. Independently geocode **three public real estate addresses** with the free U.S. Census `Public_AR_Current` street-geocoder, and test each coordinate against the **nine** grades 02/07/10 actually returned by the official Denton School Locator in browser run [42680389571](https://github.com/kevinim/kevinim.github.io/actions/runs/42680389571). **9/9 PDF-derived polygon containment results agreed with the official Finder sample campuses.** Census coordinates may be street-segment interpolations, **not** parcel-survey points.

### Exact latest successful pipeline

- [GitHub Actions run 42691734933](https://github.com/kevinim/kevinim.github.io/actions/runs/42691734933) — **SUCCESS**: source download, PyMuPDF vector audit, native GeoPDF georeference, 39 polygon exports, cross-campus shape/topology QA and Census-vs-Finder 9/9 sample comparison.
- [Download short-retention staging artifact](https://github.com/kevinim/kevinim.github.io/actions/runs/42691734933/artifacts/13707277506). ZIP includes:
  - `denton-geopdf-derived/high-2026-27-geopdf-derived-STAGING.geojson`
  - `denton-geopdf-derived/middle-2026-27-geopdf-derived-STAGING.geojson`
  - `denton-geopdf-derived/elementary-2026-27-geopdf-derived-STAGING.geojson`
  - `denton-geopdf-derived/staging-integrity-report.json`
  - `denton-geopdf-derived/census-street-holdout-report.json`
  - audited original publicly posted PDFs, PDF-local paths, page previews, forensic and topology reports.
- Artifact retention is **7 days**. The code can regenerate it from official public URLs using only GitHub Free.
- SHA/source audit and school-path text anchors are in the evidence artifacts. No derived GIS file has been placed on the public Production website.

## Exact reproducibility

```bash
python -m pip install pymupdf==1.26.7 numpy==2.2.6 pyproj==3.7.2 shapely==2.1.2
python -m unittest discover -s tests -p 'test_denton_pdf_vector_poc.py' -v
python scripts/denton_pdf_vector_poc.py
python scripts/denton_pdf_geopdf_probe.py
python scripts/denton_pdf_polygon_topology_debug.py
python scripts/denton_geopdf_to_geojson.py
python scripts/verify_denton_geopdf_staging.py
python scripts/denton_geopdf_census_holdout_qa.py
```

The free workflow `.github/workflows/denton-pdf-vector-poc.yml` pins dependencies and runs all these steps, never deploying or merging into `main`.

## What this accomplishes — and what remains NO-GO

**Technically resolved / staging approved for independent review:**
- No school-level geometry available at all → **39/39 PDF-derived *georeferenced* candidate polygons exist**.
- The PDFs had no usable geographic coordinates → **false**; the `/Measure /GEO` dictionaries provide four true embedded points and WKT.
- Extracting PDF vector shapes is impossible → **false**; original colored boundaries are extracted and georeferenced.
- School ID and school-year association → **39/39 join to published official 2026–27 PDF roster**.
- Baseline geographic QA → **39/39 valid, no major same-level overlaps, 9/9 independent Census-vs-Finder public street samples**.

**Still explicitly not certified or authorized for public Production use:**
- **Re-use, redistribution and attribution rights.** The source PDFs are public, but the permission for rehosting derivative GIS has not been confirmed. Denton ISD's Texas Public Information Act request was sent on Nov 9.
- **Precise parcel/home assignment at zone edges.** Census street geocoding is not survey-accurate; sample addresses were not boundary-adjacent. Broader near-boundary holdouts are needed with actual official Finder checks.
- **Source precedence and effective school-year certainty.** District original source GIS or the current official Finder can supersede PDF-derived surfaces. Update/reconciling original data remains required.
- **Eight historical campus point-location exceptions.** The source polygons do not validate those campus-building locations; do not clear their hold flags by inference.
- **Release sign-off.** Residential enrollment release guard #148 remains NO-GO until these explicit gates and the owner's merge/Production authorization pass. #185 informational-only Conditional GO is a *separate* Agent 06 branch; this PoC does not override its restrictions.

## Next integration recommendation

Agent 07 may review PR #187 and the regenerable GeoJSON staging artifacts **without deploying them**. Once right-to-redistribute and enough border holdouts are independently confirmed, import these polygons as `DERIVED_FROM_OFFICIAL_GEOPDF` with visible year/source/uncertainty and a permanent official Finder fallback. Do not label them `OFFICIAL_ISD_GIS` or use them to determine eligibility without the district's current address lookup. Preserve school markers as distinct records from their attendance zones.
