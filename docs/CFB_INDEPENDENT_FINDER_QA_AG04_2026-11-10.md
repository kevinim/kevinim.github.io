# AG 04 — Independent CFB Finder vs GIS QA

**Checked:** 2026-11-10. **Official:** https://www.cfbisd.edu/students/school-maps-locator-system

## Source baseline and actual counts

- PR #204/#206/#207 merged (Finder manual bridge/live Pages smoke).
- PR #208 is Draft. 2025–26 approved E/M/H raster maps are *illustrations*,
  not school-level GIS. Its Texas Legislative Council 2025–26 polygons are
  district jurisdiction outlines only (CFB, Dallas, Lewisville).
- The elementary scratch reconstruction has 14 roughly placed control points,
  **zero independently validated anchors**, ~356.4 m fit RMS, and ~601.9 m p95.
  No elementary/middle/high school polygon is certified for an actual home.
- **Corrected after inspecting the actual Nov 10 Actions job log**:
  PR #208's latest native-autocomplete advisory run #42894866573
  **reconfirmed both existing public properties (2/2)**. Its run log records
  exact native selections and the E/M/H school comparisons matched for both.
  Earlier 0/2 statements reflected a stale probe and were incorrect.
  This is direct official Finder UI evidence, not reconstructed polygon proof.
- Existing #208 current Finder browser observation: **2 public properties**,
  elementary **2/2**, middle **2/2**, high **2/2** (six grade results).
- AG 04 has now added a **separately implemented real Chromium Finder verifier**
  (`scripts/cfb-independent-live-finder.cjs`), wired to free PR CI.
  Its fresh independent run should be interpreted from that job's evidence,
  not assumed successful until the live job has completed.
- **Independent school-zone geometry comparisons: 0**, because AG03 polygons
  are unverified. Geometry PASS **0**, FAIL **0**, and boundary-adjacent failure
  list **not yet measurable**. Geometry accuracy is **undefined**.

## Approved one-at-a-time manual Finder procedure

1. Use only an independently public, documentable property (school campus or
   advertised apartment-complex base); never collect a resident/student,
   unit number, or personal address. Prioritize **opposite sides of known split
   school boundaries**, not guessed border positions.
2. Open the official district School Search link. Note displayed school year.
   Focus GuideK12's native **address field**, then type the public property
   location as a person would. Wait for *address suggestions*.
3. Click the **exact native suggestion**. Check city/street matches the public
   property. If not present, mark WARNING / ADDRESS /
   NO_EXACT_NATIVE_AUTOCOMPLETE_SELECTION. Do not treat typing, Enter, or
   Find on Map by itself as choosing a valid property.
4. Only read an actual result card explicitly labeled **Assigned school**.
   Record elementary, middle, high separately; exclude special program schools
   unless the ordinary grade assignment is explicitly shown. A heading
   **Matching Results**, a generic district school list, or an independently
   selected campus marker is **not** an address-specific result.
5. Continue across other properties if the provider errors, one grade is missing,
   or autocomplete gives no exact match. Classify failures as FINDER, ADDRESS,
   SCHOOL_YEAR, or GEOMETRY; unknown cases stay WARNING.
6. Screenshots, operator notes, and address entry remain temporary/local,
   **never Git-committed**. Do not query private APIs, harvest address lists,
   or automate bulk official provider lookups.

**Root cause of past recheck:** programmatic fill can show the all-campus
Matching Results catalog. PR #208 added sequential typing and native
suggestion clicking; the current Nov 10 log confirms **2/2**. AG04 now performs
its own bounded live browser recheck and separately records E/M/H counts.
This independent tool refuses to count generic catalog entries as assignments.

## Offline reproducible QA

- Offline evaluator: scripts/cfb-independent-finder-qa.cjs
- Offline tests: tests/cfb-independent-finder-qa.test.cjs
- Independent live Chromium validator: scripts/cfb-independent-live-finder.cjs
  (exactly the two previously public fixture addresses, sequential
  keyboard input, exact native candidate selection, explicit Assigned school,
  redacted per-grade comparison, no hidden API/bulk queries).
- No browser scraping or network calls; only manually confirmed evidence and
  AG 03's *ephemeral*, non-production polygon artifact are read.
- A case uses a non-identifying ID (e.g. PUBLIC-campusA), assetType of
  public-campus / public-complex-base, an independently verified GeoJSON-order
  public longitude/latitude point, an exact selected candidate flag, dated
  operator confirmation, and assigned E/M/H values. Do not put any actual
  address/coordinates in this repository or CI logs.
- The tool redacts coordinates, school names and provider URLs from output,
  rejects common private address/student/unit keys, never modifies AG 03 GIS,
  and never promotes a polygon or production release gate.
- Each grade independently returns PASS / FAIL / WARNING. Only independently
  certified same-year non-ambiguous polygons can PASS. AG 03's unverified
  geometry returns WARNING even when names agree. Complex-base locations and
  points within **250m** of any zone boundary remain WARNING.

### Commands

~~~sh
node --test tests/cfb-independent-finder-qa.test.cjs
node scripts/cfb-independent-finder-qa.cjs

# AFTER an operator has collected public-evidence-only data outside Git:
node scripts/cfb-independent-finder-qa.cjs \
  --observations /tmp/cfb-public-observations.json \
  --geometry artifacts/cfb-reconstruction/cfb-elementary-draft-unverified.geojson \
  --output /tmp/cfb-independent-qa-redacted.json
~~~

### Schema (synthetic illustration, NOT actual Finder evidence)

~~~json
[
  {
    "id": "SYN-demo1",
    "assetType": "synthetic",
    "point": [0.003, 0.003],
    "candidate": {"selected": true, "exactMatch": true},
    "evidence": {"operatorConfirmed": true, "date": "2026-11-10"},
    "finder": {
      "view": "assigned-school",
      "schoolYear": "2026-27",
      "assigned": {
        "elementary": "EXAMPLE Elementary",
        "middle": "EXAMPLE Middle School",
        "high": "EXAMPLE High School"
      }
    }
  }
]
~~~

Synthetic test fixtures are software checks only. They do not produce real
certification metrics. Record real evidence outside the repository.

## Release decisions

| Feature or geographic scope | Decision | Reason |
| --- | --- | --- |
| Existing opt-in official Finder manual UI (#204) | CONDITIONAL GO as currently deployed | Manual only, no native auto-assignment |
| Original raster zone map atlas (#208) | Reference-only, Draft | No georeferenced per-school layer |
| CFB/Dallas/Lewisville ISD outer district GIS (#208) | Reference-only, Draft | Not E/M/H zone geometry |
| Elementary school zone reconstruction | HOLD | ~356m draft fit; 0 current Finder geometry holdouts |
| Middle school zone reconstruction | HOLD | 0 validated school polygons |
| High school zone reconstruction | HOLD | 0 validated school polygons |
| Residence to automatically assigned E/M/H schools | NO-GO | No matching-year certified per-school GIS |

## AG 03 independent defect handoff

- QA-CFB-01 (GEOMETRY): supply campus-labelled, grade-specific E/M/H polygons
  with topological gap/overlap reports; district outline does not count.
- QA-CFB-02 (SCHOOL_YEAR): prove that official 2025–26 illustrated borders
  represent the same attendance plan as current GuideK12 school-year context.
- QA-CFB-03 (GEOMETRY): remeasure 8+ independently checked street/road control
  points per grade and validate **edge** residuals; 356m RMS not home-grade safe.
- QA-CFB-04 (FINDER/ADDRESS): **corrected: 2/2 reconfirmed in PR #208 run
  #42894866573**; ensure the independent AG04 live job reproduces this.
  Only exact native candidate + Assigned school labels count.
- QA-CFB-05 (GEOMETRY): paired opposite-side zone border samples, 250m
  ambiguity guard, and split-feeder exceptions required before promotion.

No changes to AG 03's polygons, mapping files, live UI, or production gates.

## Corrections and audit trace (Nov 10, 2026)

The original AG04 PR #209 description and PR #208 handoff comment were
written before inspecting the full newest live job log. They incorrectly
reported the **old** 0/2 outcome. The observed GitHub Actions log
[run #42894866573](https://github.com/kevinim/kevinim.github.io/actions/runs/42894866573)
contains `TWO_EXISTING_PUBLIC_FINDER_FIXTURES_RECONFIRMED`, `found:2`,
`matched:2`, `exact:true` for each sample. AG04's independent browser
test is distinct from PR #208's previous code and reads no private API.
This correction does **not** imply that apartment unit assignments or any
E/M/H zone polygon have been certified.
