'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),P=require('../scripts/agent01-probe-irving-gis.cjs');
const ring=[[-96.99,32.81],[-96.95,32.81],[-96.95,32.83],[-96.99,32.83],[-96.99,32.81]];
const sample={type:'Feature',properties:{SCHOOL_NAME:'Test Campus'},geometry:{type:'Polygon',coordinates:[ring]}};
test('only three grade-specific Irving district ArcGIS maps',()=>{
 assert.deepEqual(P.MAPS.map(x=>x.level),['elementary','middle','high']);
 assert.equal(new Set(P.MAPS.map(x=>x.id)).size,3);
});
test('extract exact grade layer, reject missing and ambiguous ones',()=>{
 const one={operationalLayers:[{title:'Group',layers:[{title:'Elementary School Boundaries',url:'https://services2.arcgis.com/abc/FeatureServer/0'}]}]};
 assert.equal(P.selectLayer(one,P.MAPS[0]),'https://services2.arcgis.com/abc/FeatureServer/0');
 assert.throws(()=>P.selectLayer(one,P.MAPS[1]),/missing|unverified|ambiguous/);
 const two={operationalLayers:[{title:'Elementary School Boundaries',url:'https://services2.arcgis.com/abc/FeatureServer/0'},
 {title:'Elementary School Boundaries 2',url:'https://services3.arcgis.com/def/FeatureServer/0'}]};
 assert.throws(()=>P.selectLayer(two,P.MAPS[0]),/ambiguous/);
});
test('untrusted hosts, HTTP and non-layer endpoints are denied',()=>{
 for(const url of ['http://services2.arcgis.com/a/FeatureServer/0','https://evil.arcgis.com/a/FeatureServer/0',
 'https://services2.arcgis.com/a/FeatureServer','https://services2.arcgis.com.evil.test/a/FeatureServer/0'])
 assert.throws(()=>P.acceptLayerUrl(url));
});
test('shapes require closed WGS84 polygons within DFW bounds',()=>{
 assert.equal(P.validPolygon(sample.geometry),true);
 assert.equal(P.validPolygon({type:'Polygon',coordinates:[ring.slice(0,-1)]}),false);
 assert.equal(P.validPolygon({type:'Polygon',coordinates:[[[0,0],[1,0],[1,1],[0,0]]]}),false);
});
test('staged boundaries cannot be promoted to current-year or certified campus IDs',()=>{
 const row=P.normalize(sample,'elementary','https://services2.arcgis.com/abc/FeatureServer/0');
 assert.equal(row.properties.school,'Test Campus');assert.equal(row.properties.schoolYear,null);
 assert.equal(row.properties.campusId,null);assert.equal(row.properties.sourceYearVerified,false);
 assert.equal(row.properties.campusIdCrosswalkVerified,false);assert.equal(row.properties.independentFinderVerified,false);
 assert.equal(row.properties.status,'QUARANTINED_YEAR_UNKNOWN');
 assert.throws(()=>P.normalize({type:'Feature',properties:{foo:'bar'},geometry:sample.geometry},'elementary','src'),/school-name/);
});
