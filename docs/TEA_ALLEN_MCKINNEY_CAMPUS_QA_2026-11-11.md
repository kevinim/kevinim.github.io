> **Current-main 2026-11-11 integration status:** This PR ports the isolated official TEA/PEIMS source evidence and source QA tests only from historical #237. Current main already displays official 2026 scaled domains and STAAR results from #264, and disclosed-only ethnicity percentages sorted by public headcount via #265/#266. The older #237 school-click JS/CSS/HTML changes are **not merged** because they predate and could override the current published-only share/FERPA UI protections. Campus Total (grade-group) denominators are documented source-specific official data, not a license to reverse masked ethnicity counts or to change the public display's denominator. No home-zone GIS or school assignment is validated by this cohort.

# Allen / McKinney TEA campus data — official 2026 intake

## Status and readiness (2026-11-11)

- **56/56 campuses** have official 2025–26 PEIMS ethnicity source rows, Allen ISD 23 and McKinney ISD 33. Separate official grade-group Campus Total reports provide **53 exact published enrollment denominators** and **3 privacy-suppressed totals**.
- **56/56 campuses** have their official 2026 campus accountability Summary and STAAR Performance pages inspected. The initial two high schools were previously checked; 54 additional reports were collected in this PR branch.
- **52 schools receive an official A–F overall rating; 4 are Not Rated.** Official values agree with the existing dashboard catalog for all 56 campuses, without rating/score discrepancies.
- **50/56 have published 2026 scaled Student Achievement, School Progress and Closing the Gaps scores PLUS at least one official STAAR All Students subject Meets percentage.** Allen 21, McKinney 29.
- **50/56 have a generated score-only strengths/improvement summary.** These are within-school highs/lows among actually reported subjects, never an inferred reason for the grade.
- Six cases with no individual academic breakdown: two official paired early-childhood schools and four officially Not Rated schools. No missing value is replaced with zero.

| Area | Source coverage | Important caveat |
| --- | ---: | --- |
| PEIMS ethnicity reports | 56/56 | Many cells privacy-masked or not listed |
| TEA 2026 overall accountability Summary | 56/56 | 52 A–F, 4 Not Rated |
| Three published 2026 scaled domain scores | 50/56 | 2 paired, 4 Not Rated |
| Published STAAR All Students subject Meets percentages | 50/56 | School-specific subjects only; no missing=zero |
| Noncausal scores-based strengths and improvement areas | 50/56 | Based solely on actual official rates |
| Official 2025–26 Campus Total enrollment denominators | 53/56 published; 3 masked | Independently published grade-group Campus Total, not a derived total |
| Public exact-category ethnicity percentage fields | 53/56 with at least one displayed percentage | Only count / official denominator; hidden categories stay null |
| Full seven-category demographic percentages | 1/56 | Only Allen HS has all seven exact published categories and matching official total |

## Official sources and source-to-joined files

- [54 newly fetched official campus academic report records](../data/tea-allen-mckinney-academics-2026-source.json)
- [Joined 56-campus 2026 TEA/PEIMS dashboard-ready source dataset](../data/tea-allen-mckinney-campus-qa-2026.json)
- [Texas Education Agency 2026 accountability reports](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-accountability-rating-system)
- [Official PEIMS 2025–26 campus enrollment totals from grade-group reports](../data/tea-allen-mckinney-enrollment-2025-26-source.json)
- [Official Allen 2025–26 PEIMS campus ethnicity CSV](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043901&_debug=0)
- [Official McKinney 2025–26 PEIMS campus ethnicity CSV](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=ic&linespg=60&charsln=120&grouping=e&loop=2&key=043907&_debug=0)

Official 2026 campus report URLs contain ccyy=2026, lev=C and the exact nine-digit Campus ID. The school-level report types are reports/acct/summary.sas and reports/acct/domain1a.sas. Source URLs are stored with every new school row. Closing the Gaps **scaled domain score** is distinct from its separately published **unscaled component**.

STAAR Reading/Language Arts, Mathematics, Science and Social Studies values are **All Students, percent of tests at Meets Grade Level or above**. This is not a percentage of unique students, nor a subgroup ethnicity performance figure. Subjects not offered at a campus (such as Social Studies for many elementary schools) remain null. School strengths/improvements are descriptive comparisons only.

### Official paired campus and Not Rated handling

| Campus | Official 2026 report interpretation |
| --- | --- |
| 043901201 George J Anderson Early Childhood | A90 overall, paired with Allen ISD 043901; no separate campus domains/STAAR |
| 043907125 Herman Lawson Early Childhood | A94 overall, paired with Roy Lee Walker EL 043907115; no separate campus domains/STAAR |
| 043901003 Collin Co J J A E P | Not Rated, no campus domains/STAAR |
| 043907005 Serenity High | Not Rated, Alternative Education Accountability; no campus domains/STAAR |
| 043907006 County Residential Center | Not Rated, Alternative Education Accountability; no campus domains/STAAR |
| 043907197 J J A E P | Not Rated, no campus domains/STAAR |

The two paired school grades are **not independently earned campus STAAR results**. Do not copy paired district/school academic values into those records.

## PEIMS privacy and data completeness

Official 2025–26 campus ethnicity exports list 342 category entries: **240 published numeric counts and 102 privacy-suppressed counts such as less-than-N**. Of the 392 possible seven-category campus cells, 50 are unlisted. Exactly published data are preserved; suppressed and unlisted are distinct statuses and neither is zero. The separate official 2025–26 grade-group Campus Total reports show exact enrollment totals for 53 campuses and a literal privacy mask for 3 campuses (043901003, 043907005, 043907197). For the 53 published denominators, individual percentages are calculated **only** for categories already disclosed as exact counts, rounded to one decimal. Masked or unlisted category percentages remain null; complete all-seven-category percentages are available for Allen HS (043901001) only. No subtraction or back-calculation is performed to reveal hidden counts.

These demographic limitations must **not prevent rendering official academic profile values**. UI can show exact published counts with an explicit unavailable/suppressed label without displaying an invented full seven-category percentage distribution.

## Release and technical constraints

All modifications remain limited to isolated Allen/McKinney JSON source and normalized files, one dedicated test, a no-deploy GitHub Actions workflow, and this documentation. This PR does not change shared AG01/AG02 pipeline files, school marker display, boundary polygons, GIS, address-to-school assignments, the shared data aggregate, or main.

CI runs the standalone TEA checks and existing pipeline checks. The source-to-joined report parity, 9-digit Campus ID, official 2026 URL parameters, score ranges, paired campuses, unavailable data, and 2025–26 privacy masks are validated in the dedicated suite.

## Historical #237 UI prototype (not part of the current-main source-only integration)

The existing school-click module, features/carrollton-school-insights.js, now lazy-loads the isolated combined dataset on selecting an Allen or McKinney school. It rejects incomplete snapshots, invalid 2026 TEA campus/report URLs and 2025–26 PEIMS masking violations. School record joins use only the exact existing 9-digit campus ID; no school assignment, ZIP, geocoder, map marker, boundary or district official Finder logic was changed.

- Existing detailContent school panel displays 2026 scaled domains and reported All Students STAAR percentages.
- Selected school list item shows the inline school profile, academic strengths and improvement focus.
- Published demographic headcounts and safe 2025–26 partial percentages appear for all 53 campuses with publicly released denominators. Null percentages for masked/unlisted cells are labeled "비공개"/"미제공".
- Allen High School (all seven categories published) has a fully valid seven-group chart. Other partial campuses **do not show a misleading 100% race chart**, but do show seven individually labeled public/masked/unlisted rows.
- Two official paired schools show their overall grade alongside "연계 평가 / 개별 성적 미제공"; four Not Rated campuses are not converted to F/zero.
- Official TEA source links, current school year, school enrollment denominators and limitations are shown.
- The preexisting CFB/Lewisville 2024–25 profiles, address assignment/zone warnings, GIS overlays and non-target DFW campuses remain unchanged.
- Cache-busted school insight JS/CSS assets ensure browsers load the new version.

UAT checks:
1. tests/allen-mckinney-tea-ui.test.cjs covers exact join, 50/6 reporting status, 53 published enrollment denominators, seven category labels and privacy handling, malicious URL rejection and lightweight DOM rendering.
2. tests/tea-allen-mckinney-campus-qa.test.cjs verifies full official TEA report provenance.
3. scripts/test-carrollton-tea-insights-browser.cjs covers 1280px desktop and 390px mobile school clicks with CFB/LISD regression as well as Allen/McKinney 2025–26 public/partial composition, with screenshot artifacts.
4. Dedicated non-deploy GitHub Actions and full repository PR workflows are required to pass at final head.

**Release:** Historical #237 included a UI prototype, but this current-main integration contains **only its evidence JSON, source QA and documentation**. Current Production already has domain/STAAR school panels and source-safe published-subtotal ethnicity UI via #264–#266. Any future additional campus total or UI feature requires a separate reviewed integration; do not merge the stale #237 HTML/JS wholesale.
