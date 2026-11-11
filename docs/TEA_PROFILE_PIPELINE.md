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
