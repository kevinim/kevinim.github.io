#!/usr/bin/env python3
"""Synthetic boundary-nearness tests; never a residential enrollment decision."""
import sys
import unittest
from pathlib import Path
from shapely.geometry import box
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from denton_geopdf_edge_review import (projected_boundaries,margin_meters,
 EDGE_REVIEW_DISTANCE_METERS,classify_margin)

class TestDerivedBoundarySafety(unittest.TestCase):
    def setUp(self):
        self.boundaries=projected_boundaries([box(-97.20,33.20,-97.18,33.22)])
    def test_street_center_is_not_parcel_certification(self):
        distance=margin_meters(-97.19,33.21,self.boundaries)
        self.assertGreater(distance,EDGE_REVIEW_DISTANCE_METERS)
        self.assertEqual(classify_margin(distance),"STREET_SAMPLE_INTERIOR_NOT_PARCEL_CERTIFIED")
    def test_near_edge_requires_finder_and_parcel(self):
        distance=margin_meters(-97.1998,33.21,self.boundaries)
        self.assertLess(distance,EDGE_REVIEW_DISTANCE_METERS)
        self.assertEqual(classify_margin(distance),"NO_GO_BOUNDARY_ADJACENT_NEEDS_PARCEL_AND_FINDER_REVIEW")
    def test_missing_distance_fails_closed(self):
        self.assertIsNone(margin_meters(float('nan'),33.21,self.boundaries))
        self.assertIsNone(margin_meters(-97.19,33.21,[]))
        self.assertEqual(classify_margin(None),"NO_GO_BOUNDARY_PROXIMITY_UNAVAILABLE")
        self.assertEqual(classify_margin(-1),"NO_GO_BOUNDARY_PROXIMITY_UNAVAILABLE")
if __name__=="__main__":unittest.main()
