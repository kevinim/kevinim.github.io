# Independent QA — 2026 TEA domain and STAAR missingness (2026-11-11)

**Dependency:** [PR #244](https://github.com/kevinim/kevinim.github.io/pull/244), data-only 2026 accountability domains and four STAAR subjects. This report does **not** modify that PR's source batches, school assignment GIS, shared enrichment, or Production.

## Evidence sources and interpretation

All reconciliation keys are TEA's **nine-digit campus IDs**, never school name or district county alone.

1. [2026 TEA Campus Accountability Summary / public 2026 downloads](https://rptsvr1.tea.texas.gov/perfreport/account/acct_download?year=2026) — source of reported/Not Rated domain values; see #244 for exact RATE and STAAR fields.
2. [2026 Final AEA Campus List, April 30, PDF](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-final-aea-campus-list-updated.pdf) — 418 statewide AEA IDs; **AEA membership is not, by itself, a proof of why an individual domain has no score**.
3. [2026 Final Campus Pairings, May 14, XLSX](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-campus-pairings-final.xlsx) — 387 statewide pairing rows including grade-span and paired campus ID.
4. [2026 Campus Grade 3–12 Membership, April 14, XLSX](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-campus-3-12-enrollment-list.xlsx) — 9,103 statewide campus rows; separate total enrollment from grade 3–12 enrollment.
5. [TEA 2026 pairing requirements](https://tea.texas.gov/taa-letters/2026-accountability-pairing-registration-requirements) and [2026 Accountability Manual](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-accountability-manual-full-8.pdf). EE–grade 2 campuses are paired; JJAEP/DAEP and other exempt settings can be Not Rated.
6. [TEA STAAR tested subjects and grades](https://teastudentassessments.zendesk.com/hc/en-us/articles/360040736511-In-what-grades-subjects-and-courses-are-students-assessed-under-the-STAAR-program).
7. [TexasWorks official location directory](https://texasworks.com/learning/landing-page-find-a-campus/); use **campus physical location**, not charter headquarters county, for DFW scope.

The official pairing, AEA and grade-membership documents were checked by campus ID against the 2,282-row dashboard inventory. Original upstream documents are **not** copied into the repo. These are independent QA counts from the above snapshots, not an amendment to TEA values. The paired/A EA category flags are evidence categories, not imputed missingness causes.

## Reconciliation

| Check | Count | Result |
| --- | ---: | --- |
| Dashboard 2026 TEA campus IDs | 2,282 | Exact source match (PR #244) |
| Student Achievement domain `not-rated` | 181 | Official source status; not zero |
| School Progress domain `not-rated` | 200 | Official source status; not zero |
| Closing the Gaps domain `not-rated` | 219 | Official source status; not zero |
| Closing the Gaps NR IDs in 2026 AEA list | 72 | AEA registered; specific missing domain cause not individually proven |
| Closing the Gaps NR IDs in 2026 pairing list | 67 | Official grade-span pairing recorded |
| Closing the Gaps NR IDs with **zero** grade 3–12 membership | 73 | No assessed-grade enrollment in official membership file |
| Closing the Gaps NR IDs with **positive** grade 3–12 membership | 146 | Cannot infer reason from grade span alone |
| Missing entire STAAR group row, all four subjects | **110** | Each source status `not-in-source`, **not** `suppressed` |
| STAAR-row-missing with zero grade 3–12 membership | 72 | Zero assessed-grade membership verified |
| Of those 72, present in official pairing list | 67 | Paired official rating can exist without school-local STAAR result |
| Of those 72, not found in pairing list | 5 | Requires separate pairing/exception check; do not infer |
| STAAR-row-missing with positive grade 3–12 membership | **38** | **Open** investigation: special settings, program exclusions, low counts and/or source missing |
| Of those 38, in official AEA list | 3 | AEA classification verified, individual missing-row rationale unconfirmed |
| Overall A–F rated but all three own-domain entries NR | 67 | **Do not label school itself Not Rated**; pairing explains rating provenance |

The 110 schools lacking a STAAR row are all included among the 219 Closing the Gaps NR IDs (source cross-check). The 72 / 38 partition is exhaustive. **The 67 paired, 72 AEA, and 73 grade-zero counts are overlapping evidence dimensions; do not add them.** The 67 rated overall despite own-domain NR are not errors to be changed to NR or to zero.

### Five reproducible spot-check campuses

Original sample: deterministic shuffle seeded `20261111` of 219 IDs with Closing the Gaps `not-rated`, sorted by campus ID before Fisher–Yates. Spot-check notes below also use official pairings and 3–12 memberships.

| Campus ID | TEA campus | Official 3–12 count | Additional official evidence | QA disposition |
| --- | --- | ---: | --- | --- |
| `061806021` | TEXASWORKS - MESQUITE | 25 | 2026 AEA Dropout Recovery School; Student Achievement score 92, School Progress 90, Closing the Gaps NR | **Partial**: missing domain specific reason unresolved |
| `061806015` | TEXASWORKS - SAN JUAN | 41 | 2026 AEA Dropout Recovery School; Student Achievement 91, remaining domains NR; operator confirms physical San Juan, TX location | **Partial + out-of-DFW confirmed** |
| `070903022` | ELLIS CO JJAEP | 2 | JJAEP name; TEA 2026 JJAEP exclusion rule; all three domains NR; privacy-suppressed STAAR rates remain null | **Regulatory basis identified**, not a manufactured score |
| `070912113` | TURNER PREKINDERGARTEN ACADEMY | **0** (179 total) | 2026 paired with `070912107`, grade span EE–PK; overall **B/83** despite all own-domain entries NR; no STAAR source row | **No tested grade + pairing confirmed** |
| `057905096` | JUVENILE JUSTICE AEP | 6 | Juvenile justice alternative program; Not Rated by official source; no STAAR source row | **Regulatory basis identified**, not a manufactured score |

### Additional examples from unresolved 38 positive-enrollment/no-STAAR-row cases

| Campus ID | Program name in TEA inventory | Official 3–12 count | What is verified |
| --- | --- | ---: | --- |
| `057903005` | SALAZAR DISTRICT ALTERNATIVE EDUCATION PROGRAM | 50 | 2026 grade membership exists; entire STAAR source row absent |
| `057905011` | BARBARA M MANNS MIDDLE DAEP | 109 | 2026 grade membership exists; entire STAAR source row absent |
| `057903009` | DALLAS COUNTY JJAEP CFB CAMPUS | 1 | 2026 grade membership exists; entire STAAR source row absent |
| `061901005` | LESTER DAVIS | 85 | 2026 grade membership exists; entire STAAR source row absent |
| `220905035` | TRANSITION CTR | 122 | Listed in 2026 AEA as Dropout Recovery School; entire STAAR source row absent |

**Important:** names such as JJAEP/DAEP suggest a relevant exemption, but per-campus exclusion evidence must be confirmed before assigning final machine-readable exclusion reasons. Low enrollment does not automatically prove privacy suppression. This is why unresolved data stays explicitly unavailable, not zero.

## Geographic / K–12 quality gate

The 2,282 dashboard inventory contains **41 TexasWorks campuses** under district code `061806`, whose district county is `DENTON`. They are distributed across Texas; **40 of the 41** have Closing the Gaps NR. For example, `061806015` is at **1202 E Business Hwy 83, San Juan, TX 78589**, not DFW, while `061806021` is at **3733 W Emporium Cir, Mesquite, TX 75150**, in DFW. The charter operator's directory confirms these locations.

**Do not globally delete all 41 TexasWorks records.** Scope should be determined from individual current campus addresses and verified county/region, not district headquarters. Adult/dropout-recovery programs must be kept separate from ordinary household K–12 attendance and school quality recommendations. A statewide public source campus ID can legitimately exist in the TEA dataset yet be outside the dashboard's geographic scope.

## QA decisions and release blockers

- **PASS**: exact 2,282 campus join; official source null and NR statuses; all 110 STAAR missing-source rows distinguished from privacy-masked values; official pairing/AEA/membership cross-check counts.
- **CONDITIONAL GO for UAT source-only presentation**: show numeric TEA results as published, with explicit `Not Rated`, `Not Applicable / no tested grades`, `suppressed`, and `source unavailable` notices. Paired campus grades must be marked as linked rather than own-campus test performance.
- **NO-GO for interpreting all missing values as broken extraction**, inventing scores, treating `-1`/null as 0, extrapolating STAAR grades, or using a charter's HQ county to determine a campus's DFW membership.
- **Outstanding (after second-pass investigation):** 24 positive-enrollment/JJAEP-or-DAEP cases have rule-supported home-campus attribution, while **14 positive-enrollment campuses** (3 official AEA plus 11 other specialized settings) remain without an exact individual missing-STAAR-row explanation; the five grade-3–12-zero unpaired campuses now have verified 2026 grade spans and lawful pairing-scope classifications. Still verify campus-specific reasons for 14 and physical DFW locations / corrected denominators.
- **Governance:** PR #244 remains Draft, no `main` merge, no Production deploy, no shared source batch or GIS edits. Re-run cross-source official register comparison after any TEA refresh and before treating this QA report as release-ready.

## Reproducibility boundaries

This report captures the *observed* source crosswalk and its source URLs, including the subsequent direct-campus drilldown and 43-ID structured exceptions register. The adjacent automated test validates the immutable #244 campus keys, `not-rated`/missing-source tallies, status semantics and spot-checks. It does **not** claim to parse the externally hosted TEA XLSX files in CI; pairings/membership evidence must be separately refreshed and verified if upstream sources change.

## Second pass — five unpaired campuses and 38 positive-enrollment cases

Cross-referenced `data/tea-2026-staar-missing-row-qa-exceptions.json` against **TEA's 2026 A–F Accountability Campus Listing** (September 2026 update), the exact ID-keyed sources above, and 2026 manual Chapter 7, pp. 83–85.

### 2026 direct campus report evidence for the five zero-tested-grade / unpaired schools

| TEA ID | Campus | 2026 grades | Total enrollment | Official report pairing | Rating | Verified reason for lack of campus-local STAAR score |
| --- | --- | --- | ---: | --- | --- | --- |
| `129902116` | FORNEY ISD — EARLY CHILDHOOD CENTER | EE–EE | 78 | No | Not Rated | EE-only, below PK–12 accountability pairing scope |
| `043908106` | MELISSA RIDGE EDUCATION CENTER | EE–EE | 22 | No | Not Rated | EE-only; **2025 grade span EE–PK and paired A/92, but 2026 grade span became EE–EE and Not Rated** |
| `057905302` | CALLIER CENTER PRE-SCHOOL DEAF (0–5) | EE–EE | 61 | No | Not Rated | EE-only preschool, not STAAR-tested |
| `220802101` | ARLINGTON CLASSICS ACADEMY — ARKANSAS CAMPUS | KG–02 | 493 | No | Not Rated | No STAAR-tested grade; **open-enrollment charter campus** exception from pairing with another campus |
| `057833001` | EDUCATION CENTER INTERNATIONAL ACADEMY 1 | KG–01 | 37 | No | Not Rated | No STAAR-tested grade; **charter campus** exception from pairing with another campus. The campus had STAAR-result-based scores in 2025, but serves KG–01 in 2026; do not backfill 2025 data |

**Official, directly observed 2026 A–F campus listings** (precise year and ID in each URL):
- [Forney ISD, campus 129902116](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&domain=3&id=129902&lev=D&prgopt=reports/acct/ca.sas).
- [Melissa ISD, campus 043908106](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=043908&lev=D&prgopt=reports/acct/ca.sas).
- [Dallas ISD, campus 057905302](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=057905069&lev=C&prgopt=reports/acct/ca.sas).
- [Arlington Classics, campus 220802101](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&domain=3&id=220802&lev=D&prgopt=reports/acct/ca.sas).
- [Education Center International Academy 1, campus 057833001](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_debug=0&_program=perfrept.perfmast.sas&_service=marykay&ccyy=2026&id=057833001&lev=C&prgopt=reports/acct/ca.sas).
- [TEA 2026 Accountability Manual, Chapter 7 pairing and student attribution](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-accountability-manual-full-8.pdf): PK–12 without tested grades are ordinarily paired, **charter campuses and registered AECs are not paired with another campus**; EE-only campus is below stated PK–12 pairing scope; JJAEP/DAEP data go to the home campus.

**Do not flag those five as extraction failures or invent test scores.** The missing **campus-owned** STAAR results reflect no eligible tested grade. The TEA report explains the observed unpaired status; its individual `Not Rated` decision reason is not separately encoded in the CSV. Distinguish absence from suppression.

### Positive grade-3–12 membership, still no STAAR source row: 38

| Official evidence class | Campus count | What 2026 rule supports | What remains unknown |
| --- | ---: | --- | --- |
| JJAEP, official name explicitly denotes juvenile justice program | **19** | JJAEP not rated; student attendance and performance attributable to home campus | No separate campus-specific absent-row cause code |
| DAEP, official name denotes disciplinary alternative education program | **5** | DAEP not rated; student attendance and performance attributable to home campus | No separate campus-specific absent-row cause code |
| Registered AEA school in 2026 final list | **3** | Program classification confirmed | Why no own-campus STAAR row despite positive 3–12 membership |
| Other nontraditional/specialized campus (incl. special education, treatment, alternative, etc.) | **11** | Official enrollment and Not Rated confirmed | Exact reporting/exemption/assessment reason, whether per-campus/eligible tests were given |
| **Total** | **38** | **24 with rule-supported attribution; 14 require individual evidence** | Do not impute or suppress invented values |

All **38** have official **positive grade-3–12 membership** and official **overall Not Rated**, and lack an entire STAAR source row for all four subjects. **22** have fewer than 10 students in grade-3–12 membership; this is a potential minimum-size signal, **not** proof of why an entire source row is absent.

Special caution: TEA 2026 Chapter 7 says **special education campuses with assessed students are rated on their student performance**, with no special blanket exemption. Therefore do not automatically classify `HUIE SPECIAL EDUC CTR`, `LESTER DAVIS`, or other specialized campuses as "exempt" just from names. The 14 unresolved require specific official evidence before final classification. **AEA registration is not equivalent to JJAEP/DAEP and does not alone justify omission.**

These are **QA classifications**, not substitute values. The protected source batches in PR #244 remain unchanged.

## Source-link scope correction (2026-11-11 QA follow-up)

The five zero-tested-grade unpaired exception links previously used the key `officialCampusReportUrl`, although only one linked to the matching nine-digit campus ID with `lev=C`. Three others were six-digit `lev=D` district listings. The Callier Center record `057905302` incorrectly pointed to a different campus ID `057905069`; the replacement is the official 2026 Dallas ISD district summary listing, where `057905302` appears as Not Rated / EE–EE. This correction is limited to QA provenance; it changes no campus scores, student counts, suppression codes, school assignments or runtime UI.

The exception register now records `officialEvidenceUrl` and explicit `officialEvidenceScope` (`campus` versus `district-listing`). Regression tests reject cross-campus IDs and district/campus scope mismatches. **A district listing is not proof of a campus-owned STAAR result or an individual missing-row cause.** All 14 unresolved special-setting missing-row explanations remain open.

## 2026 AEA subtypes verified for three of the 14 unresolved positive-enrollment campuses (Nov 11 follow-up)

The official [TEA 2026 Final AEA Campus List, page 4](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/2026-final-aea-campus-list-updated.pdf), dated April 30, identifies these **exact nine-digit campus IDs**:

| Campus ID | Campus | AEA type |
| --- | --- | --- |
| `220905035` | TRANSITION CTR | DROPOUT RECOVERY SCHOOL |
| `220905212` | BRIDGE ASSOC | RESIDENTIAL FACILITY |
| `220905242` | TARRANT YOUTH RECOVERY | RESIDENTIAL FACILITY |

The [2026 Accountability Manual, Chapter 1, page 5](https://tea.texas.gov/school-and-district-leaders/accountability/academic-accountability/performance-reporting/chapter-1-2026-accountability-overview-0.pdf) explicitly lists *residential facility* as a reason a campus may be **Not Rated**. This establishes a specific **rating eligibility rationale** for two of the three facilities but does **not** prove the precise reason the TEA public STAAR export contains **no row** for any of these campuses. The DRS designation for Transition Ctr is not a standalone reason to assume no STAAR performance.

The QA exception register now pins the original AEA type and source for all three. The negative regression prohibits treating an AEA type, Not Rated, a small grade 3–12 population or a residential label as fabricated STAAR data. Thus **two residential-facility classifications and one DRS classification are verified; individual missing-row causes remain unresolved for all 14** (the 3 AEA + 11 other-review cases). No source scores, enrollment values, district/year mappings, demographic masks, campus whereabouts or household school assignments were modified.
