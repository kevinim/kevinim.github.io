#!/usr/bin/env python3
"""AG03 independent evidence audit: source-text checks are NOT campus GIS certification.

Read only approved CFB source manifest, the 2026 TEA campus identity registry,
officially published 2025–26 narrative change citations, and research-only AG03
E/M/H artifacts. Fail closed on invalid/missing geometry, year, or source claims.
No network, no residential addresses, no UI or auto-assignment changes.
"""
import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEVELS = ("elementary", "middle", "high")
REGISTRY = ROOT / "data/cfb-ag03-official-narrative-evidence-2025.json"
ROSTER = ROOT / "data/cfb-ag03-zone-roster-review.json"
TEA = ROOT / "tea-ratings-2026.json"
MANIFEST = ROOT / "data/cfb-approved-zone-raster-reference-2026.json"
OUT = ROOT / "artifacts/cfb-ag03"


def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def identity(name):
    # Deliberate controlled CFB aliases; each maps district source wording to
    # a specific 2026 TEA campus name. Identity is NOT zone membership.
    alias = {
        "Thompson Elementary":"THOMPSON EL","Blalack Middle School":"BLALACK MIDDLE",
        "Creekview High School":"CREEKVIEW H S","Carrollton Elementary":"CARROLLTON EL",
        "Newman Smith High School":"SMITH H S","Blanton Elementary":"BLANTON EL",
        "Perry Middle School":"PERRY MIDDLE","Blair Elementary":"BLAIR EL",
        "Stark Elementary":"STARK EL","Rainwater Elementary":"RAINWATER EL",
        "Rosemeade Elementary":"ROSEMEADE EL","Country Place Elementary":"COUNTRY PLACE EL",
    }
    return alias.get(name, name)


def verify_text_evidence(evidence, tea_rows, manifest):
    if (evidence.get("district") != "CFB" or evidence.get("sourceEffectiveSchoolYear") != "2025-26"
        or manifest.get("approvedSchoolYear") != "2025-26"
        or evidence.get("automaticAssignmentAllowed") is not False
        or evidence.get("currentYear2026_27PolygonVerified") is not False):
        raise ValueError("Narrative-source-year or release gate mismatch")
    if evidence["sourceUrl"] != manifest["sourcePage"]:
        raise ValueError("Cross-referenced source differs from approved district source")
    campuses = {r["id"]:r for r in tea_rows if r.get("district") in ("CFB","057903")}
    pairings, seen, problems = [], set(), []
    for row in evidence["cases"]:
        key = (row.get("area"),row.get("grade"))
        if key in seen:
            raise ValueError("Conflicting school labels for same named area/grade")
        seen.add(key)
        if row.get("grade") not in LEVELS or row.get("schoolYear") != "2025-26" or row.get("sourceUrl") != manifest["sourcePage"]:
            raise ValueError("Unsupported grade/year/source in narrative claim")
        if not (row.get("evidenceSection") and row.get("status") == "OFFICIAL_NARRATIVE_CROSS_REFERENCED"):
            raise ValueError("Missing manually reviewed source text location")
        if any(row.get(f) is not False for f in ("finderResidenceVerified","currentYear2026_27Verified","georeferencedPolygonCertified","automaticAssignmentEligible")):
            raise ValueError("Narrative source falsely asserts a residential/GIS certification")
        match = campuses.get(row.get("teaId"))
        if not match or identity(row["school"]).lower() != (match.get("officialName") or match.get("name")).lower():
            problems.append({"case":row.get("id"),"error":"TEA identity mismatch"})
        pairings.append({"case":row["id"],"area":row["area"],"grade":row["grade"],
            "school":row["school"],"teaId":row["teaId"],
            "scope":"CFB_2025_26_DISTRICT_NARRATIVE_ONLY",
            "status":"SOURCE_TEXT_SUPPORTED_NOT_GEOMETRY_VERIFIED",
            "AG04FinderResidenceCheckRequired":True})
    if problems:
        raise ValueError("Failed TEA identity checks: "+json.dumps(problems))
    conflicts = evidence.get("discrepancies",[])
    for c in conflicts:
        if (len(c.get("sourceUrls",[])) < 2 or
                c.get("status") != "PUBLISHED_PAGES_CONFLICT_NO_ADDRESS_CERTIFICATION"):
            raise ValueError("Conflicting official district source not disclosed")
    return {"district":"CFB","schoolYear":"2025-26","officialTextCases":len(pairings),
        "verifiedCampusIdentityCrossReferences":len(pairings),
        "sourceConflicts":len(conflicts),
        "sourceConflictCaseIds":[c["id"] for c in conflicts],
        "reviewedNarrativePairings":pairings,
        "scope":"DISTRICT_WEBPAGE_CROSSCHECK_ONLY",
        "certified2026_27ResidentialAddresses":0,"certifiedCampusGeoJSONPolygons":0}


def audit_geometry(geo_dir, manifest):
    reports = []
    expected = {m["level"]:m["url"] for m in manifest["maps"]}
    for level in LEVELS:
        p = Path(geo_dir) / ("cfb-" + level + "-DRAFT_UNVERIFIED.geojson")
        qa = Path(geo_dir) / ("cfb-" + level + "-coverage-qa.json")
        if not p.is_file() or not qa.is_file():
            reports.append({"grade":level,"status":"NO_GEOJSON_QA_ARTIFACT",
                "draftFragments":0,"certifiedCampusPolygons":0,"reason":"Artifacts missing; release blocked"})
            continue
        data, coverage = load(p), load(qa)
        meta = data.get("metadata",{})
        if (data.get("type") != "FeatureCollection" or meta.get("status") != "DRAFT_UNVERIFIED_VISUAL_ONLY"
            or meta.get("schoolYear") != "2025-26" or meta.get("sourceUrl") != expected[level]
            or meta.get("residentialAssignmentEnabled") is not False
            or coverage.get("productionReady") is not False or coverage.get("currentYear2026_27Verified") is not False):
            raise ValueError("Untrusted draft GeoJSON/QA provenance: "+level)
        labeled = 0
        for feature in data["features"]:
            prop = feature.get("properties",{})
            if (prop.get("geometryStatus") != "DRAFT_UNVERIFIED_VISUAL_ONLY"
                or prop.get("releaseEligible") is not False
                or prop.get("liveFinderChecked") is not False
                or prop.get("isOfficialCampusBoundary") is not False
                or prop.get("validForAutomaticResidenceAssignment") is not False):
                raise ValueError("Draft feature falsely promoted: "+level)
            if prop.get("schoolName") and prop.get("teaCampusId"):
                labeled += 1
        reports.append({"grade":level,"status":"DRAFT_UNVERIFIED_VISUAL_ONLY",
            "draftFragments":len(data["features"]), "labeledUnverifiedFragments":labeled,
            "certifiedCampusPolygons":0,
            "verifiedCalibrationControls":(coverage.get("calibration") or {}).get("verifiedPixelAnchors",0),
            "finderGeometryMatches":coverage.get("finderGeometryMatches",0),
            "reason":coverage.get("blocker"),
            "topology":coverage.get("geometryTopology"),
            "missingCampusBoundaryCandidates":len(coverage.get("missingCampusBoundaryCandidates",[]))})
    return reports


def certification_report(registry, tea, manifest, geo_dir):
    narrative = verify_text_evidence(registry, tea, manifest)
    geometry = audit_geometry(geo_dir, manifest)
    return {
        "reportType":"AG03_INDEPENDENT_CERTIFICATION_READINESS_NOT_OFFICIAL_DISTRICT_ISSUED_CERTIFICATE",
        "schoolYearEvidence":"2025-26","currentYear2026_27GeometryUnverified":True,
        "evidenceTiers":{
            "districtPublishedNarrative":{"status":"SOURCE_TEXT_CROSS_REFERENCED","count":narrative["officialTextCases"]},
            "TEACampusIdentity":{"status":"CAMPUS_IDENTITY_MATCH_ONLY","crossReferences":narrative["verifiedCampusIdentityCrossReferences"]},
            "GISCampusZone":{"status":"NOT_CERTIFIED","count":0},
            "GuideK12CurrentResidence":{"status":"NOT_CERTIFIED","count":0}
        },
        "narrative":narrative,"geometry":geometry,
        "releaseDecision":"NO_GO_AUTOMATED_SCHOOL_ASSIGNMENT",
        "label":"DRAFT_UNVERIFIED_VISUAL_ONLY",
        "constraints":{"autoAssignmentEnabled":False,"GISPublishApproved":False,
            "doNotClaim2026_27OfficialPolygon":True},
        "nextEvidenceNeeded":[
            "AG02 8 independently verified fit road controls AND 3 separate holdouts per grade with source coordinates",
            "AG03 per-school raster label -> campus TEA mapping with visual evidence and resolved topology",
            "AG04 actual native GuideK12 exact property selection, per-grade school agreement and boundary clearance",
            "Current-school-year equivalence and source reuse/redistribution permission assessment",
        ]
    }


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--geojson-dir",type=Path,default=OUT)
    p.add_argument("--out",type=Path,default=OUT/"cfb-ag03-certification-readiness.json")
    a=p.parse_args(argv)
    report=certification_report(load(REGISTRY),load(TEA)["data"],load(MANIFEST),a.geojson_dir)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("CFB_AG03_CERTIFICATION_READINESS "+json.dumps({
        "narrative":report["narrative"]["officialTextCases"],
        "conflicts":report["narrative"]["sourceConflicts"],
        "districtGISCertified":0,"geometry":{x["grade"]:x["draftFragments"] for x in report["geometry"]},
        "releaseDecision":report["releaseDecision"]
    }))
    return report

if __name__=="__main__":
    main()
