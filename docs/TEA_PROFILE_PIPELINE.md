# TEA school profile completeness · 2026

## Scope and baseline
Source inventory: \`tea-ratings-2026.json\` (2,282 campus records, 181 district codes); this is the dashboard's DFW-area collection, **not** all Texas schools.

As of 2026-11-11, before this work: 2,144 A–F ratings, 138 Not Rated; 148 campuses had basic school-profile panels; 18 manually reviewed narratives; 2 had area/domain scores; 4 had ethnicity charts. After the fallback rollout, 2,282 records can display an honest TEA rating-only profile. This **does not increase actual audited domain or ethnicity data coverage**.

Detailed progress is computed in \`data/tea-profile-progress-2026.json\` by \`node scripts/build-tea-profile-progress.cjs --check\` and visible when expanding "학교정보 구축 현황" beside the school list. The exact snapshot date is always shown. Keep the data source denominator distinct from searchable markers, school boundary polygons and confirmed home assignments.

Priority: Carrollton (CFB + Lewisville, 92), Allen (23), McKinney (33), remaining DFW campuses (2,134). Entire full-data goal = 2,282; eligibility may vary due to campus closures, Not Rated and FERPA suppression.

## Authoritative public sources
1. **2026 TEA Accountability Data Downloads**:
   https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026  
   Report Level **Campus**. Download **Accountability Component Scores**, **STAAR ELA/Reading**, **Mathematics**, **Science/Social Studies**, and supporting year-specific variable descriptions. If masked, Not Rated or not applicable, store **missing**; do not interpolate from rank/grade.
2. **2025–26 PEIMS Student Enrollment Reports**:
   https://rptsvr1.tea.texas.gov/adhocrpt/adste.html  
   Choose school year 2025–26, campus, ethnicity, comma-delimited *aggregated* counts. Official TEA states masked cells are \`-999\` in CSV and \`N/A\` on its website. Never infer a small suppressed group's count from reported total and other groups. Keep denominators and publication year.
3. The TEA campus portal https://txschools.gov/ is for independent item-by-item crosschecks. Keep per-campus source links.

**Never use** the "PEIMS Student Demographic Listing" at the individual-student level. It includes names/IDs/DOB and must not be fetched, published or loaded into this project. Only public aggregate data.

## Incremental official source verification — Castle Hills (2026-11-11)

A new independently source-checked 2024–25 ethnicity profile is now staged for Castle Hills Elementary (`061902136`, Lewisville ISD). The district-hosted **2025 TEA School Report Card**, [pages 1–2](https://resources.finalsite.net/images/v1767735451/lisdnet/lisdnet/pbywuuw1lzfsjjftgn4m/castlehillsrc.pdf), identifies **599** total students and the seven campus-level race/ethnicity shares (Black 2.0%; Hispanic 8.3%; White 45.9%; American Indian 0.2%; Asian 35.9%; Pacific Islander 0.2%; two or more races 7.5%). They sum to 100.0%. The source year is **2024–25**, while the current dashboard accountability grade is TEA 2026; do not conflate the two. This adds one verified historical student-composition profile; **no 2025–26 PEIMS campus records have yet been imported**. If source years disagree on total enrollment, preserve each source's vintage and do not overwrite with a mixed-year count.

## Additional 2024–25 Lewisville campus source checks — 2026-11-11

Source-verified same-year profiles have also been staged in PR #229 for `061902140` Coyote Ridge (N=478), `061902142` Independence (N=828), and `061902143` Lewisville Elementary (N=509). All seven official race/ethnicity shares and source links are recorded under the 9-digit campus IDs in `features/carrollton-school-insights.js`; source details appear in `docs/TEA_SCHOOL_PROFILES_ROLLOUT_2026-11-11.md`. Rounding tolerance is checked without inferring any masked count. With Castle Hills, these are four newly source-reviewed 2024–25 campus profiles beyond the four previously merged. **Staged verified ethnicity: 8/2,282 (0.35%), of which 6/92 (6.52%) are in the Carrollton CFB/Lewisville priority cohort. Current official 2025–26 PEIMS ethnicity imports remain 0/2,282.** Staged progress is not production coverage before PR checks and merge.

## Official 2025–26 campus counts: CFB + Lewisville, partial but source-backed (Nov 11, 2026)

A verified public **TEA PEIMS Student Enrollment Reports** batch is now staged in `data/tea-ethnicity-2025-26-priority.json` for **92/92 priority cohort campuses** (CFB ISD 35, Lewisville ISD 57; each joined to the existing exact 9-digit TEA campus ID in `tea-ratings-2026.json`).

Official source export settings: school year 2025–26, **Selected Campus Totals using district number**, **Ethnicity**, CSV. Direct publisher report links (only published campus aggregates; not student-level records):

- CFB ISD `057903`: https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=057903&_debug=0
- Lewisville ISD `061902`: https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=061902&_debug=0

**Verified input / coverage:** 92 campuses, 644 possible group-cells (seven categories per campus), **393 exact publicly reported count cells**, **180 TEA-suppressed cells** (e.g. `<10` or `<60`), and **71 category cells not listed** by the source. **Zero campuses have seven complete published ethnicity counts.** This distinction is important: 2025–26 *campus-count coverage* is 92/92 within this priority cohort (4.03% of the 2,282-campus inventory), while *complete seven-group percentages* from 2025–26 remain **0/92**. Historical 2024–25 source-verified percentage charts for eight campuses (after PR #230 merges) remain separate, clearly labeled.

This is an intentional partial-data product, not a substitute for published full ethnic percentages. UI shows publicly released 2025–26 group-level student **counts** with every masked cell marked `비공개 (<N)` and absent cell marked `원본 미표시`. It never treats a mask/omission as zero, estimates an undisclosed ethnic count, or combines the 2025–26 counts with the previous school-year denominator to claim a percentage. Never subtract reported groups from other datasets' totals to reconstruct a suppressed count. Exact ratio calculations require seven independently published categories and a same-year enrollment denominator.

The dashboard loads the aggregate JSON from the same origin only when inspecting a school and never sends user-entered residence addresses to TEA. Campus ID join, source vintage, seven-category completeness, privacy masks, browser/mobile and progress checks are gated in tests. Recheck redistribution rights and public-site attribution before Production merge.

**Next:** obtain and validate analogous official campus-level PEIMS 2025–26 aggregates for Allen (23), McKinney (33), and remaining DFW districts; retain suppression statuses. For complete share charts, seek separately published TEA School Report Cards/TAPR for a matching school year rather than inferring any protected data.

## Immediate expansion · 2025–26 official Allen, McKinney, Frisco and Plano enrollment (2026-11-11)

An additional **201** exact-campus-ID official TEA public PEIMS ethnicity-count profiles were retrieved and validated *now*, using the same 2025–26 selected-campus district CSV contract. The same-origin data file `data/tea-ethnicity-2025-26-priority.json` now contains **293 of 2,282 DFW-area campuses (12.84%)**, across six districts:

| TEA district code | District | 2025–26 schools linked | Official campus aggregate CSV |
|---|---|---:|---|
| 057903 | Carrollton-Farmers Branch | 35 | Existing CFB link above |
| 061902 | Lewisville | 57 | Existing Lewisville link above |
| 043901 | Allen ISD | 23 | [TEA public CSV](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043901&_debug=0) |
| 043907 | McKinney ISD | 33 | [TEA public CSV](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043907&_debug=0) |
| 043905 | Frisco ISD | 76 | [TEA public CSV](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043905&_debug=0) |
| 043910 | Plano ISD | 69 | [TEA public CSV](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043910&_debug=0) |

**Verified dataset totals:** 293 school IDs, 2,051 possible cells, **1,260 exact public counts, 546 TEA-suppressed cells and 245 unlisted cells**. Every ID joins a TEA 2026 inventory campus in its same district; no individual student records are retrieved or stored. Six-group / seven-group percentages are never inferred where any ethnicity is suppressed or omitted.

**One current-year exception:** Allen High School (`043901001`) has all seven group counts published for 2025–26. Their sum is 5,127 students and its 1,426 Asian students are **27.8%** of the full seven publicly reported categories. Display this 2025–26 percentage only for this complete-data campus. Its separately sourced 2024–25 historical profile is still a distinct year (5,206 students), not mixed into any calculation. No other current-year campus has seven complete published categories in this six-district batch.

Display rules: show all seven categories as student counts with explicit `비공개 (<N)` or `원본 미표시` for non-public values; current-year percentages are allowed only when all seven categories are public in the *same* campus report. Preserve existing historical charts/links with their original year. Verify updated progress snapshot and desktop/mobile school selection for Allen and McKinney on the exact PR head. **UAT only; no production merge without explicit approval.**

## Immediate second expansion · five additional 2025–26 districts (2026-11-11)

An additional **401** exact-campus-ID official TEA PEIMS campus aggregate ethnicity-count profiles were extracted from publisher CSVs and matched against the existing 2026 TEA district/campus inventory. The 2025–26 public count dataset now contains **694 / 2,282 DFW campuses (30.41%)** across **11 district cohorts**. No student-level records, address, DOB, names, or unreleased ethnicity counts were collected.

| TEA district | District | Added campuses | Official published CSV |
|---|---|---:|---|
| 043912 | Prosper ISD | 32 | [TEA 2025–26 ethnicity by campus](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043912&_debug=0) |
| 061901 | Denton ISD | 46 | [TEA 2025–26 ethnicity by campus](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=061901&_debug=0) |
| 057912 | Irving ISD | 35 | [TEA 2025–26 ethnicity by campus](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=057912&_debug=0) |
| 057916 | Richardson ISD | 51 | [TEA 2025–26 ethnicity by campus](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=057916&_debug=0) |
| 057905 | Dallas ISD | 237 | [TEA 2025–26 ethnicity by campus](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=057905&_debug=0) |

**Actual consolidated coverage:** 694 campuses × seven TEA ethnicity categories = 4,858 possible public campus-group cells: **2,677 exact published student counts, 1,508 suppressed masks and 673 source-omitted groups**. Three campuses have all seven group counts independently published, allowing same-year percentages without filling missing data: Allen High School (043901001, enrollment 5,127, Asian 1,426 / 27.8%), Irving Houston Middle (057912046, 753 students, Asian 49 / 6.5%) and Irving Jackie Mae Townsell Elementary (057912123, 756 students, Asian 69 / 9.1%). **All other 691 profiles remain partial 2025–26 counts; they are not complete race-share charts.** The earlier eight 2024–25 complete profiles are separate source vintages.

Display and QA controls: a current-year row showing count, suppression mask or absence for each of seven categories; calculate ratios exclusively for those three fully public campuses. Unit tests validate every campus/district ID against official TEA inventory and source URL year, all 4,858 count/mask cells, no PII and no inferred values. Browser QA covers one or more actual school selections in each priority region (desktop/mobile), checks link, rendering and no GIS or CSP regression. Stage in UAT/PR; do not merge Production without explicit sign-off.

## 2026-11-11 immediate Wave 3 — twelve additional DFW districts (official public aggregates)

From official 2025–26 TEA PEIMS selected **campus totals by district number**, grouping **Ethnicity**, this batch adds **649** exact 9-digit campus IDs over previous UAT PR #238. All 12 source exports have all of their 649 existing 2026 inventory campuses represented and matched; no duplicates or wrong-district IDs. These are **public campus aggregates only**.

| District code | School district | School count |
|---|---|---:|
| 220905 | Fort Worth ISD | 134 |
| 220901 | Arlington ISD | 74 |
| 057909 | Garland ISD | 66 |
| 057914 | Mesquite ISD | 51 |
| 220908 | Mansfield ISD | 48 |
| 057803 | Uplift Education | 45 |
| 057848 | International Leadership of Texas | 44 |
| 061806 | Texas Works | 41 |
| 220907 | Keller ISD | 40 |
| 057910 | Grand Prairie ISD | 37 |
| 061911 | Northwest ISD | 37 |
| 220916 | Hurst-Euless-Bedford ISD | 32 |

**Consolidated staged 2025–26 current-year campus count coverage: 1,343 / 2,282 = 58.85% across 23 source exports.** Every ethnicity has a three-way source status, no imputation: **5,024 exact publicly reported student counts, 2,915 TEA-suppressed cells, and 1,462 source-unlisted cells**, across 9,401 possible campus/group cells. Five campuses have seven fully published groups and can have exact same-year percentages: Allen H S (043901001), Irving Houston Middle (057912046), Irving Jackie Mae Townsell EL (057912123), Northwest H S (061911001) and Byron Nelson H S (061911007). The remaining 1,338 current-year campus records are partial only and **must not** receive fabricated full shares. Separately, eight 2024–25 historic source-verified charts remain correctly labeled with their prior year.

All official CSV source URLs are retained by district code under `sources` in `data/tea-ethnicity-2025-26-priority.json`. Example original Fort Worth export: https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=220905&_debug=0

**QA required:** source URL contract + campus ID/district exact join + race keys/masking + full-data ratio authorization only if all seven counts public; browser desktop/mobile, privacy/security, GIS/markers. Production deploy remains blocked until explicit user release approval, even if all PR actions pass.

## Wave 4A · 2025–26 official PEIMS ethnicity count expansion — 2026-11-11

Using the public Texas Education Agency 2025–26 **Selected Campus Totals using district number → Ethnicity → CSV** report, this batch added **301 existing TEA inventory campuses in 15 additional districts** on top of the source-verified 1,343-campus wave:

| TEA district code | District | New exact campus-ID matches |
|---|---|---:|
| 220918 | Eagle Mountain–Saginaw ISD | 32 |
| 220902 | Birdville ISD | 31 |
| 129902 | Forney ISD | 24 |
| 199901 | Rockwall ISD | 23 |
| 220912 | Crowley ISD | 23 |
| 043914 | Wylie ISD | 22 |
| 126902 | Burleson ISD | 20 |
| 220906 | Grapevine–Colleyville ISD | 20 |
| 070912 | Waxahachie ISD | 18 |
| 043911 | Princeton ISD | 16 |
| 057922 | Coppell ISD | 16 |
| 091906 | Sherman ISD | 16 |
| 057907 | Duncanville ISD | 14 |
| 070908 | Midlothian ISD | 13 |
| 199902 | Royse City ISD | 13 |

**Staged cumulative coverage: 1,644 / 2,282 schools (72.04%) across 38 publisher-validated district exports.** Across 11,508 possible school/race cells: **6,263 exact public counts; 3,536 TEA-masked cells; 1,709 TEA-unlisted cells.** Source masking/omission never means zero or permits derivation; the data are not individual-student records.

Six current-year schools have all seven official categories published: the prior five plus **North Crowley High School (220912002), with 3,033 students and 105 Asian students (3.5%)**. School panels show current-year percentages only for fully public seven-category profiles; previous 2024–25 percentage charts remain clearly separate. In Crowley ISD, the public TEA CSV also contains campus ID `220912012`, which is absent from this dashboard's official 2026 TEA inventory; it is deliberately not imported or included in 1,644 verified joins. The CFB/Carrollton address→school assignment and GIS data are unaffected.

The per-district exact publisher CSV URL for each of these new 15 sources is recorded in `data/tea-ethnicity-2025-26-priority.json:sources` and validated by the strict TEA-host/year/grouping/district contract. Example source for Wylie: https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043914&_debug=0

Ready-for-review UAT requires passing exact-head CI, school-ID/country source checks, FERPA, desktop/mobile school selection, XSS/CSP and map regressions. **No main/Production merge absent user authorization.**

## Importing an official verified batch

The native TEA export may use different column names by report/year. Before ingestion, inspect TEA's associated data dictionary and explicitly transpose **aggregated campus rows only** into these normalized CSV headers. Do not assume any file's column names.

Domain staging file:
\`\`\`csv
campus_id,student_achievement,school_progress,closing_gaps,reading_meets,math_meets,science_meets,social_studies_meets
057903122,91,89,85,71,65,,
\`\`\`
The figures above are **schema illustration only**, not a new TEA extract; never publish or ingest the example as real data.

PEIMS staging file:
\`\`\`csv
campus_id,enrollment,black,hispanic,white,native,asian,pacific,multi
057903122,100,15,20,25,0,30,0,10
\`\`\`
Also **synthetic fixture only**, not a real enrollment count.

From the repository root, after official source verification:
\`\`\`bash
node scripts/tea-campus-enrichment-pipeline.cjs \
  --components /tmp/verified-tea-components.csv \
  --component-source 'https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026' \
  --enrollment /tmp/verified-tea-peims.csv \
  --enrollment-source 'https://rptsvr1.tea.texas.gov/adhocrpt/adste.html' \
  --output data/tea-campus-enrichment-2026.json
# Review dry-run summary; after auditing exact source file and campus IDs:
node scripts/tea-campus-enrichment-pipeline.cjs \
  --components /tmp/verified-tea-components.csv \
  --component-source 'https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026' \
  --enrollment /tmp/verified-tea-peims.csv \
  --enrollment-source 'https://rptsvr1.tea.texas.gov/adhocrpt/adste.html' \
  --output data/tea-campus-enrichment-2026.json --write yes
node scripts/build-tea-profile-progress.cjs --write
node --test tests/tea-campus-enrichment-pipeline.test.cjs tests/carrollton-school-insights.test.cjs
\`\`\`
The converter is **intentionally not** a scraper for the interactive TEA pages. It imports normalized campus-level public exports after an independently verified column mapping. Incorrect year, suppression, denominator, ID, source host, duplicate or out-of-range numeric fields fail closed. No API key, paid provider or end-user address is needed. Do not commit raw TEA downloads to the public repo without source rights review; commit only necessary source-linked campus aggregates.

The dashboard loads \`data/tea-campus-enrichment-2026.json\` **on school selection**, not on first paint, and applies only strict verified totals/official domains. Summary text describes relative domain scores and explicitly does not claim those alone causally prove why a school got its grade; TEA's published formulas and exceptional campus treatment govern the official result.

## Release gates and progress cadence
Every batch:
- Preserve campus ID including leading zeroes, year, official URL, exact reported numeric values, and masking.
- Confirm duplicates, join coverage and count parity; never silently overwrite validated prior-year data with older values.
- Verify CFB/Lewisville first, Allen second, McKinney third, then Plano/Frisco/Prosper/Denton/Dallas/Irving/other DFW in measured batches.
- Test mobile 390/1280 px school selection, ethnicity chart, expanded details, source links, no map/marker/address regression, privacy/CSP and current PR conflicts.
- Update the progress JSON and publish counts of basic profiles, curated narratives, domain score coverage, subject coverage and ethnicity coverage, with both batch and whole-scope percentages.
- Merge only after required **exact-head** GitHub Actions pass. Verify GitHub Pages and live browser smoke post-deploy. No assumed "100%" while official sources mask some data. "Not Rated" is a separate status, not a failing grade.

Progress updates should show *actual* newly verified campus data, what remains, source-year gaps, district blockers and GitHub evidence. If blocked, state that clearly without claiming completion.
