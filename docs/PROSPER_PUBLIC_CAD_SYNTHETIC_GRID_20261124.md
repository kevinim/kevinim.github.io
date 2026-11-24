# Prosper 2026–27 P1 — synthetic GIS mismatch grid vs official appraisal parcels

Date: 2026-11-24. Trackers: [#376](https://github.com/kevinim/kevinim.github.io/issues/376), [#125](https://github.com/kevinim/kevinim.github.io/issues/125) and [#378](https://github.com/kevinim/kevinim.github.io/issues/378).

## The specific pending question

Prosper's official school-grade GIS contains **31 current 2026–27 campus-zone features** (20 E / 7 M / 4 H). Its source-faithful 120×120 QA grid has 293 synthetic points inside at least one but not all E/M/H polygon unions, including 121 strictly farther than 200 m from **all** missing-grade boundaries and 12 mixed-distance samples; the historical 133 any-missing-grade-far count has a separately correct meaning. Those grid points are **not actual parcels or verified school-enrollment failures**. The official Infofinder published geometry and independent six-pattern SearchLocation reference checks previously agreed, but neither establishes the land use of a grid cell.

## Public government sources for independent land-context evidence

1. **Collin Central Appraisal District (CCAD), published public-domain downloads**: [official Open Data Portal](https://collincad.org/open-data-portal/), [official live feature layer](https://services2.arcgis.com/uXyoacYrZTPTKD3R/ArcGIS/rest/services/CCAD_Parcel_Feature_Set/FeatureServer/4). This source documents `propType`, `propSubType`, `propYear` as field names, and the official site says its public exports are as-is public-domain data. Its layer edit timestamp on 2026-11-24 does **not** prove that every individual parcel classification is current.
2. **Denton Central Appraisal District (DCAD)**: [official published GIS layer](https://geo.dentoncad.com/arcgis/rest/services/LandRecords/Parcels_Appraisal/FeatureServer/1), with `propType` and `pYear`. The publisher retains attribution; no redistribution license/approval for its feature geometry is presumed.
3. **Official Town of Prosper public records**: [Data and GIS](https://www.prospertx.gov/288/Data-Map-Requests). Its own aggregate parcel layer [Reference_Layers/10](https://services8.arcgis.com/8ofMLzOrtxGP9wVQ/ArcGIS/rest/services/Reference_Layers/FeatureServer/10) explicitly states CCAD and DCAD as underlying canonical parcel publishers. The Town's 2023 layer last-edit metadata prevents treating it as a replacement for the appraisers' current official layers.

## Implementation and privacy

- `scripts/prosper-public-parcel-overlap-audit.cjs` deterministically reconstructs all **293 synthetic grid points**, exactly matching the source-faithful local polygon audit grid. It submits only **12-point multipoint** requests against two independently published official CAD feature services, using **read-only HTTPS POST** with ArcGIS `geojson` spatial query.
- `outFields` is restricted to classification and source-vintage metadata: CCAD `propType,propSubType,propYear`, DCAD `propType,pYear`. No user input or actual addresses, owner names, parcel IDs, situs, GIS raw parcel geometry files or unit identifiers are requested for return. Provider geometry may transiently be used in CI memory to intersect synthetic samples, but no geometry or raw parcel attributes are saved or logged.
- The persisted CI evidence is **aggregate counts only**, split by missing-grade pattern and conservative source classification. A point intersecting a `Residential` or `R` property-category label is **not evidence of occupancy**; `Commercial` etc. similarly does not prove that a property is an ineligible non-residential area. Unknown types are not reclassified. No match is reported as *no source parcel at synthetic point*, not as vacant or outside ISD. If either provider is down, classification records partial/unavailable source, **not absence of residences**.
- `tests/prosper-public-parcel-overlap-audit.test.cjs` checks the unchanged 293-cell source, minimal outbound fields, no owner/address persistence, source failures and malformed response fail-closed. Existing school polygon linkage CI performs a bounded public-source reference check without new workflow, no user data, no runtime map integration.

## Decision gate

**P1 is not complete** when the scripted source audit merely passes CI: the aggregate must be interpreted against actual CAD coverage, county border/municipal source footprints, parcel use-code meaning and school-district boundaries. An official tax-jurisdiction field is **not** a school-specific attendance assignment. Missing E/M/H campus polygons may not be fabricated from parcel observations. Even a parcel marked residential would need an independently approved precise school-year and unit-specific official Finder result for enrollment certification.

After running CI, inspect the aggregate artifact and distinguish: independent source reachable / source unavailable; parcels intersected / not intersected; type code known / unknown; Collin vs Denton coverage and date. A successful merge and Pages smoke verifies audit infrastructure delivery, **not residential classification or GIS expansion to the remaining 100 ISDs**.
