'use strict';
// On-demand, read-only public CCAD parcel point query. Never request owner fields.
const COLLIN_PARCEL_LAYER='https://services2.arcgis.com/uXyoacYrZTPTKD3R/arcgis/rest/services/CCAD_Parcel_Feature_Set/FeatureServer/4/query';
function buildCollinParcelUrl(ll){
 if(!Array.isArray(ll)||ll.length!==2||!Number.isFinite(ll[0])||!Number.isFinite(ll[1])||ll[0]<25||ll[0]>37||ll[1]<-107||ll[1]>-93)throw Error('invalid coordinates');
 const p=new URLSearchParams({f:'json',where:'1=1',geometry:ll[1]+','+ll[0],geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields:'OBJECTID,situsConcat,propYear',returnGeometry:'false',resultRecordCount:'3'});
 return COLLIN_PARCEL_LAYER+'?'+p;
}
function parcelStreetKey(str){
 const first=String(str||'').toUpperCase().split(',')[0]
  .replace(/(?:\s|^)(?:APT|APARTMENT|UNIT|STE|SUITE|BLDG|BUILDING|#)\s*[-#A-Z0-9]+.*$/,'')
  .replace(/[^A-Z0-9\s]/g,' ').replace(/\bBOULEVARD\b/g,'BLVD').replace(/\bROAD\b/g,'RD').replace(/\bSTREET\b/g,'ST')
  .replace(/\bDRIVE\b/g,'DR').replace(/\bPARKWAY\b/g,'PKWY').replace(/\bAVENUE\b/g,'AVE').replace(/\bLANE\b/g,'LN')
  .replace(/\bCOURT\b/g,'CT').replace(/\bCIRCLE\b/g,'CIR').replace(/\bPLACE\b/g,'PL').replace(/\bTRAIL\b/g,'TRL')
  .replace(/\s+/g,' ').trim();
 return /^\d+[A-Z]?\s+[A-Z0-9]/.test(first)?first:null;
}
function parcelZip(str){return String(str||'').match(/\b\d{5}(?:-\d{4})?\b/g)?.at(-1)?.slice(0,5)||null;}
function assessCollinParcelResult(address,api){
 if(api?.error)return {status:'error',reason:'Collin CAD 서버 오류'};
 if(!Array.isArray(api?.features))return {status:'error',reason:'필지 응답 형식 오류'};
 if(!api.features.length)return {status:'not-found',reason:'Collin CAD에 좌표와 겹치는 필지가 없습니다. 관할지역 밖이거나 위치가 부정확할 수 있습니다.'};
 if(api.features.length!==1||api.exceededTransferLimit)return {status:'ambiguous',reason:'여러 필지가 겹칩니다. 현재 주소와 호수를 공식 조회에서 확인하세요.'};
 const a=api.features[0].attributes||{},situs=String(a.situsConcat||'').trim(),from=parcelStreetKey(address),to=parcelStreetKey(situs),zipA=parcelZip(address),zipB=parcelZip(situs);
 const extra={parcelAddress:situs,year:a.propYear||null};
 if(!from||!to)return {status:'inconclusive',reason:'필지 또는 검색 결과에서 도로명·번지를 확인하지 못했습니다.',...extra};
 if(from!==to||(zipA&&zipB&&zipA!==zipB))return {status:'mismatch',reason:'필지 주소와 지도에 표시된 집 주소가 다릅니다. 지도 핀을 재확인하세요.',...extra};
 return {status:'matched',reason:'지도 핀이 동일한 도로명·번지의 필지 안에 있습니다. 학교 배정 확인은 아닙니다.',...extra};
}
if(typeof module!=='undefined')module.exports={buildCollinParcelUrl,parcelStreetKey,assessCollinParcelResult};
