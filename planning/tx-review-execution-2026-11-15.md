# TX review execution ledger

Plan: TX_Dashboard_Code_Review_Plan_2026-11-15.md, main baseline c4c3d0a085525e5d7abd77dcbe94d36f22042238.

## T01: merged and deployed

- Both the current dashboard and reviewed.html's legacy bootstrap now invalidate superseded commute calculations on input/ZIP/mode changes.
- A shared in-memory operation controller lives in the already loaded provider-requests module. Every geocoder/table/route completion must own the current generation before updating state, status, layers or cost distance.
- Home routing shares cancellation ownership with ZIP routing; current home routes still draw and report distance. Automatic distance fields are cleared on programmatic selection changes; manually entered miles are preserved.
- Duplicate submissions while the same ZIP calculation is pending do not send duplicate lookups. The existing destination marker remains when moving to a different ZIP for the same destination.
- New regression tests deliberately ignore AbortSignal in mocked providers to verify stale-write protection independently of cancellation support.
- RED: six stale-response/duplicate-submit scenarios failed in each original entry point. Two home route scenarios also failed against the original home source.
- GREEN: 52 local tests passed (17 new commute lifecycle cases, provider guard, table repaint, area assessment, region comparison, area explorer, script order). Changed JS syntax checks passed.
- Full repository data/history/browser checks require GitHub CI: local Git network access and managed worktree creation failed. The local isolated snapshot contains only selected files and must not be mistaken for the full repository or its history.
- PR #314 passed all 33 workflows, then merged as f0a7b1c6364ba0361dbedf935e5f9baec65d8db3. Pages deployment #43732423306 and production school-map smoke #43732490965 succeeded.

## T02: merged and deployed

- Initial demographics and outside-area data use independent 12-second deadlines, preserving cache:default and deterministic allSettled merge. On timeout the fallback initializes once; late responses cannot initialize or mutate again.
- A shared bounded JSON reader in the already-loaded provider module limits both HTTP fetch and JSON body parsing, handles caller cancellation, and removes timers/listeners when settled. Polygon requests retain their existing 20-second limit and timeout test override.
- Plano feeder validation has a separate 12-second deadline and readiness status. It no longer blocks completed polygons. Per-source status drives campus boundary hints and the school-grade UAT; global zoneReady remains the compatibility marker for all polygon requests becoming terminal. Home assignment gates remain fail-closed.
- Esri geocoding uses the shared deadline; search restores its button and retry message on timeout. Abort is distinct from timeout and stale completion cannot replace status.
- Cache-bust changed consumer/guard assets. Add the missing provider guard to legacy rent/redfin UAT pages before their shared bootstrap, without adding scripts to the production index inventory.
- RED/GREEN: pending initial data, pending feeder, per-district readiness, Esri timeout/cancellation, stalled JSON body, timer cleanup and entry-point guard ordering. 89 selected local tests passed, including preview transformation and prior safety guards.
- No automatic retries or provider-policy changes. Explicit home search retry remains available after timeout. More detailed school data partial/error UI belongs to T04.

## Rulings

- Reuse the existing provider script for operation ownership instead of adding a new script tag. This preserves the audited loader inventory/CSP and avoids dependency-order drift; behavioral coverage remains required.
- Source inspection found reviewed.html actually references features/reviewed-bootstrap.js. The earlier review's dormant-code observation was incomplete, so T01 covers that real entry point too.
- Preserve existing mixed line endings outside narrow edits. Extend the existing exact-byte JS allowlist with one exact T01 blob digest; historical baselines and security assertions remain enforced.
- CI exposed a pre-existing stale McNeil click assertion after #313 removed three repurposed campuses from active choices. Keep the active Finch polygon test and explicitly assert McNeil/Eddins/Wolford are absent; do not restore retired schools or skip browser QA.
- T02 reuses the existing provider asset for bounded reads to preserve the synchronous script dependency order. Exact legacy HTML assertions normalize only four reviewed cache-key changes; all other markup and CSP remain byte-pinned. New loader tests require the fresh guard on all five entry points.
- Update existing audit/build/browser references to the new exact asset versions, without broadening URL/CSP/policy rules or performance budgets. The approved provider-added resource allowance still counts the same single guard asset.
- CFB evidence rows may move into the existing compact-footnote index. Its browser check now requires original evidence content plus either readable inline text or a working link to that same evidence, instead of racing the footnote observer with an immediate innerText assertion.
- The curated public-preview builder must recognize the bounded neutral-data read and preserve cancellation/superseded-result guards when replacing Nominatim with Esri. A VM regression failed with the old transformation restoring destination A after edit to B, and passes with the generated operation signal and ownership check retained. The five public-promotion blockers remain unchanged.

## T03–T07: implemented; integrated CI and repeated measurements pending

- T02 PR #315 merged as 61617d738180a0d1a8cb13d09818e6f96bd64b95 after 52 successful workflows. Pages #43734979594 and production school-map smoke #43735051773 succeeded.
- T03 preserves each Finder layer's source year and marks only explicitly checked McKinney elementary 2026-27 as current. Middle/high remain references. Campus clicks preserve disabled boundary toggles; late ZIP geometry cannot replace a viewport already claimed by the user or selected UAT city.
- T04 distinguishes official Not Rated, absent TEA joins, ambiguous campus identity and invalid records. Counts explicitly separate campuses and geometry pieces. The panel reports loading/error/partial/empty states, retains official Finder links, and manually retries only failed available sources. A superseded retry cannot clear its replacement's data or status.
- T05 names the ZIP/metric selects, exposes pressed school filters, makes ZIP choices native keyboard buttons, and suppresses autocomplete/submission during IME composition. Browser checks cover keyboard controls and dark/light layouts at 390/1366px with 100/200% equivalent CSS viewport widths. This is layout-zoom equivalence, not an OS-level browser-zoom experiment.
- T06 removes repository write credentials and git writeback from FEMA/NOAA generators. PRs validate code/policy; reviewed main has manual read-only generation with retained artifacts. Runtime privacy QA follows all address/provider/workplace owners and distinguishes explicit saved workplaces from transient home input.
- T07 compares five independent cold/warm browser repetitions per viewport/revision against the current PR base, reporting medians and observed ranges. Existing budgets remain. No unmeasured speedup is claimed.
- Local regression selection: 123 tests passed before the additional superseded-source retry regression; that additional regression also passed. Full history/data/browser checks run in GitHub because the local checkout is a partial snapshot.
- Cache keys are advanced for changed runtime assets. Exact HTML checks reverse only the three approved semantic-control changes and exact cache keys; the changed main script has an additional exact blob allowlist entry. Historical checks and CSP are retained.

## Remaining

T07 measured browser evidence and CI queue/setup timing review; T08 integrated GitHub checks, merge, Pages deployment and live production smoke.

T01 changes do not authorize automatic school assignment, change data provenance, add paid services, store home addresses, or relax public-promotion gates.
