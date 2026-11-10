#!/usr/bin/env python3
"""AG02 independent QA for georeferencing mathematics and release fail-closed policy."""
import importlib.util
import json
import sys
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("ag02", ROOT/"scripts/cfb-ag02-georeference-qa.py")
geo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(geo)


class TestCalibration(unittest.TestCase):
    def synthetic(self):
        pts = []
        for y in range(4):
            for x in range(5):
                xx, yy = 40+x*90, 50+y*120
                pts.append({"id": f"s{x}{y}", "pixel": [xx, yy],
                            "latlon": [32.9 + (320-1.3*xx-23*yy)/111320,
                                       -96.9 + (100+25*xx+.8*yy)/(111320*np.cos(np.radians(32.9)))]})
        return pts

    def test_affine_exact_synthetic(self):
        pts = self.synthetic()
        model = geo.fit(pts, "affine")
        self.assertLess(geo.rms(geo.residual_rows(model, pts, "synthetic")), 0.02)
        self.assertLess(geo.proxy_spatial_holdout(pts, "affine")["rmseMeters"], 0.02)

    def test_all_models_support_synthetic(self):
        pts = self.synthetic()
        for kind in ("affine", "projective", "quadratic"):
            with self.subTest(kind=kind):
                model = geo.fit(pts, kind)
                self.assertLess(geo.rms(geo.residual_rows(model, pts, "synthetic")), 0.05)

    def test_reject_degenerate_or_outside_region(self):
        repeated = [{"pixel": [5, 5], "latlon": [32.9, -96.9]} for _ in range(12)]
        for kind in ("affine", "projective", "quadratic"):
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                geo.fit(repeated, kind)
        bad = self.synthetic()
        bad[0]["latlon"] = [0, 0]
        with self.assertRaises(ValueError):
            geo.fit(bad, "affine")

    def test_existing_elementary_control_is_not_independently_verified(self):
        data = geo.load(ROOT/"data/cfb-elementary-raster-calibration-draft.json")
        self.assertEqual(data["sourceSchoolYear"], "2025-26")
        self.assertEqual(len(data["controlPoints"]), 14)
        self.assertTrue(all(p["pixelConfidence"] == "rough-visual" for p in data["controlPoints"]))
        self.assertEqual(sum(p.get("pixelVerified") is True for p in data["controlPoints"]), 0)

    def test_rough_leave_one_out_is_not_independent_ground_validation(self):
        pts = self.synthetic()
        score = geo.rough_leave_one_out(pts, "affine")
        self.assertEqual(score["count"], len(pts))
        self.assertLess(score["rmseMeters"], 0.05)
        # Actual independent residuals are scored after separately excluding the holdout.
        model = geo.fit(pts[:16], "affine")
        holdout = geo.residual_rows(model, pts[16:], "independent-vetted-holdout")
        self.assertLess(geo.rms(holdout), 0.05)
        self.assertEqual(len(holdout), 4)

    def test_feature_matching_blank_images_fail_closed(self):
        from PIL import Image
        blank = Image.new("RGB", (505, 609), (255, 255, 255))
        result = geo.cross_grade_candidates(blank, blank)
        self.assertEqual(result["status"], "NO_RELIABLE_CROSS_GRADE_MATCH")
        self.assertEqual(result["independentlyVerifiedControlPoints"], 0)

    def test_public_cdn_allowlist(self):
        with self.assertRaises(ValueError):
            geo.approved_image("https://example.com/elementary.jpg")
        with self.assertRaises(ValueError):
            geo.approved_image("http://resources.finalsite.net/images/cfb.jpg")


if __name__ == "__main__":
    unittest.main()
