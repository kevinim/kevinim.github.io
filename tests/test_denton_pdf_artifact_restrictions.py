#!/usr/bin/env python3
"""Review the *published artifact* allowlist independently of the staging GIS."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
WORKFLOW=(ROOT/".github/workflows/denton-pdf-vector-poc.yml").read_text()
PUBLIC_ALLOWED={
 "artifacts/denton-geopdf-derived/staging-integrity-report.json",
 "artifacts/denton-geopdf-derived/public-cad-parcel-check-STAGING.json"
}
class TestStagingArtifactGuard(unittest.TestCase):
 def test_only_non_geometry_status_reports_are_uploaded(self):
  self.assertEqual(WORKFLOW.count("actions/upload-artifact@"),1)
  area=WORKFLOW.split("      - name: Publish QA STATUS summaries only")[1]
  block=area.split("          path: |")[1].split("          retention-days:",1)[0]
  got={x.strip() for x in block.splitlines() if x.strip()}
  self.assertEqual(got,PUBLIC_ALLOWED)
  self.assertFalse(any(x.endswith((".geojson",".pdf",".png",".zip")) for x in got))
 def test_census_addresses_are_not_printed_in_action_logs(self):
  script=(ROOT/"scripts/denton_geopdf_census_holdout_qa.py").read_text()
  self.assertNotIn('json.dumps(group,separators=',script)
  self.assertIn('"fullAddressLogged":False',script)
  self.assertIn('"coordinatesLogged":False',script)
 def test_no_upload_of_geometry_reconstruction_or_house_coordinates(self):
  self.assertNotIn("            artifacts/denton-geopdf-derived/\n",WORKFLOW)
  self.assertNotIn("            artifacts/denton-pdf-vector-poc/\n",WORKFLOW)
  self.assertNotIn("            artifacts/denton-elementary-legend-poc/\n",WORKFLOW)
  self.assertIn("if-no-files-found: warn",WORKFLOW)
if __name__=="__main__":unittest.main()
