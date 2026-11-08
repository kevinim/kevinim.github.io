# P43 — DFW Crime Data Staging (research only)

**Acquisition snapshot:** 2026-11-07 (America/New_York)  
**Status:** Official aggregate data staged for later analysis. **No map, safety score, public UI integration, or per-address crime rating is authorized.**  
**Owner documentation:** [../../HANDOFF.md](../../HANDOFF.md).

## What is actually saved

| City | File | Geography | Data period | Observations | Caveat |
| --- | --- | --- | --- | ---: | --- |
| Dallas | `dallas-offenses-2021-2026.json` | Entire published police incident dataset, by year + original NIBRS code | 2021–2026 YTD | 317 aggregate groups | Public release excludes some sex/juvenile and other sensitive incidents; offense rows are not unique crime incidents |
| Dallas | `dallas-zip-offenses-2025.json` | Published ZIP × NIBRS code | 2025 | 1,216 retained groups | 563 ZIP/code groups with count < 5 suppressed; 14 non-75*** ZIP/code groups not stored |
| Fort Worth | `fort-worth-offenses-2021-2026.json` | Entire published police incident dataset, by year/code/original description | 2021–2026 YTD | 3,765 aggregate groups | 2026 partial, duplicates across incident/codes possible, juvenile exclusions |
| Fort Worth | `fort-worth-beat-totals-2025.json` | Police Beat ID totals, not geographic polygons | 2025 | 104 retained beats | 8 null, missing or < 5 groups omitted; source 2025 total 56,936 offense records |
| Frisco | `frisco-offenses-partial-2025-2026.json` | Citywide original `OffenseGroup` | ~Nov 2025–Nov 2026 | 54 aggregate groups | API date range is only ~1 year; **2025 is NOT full year**; public map has a narrower display window |
| Plano | `plano-police-official-2021-2025.json` | City police annual statistics | 2021–2025 full year | 5 annual records | Transcribed from official one-page year-end PDF, UCR categories as published |
| McKinney | `mckinney-police-official-2021-2025.json` | City police annual statistics | 2021–2025 full year | 5 annual records | Official city PDF includes `Arson` in its displayed property subtotal, unlike Plano |

**Total staged:** 7 files and **5,466 aggregate data rows**. These are group rows, not incidents. The Dallas/Fort Worth/Fresco datasets remain source-native; **the 7 files cannot be merged into one cross-city ranking** without reporting-coverage and classification work.

## Source evidence, caveats and access

1. Dallas PD official open data `qv6i-rri7`: https://www.dallasopendata.com/Public-Safety/Police-Incidents/qv6i-rri7 ; Socrata SODA `https://www.dallasopendata.com/resource/qv6i-rri7.json`. Query source `year1`, `nibrs_code`, `nibrs_crime`, `zip_code`, `incidentnum`. `count(*)` counts offense rows; `count(distinct incidentnum)` counts distinct case IDs **within each grouped code/year**, not distinct cases across the dataset. Sensitive data omitted under publisher policy; ZIP stats suppress cells below 5.
2. Fort Worth PD official public GIS: https://mapit.fortworthtexas.gov/ags/rest/services/CIVIC/Crime_Data/MapServer/0 . Native `Reported_Date`, `Offense`, `Offense_Desc`, `Beat`; grouped `count(OBJECTID)`. Source observed min reported date Feb 1 2016, max Nov 1 2026. 2025 source total = **56,936 offense rows**, matching the sum across all beat groups including excluded null/small beats. **Important API guardrail:** ArcGIS grouped queries with `Beat,Offense` returned a 1,000-record truncated result and appeared to ignore `resultOffset`. Do NOT silently paginate or claim the `Beat × Offense` table complete; we deliberately staged **Beat totals only** (112 raw groups, 104 retained).
3. Frisco GIS official FeatureServer: https://maps.friscotexas.gov/gis/rest/services/Public/Crime_Mapping_View__Dashboard/FeatureServer/1 . Group `OffenseGroup` by `DateReported` calendar-year range. Source total 5,806 = **921 for 2025** (partial) + **4,885 for 2026** (partial), observed min/max Nov 2025–Nov 2026. Frisco crime dashboard describes a 30-day **display** window, not the full API source retention.
4. Plano PD [2016–2025 year-end report](https://content.civicplus.com/api/assets/3ddf77ec-8089-4d6b-90d8-4986172c0dec?cache=1800) (official PDF, transcribed years 2021–2025). Validated homicide + rape + robbery + aggravated assault = violent subtotal, and burglary + larceny + motor-vehicle theft = property subtotal.
5. McKinney PD [2025 UCR annual comparison](https://www.mckinneytexas.org/DocumentCenter/View/3681/UCR-Annual-Comparison-Report-2025) (official PDF, transcribed years 2021–2025). Validated listed category subtotals (including special homicide and arson rows). **Its reported grouping is NOT the same as Plano or standardized FBI index offenses.**
6. Texas DPS statewide crime portal: https://txucr.nibrs.com/ ; FBI Crime Data Explorer: https://cde.ucr.cjis.gov/ . Discovered for consistent future agency-level denominator/comparability audit; **not yet downloaded into this staging**.

### Critical outstanding coverage

- **Allen**: no directly verified, city-authored export or official FBI agency totals yet. Secondary websites disagree on 2025 (e.g. violent count 87 vs 91; property 810 vs 821/822). Do not choose a number without verifying a primary dataset/version. 2021 NIBRS changeover can leave partial reporting years. Prioritize authoritative Allen/DPS/FBI reconciliation before public map development.
- **Prosper, Celina, Lewisville, CFB**, and remaining DFW municipalities: source discovery pending.
- **Plano and McKinney sub-city data**: not acquired (their files contain citywide yearly totals). **Fort Worth Beat polygons**, **Dallas ZIP-to-true-geographic correspondence** and **Frisco spatial aggregates** remain missing.
- **Cross-city**: no comparable offense normalization, census-tracked population denominator, coverage completeness audit, small-area uncertainty model, or severity methodology exists yet. **Do not draw maps or compare scores** from these snapshots.
- Source terms, redistribution rules, and regular refresh cadence must be reverified before product-facing publication.

## Privacy, interpretation and rendering rules

- All saved rows are **aggregates**. No street addresses, event coordinates, victim/officer names, case IDs, or person-level records are saved.
- The ZIP x offense small-cell threshold is 5. The Fort Worth Beat table excludes unknown/missing identifiers and very small groups. ZIP or beat totals **must not be interpreted as incident density** without honest denominator/geographic joins.
- Police-recorded offense rows, unique incidents, reported crimes, arrests and citizen safety are distinct concepts. Counts are not a risk of personal victimization.
- **Missing = missing**, not zero. Unrated is not no-data. Year 2026 is provisional, Frisco 2025 is partial. Preserve original publisher categories and original publication vintage.
- Existing SimCity-inspired map rules (validated worse risk progressively more red; no-data unfilled) are relevant **only to a future separately authorized UI phase**.

## Reproduction and QA

- Review `metadata` in each JSON file for its source query/aggregation and data coverage.
- Run `node scripts/check-crime-staging.mjs` from the repository root (Node 18+). This reads all seven staged files and checks nonnegative counts, duplicate group keys, small-cell threshold, source-specific totals, official PDF subtotals and PII guardrails.
- Refresh by re-querying the **official** endpoints above, preserving the same source-native dimensions and versioning each acquisition. Never blindly overwrite an audited snapshot or assume the source is immutable.
- Manual PDF transcription must always be checked against an official report, including the source's rate vs population and category scope.
- **No automatic public map layer, scoring or even production JS import is created by this work**.
