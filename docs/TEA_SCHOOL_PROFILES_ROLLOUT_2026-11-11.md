# TEA school profile rollout — TX relocation dashboard (2026-11-11)

## Objective and rollout order

Expand school click → TEA detail panel by **stable 9-digit TEA campus ID**, without altering school attendance assignment logic, school GIS, map markers, geocoding, zip boundaries or campus-choice rules.

1. **Carrollton-first district cohorts:** CFB ISD (35 TEA records) + Lewisville ISD (57). These district cohorts include schools in other cities. This is not a claim that all 92 are physically in Carrollton.
2. **Allen ISD:** 23 TEA records.
3. **McKinney ISD:** 33 TEA records.
4. **Other DFW cohorts:** validate/enable district-by-district after the first three phases. Source data already contains additional DFW campuses; they are not automatically implied to be geocoded, assigned to a house or covered by the TEA insight component.

**Current rollout gate:** 148 campus records (92 + 23 + 33), of which 18 have manually drafted academic interpretation and 130 have only automatic summaries of published 2026 overall scores. The latter explicitly display that domain, academic growth and subject data are not verified, so must not be passed off as a fully researched strength/weakness review. Rated and Not Rated schools are handled separately.

## Ethnicity data provenance

The 2025–26 TEA PEIMS Student Enrollment Reports publish ethnicity by campus, with FERPA masking; the 2025–26 TAPR is not expected before December 2026. Detailed ethnicity chart is shown only with an independently checked campus-year record from official TEA or district-hosted TEA report, including a campus ID and denominator. Published suppressed counts are never interpreted as zero.

Verified student composition charts, school year **2024–25** (NOT 2026):
- `061902118` STEM Academy at Hebron Valley Elementary — TEA 2025 School Report Card; N=424
- `061902136` Castle Hills Elementary — TEA 2025 School Report Card hosted by Lewisville ISD (page 2); N=599; [official district-hosted source](https://castlehills.lisd.net/fs/resource-manager/view/1534674b-7abf-4949-b7e9-30f24d4e0de1). Campus percentages: Black 2.0, Hispanic 8.3, White 45.9, American Indian 0.2, Asian 35.9, Pacific Islander 0.2, Two or More 7.5. These are **2024–25**, not 2025–26 PEIMS.
- `061902008` Hebron High School — TEA 2025 School Report Card; N=3,668
- `043901001` Allen High School — 2024–25 TAPR via Allen ISD 2024–25 Annual Report; N=5,206
- `043907002` McKinney High School — 2024–25 TAPR via McKinney ISD; N=2,668

Every chart uses seven TEA ethnicity categories (African American, Hispanic, White, American Indian, Asian, Pacific Islander, Two or More Races), and total percentage is validated within normal published rounding tolerance. TEA race categories do NOT show detailed Asian ancestry (e.g. Korean/Indian/Chinese) by campus. Do not substitute Census neighborhood ancestry for enrolled school composition.

## Risk and interpretation labels

- 2026 overall TEA A–F grade is kept separate from academic subject/annual growth indicators.
- Automatically generated 2026 grade-only summaries do not claim an academic strength or weakness; they explicitly say details await verification.
- Unrated is not an F. No number in published reports means unavailable, not zero.
- A school site is not an address assignment; a TEA grade or ethnicity chart is not attendance-zone evidence.
- This feature does not classify quality or desirability based on student race/ethnicity.

## Next source-work and validation stages

1. Match every eligible live school listing to exactly one TEA campus ID, report measured matched/total by **district**, and record unmatched names/IDs (not inferred by proximity).
2. Obtain current official TEA PEIMS campus ethnicity counts/rates, preserve masking, year and raw-source link for all CFB/Lewisville profiles before prioritizing Allen and McKinney.
3. Verify Student Achievement, School Progress and Closing the Gaps scores from TEA accountability detail, plus STAAR subject rates, so individually supported academic strengths and improvement areas can replace the grade-only placeholders.
4. After completion of CFB/Lewisville, Allen and McKinney source reviews, sequence Plano, Frisco, Prosper, Denton, Dallas, Irving and remaining DFW district cohorts by source completeness, user search frequency and campus matching.
5. Maintain PR preflight: Node static tests, Playwright desktop + 390px mobile school click, TEA ID join, score source, CSP, XSS, Allen marker nonzero, selection state, boundary/finder unchanged, deployment pages smoke.

## Status / release rule

The scope is feature implementation, not a guarantee of populated subject/race fields for every campus. **Do not merge until required checks pass at the exact PR head.** If blocked, report failure; do not bypass safety checks or deploy invalid placeholders.

Source references:
- https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/texas-academic-performance-reports
- https://tea.texas.gov/data-reports/student-data/standard-reports/peims-standard-reports
- https://rptsvr1.tea.texas.gov/adhocrpt/adste.html
