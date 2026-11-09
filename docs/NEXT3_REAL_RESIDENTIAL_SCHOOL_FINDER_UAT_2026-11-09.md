# Independent public residential address → school map / official Finder UAT

**Review:** 2026-11-09. **Branch:** Draft #171, based on Draft #165 (itself based on #162). **No deployment or release signoff**.

## A. What the actual Chromium screenshots prove

[Real app desktop+mobile run](https://github.com/kevinim/kevinim.github.io/actions/runs/42662371629) and [native district Finder inspection](https://github.com/kevinim/kevinim.github.io/actions/runs/42663668957).

Nine publicly advertised residence addresses, 1366px and 390px each: **18/18 real Esri house search → existing district GIS school candidates → actual Leaflet overlays → real school click → visible school polygon**. An earlier Barrington marker-click flake was reproduced, traced to map transition/stability and retested through the actual on-screen matched-campus control; latest run succeeds on both sizes. No geometry or school's address is injected into test state. No private resident/student/unit is involved.

| District | Public residential QA address | App GIS campus candidates | Caveat |
|---|---|---|---|
| PISD | 4661 Baldwin Ln, Plano 75024 | Gulledge ES / Robinson MS / Jasper 9–10 / Plano West 11–12 | GIS Finder-linked layer 2025–26, current 2026–27 enrollment unverified |
| PISD | 4704 Durham Dr, Plano 75093 | Hightower ES / Frankford MS / Shepton 9–10 / Plano West 11–12 | Same vintage |
| PISD | 4204 Marshall Ct, Plano 75093 | Daffron ES / Robinson MS / Jasper 9–10 / Plano West 11–12 | Boundary proximity review |
| LISD | 430 Hamilton St, Lewisville 75067 | Rockbrook ES / Durham MS / Lewisville HS | **9th grade separate:** Lewisville Harmon; not a corresponding polygon in app |
| LISD | 460 Hunt Dr, Lewisville 75067 | Rockbrook ES / Durham MS / Lewisville HS | 9th campus must be independently checked |
| LISD | 134 Barrington Ln, Lewisville 75067 | Lewisville ES / Durham MS / Lewisville HS | Boundary proximity; first click test flaky, repeat pass |
| 043907 | 4727 Sunflower Dr, McKinney 75070 | Johnson ES / Evans MS / McKinney HS | Boundary proximity; independent official name outcome not yet read |
| 043907 | 4801 Monte Vista Ln, McKinney 75070 | McGowen ES / Evans MS / McKinney HS | Official grade outcome not yet read |
| 043907 | 3700 Mariner St, McKinney 75070 | McGowen ES / Evans MS / McKinney HS | Official grade outcome not yet read |

These are **dashboard GIS candidates, not legal assigned school/campus enrollment certifications.** Campus names must not be promoted to certified without independently reading district address-specific results and applied academic year.

## B. Independent district source UX — full human-style native search

- **Plano:** The separate public [Plano ASP.NET SchoolFinder](https://webservice.pisd.edu/SchoolFinderForSchoolWires/) was opened, **actual address option** `4661 BALDWIN LANE / PLANO` chosen via the native SELECT listbox. The page returned Early Childhood Beaty, Gulledge, Robinson, Jasper and Plano West, consistent with four app school grade bands **but explicitly says "For the school year 2024-2025"**. The live GIS underlying the dashboard uses four official layers with `SR2526/HIGH2526/MID2526/ELEM2526`. **2026–27 year is *NOT* proven by these matching names.** Added explicit year-mismatch warning in the actual residential UI and changed badge from "current" to "academic year unverified"; tested on both sizes.
- **Lewisville:** Native 2026–27 district-linked MetroStudy [School Locator](https://www.lisd.net/resources/families/school-locator) accepted actual house `430 Hamilton St, Lewisville, TX 75067`; user-style identify on map returned *Elementary Rockbrook, Middle Durham, 9th Grade Lewisville Harmon, High Lewisville*. **App contains three zoned GIS grade bands and omits the 9th-grade Harmon band.** Introduced an explicit warning and required its presence in 390/1366px Chromium QA. Never derive the 9th-grade campus's polygon from a high-school polygon.
- **McKinney:** Native 2026–27 MetroStudy map accepted `4727 Sunflower Dr, McKinney TX 75070` and centered its house point. The district site shows approved 2026–27 attendance maps and dashboard live source checks elementary `SCHL_YEAR 2026-27`. **No explicit K–5/6–8/9–12 campus result has yet been independently read from the resident map popup**, so address correctness remains unverified; 2026–27 year of middle/high features still needs independent proof.

## C. Source and sample gaps, safety gates

- **Plano:** Only one independent *legacy 2024–25* address-school Finder result, **zero valid 2026–27 exact-residence confirmations**. Current official 2026–27 lookup or registrar/Board source must establish corresponding 2026–27 campus/year, especially split feeders.
- **Lewisville:** One independent 4-stage house record, all 9th-grade GIS absent, mixed older layer vintages, 3 actual tested house addresses only in ZIP 75067. Need additional ZIP, explicit 2026–27 layer checks, apartment building/unit exception analysis.
- **McKinney:** 3 real-house app map flows at ZIP 75070, but no independent official home→campus names yet; need different ZIP and robust official map popup identify, middle/high source year confirmation.
- **Allen:** Separate Draft #170 independently validates 6 publicly listed homes against the official **year-unverified** street-range table, not a current GIS; source 2019/2023 shapes must remain historical only.
- **CFB:** Separate Draft #170 official GuideK12 UI selected two publicly listed houses and observed all three campus levels, but there are no independently verified/reusable 2026–27 campus GIS polygons or rights. Do not duplicate or infer a zone.
- **Dallas:** #164/#167 source GIS 187 polygons with provisional 2026–27 vintage and school IDs, incomplete name crosswalk; not residential enrollment.
- **Denton:** #169 linked 39 official school PDF maps; no live campus GIS or marker yet.
- **108 ISD gaps:** #170 source classifies 100 linked-to-parent-portal ISDs with campus GIS not on-boarded. Parent links are not polygons. Do not conflate.

**Release:** #148 mandatory fail-closed seven-ISD residential school gate remains **NO_GO**; all PRs Draft, review only; #168 26/26 full-stack CI for #162→#164→#167 does *not* include #160 source route chain or #165/#171. No merger/deployment without owner approval.

## D. Strict assertions

The #171 browser regression requires: all real-public residential property search form paths, source-backed map features, clicked school boundary, Plano four-tier grade bands, Lewisville 9th campus disclaimer, and Plano legacy school-year disclosure. Real school assignments remain independent verification; synthetic-only UI checks do not count as accredited household enrollment.
