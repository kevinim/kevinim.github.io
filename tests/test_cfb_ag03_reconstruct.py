#!/usr/bin/env python3
"""Offline AG03 reconstruction/geometry regression tests. No network or addresses."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from shapely.geometry import Polygon, mapping

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cfb_ag03", ROOT / "scripts/cfb-ag03-reconstruct.py")
ag = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ag)


def cps(n=8):
    # Synthetic raster affine. 1 image pixel = ~10 meters; valid Carrollton area.
    return [{"pixel": [x, y], "latlon": [32.94 - y * 0.00009, -96.94 + x * 0.00011]}
        for x,y in [(10,10),(90,10),(10,90),(90,90),(50,50),(30,60),(70,30),(20,80)][:n]]


class TestAg03(unittest.TestCase):
    def test_valid_affine_and_projective(self):
        for method in ("affine", "projective"):
            project, report = ag.fit_transform(cps(), method)
            self.assertLess(report["trainRmsMeters"], 0.05)
            lon, lat = project([[10, 10]])[0]
            self.assertAlmostEqual(lon, -96.9389, places=5)
            self.assertAlmostEqual(lat, 32.9391, places=5)

    def test_degenerate_calibration_rejected(self):
        config = {"level":"middle", "rasterPixelSize":[100,100], "controlPoints":cps()}
        self.assertEqual(len(ag.control_points(config, [100,100])), 8)
        with self.assertRaises(ValueError):
            ag.control_points(config, [101,100])
        with self.assertRaises(ValueError):
            ag.fit_transform([cps()[0]] * 8, "affine")

    def test_source_guards(self):
        district = {"metadata":{"notSchoolAttendanceZones":True},"features":[{
            "properties":{"districtCode":"057903"}, "geometry": mapping(Polygon([
                (-97,32.8),(-96.8,32.8),(-96.8,33.1),(-97,33.1)]))}]}
        source = {"district":"CFB","approvedSchoolYear":"2025-26", "georeferenced":False,
            "validForAutomaticResidenceAssignment":False,"maps":[{
                "level":level,"url":"https://resources.finalsite.net/images/test-" + level}
                for level in ag.LEVELS]}
        maps, geom = ag.validate_sources(source, district)
        self.assertEqual(len(maps), 3)
        self.assertGreater(geom.area, 0)
        source["validForAutomaticResidenceAssignment"] = True
        with self.assertRaises(ValueError):
            ag.validate_sources(source, district)

    def test_crosswalk_requires_evidence_and_existing_tea_identity(self):
        by_id={"057903111":{"schoolName":"Thompson","teaCampusId":"057903111"}}
        self.assertEqual(ag.validate_review({"elementary":{}}, "elementary", by_id), {})
        with self.assertRaises(ValueError):
            ag.validate_review({"elementary":{"0":{"teaCampusId":"NOPE","reviewStatus":"human_label_read_unverified_zone","evidence":"visual"}}}, "elementary", by_id)
        with self.assertRaises(ValueError):
            ag.validate_review({"elementary":{"0":{"teaCampusId":"057903111"}}}, "elementary", by_id)

    def test_three_grade_outputs_and_topology_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            pixel_dir = tmp/"pixel"
            pixel_dir.mkdir()
            out = tmp/"output"
            fake_manifest = tmp/"manifest.json"
            page="https://www.cfbisd.edu/school-zone"
            fake_manifest.write_text(json.dumps({"sourcePage":page}))
            urls = {level:{"url":"https://resources.finalsite.net/images/" + level} for level in ag.LEVELS}
            rectangle = [[20,20],[80,20],[80,80],[20,80]]
            overlap = [[50,20],[95,20],[95,75],[50,75]]
            # Bowtie/self-intersecting ring deliberately must be rejected.
            invalid = [[20,20],[80,80],[20,80],[80,20]]
            for level in ag.LEVELS:
                source = {"source":urls[level]["url"],"level":level,"publisherImageYear":"2025-26",
                    "coordinateReference":"image_pixels_only","publishable":False,
                    "imageSize":[100,100],"contours":[{
                        "colorCluster":n,"imagePixelRing":ring} for n, ring in enumerate((rectangle, overlap, invalid))]}
                ag.write(pixel_dir/("pixel-contours-" + level + ".json"), source)
            boundary = Polygon([(-97.0,32.85),(-96.80,32.85),(-96.80,33.05),(-97,33.05)])
            roster = {level:["Thompson"] for level in ag.LEVELS}
            tea = [{"district":"CFB","name":"THOMPSON EL","officialName":"THOMPSON EL","id":"057903111"}]
            cal = {"level":"elementary", "rasterPixelSize":[100,100],
                "controlPoints":cps(),"verifiedPixelAnchors":0}
            with patch.object(ag,"MANIFEST",fake_manifest):
                e = ag.reconstruct_grade("elementary",pixel_dir=pixel_dir,output_dir=out,
                    maps=urls,district=boundary,calibration=cal,roster=roster,tea_rows=tea,
                    review={"elementary":{}},method="affine")
                m = ag.reconstruct_grade("middle",pixel_dir=pixel_dir,output_dir=out,
                    maps=urls,district=boundary,calibration=None,roster=roster,tea_rows=tea,
                    review={"middle":{}},method="affine")
                h = ag.reconstruct_grade("high",pixel_dir=pixel_dir,output_dir=out,
                    maps=urls,district=boundary,calibration=None,roster=roster,tea_rows=tea,
                    review={"high":{}},method="affine")
            self.assertEqual(e["draftGeographicFragments"],2)
            self.assertEqual(e["geometryRejected"]["invalid_geometry"],1)
            self.assertGreater(e["geometryTopology"]["fragmentAreaOvercountApproxSqKm"],0)
            self.assertEqual(e["mappedCampusCount"],0)
            self.assertEqual(e["blocker"],"INSUFFICIENT_INDEPENDENT_VERIFIED_ANCHORS")
            self.assertEqual(m["draftGeographicFragments"],0)
            self.assertEqual(h["blocker"],"AG02_CALIBRATION_MISSING")
            for level in ag.LEVELS:
                saved=ag.read(out/("cfb-" + level + "-DRAFT_UNVERIFIED.geojson"))
                self.assertEqual(saved["metadata"]["status"],ag.STATUS)
                self.assertFalse(saved["metadata"]["residentialAssignmentEnabled"])
                self.assertTrue(all(not f["properties"]["releaseEligible"] for f in saved["features"]))

    def test_untrusted_pixel_raster_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            ag.write(root/"pixel-contours-middle.json",
                {"source":"https://invalid.example/map","level":"middle",
                 "publisherImageYear":"2025-26","coordinateReference":"image_pixels_only",
                 "publishable":False,"imageSize":[100,100],"contours":[]})
            with self.assertRaises(ValueError):
                ag.reconstruct_grade("middle",pixel_dir=root,output_dir=root/"out",
                    maps={"middle":{"url":"https://resources.finalsite.net/images/middle"}},
                    district=Polygon([(-97,32.9),(-96.9,32.9),(-96.9,33),(-97,33)]),
                    calibration=None,roster={"middle":[]},tea_rows=[],review={"middle":{}})


if __name__ == "__main__":
    unittest.main()
