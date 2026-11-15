# TX performance and CI evidence — 2026-11-15

Candidate source: PR #316 head 4e202e840005e3e97f0b1fd395db52bdc4b3f0a2. Baseline: main 61617d738180a0d1a8cb13d09818e6f96bd64b95. GitHub tested merge SHA d83e4f0af1240159470caea9d41daefdadf5eeee.

## Five repeated browser comparisons

[Successful benchmark run](https://github.com/kevinim/kevinim.github.io/actions/runs/43744073861). Five independent Chromium processes, 390px mobile and 1366px desktop, cold then warm navigation in each fresh context; local HTTP and external APIs blocked except pinned Leaflet. All existing readiness/resource/transfer/marker gates passed. This is not production CDN latency or live Finder verification; warm means second navigation, not a guarantee of cached transfer.

| Viewport | Revision | Visit | Map ready median (ms) | Observed range (ms) |
|---|---|---|---:|---:|
| mobile | baseline | cold | 753.3 | 736.4–853.8 |
| mobile | baseline | warm | 574.4 | 551.8–641 |
| mobile | candidate | cold | 684.8 | 670–744.7 |
| mobile | candidate | warm | 571.6 | 544.5–613.3 |
| desktop | baseline | cold | 732.6 | 701.8–779.6 |
| desktop | baseline | warm | 586.4 | 573–673.5 |
| desktop | candidate | cold | 697.7 | 680.6–786.8 |
| desktop | candidate | warm | 606.4 | 579.8–745.9 |

Both revisions made 104 same-origin resource requests in every sample. Candidate transfer was 5,113,751 bytes vs baseline 5,110,340 (+3,411 bytes). Desktop warm median increased by 20ms while the other medians decreased; overlapping ranges and five observations do not establish a speedup or regression. No speculative loader/bundler changes are justified by these measurements. Per-run details and summary are retained in the run artifact.

## CI queue and setup observations

Measured the successful T02 head 15cd07ffad8742bdc9bc1353c089c3eef3e171b: 52 workflow runs, 86 jobs (GitHub REST run/job/step timestamps). Time from run creation to job start: median 29 seconds, range 0–81 seconds. This combines scheduling, dependencies and runner availability; it is not a direct measurement of GitHub's scheduler alone.

31 isolated Chromium installation steps took a median 20 seconds, range 14–33, totaling 646 runner-seconds across concurrent jobs. The total is not elapsed user wait. One job has a -1 second start/end discrepancy and is excluded from any duration interpretation. Setup duplication is a measured consolidation opportunity, but sharing browsers/artifacts across security and data gates would require a separately verified workflow redesign. Existing gates remain intact; this release removes unsafe snapshot writeback and PR-time external data generation instead.

## Remaining release verification

Initial PR checks exposed older assertions requiring campus clicks to enable disabled overlays and expecting the two retired write-scoped workflows. Update those assertions to enforce explicit opt-in and zero writers, retaining browser polygon rendering after opt-in and rejection of restored privileges. Re-run integrated checks before merge, then verify Pages deployment and production smoke.

