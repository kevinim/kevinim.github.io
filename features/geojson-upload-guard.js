/* Local, account-free school boundary GeoJSON input validation.
 * Browser only: never upload file contents or preserve user data.
 * Output contains only the school label and bounded Polygon/MultiPolygon coordinates.
 */
(function(root){
'use strict';
const LIMITS=Object.freeze({
 fileBytes:4*1024*1024,
 features:800,
 totalVertices:50000,
 featureVertices:12000,
 ringVertices:5000,
 ringsPerPolygon:32,
 polygonsPerFeature:16,
 schoolNameCharacters:160
});
function reject(message){throw new TypeError(message)}
function isObject(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)}
function assertFileSize(bytes){
 if(!Number.isSafeInteger(bytes)||bytes<1)reject('빈 파일이거나 파일 크기를 확인할 수 없습니다.');
 if(bytes>LIMITS.fileBytes)reject('파일은 최대 4 MiB까지 업로드할 수 있습니다.');
}
function validate(source){
 if(!isObject(source)||source.type!=='FeatureCollection'||!Array.isArray(source.features))
  reject('학교 경계 FeatureCollection 형식이어야 합니다.');
 if(source.features.length<1||source.features.length>LIMITS.features)
  reject('학교 경계는 1~800개 도형만 지원합니다.');
 let totalVertices=0;
 const output=[];
 for(let i=0;i<source.features.length;i++){
  const feature=source.features[i];
  if(!isObject(feature)||feature.type!=='Feature'||!isObject(feature.properties))
   reject((i+1)+'번째 Feature의 형식이 올바르지 않습니다.');
  const props=feature.properties;
  const name=props.school||props.SchoolName||props.school_name||props.NAME;
  if(typeof name!=='string'||!name.trim()||name.length>LIMITS.schoolNameCharacters||/[\u0000-\u001f\u007f]/.test(name))
   reject((i+1)+'번째 도형에 유효한 학교 이름이 없습니다.');
  const geom=feature.geometry;
  if(!isObject(geom)||!['Polygon','MultiPolygon'].includes(geom.type)||!Array.isArray(geom.coordinates))
   reject((i+1)+'번째 도형은 Polygon 또는 MultiPolygon이어야 합니다.');
  let featureVertices=0;
  function ring(points){
   if(!Array.isArray(points)||points.length<4||points.length>LIMITS.ringVertices)
    reject((i+1)+'번째 도형의 좌표 고리는 4~5000개 점이어야 합니다.');
   for(const point of points){
    if(!Array.isArray(point)||point.length<2||point.length>3)
     reject((i+1)+'번째 도형의 좌표는 [경도, 위도] 배열이어야 합니다.');
    if(!point.every(Number.isFinite)||point[0]<-108||point[0]>-92||point[1]<24||point[1]>38)
     reject((i+1)+'번째 도형의 좌표가 유효한 텍사스 인근 범위를 벗어났습니다.');
    if(++featureVertices>LIMITS.featureVertices||++totalVertices>LIMITS.totalVertices)
     reject('파일의 경계 좌표가 너무 복잡합니다.');
   }
   const a=points[0],b=points[points.length-1];
   if(a[0]!==b[0]||a[1]!==b[1])reject((i+1)+'번째 도형의 좌표 고리가 닫혀 있지 않습니다.');
  }
  function polygon(rings){
   if(!Array.isArray(rings)||rings.length<1||rings.length>LIMITS.ringsPerPolygon)
    reject((i+1)+'번째 Polygon 고리 수가 허용 범위를 벗어났습니다.');
   for(const points of rings)ring(points);
  }
  if(geom.type==='Polygon')polygon(geom.coordinates);
  else {
   if(geom.coordinates.length<1||geom.coordinates.length>LIMITS.polygonsPerFeature)
    reject((i+1)+'번째 MultiPolygon의 조각 수가 허용 범위를 벗어났습니다.');
   for(const rings of geom.coordinates)polygon(rings);
  }
  output.push({type:'Feature',properties:{school:name.trim()},geometry:{type:geom.type,coordinates:geom.coordinates}});
 }
 return {geojson:{type:'FeatureCollection',features:output},stats:{features:output.length,vertices:totalVertices}};
}
const api=Object.freeze({LIMITS,assertFileSize,validate});
if(typeof module==='object'&&module.exports)module.exports=api;
if(root)root.SchoolGeoJSONGuard=api;
})(typeof window!=='undefined'?window:null);
