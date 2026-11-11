#!/usr/bin/env python3
"""Conservative STAGING-only proximity checks for *derived* Denton PDF boundaries.

A street-interpolated Census point near a boundary cannot establish the side
of an actual parcel, even if its school agrees with the district Finder.
All outcomes remain NOT authorized for residential school enrollment.
"""
import math
from pyproj import Transformer
from shapely.geometry import Point
from shapely.ops import transform

EDGE_REVIEW_DISTANCE_METERS = 250.0
_TX_UTM14 = Transformer.from_crs("EPSG:4326", "EPSG:32614", always_xy=True)

def projected_boundaries(geometries):
    return [transform(_TX_UTM14.transform, geom).boundary for geom in geometries
            if geom is not None and not geom.is_empty]

def margin_meters(lon, lat, boundaries):
    if not (isinstance(lon, (float, int)) and isinstance(lat, (float, int))
            and math.isfinite(lon) and math.isfinite(lat)
            and -98.5 < lon < -96.0 and 32 < lat < 34):
        return None
    if not boundaries:
        return None
    pt = transform(_TX_UTM14.transform, Point(lon, lat))
    return round(min(b.distance(pt) for b in boundaries), 1)

def classify_margin(distance):
    if distance is None or not math.isfinite(distance) or distance < 0:
        return "NO_GO_BOUNDARY_PROXIMITY_UNAVAILABLE"
    if distance < EDGE_REVIEW_DISTANCE_METERS:
        return "NO_GO_BOUNDARY_ADJACENT_NEEDS_PARCEL_AND_FINDER_REVIEW"
    return "STREET_SAMPLE_INTERIOR_NOT_PARCEL_CERTIFIED"
