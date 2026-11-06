#!/usr/bin/env node
/**
 * Acquire Prosper ISD's CURRENT 2026–27 school attendance polygons.
 * Source: district-linked Infofinder i parent-facing public map.
 * Run manually: node scripts/fetch-prosper-2026-zones.mjs
 * Network access required ONLY when regenerating; CI reads the committed snapshot.
 *
 * The API returns Google-encoded polylines at 1e6 precision (not 1e5).
 * Some nested ring JSON has single literal backslashes that are not valid
 * JSON escapes; split the quoted array by its literal delimiters instead
 * of JSON.parse, preserving the exact encoded polyline bytes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
const CLIENT = 'PI5FFG7RYZ1';
const ROOT = 'https://www.infofinderi.com/ifi/ws/RedistrictRequest.asmx/';
const URL = 'https://www.infofinderi.com/ifi/?cid=' + CLIENT;
const expected = [
  {id:1, title:'2026-2027 ELEMENTARY SCHOOL', grade:'elementary', count:20},
  {id:2, title:'2026-2027 MIDDLE SCHOOL', grade:'middle', count:7},
  {id:3, title:'2026-2027 HIGH SCHOOL', grade:'high', count:4}
];
const read = path => JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
async function publicJson(url) {
  const response = await fetch(url,{signal:AbortSignal.timeout(25000),headers:{'Accept':'application/json'}});
  if(!response.ok) throw Error('HTTP '+response.status+': '+url);
  return response.json();
}
function encodedRings(text) {
  if(typeof text!=='string')throw Error('Encoded shape is not text');
  if(!text.startsWith('["'))return [text];
  if(!text.endsWith('"]'))throw Error('Invalid ring list delimiters');
  return text.slice(2,-2).split('","');
}
function decodePolyline(encoded) {
  let i=0,lat=0,lng=0;const result=[];
  function delta() {
    let value=0,shift=0,byte;
    do {
      if(i>=encoded.length)throw Error('Truncated encoded polyline');
      byte=encoded.charCodeAt(i++)-63;
      if(byte<0||byte>63||shift>=36)throw Error('Invalid encoded polyline byte');
      value|=(byte&31)<<shift;
      shift+=5;
    } while(byte>=32);
    return (value&1)?~(value>>1):(value>>1);
  }
  while(i<encoded.length) {
    lat+=delta();lng+=delta();
    const lon=lng/1e6,latitude=lat/1e6;
    if(lon < -97.5||lon > -96.2||latitude <32.8||latitude>33.6)
      throw Error('Not a Prosper TX polygon: '+lon+','+latitude);
    result.push([lon,latitude]);
  }
  if(result.length<3)throw Error('Degenerate GIS ring');
  if(result[0][0]!==result.at(-1)[0]||result[0][1]!==result.at(-1)[1])
    result.push([...result[0]]);
  return result;
}
async function main(){
  const manifest=await publicJson(ROOT+'GetRedistricts?clientId='+CLIENT);
  if(!Array.isArray(manifest)||manifest.length!==3)throw Error('Unexpected district zone groups');
  const ratings=new Map(read('tea-ratings-2026.json').data.filter(r=>r.district==='PROSPER').map(r=>[r.id,r]));
  const seen=new Set(),features=[];let polygonParts=0,rings=0,vertices=0;
  for(const group of expected) {
    const entry=manifest.find(r=>r.RedistrictId===group.id);
    if(!entry||entry.RedistrictName!==group.title)throw Error('Current-year source identity changed '+group.title);
    const source=ROOT+'GetRedistrict?clientId='+CLIENT+'&redistrictId='+group.id;
    const row=await publicJson(source);
    if(row.RedistrictName!==entry.RedistrictName||row.RedistrictId!==group.id||row.Schools?.length!==group.count)
      throw Error('Source school count/version changed '+group.grade);
    for(const school of row.Schools){
      const code=String(school.SchoolCode).padStart(3,'0');
      const campusId='043912'+code;
      const teadata=ratings.get(campusId);
      if(seen.has(campusId))throw Error('Duplicate campus '+campusId);
      if(!teadata && !(group.grade==='middle'&&code==='048'))
        throw Error('Unmatched official school code '+code);
      if(group.grade==='elementary'&&teadata&&!/\bel\b|elementary/i.test(teadata.name))throw Error('Wrong elementary '+campusId);
      if(group.grade==='middle'&&teadata&&!/middle/i.test(teadata.name))throw Error('Wrong middle '+campusId);
      if(group.grade==='high'&&teadata&&!/high/i.test(teadata.name))throw Error('Wrong high '+campusId);
      seen.add(campusId);
      const polygons=(school.Polygons||[]).map(encoded=>{
        const geoRings=encodedRings(encoded).map(decodePolyline);
        if(!geoRings.length)throw Error('Missing rings '+campusId);
        rings+=geoRings.length;
        vertices+=geoRings.reduce((s,p)=>s+p.length,0);
        polygonParts++;
        return geoRings;
      });
      if(!polygons.length)throw Error('No geometry '+campusId);
      features.push({type:'Feature',properties:{
        school:teadata?.name||'Jim Bridges Middle School',
        campusId,schoolCode:code,gradeLevel:group.grade,
        sourceDistrict:'PROSPER',sourceVintage:'2026–27',current:true,
        sourceYearConfirmed:true,schoolYear:'2026–27',
        source:'Prosper ISD official Infofinder i current-year school locator',
        sourceUrl:source,
        note:'Official zone shapes; school eligibility, exceptions and transfers must still be verified for a specific address.'
      },geometry:{type:'MultiPolygon',coordinates:polygons}});
    }
  }
  if(features.length!==31||seen.size!==31||polygonParts!==33||rings!==35||vertices!==1706)
    throw Error('The official source geometry changed: review before regenerating');
  features.sort((a,b)=>a.properties.gradeLevel.localeCompare(b.properties.gradeLevel)||a.properties.campusId.localeCompare(b.properties.campusId));
  const dataset={type:'FeatureCollection',metadata:{
    district:'PROSPER',sourceYear:'2026–27',currentYearConfirmed:true,
    reviewedOn:new Date().toISOString().slice(0,10),
    officialLocator:URL,districtPublishedMap:'https://www.prosper-isd.net/page/attendance-boundaries/',
    sourceGroupUrl:ROOT+'GetRedistricts?clientId='+CLIENT,
    sourceGroupNames:expected.map(x=>x.title),
    recordCount:31,polygonPartCount:polygonParts,ringCount:rings,vertexCount:vertices,
    gradeCounts:{elementary:20,middle:7,high:4},
    sourceEncoding:'Google encoded polyline with 1e6 coordinate scale decoded per official IFIMap.js',
    polygonRepresentation:'MultiPolygon; each original school.Polygons array element is a polygon and serialized inner rings are preserved as holes',
    academicYearEvidence:'Infofinder redistrict group names explicitly 2026-2027; linked from Prosper ISD official Attendance Boundaries page',
    info:'Official current-year zone geometry does not guarantee enrollment eligibility for a specific home; confirm exceptions with Prosper ISD.'
  },features};
  const filepath=new URL('../prosper-attendance-2026.geojson',import.meta.url);
  writeFileSync(filepath,JSON.stringify(dataset)+'\n','utf8');
  console.log('Wrote '+features.length+' official 2026–27 campus zones ('+polygonParts+' polygon parts, '+rings+' rings, '+vertices+' vertices)');
}
main().catch(e=>{console.error(e);process.exitCode=1});
