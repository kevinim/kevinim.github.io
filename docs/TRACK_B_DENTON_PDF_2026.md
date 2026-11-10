# Denton Track B — 39 official 2026–27 school PDF map references

The Dallas source GIS Track B release is separate. This PR is a link-only Denton extension based on source Draft #169, **not** a merge of the #162/#164/#167 stacked address-assignment runtime.

Denton ISD supplies 26 elementary, 9 middle and 4 high school 2026–27 official attendance zone PDFs. We link to each exact official published PDF using TEA nine-digit ID and grade; we do not copy or rehost source PDF files or inferred GIS shapes. The public dashboard school-boundary panel now has a visible mobile-accessible 39-school selector, official School Locator, source warning and district rezoning reference. No Denton school polygon is registered as current and no household attendance school is inferred.

Source IDs: denton-official-zone-references.js published district Finalsite PDF paths; original source request and provenance in Draft #169. Paloma Creek older standard zones are not reused. School-click map popups and eight disputed Denton campus location points remain separate unresolved work under #174/#176. The 39 polygons extracted from native GeoPDF in Draft #187 remain STAGING, not rehosted; derivative license and boundary-edge QA are not satisfied.

The exact website release gate continues to authorize zero residential auto-assigned schools. All UI links open with rel=noopener noreferrer; no district API request, geocoder address, private residence or paid subscription is required by this PDF selector. Actual browser test chooses a published school by ID and confirms its specific official 2026–27 PDF without drawing any synthetic zone.

Conditional GO is limited to **published official PDF reference links**, not a current-year GIS/GeoJSON release.
