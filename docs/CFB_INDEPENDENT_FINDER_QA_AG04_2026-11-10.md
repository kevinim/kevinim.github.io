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
- Two previously verified **public-property** Finder fixtures from November 7
  were not reconfirmed in the latest PR #208 advisory (0/2 conclusive).
  This is inconclusive UI evidence, not proof that their past school names changed.
- New independently recorded actual Finder results for AG 04: **0 properties**;
  elementary 0 / middle 0 / high 0. Certified GIS comparisons: **0**.
  Thus geometry PASS **0**, FAIL **0**, and boundary-adjacent failure list
  **not yet measurable**. Accuracy is **undefined**, not 100% or 0%.

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
suggestion clicking, but the most recent 2-case probe was still inconclusive.
This independent tool refuses to count generic catalog entries as assignments.

## Offline reproducible QA

- Evaluator: scripts/cfb-independent-finder-qa.cjs
- Tests: tests/cfb-independent-finder-qa.test.cjs
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
- QA-CFB-04 (FINDER/ADDRESS): old 2 public fixtures currently 0/2 confirmed;
  only exact native candidate + Assigned school labels count.
- QA-CFB-05 (GEOMETRY): paired opposite-side zone border samples, 250m
  ambiguity guard, and split-feeder exceptions required before promotion.

No changes to AG 03's polygons, mapping files, live UI, or production gates.
