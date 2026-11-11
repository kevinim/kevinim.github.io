#!/usr/bin/env python3
"""Regression checks for Denton PDF forensic PoC; synthetic PDF only."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import fitz

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("denton_pdf_poc",ROOT/"scripts/denton_pdf_vector_poc.py")
poc=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(poc)


class TestDentonPDFPoC(unittest.TestCase):
    def test_expected_levels_match_published_denton_roster(self):
        self.assertEqual(poc.COUNT,{"high":4,"middle":9,"elementary":26})
        self.assertEqual(set(poc.SOURCES),set(poc.COUNT))
        for url in poc.SOURCES.values():
            self.assertEqual(__import__("urllib.parse",fromlist=["urlparse"]).urlparse(url).hostname,
                             "resources.finalsite.net")
            self.assertIn("26-27",url)

    def test_simple_rectangle_vector_candidate_is_pdf_local_only(self):
        d={"items":[("re",fitz.Rect(10,20,70,55),1)],
           "closePath":True,"fill":(.8,.6,.4)}
        rings=poc.split_path_into_closed_rings(d)
        self.assertEqual(len(rings),1)
        self.assertEqual(rings[0][0],rings[0][-1])
        self.assertEqual(len(rings[0]),5)
        self.assertTrue(poc.possibly_zone_fill(d["fill"]))

    def test_nonclosed_path_is_not_silently_converted_to_polygon(self):
        d={"items":[("l",fitz.Point(1,1),fitz.Point(20,10)),
                    ("l",fitz.Point(20,10),fitz.Point(40,20))],
           "closePath":False,"fill":(.9,.4,.5)}
        self.assertEqual(poc.split_path_into_closed_rings(d),[])

    def test_pdf_forensic_audit_has_no_fake_geographic_coordinates(self):
        with tempfile.TemporaryDirectory() as temp:
            doc=fitz.open()
            page=doc.new_page(width=1200,height=900)
            shape=page.new_shape()
            shape.draw_rect(fitz.Rect(100,100,700,650))
            shape.finish(fill=(.85,.4,.7),color=None)
            shape.commit()
            page.insert_text((100,80),"Synthetic school zone example, not real GIS")
            raw=doc.tobytes()
            stats=poc.inspect_one("high",raw,Path(temp))
            self.assertGreater(stats["nativeDrawingPaths"],0)
            self.assertGreaterEqual(stats["fillDrawingPaths"],1)
            self.assertFalse(stats["WGS84GeoJSONProduced"])
            self.assertFalse(stats["extractedGISApproved"])
            candidate=json.loads((Path(temp)/"high-pdf-local-vector-candidates.json").read_text())
            self.assertIsNone(candidate["epsg"])
            self.assertEqual(candidate["certifiedCurrentYearSchoolPolygons"],0)
            self.assertFalse(candidate["officialGIS"])
            self.assertEqual(candidate["coordinateSystem"],"PDF_PAGE_POINTS_Y_DOWN_NOT_GEOGRAPHIC")


if __name__=="__main__":
    unittest.main()
