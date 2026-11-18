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
     if(!liveFinder)return 'blocked';
     if(level!=='elementary')return 'reference-finder';
     return p.yearVerified2627===true&&p.verifiedYear==='2026-27'&&year.includes('2026-27')
       ?'finder-2026-elementary':'blocked';
   }
   // GIS polygons are 2019-23 in Allen; no current-address claim possible.
   if(district==='AISD')return p.current===false&&/2019|2022|2023/.test(year)
       ?'historical':'blocked';
   // Lewisville's high layer includes 2025-26; other layers are year-unconfirmed.
   if(district==='LISD')return 'reference-finder';
   // CFB has no authorized current campus polygons in dashboard.
   return 'blocked';
 }
 function recordLevel(record){
   const text=String(record?.officialName||record?.name||'').toLowerCase();
   if(/\b(?:elementary|el)\b/.test(text))return 'elementary';
   if(/\bmiddle\b/.test(text))return 'middle';
   if(/\b(?:high|h\s*s)\b/.test(text))return 'high';
   return null;
 }
 function matchRatingResult(feature,district,ratings,lookup){
   const p=feature?.properties||{},all=Array.isArray(ratings)?ratings:[],id=p.campusId;
   const key=normalizedName(p.school);
   let matches=[];
   if(id!==null&&id!==undefined&&id!==''){
     if(!/^\d{9}$/.test(String(id)))return {status:'invalid-record'};
     matches=all.filter(r=>String(r.id)===String(id)&&r.district===district);
   }else{
     matches=all.filter(r=>r.district===district&&(normalizedName(r.name)===key||normalizedName(r.officialName)===key));
     if(!matches.length&&typeof lookup==='function'){
       const picked=lookup(p.school,district);
       if(picked&&picked.district===district&&(normalizedName(picked.name)===key||normalizedName(picked.officialName)===key))
         matches=all.filter(r=>r.id===picked.id&&r.district===district);
     }
     if(!matches.length&&district==='AISD'&&key.length>=4){
       matches=all.filter(r=>r.district==='AISD'&&recordLevel(r)===p.gradeLevel&&
        (normalizedName(r.name).endsWith(key)||normalizedName(r.officialName).endsWith(key)));
     }
   }
   if(matches.length>1)return {status:'ambiguous'};
   if(!matches.length)return {status:'unlinked'};
   const record=matches[0];
   if(!/^\d{9}$/.test(String(record.id)))return {status:'invalid-record'};
   if(!['043907','LISD'].includes(district)&&normalizedName(record.name)!==key&&normalizedName(record.officialName)!==key&&
      !(district==='AISD'&&(normalizedName(record.name).endsWith(key)||normalizedName(record.officialName).endsWith(key))))
     return {status:'unlinked'};
   if(record.rating==='Not Rated')return {status:'not-rated',record};
   if(!Object.hasOwn(RANK,record.rating)||!Number.isFinite(record.score)||record.score<0||record.score>100)
     return {status:'invalid-record'};
   return {status:'rated',record};
 }
 function matchRating(feature,district,ratings,lookup){
   const result=matchRatingResult(feature,district,ratings,lookup);
   return result.status==='rated'?result.record:null;
 }
 function dataAvailability(sources){
   const list=Array.isArray(sources)?sources:[],ready=list.filter(s=>s.polygon==='ready').length,
    loading=list.filter(s=>s.polygon==='loading').length,failed=list.length-ready-loading;
   return {status:ready?(loading||failed?'partial':'ready'):(loading?'loading':'error'),ready,loading,failed};
 }
 function build(features,ratings,lookup,{district,level='elementary',threshold='B',showReference=false,liveFinder=false}={}){
   if(!LEVELS.includes(level)||!Object.hasOwn(RANK,threshold))throw new RangeError('Invalid grade/level');
   const source=Array.isArray(features)?features:[],sets={};
   const result={visible:[],matched:0,nonRated:0,unlinked:0,ambiguous:0,invalidRecord:0,unverified:0,eligible:0,sourceCount:source.length,campusCounts:{}};
   const counters={'rated':'matched','not-rated':'nonRated','unlinked':'unlinked','ambiguous':'ambiguous','invalid-record':'invalidRecord'};
   for(const feature of source){
     if(feature?.properties?.gradeLevel!==level)continue;
     result.eligible++;
     const kind=sourceKind(district,level,feature,liveFinder);
     if(kind==='blocked'){result.unverified++;continue;}
     const joined=matchRatingResult(feature,district,ratings,lookup),counter=counters[joined.status];
     result[counter]++;
     (sets[joined.status]??=new Set()).add(String(joined.record?.id||feature.properties.campusId||feature.properties.school));
     if(joined.status!=='rated')continue;
     const record=joined.record;
     if(!thresholdPass(record.rating,threshold))continue;
     if(kind!=='finder-2026-elementary'&&!showReference)continue;
     result.visible.push({feature,school:pureLabel(feature.properties.school),rating:record.rating,
       score:record.score,campusId:record.id,kind,level,district,year:YEAR,
       gisVintage:gisVintageLabel(feature)});
   }
   for(const status of Object.keys(counters))result.campusCounts[status]=sets[status]?.size||0;
   return result;
 }
 function dissolveByCampus(selected,clipper,cache){
   // Group only the same source-assured campus, grade level, district and
   // currency kind. Never join different schools or current/reference zones.
   const buckets=new Map();
   for(const item of Array.isArray(selected)?selected:[]){
     if(!item?.feature?.geometry||!/^\d{9}$/.test(String(item.campusId||'')))continue;
     const key=[item.district,item.level,item.kind,item.campusId].join('|');
     if(!buckets.has(key))buckets.set(key,[]);
     buckets.get(key).push(item);
   }
   const groups=[],errors=[];
   let inputPieces=0,mergedGroups=0,independentPieces=0;
   for(const [key,items] of buckets){
     inputPieces+=items.length;
     const first=items[0],previous=cache?.get(key);
     if(previous?.count===items.length&&previous.first===items[0].feature
       &&previous.last===items[items.length-1].feature){
       groups.push(previous.value);
       if(previous.value.dissolved)mergedGroups++;
       independentPieces+=previous.value.pieceCount;
       if(previous.value.error)errors.push(key);
       continue;
     }
     const geometries=items.map(item=>item.feature.geometry).filter(g=>
       (g?.type==='Polygon'||g?.type==='MultiPolygon')&&Array.isArray(g.coordinates));
     let geo=null,error=null;
     try{
       if(geometries.length!==items.length||geometries.length===0)throw Error('Invalid polygon geometry');
       // Union returns disjoint islands and true holes as GeoJSON MultiPolygon
       // topology. A simple MultiPolygon of the input leaves internal lines
       // behind, so it MUST NOT be used as the success case.
       if(geometries.length===1){
         geo=geometries[0];
       }else{
         if(typeof clipper?.union!=='function')throw Error('Polygon union unavailable');
         const merged=clipper.union(...geometries.map(g=>g.coordinates));
         if(!Array.isArray(merged)||!merged.length)throw Error('Polygon union empty');
         geo={type:'MultiPolygon',coordinates:merged};
       }
     }catch(e){
       error=e instanceof Error?e.message:'Polygon union failed';
       errors.push(key);
     }
     const result={...first,sourceCount:items.length,
       // When a union fails, show polygons as transparent fills without any
       // edges rather than painting a false outer boundary.
       feature:geo?{type:'Feature',properties:{...first.feature.properties},geometry:geo}:null,
       fallback:geo?null:items.map(item=>item.feature),
       pieceCount:geo?(geo.type==='MultiPolygon'?geo.coordinates.length:1):items.length,
       dissolved:!!geo,error};
     groups.push(result);
     if(result.dissolved)mergedGroups++;
     independentPieces+=result.pieceCount;
     cache?.set(key,{first:items[0].feature,last:items[items.length-1].feature,
       count:items.length,value:result});
   }
   return {groups,errors,inputPieces,mergedGroups,independentPieces};
 }
 // Keep a boundary's vintage separate from the TEA campus rating year.
 // An explicitly null GIS year must not inherit the Finder page's title year.
 function gisVintageLabel(feature){
   const p=feature?.properties||{};
   if(Object.hasOwn(p,'sourceYearRaw')){
     const raw=p.sourceYearRaw;
     return typeof raw==='string'&&/^20[0-9]{2}[-–][0-9]{2}$/.test(raw.trim())
       ?raw.trim():'원본 GIS 학년도 미표기';
   }
   const vintage=typeof p.sourceVintage==='string'?p.sourceVintage:'';
   const years=vintage.match(/(?:19|20)[0-9]{2}(?:[-–](?:(?:19|20)[0-9]{2}|[0-9]{2}))?/g);
   return years?.length?[...new Set(years)].join(', ').slice(0,80):'원본 GIS 학년도 미표기';
 }
 function pureLabel(s){return String(s).trim().slice(0,130)}
 return {DISTRICTS,LEVELS,RANK,YEAR,normalizedName,thresholdPass,sourceKind,matchRating,matchRatingResult,dataAvailability,build,dissolveByCampus,gisVintageLabel};
});
