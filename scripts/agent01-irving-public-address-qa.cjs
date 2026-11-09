'use strict';
// Three PUBLIC school building addresses only, NEVER real residences or units.
// Uses the ArcGIS public geocoder followed by the exact elementary, middle
// and high sources in the currently district-linked Irving School Locator.
// This is NOT independent student-level 2026-27 enrollment certification.
const fs=require('node:fs'),path=require('node:path');
const {SOURCES,MAP_ID}=require('./agent01-verify-irving-live-finder.cjs');
const CASES=Object.freeze([
 {id:'campus-barton',address:'2931 Conflans Rd, Irving, TX 75061',elementary:'Barton ES'},
 {id:'campus-brown',address:'2501 W 10th St, Irving, TX 75060',elementary:'Brown ES'},
 {id:'campus-farine',address:'615 Metker Rd, Irving, TX 75062',elementary:'Farine ES'}
]);
function requireOK(c,msg){if(!c)throw Error(msg);}
async function getJson(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{accept:'application/json'}});
 requireOK(r.ok,'HTTP '+r.status+' fetching public locator GIS');
 const j=await r.json();requireOK(!j.error,'ArcGIS API reported '+JSON.stringify(j.error||{}).slice(0,160));return j;
}
function pointInRing(point,ring){
 const [x,y]=point;let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i],[xj,yj]=ring[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
function pointInEsriPolygon(point,geometry){
 const rings=geometry?.rings||[];
 return rings.reduce((inside,ring)=>pointInRing(point,ring)?!inside:inside,false);
}
function toMercator(p){
 const [lon,lat]=p,R=6378137;
 requireOK(Number.isFinite(lon)&&Number.isFinite(lat)&&lon>-97.6&&lon<-96.5&&lat>32.3&&lat<33.4,'public Irving campus coordinate out of range');
 return [R*lon*Math.PI/180,R*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))];
}
async function identifyArcGIS(name,url,longitude,latitude){
 const q=new URL(url+'/query');
 for(const [k,v] of Object.entries({f:'json',geometry:longitude+','+latitude,geometryType:'esriGeometryPoint',
  inSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'NAME',returnGeometry:'false'}))q.searchParams.set(k,v);
 const res=await getJson(q.toString());
 const names=(res.features||[]).map(z=>z.attributes?.NAME).filter(Boolean);
 requireOK(names.length===1,'not exactly one '+name+' Finder source polygon for public campus coordinate');
 return names[0];
}
async function run(){
 const item=await getJson('https://www.arcgis.com/sharing/rest/content/items/'+MAP_ID+'/data?f=json');
 const high=item.operationalLayers?.find(z=>z.id===SOURCES.high.id)?.featureCollection?.layers?.[0]?.featureSet?.features;
 requireOK(Array.isArray(high)&&high.length===3,'current official locator high polygons missing');
 const outcomes=[];
 for(const c of CASES){
  const geocoder=new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
  geocoder.searchParams.set('SingleLine',c.address);
  geocoder.searchParams.set('f','json');
  geocoder.searchParams.set('outFields','Match_addr');
  geocoder.searchParams.set('maxLocations','1');
  const found=await getJson(geocoder.toString());
  const candidate=found.candidates?.[0];
  requireOK(candidate&&candidate.score>=97&&/Irving/i.test(candidate.address),'campus address geocoder quality below threshold: '+c.id);
  const pt=[candidate.location.x,candidate.location.y],hm=toMercator(pt);
  const [el,ms]=await Promise.all([
   identifyArcGIS('elementary',SOURCES.elementary.url,...pt),
   identifyArcGIS('middle',SOURCES.middle.url,...pt)
  ]);
  const hs=high.filter(z=>pointInEsriPolygon(hm,z.geometry)).map(z=>z.attributes?.NAME);
  requireOK(el===c.elementary,'public facility + elementary polygon disagree: '+c.id);
  requireOK(hs.length===1,'not exactly one high source polygon: '+c.id);
  outcomes.push({id:c.id,geocoderScore:candidate.score,elementary:el,middle:ms,high:hs[0],numberOfMatchingSchoolLevels:3,
   source:'district-linked ArcGIS public locator layers',studentEnrollmentCertified:false});
 }
 const dest=path.join('artifacts','agent01-irving-live-finder');fs.mkdirSync(dest,{recursive:true});
 fs.writeFileSync(path.join(dest,'public-campus-holdouts.json'),JSON.stringify({date:new Date().toISOString(),type:'PUBLIC_CAMPUS_ADDRESS_TECHNICAL_QA_ONLY',
  count:CASES.length,results:outcomes,privateAddressCount:0,officialBrowserTextMatchVerified:false,
  currentYearLegalAssignmentVerified:false,productionGISApproved:false},null,2)+'\n');
 console.log('Public-campus→official-Finder-source polygon QC PASS (not student assignment):',outcomes.map(x=>x.id+':'+x.elementary+'/'+x.middle+'/'+x.high).join(', '));
}
if(require.main===module)run().catch(e=>{console.error('PUBLIC CAMPUS LOOKUP QA NO_GO',e.message);process.exitCode=1});
module.exports={CASES,pointInRing,pointInEsriPolygon,toMercator};
