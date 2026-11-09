'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DISTRICT_REGISTRY } = require('../district-registry.js');
const { knownBoundaryException, boundaryMissingExplanation } = require('../school-boundary-match.js');
const {checkOfficialUrl,auditSchoolBoundaryTrust,SPECIAL_CAMPUSES} = require('../scripts/audit-gis-upload-links.cjs');
const root=path.resolve(__dirname,'..');
const source = p=>fs.readFileSync(path.join(root,p),'utf8');
const files=()=>Object.fromEntries(['index.html','dashboard-main.js','reviewed.html','features/reviewed-bootstrap.js','features/geojson-upload-guard.js','school-boundary-match.js'].map(p=>[p,source(p)]));

test('all district and special-campus links have explicitly trusted HTTPS hosts',()=>{
 const r=auditSchoolBoundaryTrust(files());
 assert.deepEqual(r.errors,[]);
 assert.equal(r.inventory.districts,Object.keys(DISTRICT_REGISTRY).length);
 assert.equal(r.inventory.districts,73); // 11 established + 62 provenance-backed DFW parent lookup entries.
 assert.equal(r.inventory.exceptionLinks,7);
 for(const school of SPECIAL_CAMPUSES){
  assert.ok(checkOfficialUrl(knownBoundaryException(school)?.sourceUrl));
 }
});
test('invalid, deceptive, unexpected and executable official link URLs are rejected',()=>{
 for(const value of [
   'javascript:alert(1)', 'data:text/html,example', '//www.pisd.edu/path',
   'http://www.pisd.edu/locator', 'https://www.pisd.edu.evil.test/locator',
   'https://www.pisd.edu@evil.test/locator', 'https://www.pisd.edu:444/locator',
   'https://www.pisd.edu\\@evil.test/path', 'https://evil.test/',
   'https://www.pisd.edu/\npath',
 ]){
  assert.equal(checkOfficialUrl(value),false,value);
 }
 assert.equal(checkOfficialUrl('https://www.pisd.edu/district-resources/schools-facilities/'),true);
});
test('unsafe district URL causes an audit failure',()=>{
 const altered=structuredClone(DISTRICT_REGISTRY);
 altered.AISD.official='javascript:alert(1)';
 assert.ok(auditSchoolBoundaryTrust(files(),altered).errors.some(e=>e.includes('AISD')));
});
test('school boundary missing explanation remains raw data, not executable markup',()=>{
 const name='<img src="x" onerror="window.__gisQAFlag=1">';
 const sample={district:'FISD',type:'elementary',name};
 const result=boundaryMissingExplanation(sample,{status:'school-not-in-polygon-source'},'2026–27',null);
 assert.ok(result.reason.includes(name));
 assert.equal(result.sourceUrl,undefined);
 // The actual DOM target remains textContent and is checked by auditSchoolBoundaryTrust.
 assert.ok(source('dashboard-main.js').includes('heading.textContent=failure.reason'));
});
test('dangerous HTML sink regression in main GIS warning is detected',()=>{
 const modified=files();
 modified['dashboard-main.js']=modified['dashboard-main.js'].replace('heading.textContent=failure.reason','heading.innerHTML=failure.reason');
 assert.ok(auditSchoolBoundaryTrust(modified).errors.some(e=>e.includes('no longer text-only')));
});
test('legacy uploaded polygon file entrypoint stays under security review',()=>{
 const modified=files();
 modified['features/reviewed-bootstrap.js']=modified['features/reviewed-bootstrap.js'].replace('SchoolGeoJSONGuard.validate','unsafeValidate');
 assert.ok(auditSchoolBoundaryTrust(modified).errors.some(e=>e.includes('GeoJSON entrypoint')));
});
test('legacy Allen GIS year label must remain HTML-escaped',()=>{
 const modified=files();
 modified['features/reviewed-bootstrap.js']=modified['features/reviewed-bootstrap.js'].replace('j.features.map(f=>escape(f.properties.YearUpdated','j.features.map(f=>String(f.properties.YearUpdated');
 assert.ok(auditSchoolBoundaryTrust(modified).errors.some(e=>e.includes('historical date')));
});

test('missing guard or lowered validation is rejected',()=>{
 const filesCopy=files();
 filesCopy['features/geojson-upload-guard.js']=filesCopy['features/geojson-upload-guard.js'].replace('fileBytes:4*1024*1024','fileBytes:999*1024*1024');
 assert.ok(auditSchoolBoundaryTrust(filesCopy).errors.some(e=>e.includes('GeoJSON entrypoint')));
});

test('missing-boundary evidence link host guard cannot silently be removed',()=>{
 const changed=files();
 changed['dashboard-main.js']=changed['dashboard-main.js'].replace(
   'failure.sourceUrl&&window.TrustedLinkPolicy?.official(failure.sourceUrl)',
   'failure.sourceUrl');
 assert.ok(auditSchoolBoundaryTrust(changed).errors.some(x=>x.includes('exact-host HTTPS policy')));
});
