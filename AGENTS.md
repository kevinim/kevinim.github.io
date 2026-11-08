# Agent instructions — TX Relocation Dashboard

This repository serves https://kevinim.github.io/.

## Required context
- Read [HANDOFF.md](HANDOFF.md) before beginning new features. It records the user-approved, **unimplemented** P40–P43 roadmap (commute/tolls; healthcare; winter/grid resilience; crime-data preparation only).
- Read [BOUNDARIES.md](BOUNDARIES.md) before editing school maps or assignment data. Inspect current GitHub PRs, code and production; a written status note is not proof of current deployment.
- Treat production school marker regressions (especially Allen schools missing / zero markers), selected-area default viewport behavior and source provenance as release blockers until verified resolved in the deployed site.

## Change discipline
- Keep new map layers independent of school markers, school boundaries, map state and source IDs.
- Distinguish no data from unrated; absent data must not imply safety or zero risk. Risk coloring should progress toward red for worse validated conditions.
- For P43, **do not ship a crime map or safety score**: only acquire, assess and normalize official datasets until the user separately approves visualization.
- Record actual implementation, tests, PRs and deployment evidence; do not mark a plan completed because a document was committed.
