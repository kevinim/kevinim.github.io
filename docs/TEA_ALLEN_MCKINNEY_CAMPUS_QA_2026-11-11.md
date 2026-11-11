# Allen / McKinney TEA campus data — official 2026 intake

## Status and readiness (2026-11-11)

- **56/56 campuses** have official 2025–26 PEIMS ethnicity source rows, Allen ISD 23 and McKinney ISD 33.
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
| Full seven-category demographic percentages | 0/56 | Do not back-calculate privacy-masked or unlisted cells |

## Official sources and source-to-joined files

- [54 newly fetched official campus academic report records](../data/tea-allen-mckinney-academics-2026-source.json)
- [Joined 56-campus 2026 TEA/PEIMS dashboard-ready source dataset](../data/tea-allen-mckinney-campus-qa-2026.json)
- [Texas Education Agency 2026 accountability reports](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-accountability-rating-system)
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

Official 2025–26 campus ethnicity exports list 342 category entries: **240 published numeric counts and 102 privacy-suppressed counts such as less-than-N**. Of the 392 possible seven-category campus cells, 50 are unlisted. Exactly published data are preserved; suppressed and unlisted are distinct statuses and neither is zero. Matching same-year official total enrollment for full percentage calculation has not been imported; enrollment and percentage fields remain null.

These demographic limitations must **not prevent rendering official academic profile values**. UI can show exact published counts with an explicit unavailable/suppressed label without displaying an invented full seven-category percentage distribution.

## Release and technical constraints

All modifications remain limited to isolated Allen/McKinney JSON files, one dedicated test, a no-deploy GitHub Actions workflow, and this documentation. This PR does not change shared AG01/AG02 pipeline files, school marker display, boundary polygons, GIS, address-to-school assignments, the shared data aggregate, or main.

CI runs the standalone TEA checks and existing pipeline checks. The source-to-joined report parity, 9-digit Campus ID, official 2026 URL parameters, score ranges, paired campuses, unavailable data, and 2025–26 privacy masks are validated in the dedicated suite.

**Next step:** consume this isolated data on a UAT dashboard via exact Campus IDs, display 50 fully published academic profiles plus clear paired/Not Rated states for the other six, then validate desktop/mobile/dark mode and regression. This branch has not been merged to main or deployed to production.
