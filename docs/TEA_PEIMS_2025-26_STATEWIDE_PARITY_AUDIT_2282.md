# Independent TEA 2025–26 statewide PEIMS source parity — ALL 2,282 dashboard-inventory campuses

**Status: independently reconciled / QA Ready for Review; no production deployment.**

This is an additive standalone QA extension to [#239](https://github.com/kevinim/kevinim.github.io/pull/239), independently verifying the **full 2,282-campus** official ethnicity snapshot staged in [#245](https://github.com/kevinim/kevinim.github.io/pull/245). Immutable ethnicity source **Git blob** `10166ec14ff1458377aa68c1419d95435da1d28c`, not merely a moving PR branch name. Review only; no source count edits, GIS, marker, address/school routing, UI, secrets or student-level data.

## Exact original TEA source validation
- TEA 2025–26 PEIMS Student Enrollment Reports, official *Statewide Campus Totals*, **race/ethnicity** [original CSV](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=sc&linespg=60&charsln=120&grouping=e&loop=1&key=&_debug=0): **48,971** statewide aggregate rows; **13,418** rows for the exact 2,282 dashboard campus IDs. Each raw category value (published number, TEA `<N` source mask, or truly absent category) checked by exact nine-digit Campus ID and seven-category key. **15,974 / 15,974 cell values and statuses matched, 0 mismatches, 0 duplicate category rows, 0 missing campus records**.
- TEA 2025–26 PEIMS *Statewide Campus Totals*, **gender** [original CSV](https://rptsvr1.tea.texas.gov/cgi/sas/broker?_service=marykay&_program=adhoc.addispatch.sas&endyear=26&major=st&minor=e&format=c&selsumm=sc&linespg=60&charsln=120&grouping=s&loop=1&key=&_debug=0): **18,021** statewide aggregate rows; **4,521** rows for current dashboard-inventory IDs. All **2,282** campuses present, covering **181** districts. Gender male+female total publicly countable for **2,126** campuses; **156** have protected gender source values.
- Ethnicity seven-cell total: **8,277** exact published group counts, **5,141** TEA-masked groups, **2,556** source-unlisted groups. All statuses preserved. For publicly countable gender totals, **0 schools** have a sum of public race category counts greater than the independent PEIMS gender denominator.
- Fully disclosed seven ethnicity category counts with **exact same-source gender denominator**: **six schools** — North Crowley H S (`220912002`, 3,033 PEIMS), Allen H S (`043901001`, 5,127), Houston Middle (`057912046`, 753), Jackie Mae Townsell EL (`057912123`, 756), Northwest H S (`061911001`, 2,806), Byron Nelson H S (`061911007`, 2,997). This means **6/2,282 school-wide race share distributions validated**, while the other **2,276** campuses are partial source counts only.
- The *separate* 2026 Texas School Profile / Campus Comparison Group lists **5,126** for Allen H S, versus same-school-year PEIMS race/gender aggregations **5,127**. The source-product difference remains unexplained; never swap or conflate the denominators. All 8 cross-product Allen/McKinney discrepancies remain documented in the prior 56-campus audit.

**Important geographic limitation:** the current dashboard inventory is not a fully geolocated set of physically DFW campuses. Independent QA #251 flags e.g. TexasWorks–San Juan `061806015` as outside DFW despite its district's Denton-county administrative label. These ethnicity row joins certify **Campus ID and TEA data**, not local geographic eligibility, campus attendance zone or address-to-school assignment.

## Privacy and reproducibility
The new JSON **does not duplicate the seven-group counts** and **omits all numeric gender totals for schools with any ethnicity mask or unlisted category**, even where gender data is officially public. This reduces opportunities to invert suppression via subtraction. No masked value is inferred, imputed, coerced to zero, or reverse-engineered. No individual student records. Only the six fully public denominators are retained.

Exact independent online row-by-row source verification was performed 2026-11-11 against the above two public TEA CSV URLs and the pinned source blob. **Offline CI checks the audit evidence shape, exact inventory joins, source URL provenance and privacy invariants; it does not redownload TEA CSVs.** Re-run live parity whenever that source blob changes, rather than claiming static offline tests prove fresh source parity.

`node --test tests/tea-peims-2025-26-statewide-parity-audit.test.cjs`

## Release decisions
- **Data source parity Ready for Review**: 2,282 / 2,282 race count records from TEA aggregate CSV validated.
- **Full seven-category percent Ready for Review**: six source-complete + gender-reconciled campuses. All other schools **counts only**; the percentage *among published counts* (if offered elsewhere) must be visibly distinguished from the school's full composition.
- **Application Production status: NO DEPLOY** until #245 exact-head CI, #247 P0 source-display fixes, #249 2026 academic integration, mobile + desktop browser privacy/CSP/marker checks, dependent PR conflict reconciliation and explicit user release authorization.
