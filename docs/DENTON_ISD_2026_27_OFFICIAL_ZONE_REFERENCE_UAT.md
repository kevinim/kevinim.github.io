# Denton ISD 2026–27 attendance map references — GIS unavailable

Public district source: https://www.dentonisd.org/families/attendance-zones
Verified 2026-11-09: 26 elementary, 9 middle and four high **school-specific PDF maps**.
Three grade-level overview PDF maps are used if the clicked school cannot be
uniquely matched by nine-digit TEA campus ID and grade.

The 39 source PDFs are linked directly from the district's Finalsite files.
They are *not* downloaded, copied, scraped or transformed into GIS vectors.
**DFW district GIS source coverage therefore remains 7/108, not 8/108.**

On school-click when there is no certified Denton polygon, the dashboard shows
Denton 2026–27 official PDF references and a prominent **GIS NOT AVAILABLE**
warning, plus the School Locator and the district rezoning decision.
It does not infer a school from a home location. No home addresses or property
coordinates are sent to the PDF publisher or logged by the code.

Official 2026–27 rezoning (Board approved 2026-03-24):
https://www.dentonisd.org/families/attendance-zones/attendance-boundary-modification-26-27

Paloma Creek Elementary TEA campus 061901120 is in preliminary accountability
data and 2025–26 maps, but its zoned enrollment ceased in 2026–27. The affected
Bell, Union Park, Sandbrock Ranch, Savannah and Martinez zones are published
separately. Ginnings construction 2025–27 is also not assumed current.

**Still NO-GO under #148:** Denton has no verified publisher-permitted 2026–27
GeoJSON/FeatureServer school polygons in the dashboard, no independent residence
-> School Locator -> K/6/9/12 match, no verified GPS polygon boundary.
The PDF fallback cannot be used to pass a polygon or legal assignment gate.
Production requires explicit owner approval.
