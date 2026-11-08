# P40: DFW commute / Toll cost — independent calculation core

**Status:** P40 step 1 complete **on feature branch only**. The calculation library and tests exist; **not wired to the live dashboard** and no route-specific toll quotes have been fetched automatically. Do not report the public calculator as shipped.

## Existing assets to re-use
- `index.html` contains the destination chooser, ZIP / selected-home OSRM driving route/road-network time, and saved commute overview.
- `jpm-road-times-2026-11-04.json` is traffic-free representative ZIP road time (not actual morning/PM conditions).
- Do not duplicate or replace these modules; add UI later after Claude's concurrent layout work finishes and the latest main is rechecked.

## Core calculator
`features/commute/cost-model.js` is browser-classic-script and CommonJS compatible (no dependencies). It requires explicit flags indicating whether NTTA and/or TEXpress facilities are used. If used and the route quote is unavailable, totals are **null** (not zero). Supports asymmetric outbound vs return miles and route-tolls, 0–31 days/month, MPG/fuel price/parking, TollTag, ZipCash and ZipCash autopay assumptions, and user-entered variable TEXpress lane amounts.

Test: `node --test tests/p40-commute-cost.test.cjs`.

`ZipCash` NTTA toll estimate = TollTag ×2. `ZipCash autopay` estimate = TollTag ×1.5 (25% discount from pay-by-mail); actual gantry-level rounding can differ. Applied to NTTA toll portions **only**, not to TEXpress.

## Official sources reviewed on 2026-11-08
- NTTA official toll calculator: https://maps.ntta.org/tollcalculator/ . **Does not include TEXpress Lanes**. Enter actual route start/end to obtain both outbound and return quotes.
- NTTA Plan Your Trip: https://www.ntta.org/plan-your-trip . Official toll-rate map, rate charts, dynamic operator distinction.
- NTTA Billing: https://www.ntta.org/pay-your-bill . ZipCash 2× TollTag; ZipCash autopay 25% off ZipCash on NTTA roads.
- TxDOT DFW toll roads: https://www.txdot.gov/discover/toll-roads-managed-lanes/txdot-toll-roads/dallas-fort-worth-area-toll-roads.html . TEXpress prices dynamic; tag interoperability.
- Source-check status: verified official **method and payment types**, not independently quoted rates for a specific house-to-work route.

## Remaining P40 work (after cross-agent coordination)
1. Define UX in existing `office-controls` card rather than a second commute panel. User enters outbound/return NTTA calculator totals for route (or a verified gantry aggregation); require clear source/date and quote direction. Enable 'toll-free route' **only when actually checked**.
2. Integrate pure cost model into `index.html` after Claude completes `fix_cards_handoff.py` and handoff edits; rebase on current main and preserve `#zipInsights` and school markers.
3. Acquire a reliable source for toll-avoiding route alternatives (OSRM public demo does not offer guaranteed toll avoidance, commercial traffic or route toll pricing), and for peak AM/PM historical travel times. Without it, keep time saved **unavailable**, not invented.
4. Verify against NTTA toll calculator sample routes with fixed date/rate vintage; test TollTag, ZipCash, ZipCash autopay, TEXpress, null quote, and zero office days.
5. Run full main QA and deployed UI smoke after integration; do not merge this branch to main or claim production deployment until the new UI and tests are reviewed.

This branch deliberately does **not** modify `index.html`, `HANDOFF.md`, `crime-city-map.js`, school files, or existing map data.
