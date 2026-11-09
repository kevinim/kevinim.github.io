# Denton ISD: eight campus coordinate exceptions + 2026–27 GIS original-source audit

**Reviewed:** 2026-11-09 · **Scope:** Denton TEA district `061901` · **Branch:** QA-only child of Draft #174 (which depends on #169 → #167 → #164 → #162) · **Release:** **NO_GO**

## What was independently established

- Denton ISD's [current official school directory](https://www.dentonisd.org/our-district/our-schools) provides the publicly listed names and street addresses of **all eight** point-exception schools.
- The pre-existing `nces-locations-2024.json` has historic NCES school points for all 39 current PDF-roster campuses; no new coordinate or duplicate marker has been injected.
- Draft #174 already independently corroborates **31/39** historical 2024–25 points within **250 m**; remaining eight are **not current-year coordinate-certified**. The attached machine-readable audit lists all eight by exact TEA campus ID, current school address, historical failure type, and sources.
- The [official 2026–27 attendance-zone page](https://www.dentonisd.org/families/attendance-zones) links **39 individual PDF references (26 E / 9 M / 4 H)**, but it does not supply a verified machine-readable campus-by-campus `FeatureServer`, shapefile or GeoJSON.
- The [official School Locator](https://webquery-2-denton-tx.etstack.io/) remains the authoritative **address-check route**, not a GIS export license or an automatically verified output. Do not automate scraping or derive coordinates from its UI.

## Eight residual point cases

| TEA campus ID | Campus | Current district-listed campus address | Prior point failure | Source caveat |
|---|---|---|---|---|
| 061901003 | Denton High | 3001 Bronco Way, Denton TX 76207 | TEA/NCES 350 m apart | Official [Denton HS history](https://dentonhs.dentonisd.org/our-school) confirms 2022 relocation from Fulton Street to Bronco Way; this **does not prove** which 2024 geocode is accurate |
| 061901045 | Calhoun Middle | 1125 Crescent St, Denton TX 76201 | 304 m apart | [Official school history](https://calhounms.dentonisd.org/our-school) confirms August 2024 relocation to old Denton High building; new 2026 geocode/entrance check required |
| 061901050 | Rodriguez Middle | 8650 Martop Road, Oak Point TX 76227 | 459 m apart | Current address confirmed, geospatial displacement unresolved |
| 061901132 | Reeves Elementary | 2225 Riney Rd, Denton TX 76207 | TEA→NCES ID absent | Exact official campus ID crosswalk retained; source attributes need repair |
| 061901051 | Cheek Middle | 200 Denton Way, Aubrey TX 76227 | No TEA point | School website, district directory and NCES list **Aubrey** postal city; official 2026–27 middle PDF uses **Prosper**, corresponding to township location. Street/ZIP identity is stable; do not assume a different school |
| 061901129 | Sandbrock Ranch Elementary | 3690 Hunter Street, Aubrey TX 76227 | No TEA point | Official district address exists; second independent 2026 point not established |
| 061901130 | Fred Hill Elementary (directory: Hill) | 501 Ryan Spiritas Parkway, Little Elm TX 75068 | No TEA point | Directory short name differs from campus record; exact TEA ID retained |
| 061901131 | Dorothy Martinez Elementary (directory: Martinez) | 2855 Eppright Dr, Little Elm TX 76227 | No TEA point | Directory short name differs from TEA/PDF; exact TEA ID retained |

**Important:** Current official **addresses** are corroborated; *current latitude/longitude values are not certified*. A 304–459 m difference between source points cannot be resolved merely by averaging or changing a geocoding tolerance. Those eight markers must retain the historical-location warning. Do not promote the exception audit to a new map data source.

## GIS acquisition — vetted sources and dispositions

| Public source | Data | Why not promotable to current campus zone |
|---|---|---|
| [Denton official 2026–27 zone maps](https://www.dentonisd.org/families/attendance-zones) | 39 school PDFs | Correct school-year source, but **no extracted vertex geometry** |
| [Denton School Locator](https://webquery-2-denton-tx.etstack.io/) | Public live address finder | Query UI, not a documented public polygon API or reuse authorization |
| [March 24, 2026 approved rezone](https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification-26-27) | Paloma Creek/Bell/Martinez/Sandbrock/Savannah/Union Park changes | Current-year change evidence, not GIS dataset |
| [Denton CAD SchoolDistrict MapServer 4](https://geo.dentoncad.com/arcgis/rest/services/ReferenceData/SchoolDistrict/MapServer/4) | District *administrative* polygon | No elementary/middle/high school assignment zones |
| [DentonSchools_2023to_2024](https://services2.arcgis.com/VNo0ht0YPXJoI4oE/ArcGIS/rest/services/market_area_F_WFL1/FeatureServer/0) | 2023–24 geocoded **points** | Old point layer, not school attendance polygons |
| [TEA geographic data notice](https://tea.texas.gov/families-and-students/school-district-locator/geographic-data) | General ISD boundaries | TEA expressly cautions that this is not a school attendance zone determination |
| [NCES SABS](https://nces.ed.gov/programs/edge/SABS) | 2013–14/2015–16 historic attendance polygons | Not 2026–27 |

**Result:** No approved, current-year, school-by-school polygon original was verified in the reviewed public sources. This does **not** mean Denton ISD has no internal GIS master. The official current PDF maps may have been authored from a GIS source; obtaining the source still requires the publisher's original export/permissions.

## Explicit requirements for the next acquisition / release gate

1. Obtain **existing** Denton ISD 2026–27 school-boundary digital export, ideally separate elementary/middle/high GIS layers with shapefile/GeoJSON, campus name/TEA ID, grade span, board approval/version date and coordinate reference system. Confirm license and permission for a public free website. Ask for electronic records already held by the district; never ask for custom GIS creation.
2. Confirm that the export actually reflects **March 24, 2026 Paloma Creek modification** and any later amendment. If not, keep `historical`/reference status.
3. Independently compare GIS IDs/roster to all 39 current official PDFs; check no missing/overlapping elementary, middle or high records except explicit exceptions, valid rings and SRID conversion.
4. For the eight campus points, compare current district building address to a 2026 independent geocode *and* mapped site/building footprint/entrance; explain relocations and update warnings only on matched evidence.
5. Run real residential address → district School Locator (grade-specific) → exact campus → current polygon visible / correct boundary, independently sampled under **#148**. Do not infer actual assignment from school **point** proximity.
6. Obtain explicit owner review before any Production merge/deploy. Keep CFB's parallel work isolated. **No paid API, request, or GitHub feature** is required for this QA branch.

## Regression protection

`node --test tests/denton-eight-point-and-gis-disposition.test.cjs` asserts:
- the eight IDs match the exact older #174 exclusion list and official 39-campus PDF roster;
- NCES point availability is still preserved, with all 8 unresolved and zero newly fabricated coordinates;
- recorded historical differences of 304/350/459 m are held;
- the Cheek Prosper/Aubrey name ambiguity is documented;
- all cited GIS candidates remain non-certified for 2026–27 attendance polygons;
- Denton remains **NO_GO** and cannot be counted as an 8th source-connected GIS ISD.

No runtime map behavior, existing production content, release workflow, or source data was mutated in this PR.

## 2026–27 primary-source ZIP discrepancy (new independent audit)

The [current Denton ISD campus directory](https://www.dentonisd.org/our-district/our-schools) and its **own 2026–27 official zone PDF legends** disagree about the postal ZIP code for two of the eight held campus locations, despite matching street addresses:

| School / ID | Current live district directory | Official 2026–27 zone-PDF legend | Classification |
|---|---|---|---|
| Hill Elementary `061901130` | 501 Ryan Spiritas Parkway, Little Elm **75068** | Same street, Little Elm **76227** ([PDF](https://resources.finalsite.net/images/v1777569439/dentonisdorg/lqtay6k6ym56kuyqgiwo/HillES-ZoneMap_26-27.pdf)) | Unresolved official ZIP disagreement; no current location point approval |
| Martinez Elementary `061901131` | 2855 Eppright Dr, Little Elm **76227** | Same street, Little Elm **75068** ([PDF](https://resources.finalsite.net/images/v1777569439/dentonisdorg/duy4xl0ijgbdjkequhea/MartinezES-ZoneMap_26-27.pdf)) | Unresolved official ZIP disagreement; no current location point approval |

The audit retains the live directory addresses as *directory-published addresses*, not guaranteed postal or map-point truth. No coordinate, map geometry, or school assignment status is upgraded. Obtain site footprint/entrance corroboration and publisher clarification before certifying a precise location; ZIP-only geocoding is particularly unsafe.

**Future-year contamination guard:** The district also publishes a [proposed 2028–29 high/middle-school modification](https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification), including potential changes to Calhoun, Rodriguez and the high-school zones. The district explicitly states it does **not** change 2026–27/2027–28 assignments. Proposed 2028–29 maps cannot fill 2026–27 GIS gaps and must not be counted as official current-year polygons. The source disposition file and regression tests enforce this classification.
