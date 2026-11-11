#!/usr/bin/env python3
"""Synthetic-only public parcel match and confidential-attribute guard."""
import sys
import unittest
from pathlib import Path
from shapely.geometry import box, mapping
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from denton_geopdf_public_parcel_qa import privacy_safe_lookup,parcel_match
BASE={"situsStreetNumb":"1800","situsStreetName":"BUENA VISTA",
      "situsCity":"DENTON","confidential":0}
def feature(polygon, attrs=None):
    return {"type":"Feature","properties":dict(BASE if attrs is None else attrs),
      "geometry":mapping(polygon)}
class TestPublicParcel(unittest.TestCase):
    def setUp(self):
        self.small=box(-97.15,33.15,-97.149,33.151)
        self.zone=box(-97.16,33.14,-97.14,33.16)
    def test_only_exact_one_nonconfidential_parcel(self):
        g,status=privacy_safe_lookup([feature(self.small)])
        self.assertIsNotNone(g)
        self.assertEqual(status,"PUBLIC_CAD_PARCEL_APPROXIMATE_GEOMETRY_ONLY")
        for batch in ([],[feature(self.small),feature(self.small)]):
            g,status=privacy_safe_lookup(batch)
            self.assertIsNone(g);self.assertTrue(status.startswith("NO_GO_"))
    def test_confidential_unknown_or_wrong_city_fails_closed(self):
        for attrs in ({**BASE,"confidential":1},{**BASE,"confidential":None},
                      {**BASE,"situsCity":"CARROLLTON"}):
            self.assertIsNone(privacy_safe_lookup([feature(self.small,attrs)])[0])
    def test_whole_parcel_containment_but_no_enrollment(self):
        zones=[{"properties":{"campusId":"061901106"},"geometry":mapping(self.zone)}]
        result=parcel_match(self.small,"061901106",zones)
        self.assertEqual(result["status"],"PARCEL_INTERIOR_DERIVED_PDF_NOT_ENROLLMENT_CERTIFIED")
        self.assertGreater(result["approximateParcelToDerivedZoneBoundaryMeters"],0)
        crossing=box(-97.141,33.15,-97.139,33.151)
        bad=parcel_match(crossing,"061901106",zones)
        self.assertTrue(bad["status"].startswith("NO_GO_"))
    def test_public_parcel_near_derived_boundary_is_not_approved(self):
        near=box(-97.1407,33.150,-97.1401,33.151)
        zones=[{"properties":{"campusId":"061901041"},"geometry":mapping(self.zone)}]
        actual=parcel_match(near,"061901041",zones)
        self.assertEqual(actual["status"],
          "NO_GO_CAD_PARCEL_WITHIN_100M_DERIVED_ATTENDANCE_BOUNDARY")
        self.assertLess(actual["approximateParcelToDerivedZoneBoundaryMeters"],100.0)
        self.assertEqual(actual["nearBorderThresholdMeters"],100.0)
    def test_other_campus_overlap_blocks(self):
        zones=[{"properties":{"campusId":"061901106"},"geometry":mapping(self.zone)},
          {"properties":{"campusId":"061901107"},"geometry":mapping(self.small)}]
        self.assertEqual(parcel_match(self.small,"061901106",zones)["status"],
          "NO_GO_PARCEL_INTERSECTS_COMPETING_SCHOOL_ZONE")
if __name__=="__main__":unittest.main()
