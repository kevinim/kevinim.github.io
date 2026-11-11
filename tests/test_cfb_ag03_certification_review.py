#!/usr/bin/env python3
"""AG03 certification guard tests: never infer residential boundary from source text."""
import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("ag03cert",ROOT/"scripts/cfb-ag03-certification-review.py")
a=importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)


class CertificationGuards(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.e=a.load(a.REGISTRY)
        cls.manifest=a.load(a.MANIFEST)
        cls.tea=a.load(a.TEA)["data"]

    def test_all_official_source_cases_have_unique_valid_tea_ids(self):
        result=a.verify_text_evidence(self.e,self.tea,self.manifest)
        self.assertEqual(result["officialTextCases"],14)
        self.assertEqual(result["sourceConflicts"],2)
        self.assertEqual(result["certified2026_27ResidentialAddresses"],0)
        self.assertEqual(result["certifiedCampusGeoJSONPolygons"],0)

    def test_reject_duplicate_or_conflicting_assignment_by_area_grade(self):
        e=copy.deepcopy(self.e)
        e["cases"].append(copy.deepcopy(e["cases"][0]))
        e["cases"][-1]["school"]="Wrong School"
        with self.assertRaises(ValueError):
            a.verify_text_evidence(e,self.tea,self.manifest)

    def test_reject_automatic_residence_approval_from_neighborhood(self):
        e=copy.deepcopy(self.e)
        e["cases"][0]["automaticAssignmentEligible"]=True
        with self.assertRaises(ValueError):
            a.verify_text_evidence(e,self.tea,self.manifest)

    def test_reject_unapproved_source_and_future_year_claim(self):
        for key,value in [("sourceEffectiveSchoolYear","2026-27"),
                          ("automaticAssignmentAllowed",True),
                          ("currentYear2026_27PolygonVerified",True)]:
            e=copy.deepcopy(self.e)
            e[key]=value
            with self.assertRaises(ValueError):
                a.verify_text_evidence(e,self.tea,self.manifest)

    def test_conflicting_publisher_pages_remain_excluded(self):
        e=copy.deepcopy(self.e)
        e["discrepancies"][0]["status"]="CERTIFIED"
        with self.assertRaises(ValueError):
            a.verify_text_evidence(e,self.tea,self.manifest)

    def test_empty_geometry_fails_closed_even_when_narrative_source_matches(self):
        with tempfile.TemporaryDirectory() as td:
            report=a.certification_report(self.e,self.tea,self.manifest,Path(td))
            self.assertEqual(report["releaseDecision"],"NO_GO_AUTOMATED_SCHOOL_ASSIGNMENT")
            self.assertEqual(report["evidenceTiers"]["GISCampusZone"]["count"],0)
            self.assertEqual(len(report["geometry"]),3)
            self.assertTrue(all(x["status"]=="NO_GEOJSON_QA_ARTIFACT" for x in report["geometry"]))

    def test_draft_unverified_geometry_cannot_self_promote(self):
        with tempfile.TemporaryDirectory() as td:
            td=Path(td)
            level="elementary"
            source=next(m["url"] for m in self.manifest["maps"] if m["level"]==level)
            props={"geometryStatus":"DRAFT_UNVERIFIED_VISUAL_ONLY","releaseEligible":False,
                "liveFinderChecked":False,"isOfficialCampusBoundary":False,
                "validForAutomaticResidenceAssignment":False}
            geo={"type":"FeatureCollection","metadata":{"status":"DRAFT_UNVERIFIED_VISUAL_ONLY",
                "schoolYear":"2025-26","sourceUrl":source,"residentialAssignmentEnabled":False},
                "features":[{"type":"Feature","properties":props,"geometry":{"type":"Polygon",
                    "coordinates":[[[-96.9,32.9],[-96.8,32.9],[-96.8,33],[-96.9,33],[-96.9,32.9]]]}}]}
            q={"productionReady":False,"currentYear2026_27Verified":False,
                "finderGeometryMatches":0,"blocker":"FINDER_CROSSCHECK_NOT_COMPLETED"}
            (td/"cfb-elementary-DRAFT_UNVERIFIED.geojson").write_text(json.dumps(geo))
            (td/"cfb-elementary-coverage-qa.json").write_text(json.dumps(q))
            report=a.audit_geometry(td,self.manifest)
            self.assertEqual(report[0]["draftFragments"],1)
            self.assertEqual(report[0]["certifiedCampusPolygons"],0)
            geo["features"][0]["properties"]["releaseEligible"]=True
            (td/"cfb-elementary-DRAFT_UNVERIFIED.geojson").write_text(json.dumps(geo))
            with self.assertRaises(ValueError):
                a.audit_geometry(td,self.manifest)


if __name__=="__main__":
    unittest.main()
