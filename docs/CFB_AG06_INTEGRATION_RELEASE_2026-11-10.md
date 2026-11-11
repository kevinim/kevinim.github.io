# AG06 CFB integration review — 2026-11-10

This release candidate now targets `main` directly, combining the reviewed CFB atlas PR #208 head `6b4296c3b532011cf958f77cafc184e96ffc938c` and AG01–05. Before merging, CI must re-run against the current main base `e9c5738ed16acaaa8058f9f49cbdceb50fe0d0ef`. This document records the proposed scope; it does not itself authorize unsupported auto-assignment.

## Input PRs (source copied at recorded heads)

| Agent | PR | Source head | Scope |
| --- | --- | --- | --- |
| AG01 | #210 | 501628a1f82802185383b63ba2a920c136d0285a | official GIS provenance, image rights, 2 source conflicts |
| AG02 | #211 | 160410676a8e075ba7e576723d41be61c1d47ccb | candidate E/M/H alignment, 2020 historic GIS, no independent ground proof |
| AG03 | #212 | 6c1dc4778fd6c6d8843af1c5d6c649a4451fe179 | ephemeral E/M/H polygons and topology, zero authorized labels |
| AG04 | #209 | ffbd0e3321e82eda8ea7ca641c0dd0344aff39a1 | independent Finder browser observations and fail-closed comparison |
| AG05 | #213 | a24c0189141d94249581e7b5d96f18caaefcf785 | manual Finder campus bridge + opt-in reference GeoJSON layer |

## Collisions resolved

- `index.html`: kept #208 official 2025–26 raster atlas, Finalsite CSP allowance, three-school-district jurisdiction lookup, and base manual Finder; added #213 reviewed CSS v2/bridge v2 and unverified overlay JS only. All script IDs unique.
- `tests/externalized-main-bootstrap.test.cjs`: kept #208 previous-main byte-exact and CSP guards, extended expected string with #213's two cache version changes and one first-party JS import. No broad integrity exception.
- Source branches for AG01–04 are copied without modifying AG05 or site school names. PR #214 (mobile first-fold) and #215 (performance baseline) remain separate and are not copied to avoid unrelated overlap.

## Verifiable coverage and accuracy

- Independent AG04 browser: **2/2** existing public property *base* addresses selected via GuideK12 native autocomplete, **6/6** elementary/middle/high assigned names matched, https://github.com/kevinim/kevinim.github.io/actions/runs/42928190021. This is **not** polygon accuracy or unit-level evidence.
- AG03 raster elementary: **33 unlabeled rough pixel fragments**, 0 independently labeled campus polygons. Middle/high geographic fragments: 0. Per-grade independently certified school zones: **0**, exact source school-zone denominator **not yet established**. Polygon vs independent live Finder: **0 PASS, 0 FAIL**, geometry accuracy **undefined**.
- AG02 14 approximate E anchors: affine fit ~**356.41m** in-sample RMSE, 0 verified fit GCPs or independent geographic holdouts for each grade. 2020 municipal GIS covers **74.09% / 98.62% / 99.53%** of CFB 2025–26 district E/M/H jurisdiction respectively, but historic vintage is not current attendance certification.
- AG01 publisher imagery public access does not establish reuse/derivative GIS rights. Texas 2025–26 district outline never proves an elementary/middle/high attendance zone. McCoy Good/Blanton and Furneaux Woodlake/Woodland contradictions require independent adjudication.

## Release gates

- **GO only for nondeploying audit/test utilities** after combined CI, not for a current household school claim.
- **CONDITIONAL GO candidate** for already-supported manual Finder, approved original raster atlas, school campus marker, district jurisdiction reference with its 250m ambiguity guard and optional unverified layer UI. No AG03 draft school geometries are auto-loaded into the public map and no inferred school name is generated.
- **NO-GO:** automatic residential E/M/H assignment, current official per-school GIS labels, apartment-unit certification or any promotion based only on source text, raster color contours or 2020 GIS.
- Conditional release is still subject to user approval; **no main merge or production deployment**.

## Validation

- Run `.github/workflows/cfb-ag06-integration-review.yml` on exact head: Node provenance/policy/CSP/regression, Python GCP/topology synthetic tests, real Chromium 390/1366 campus/atlas E2E. Do not claim GREEN until checked.
- Remains: public-record GIS/license response, 8+ independently measured fit points per grade plus distinct holdouts, year/vintage check, opposite-side public Finder properties in split zones, 2 text conflicts, mobile screenshot review and Allen/other-ISD browser smoke on integrated head.

## Owner-authorized current GitHub Pages release (2026-11-10 US Eastern)
The owner explicitly requested deployment and closure of completed PRs. This approval pertains only to the existing https://kevinim.github.io/ Pages site and the safe reference/manual Finder scope, **not** a future separate Cloudflare Public Production environment, school GIS certification or data redistribution rights.

Pre-release GitHub Pages main SHA: `e9c5738ed16acaaa8058f9f49cbdceb50fe0d0ef`.

Release order: rerun all `main` PR CI after this doc commit; merge this reviewed integration PR only if required checks and AG06 jobs are green; confirm GitHub Pages build/deployment and actual live site; then close superseded #208/#209/#210/#211/#212/#213 with individual pointers to the integrated commit. Leave unrelated #187, #214, #215 and #218 open.

Rollback: revert the main release merge commit via a separate PR to restore previous public assets; do not force push. Live postdeployment smoke must observe campus marker, official finder, district vs campus warning, CSP, address privacy and unapproved auto-assignment disabled. 
