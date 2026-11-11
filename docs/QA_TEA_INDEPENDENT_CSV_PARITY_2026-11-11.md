# Independent TEA PEIMS 2025–26 source CSV parity audit

**Verdict: CONDITIONAL GO for source-row integrity of eight district cohorts only. NO PRODUCTION RELEASE.**

On November 11, 2026 the independent QA lead obtained the original public 2025–26 TEA Student Enrollment Reports, Selected Campus Totals by District, Ethnicity (CSV) and compared every listed source row against repository PR #238 at immutable head `794309314de540d06166b41c602bf546a48994d8`.

Checked exact 9-digit Campus ID, 6-digit district ID, seven ethnicity categories, published counts, original `<N` masks, categories omitted in source, and raw duplicate rows. Official source links are in `qa/evidence/tea-peims-raw-parity-20261111.json`.

| ISD (official ID) | Campuses | Original CSV rows | Differences |
| --- | ---: | ---: | ---: |
| CFB ISD (057903) | 35 | 203 | 0 |
| Lewisville ISD (061902) | 57 | 370 | 0 |
| Allen ISD (043901) | 23 | 148 | 0 |
| McKinney ISD (043907) | 33 | 194 | 0 |
| Frisco ISD (043905) | 76 | 473 | 0 |
| Plano ISD (043910) | 69 | 418 | 0 |
| Prosper ISD (043912) | 32 | 200 | 0 |
| Denton ISD (061901) | 46 | 284 | 0 |
| **Total** | **371** | **2,290** | **0** |

All eight source checks returned TEA publisher status 200. No source duplicate-category or malformed rows were found. The result is only valid for the immutable audited candidate SHA. The remaining three cohorts in #238—Irving 35, Richardson 51, Dallas 237—were not independently re-extracted. Later #245 extensions are not certified by this finding.

## Repeat independently without paid tools

Save official public TEA ethnicity CSV exports locally using the filename for each cohort in the evidence manifest, then run the offline, dependency-free Node.js verifier against the staged snapshot:

```bash
node qa/tea-peims-raw-parity.cjs \
  --dataset data/tea-ethnicity-2025-26-priority.json \
  --manifest qa/evidence/tea-peims-raw-parity-20261111.json \
  --csv-dir /path/to/official-tea-aggregates
node --test tests/qa-tea-peims-raw-parity.test.cjs
```

The CLI rejects a wrong source year, spoofed host, wrong Campus/District ID, duplicated source category, fabricated counts for masked or omitted categories, and source count mismatch. CI runs privacy-safe synthetic fixture tests, not live CSV network checks, so green CI alone does not certify current TEA source parity.

## Remaining gates

- Confirm any new source candidate SHA through the same original-row parity process; avoid duplicate import paths across split and consolidated PRs.
- Reconcile same-product PEIMS enrollment denominators before displaying whole-school race percentages. A separate TEA accountability-profile total may differ: never substitute it as the PEIMS denominator.
- Keep suppression/Not Rated distinct from zero; do not infer masked values or causation of strengths/weaknesses.
- Independently validate 2026 academic domains/STAAR sources, campus open/closed status, security/CSP/XSS, mobile/dark mode, map-marker and address-to-school attendance zone regressions.
- No personal student records, residential addresses, API keys, paid services, shared-core changes or main deployment in this PR.

**Scope note:** TEA source-row parity is not a claim of complete school demographics, demographic quality, or verified home-school assignment.
