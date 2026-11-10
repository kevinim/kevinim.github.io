import unittest
from shapely.geometry import Polygon
from scripts.denton_geopdf_edge_sensitivity_qa import edge_sensitivity, classify_margin, source_guard

class EdgeSensitivityTest(unittest.TestCase):
    def test_synthetic_square_offsets_and_edge_categories(self):
        g=Polygon([(0,0),(1000,0),(1000,1000),(0,1000)])
        r=edge_sensitivity(g)
        self.assertGreater(r["syntheticEdgeOffsetChecks"],0)
        self.assertEqual(r["syntheticEdgeOffsetChecks"],
            sum(r["countsByStep"].values()))
        self.assertEqual(classify_margin(5),"EDGE_ADJACENT_STRICT_HOLD")
        self.assertEqual(classify_margin(60),"NEAR_EDGE_REVIEW_HOLD")
        self.assertEqual(classify_margin(190),"STREET_INTERIOR_NONPARCEL_CHECK_ONLY")
        self.assertEqual(classify_margin(400),"STREET_FAR_INTERIOR_NONPARCEL_CHECK_ONLY")
        self.assertEqual(classify_margin(None),"SOURCE_POINT_UNAVAILABLE")

    def test_derived_gis_never_passes_license_or_school_year_gate(self):
        def feature():
            return {"type":"Feature","properties":{"level":"elementary",
                "schoolYear":"2026-27","campusId":"061901101",
                "approvedForProduction":False,"reusePermissionVerified":False,
                "officialOriginalGIS":False},
                "geometry":{"type":"Polygon","coordinates":[[
                    [-97.1,33.1],[-97.0,33.1],[-97.0,33.2],[-97.1,33.1]]]}}
        payload={"type":"FeatureCollection",
            "metadata":{"productionStatus":"NO_GO","officialGIS":False,
                "reuseAndRedistributionPermissionVerified":False,
                "originalDistrictGISReceived":False},"features":[feature()]}
        self.assertEqual(len(source_guard(payload,"elementary",1)),1)
        payload["features"][0]["properties"]["approvedForProduction"]=True
        with self.assertRaises(AssertionError):source_guard(payload,"elementary",1)

if __name__=="__main__":unittest.main()
