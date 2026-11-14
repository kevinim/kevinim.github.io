/* School-grade polygon UAT: official TEA ratings joined to source-audited shapes.
   Ratings are about CAMPUSES, not permission to enroll at an address. */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SchoolGradeZonesUatCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const LEVELS=Object.freeze(['elementary','middle','high']);
 const RANK=Object.freeze({A:0,B:1,C:2,D:3,F:4});
 const YEAR=2026;
 const DISTRICTS=Object.freeze({
   mckinney:{name:'McKinney ISD',ids:['043907'],center:[33.197,-96.618],zoom:11},
   allen:{name:'Allen ISD',ids:['AISD'],center:[33.11,-96.675],zoom:11},
   carrollton:{name:'Carrollton 일대 (CFB + LISD)',ids:['CFB','LISD'],center:[32.987,-96.885],zoom:11}
 });
 function normalizedName(s){
   return String(s||'').toLowerCase().replace(/\bh\.?\s*s\.?\b/g,'high')
      .replace(/\bm\.?\s*s\.?\b/g,'middle').replace(/\bsr\.?\b/g,'senior')
      .replace(/\b(?:elem|el)\b/g,'elementary')
      .replace(/\b(?:school|dr|doctor|elementary|middle|high|senior|campus)\b/g,'')
      .replace(/[^a-z0-9]/g,'').trim();
 }
 function thresholdPass(rating,minGrade){
   return Object.hasOwn(RANK,rating)&&Object.hasOwn(RANK,minGrade)
     &&RANK[rating]<=RANK[minGrade];
 }
 function sourceKind(district,level,feature,liveFinder){
   const p=feature?.properties||{};
   if(!LEVELS.includes(level)||!['Polygon','MultiPolygon'].includes(feature?.geometry?.type)
      ||!Array.isArray(feature.geometry.coordinates)||!feature.geometry.coordinates.length
      ||p.gradeLevel!==level||typeof p.school!=='string'||p.school.trim().length<2)
      return 'blocked';
   const year=String(p.sourceVintage||'').replace(/–/g,'-');
   if(p.current===false&&district==='043907')return 'blocked';
   // McKinney live Finder gates elementary school-year at ingestion. Middle/high
   // vintage and exact dwelling assignment are not independently certified.
   if(district==='043907'){
     return liveFinder===true&&year.includes('2026-27')
       ?(level==='elementary'?'finder-2026-elementary':'reference-finder')
       :'blocked';
   }
   // GIS polygons are 2019-23 in Allen; no current-address claim possible.
   if(district==='AISD')return p.current===false&&/2019|2022|2023/.test(year)
       ?'historical':'blocked';
   // Lewisville's high layer includes 2025-26; other layers are year-unconfirmed.
   if(district==='LISD')return 'reference-finder';
   // CFB has no authorized current campus polygons in dashboard.
   return 'blocked';
 }
 function matchRating(feature,district,ratings,lookup){
   const p=feature.properties;
   const id=p.campusId;
   let record=null;
   if(id!==null&&id!==undefined&&id!==''){
     if(!/^\d{9}$/.test(String(id)))return null;
     record=(Array.isArray(ratings)?ratings:[]).find(r=>r.id===id&&r.district===district)||null;
     if(!record)return null; // No fuzzy fallback when publisher gave an unmatched campus ID
     if(normalizedName(record.name)!==normalizedName(p.school)&&
        normalizedName(record.officialName)!==normalizedName(p.school))return null;
   }else{
     record=typeof lookup==='function'?lookup(p.school,district):null;
     if(!record||record.district!==district)return null;
     if(normalizedName(record.name)!==normalizedName(p.school)&&
        normalizedName(record.officialName)!==normalizedName(p.school))return null;
   }
   if(!/^\d{9}$/.test(record.id)||!Object.hasOwn(RANK,record.rating)||!Number.isFinite(record.score))
     return null;
   return record;
 }
 function build(features,ratings,lookup,{district,level='elementary',threshold='B',showReference=false,liveFinder=false}={}){
   if(!LEVELS.includes(level)||!Object.hasOwn(RANK,threshold))throw new RangeError('Invalid grade/level');
   const source=Array.isArray(features)?features:[];
   const result={visible:[],matched:0,nonRated:0,unverified:0,eligible:0,sourceCount:source.length};
   const seen=new Set();
   for(const feature of source){
     if(feature?.properties?.gradeLevel!==level)continue;
     result.eligible++;
     const kind=sourceKind(district,level,feature,liveFinder);
     if(kind==='blocked'){result.unverified++;continue;}
     const record=matchRating(feature,district,ratings,lookup);
     if(!record){result.nonRated++;continue;}
     result.matched++;
     if(!thresholdPass(record.rating,threshold))continue;
     if(kind!=='finder-2026-elementary'&&!showReference)continue;
     const identity=district+'|'+level+'|'+record.id;
     if(seen.has(identity))continue;
     seen.add(identity);
     result.visible.push({feature,school:pureLabel(feature.properties.school),rating:record.rating,
       score:record.score,campusId:record.id,kind,level,district,year:YEAR});
   }
   return result;
 }
 function pureLabel(s){return String(s).trim().slice(0,130)}
 return {DISTRICTS,LEVELS,RANK,YEAR,normalizedName,thresholdPass,sourceKind,matchRating,build};
});
