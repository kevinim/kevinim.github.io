# Denton Agent 02 — actionable NO-GO closure and surviving blockers (2026-11-09)

**Branch:** `qa/denton-eight-points-and-2026-gis-source-audit-20261109` → Draft PR #176. This branch is a child of #174, itself a child of #169. Do not merge into `main` without the owner; do not alter concurrent CFB/other agent branches.

## Objective and split gates

- **B0 / official address-to-school grade lookup:** solved for **three published test addresses × three grades**. Verified via actual Chromium against [district official School Locator](https://webquery-2-denton-tx.etstack.io/) on 2026-11-09, using *house number + road stem*, exact city and selected suggestion, separate fresh browser page for each grade, and `DFLT` program. Browser [run 42680389571](https://github.com/kevinim/kevinim.github.io/actions/runs/42680389571): **nine visible School Results**, zero guessing, nine IDs matching the 2026–27 official school-PDF roster. Machine-readable observations in `data/denton-independent-finder-evidence-20261109.json`. This is sample-level evidence, not an eligibility determination for any unrelated address.
- **B1 / matched school's campus marker and official school PDF:** child-PR script `scripts/test-denton-finder-map-bridge-browser.cjs` exercises **seven unique observed schools × 390px and 1366px**, verifying selected marker and exact official 2026–27 campus PDF, showing the missing-polygon notice. It ensures Finder outcomes never trigger a school zone geometry where none exists. This checks page behavior, not attendance-zone containment or correctness.
- **B2 / campus-point current accuracy:** 8 historical coordinate exceptions still require verifiable source location records. Live Finder can return an assigned school name but **does not establish that school's building point is at the correct current coordinate**. Three of the eight are present in the 9 observations: Denton High `061901003`, Calhoun `061901045`, Reeves `061901132`. Keep `campusPointReview=single-source-historical` and uncertainty warnings; 0/8 newly current-certified.
- **B3 / actual current-year school attendance GIS boundaries:** remains blocked until Denton ISD supplies the original digital 2026–27 polygons or independently licensed/verifiable equivalent. Zero/39 school-level polygons; do not substitute administrative ISD boundaries, NCES school points, 2015–16 zones, 2028–29 proposals, a school PDF screenshot, Google autocomplete, or a single residential school result. Existing import preflight validates allowed data IDs, year, WGS84 shapes and source metadata but cannot grant release.
- **B4 / public Production release sign-off:** #148 continues **NO-GO** pending source version, reuse permission, independently held-out exact address-to-school grade checks paired with school polygon containment, all campus exceptions and owner approval. Green GitHub Actions ≠ release approval.

## Actually observed official Finder results

| Public sample address | Grade 2 | Grade 7 | Grade 10 |
|---|---|---|---|
| 702 Crescent St, Denton TX 76201 | N Rayzor ELEM · `061901107` | Calhoun MIDDLE · `061901045` | Denton HIGH · `061901003` |
| 1800 Buena Vista Dr, Denton TX 76210 | McNair ELEM · `061901106` | Crownover MIDDLE · `061901041` | Guyer HIGH · `061901007` |
| 2309 Windsor Farms Dr, Denton TX 76207 | Reeves ELEM · `061901132` | Calhoun MIDDLE · `061901045` | Denton HIGH · `061901003` |

The evidence identifies the official locator *as observed on November 9, 2026*, cross-checked with PDF references labelled 2026–27. The locator's result page did not explicitly prove the effective school year; this is **not independent effective-year certification**. Do not represent the screenshots as a guarantee of enrollment.

## Reproducibility and release controls

1. Automated source-data validation: `node --test tests/denton-independent-finder-evidence.test.cjs` in the free Denton no-deploy GitHub Actions provenance workflow. Fail if address/grade-to-TEA mapping changes, campus is not in official 2026–27 PDF roster, or an exception point is promoted.
2. Independent 9 live lookups: `node scripts/denton-independent-grade-finder-qa.cjs` in `.github/workflows/denton-residential-finder-qa.yml`. Store JSON and screenshots as short-retention artifacts; no private homes, API keys, new polygons, or custom vendor endpoint probing.
3. Map/PDF bridge in actual mobile and desktop browser: `node scripts/test-denton-finder-map-bridge-browser.cjs`. Compare exactly the unique observed TEA IDs; confirm all 39 Denton public campus points load, including the eight **provisional** points, but no campus point is used as a zone boundary.
4. For each future GIS response: retain publisher provenance and explicit redistribution rights; run `node scripts/validate-denton-2026-zone-import.cjs candidate.geojson provenance.json` as staging-only; add topology overlap/completeness and independently witnessed Finder holdouts before reconsidering B3/B4.

**Official records request:** the Denton ISD public-information request seeking original school zones, eight-campus location records, and address discrepancy source clarification has been sent via Gmail on 2026-11-09. No fees authorized. Response and rights decision are external dependencies, not a code defect.

**Release:** `NO-GO`. Draft PR remains reviewable on its own technical merits; do not merge `main`, enable new current-year polygon layers, or deploy Production without explicit owner approval.
