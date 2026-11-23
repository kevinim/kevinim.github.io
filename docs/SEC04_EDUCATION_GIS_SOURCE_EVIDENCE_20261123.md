# SEC-04 — Education and school GIS per-source evidence (2026-11-23)

**Status: evidence triage only; no redistribution approval; no Public Production release.** The owner has deferred separate Cloudflare Pages and family authentication. Neither is involved in this change.

## Precise scope

[PR #399](https://github.com/kevinim/kevinim.github.io/pull/399) previously classified 200 education-labelled and 44 GIS-labelled files from the **sanitized preview** using filename heuristics. These are review **candidates**, not independently established publishers, file identities, or licenses. That PR remains unmerged as of this work unit.

This independent follow-up examines **15 pinned repository source/provenance files** (7 TEA/education, 8 school GIS), which need not all be included in the 244 preview candidates. The read-only CI reports their exact intersection with the sanitized preview, rather than subtracting 15 from 244 without proof.

Manifest: `deploy/sec04-education-gis-evidence.json`. Every entry records the exact Git blob SHA, internal source marker, source page, terms page if found, and **pending** rights decision. The auditor `scripts/audit-sec04-education-gis-evidence.cjs` refuses changed blobs, missing provenance markers, duplicate paths, unsafe symlinks, invalid references or a fabricated `approved` decision. Aggregated totals only are published to Actions; no raw student files, paths or personal data are uploaded in test artifacts. The manifest itself contains only names of public source/provenance files and publicly published provider URLs.

## First-pass source assessment

| Files in this review subset | Source trace and observed limitation | Reuse decision |
| --- | --- | --- |
| `data/tea-accountability-2026-verified-batch.json`, `data/tea-staar-meets-2026-verified-batch.json` | Source metadata identifies the official TEA 2026 campus accountability/STAAR portal, with published dataset categories and masking rules | **Pending**; publisher portal accessibility is not independent reproduction permission |
| `data/tea-peims-2025-26-statewide-parity-audit-2282.json`, `data/tea-allen-mckinney-campus-qa-2026.json` | TEA PEIMS aggregate/ethnicity source references and published-vs-masked cell provenance recorded. Suppressed cells cannot be reconstructed | **Pending**; verify separate PEIMS report/reuse conditions and derived values |
| `data/tea-cfb-lisd-academic-2026-verified-batch01.json`, `data/tea-2026-uat-progress.json`, `data/tea-profile-progress-2026.json` | Publisher-labelled campus metrics and local processing status; latter two are local audit/coordination records, not independently licensed datasets | **Pending**; identify shipped facts vs internal methodology separately |
| `data/denton-2026-27-gis-source-disposition.json` | Denton ISD publishes current school-zone PDF references. The repository records that derived GIS was **not** approved for public release | **Pending**; do not rehost vector geometry without rights review |
| `data/mckinney-2026-27-provenance.json` | McKinney ISD publishes 2026–27 zone maps and feeder plans; live MetroStudy GIS source is mentioned in metadata | **Pending**; verify third-party service item terms independently |
| `data/cfb-approved-zone-raster-reference-2026.json`, `data/cfb-historical-city-gis-links-2020.json` | District/municipal references are board-approved raster and *historical* GIS links, not certified current residential assignments | **Pending**, no implicit derivative geometry permission |
| `data/finder-derived-source-rights-2026.json` | Existing CFB/GuideK12 record says public derivative redistribution is **not cleared**, and GuideK12 terms constrain service reverse engineering | **Pending**, preserve not-cleared position |
| `data/carrollton-three-isd-boundaries-2025.geojson` | Texas Legislative Council 2025–26 **district boundary** portal lists a Creative Commons Attribution license; repository GeoJSON metadata cites the same series. Independent feature-query-to-licensed-resource equivalence and required attribution still need reviewer confirmation | **Pending**; this is NOT an elementary/middle/high attendance boundary |
| `data/dfw-next-gis-source-candidates-20261121.json`, `data/west-dfw-zone-source-audit-2026.json` | GIS leads and official district links only; no license or approved zone geometry implied | **Pending** |

### Official pages and policies checked

- [TEA 2026 Accountability Rating System](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-accountability-rating-system), with downloadable 2026 reports.
- [TEA Site Policies](https://tea.texas.gov/about-tea/welcome-and-overview/site-policies): site-published materials carry reproduction/use conditions, including exceptions and permission pathways; **do not generalize this wording to every underlying factual datum without separate analysis**.
- [TEA Website Linking Policy](https://tea.texas.gov/about-tea/welcome-and-overview/tea-website-linking-policy): direct links generally allowed without advance permission, with no framing or falsely implying ownership.
- [TEA PEIMS Enrollment Trends](https://tea.texas.gov/data-reports/school-performance/accountability-research/enrollment-trends), linking campus/district reports.
- [Denton ISD Attendance Zones](https://www.dentonisd.org/families/attendance-zones), showing current 2026–27 published zones.
- [McKinney ISD Attendance Zones](https://www.mckinneyisd.net/page/attendance-zones-maps/), official zone maps.
- [CFB GuideK12 service terms](https://app.guidek12.com/ahsd/school_search/2022/terms_and_conditions.html). A public viewer does not grant an extraction or derivative geometry license.
- [TLC School Districts 2025–26 published dataset resource](https://data.capitol.texas.gov/dataset/school-districts/resource/57fb5e91-c849-4a33-aaa4-ea073ca98f8f) lists Creative Commons Attribution. This may justify reviewing that *specific* district-boundary derivative first; it does not apply to other vendors or campus zones.
- [Esri ArcGIS Online item-use conditions](https://doc.arcgis.com/en/arcgis-online/reference/access-use-constraints.htm) require reading item-specific constraints; a publicly queryable feature layer is not automatically unrestricted for republication.

## Next verification steps (not yet completed)

1. Use the sanitized preview's **actual current file list** to reconcile the 244 preliminary file-name categories against the 15 evidence records; do not claim coverage from repository path alone. Review source labels individually, including multiple-provider derived data.
2. For each shipped academic fact or polygon, check exact publisher file/version, source acquisition evidence and specific reuse scope. Record attribution and grant or exclusion decisions in the separate `deploy/public-data-rights.json` registry **only after an evidence-backed review**.
3. For CFB/GuideK12, Denton GeoPDF-derived candidate geometry and MetroStudy, prefer direct official links until independent reuse permission is documented.
4. Re-run both the rights inventory and exact-source pinning after data changes. Confirm no masked student categories are reconstructed. Keep Public Production **NO-GO** and source separation / historical privacy / external API quotas as independent release gates.

**No school assignment, GIS layer, TEA value, current family UAT screen, personal address, Cloudflare setting, domain, or hosting configuration is modified by this audit.**
