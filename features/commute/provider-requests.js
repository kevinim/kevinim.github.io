/* Free-only family UAT: best-effort per-tab public-service request guard.
 * This does NOT meet Nominatim/OSRM aggregate application-wide 1 rps limits
 * across visitors; general-public promotion requires a compliant architecture.
 * Never log or persist addresses, destination queries or route coordinates. */
(function(root){
 'use strict';
 const PROVIDERS=Object.freeze({
  nominatim:{origin:'https://nominatim.openstreetmap.org',prefix:'/search'},
  osrm:{origin:'https://router.project-osrm.org',prefixes:['/table/v1/driving/','/route/v1/driving/']}
 });
 const GAP_MS=1100;
 const TIMEOUT_MS=12000;
 class ProviderRequestError extends Error{
  constructor(code,message){super(message);this.name='ProviderRequestError';this.code=code}
 }
 const cancelled=()=>{const error=new ProviderRequestError('cancelled','요청이 취소되었습니다.');error.name='AbortError';return error;};
 function wait(ms,signal){
  if(signal?.aborted)return Promise.reject(cancelled());
  return new Promise((resolve,reject)=>{
   let done=false;
   const onAbort=()=>{if(done)return;done=true;clearTimeout(timer);reject(cancelled())};
   const timer=setTimeout(()=>{if(done)return;done=true;signal?.removeEventListener?.('abort',onAbort);resolve()},ms);
   signal?.addEventListener?.('abort',onAbort,{once:true});
  });
 }
 function assertDestination(provider,url){
  const policy=PROVIDERS[provider];
  if(!policy)throw new ProviderRequestError('provider','허용되지 않은 경로 서비스입니다.');
  let parsed;
  try{parsed=new URL(url)}catch{throw new ProviderRequestError('url','잘못된 서비스 주소입니다.')}
  if(parsed.origin!==policy.origin ||
   !(policy.prefix?parsed.pathname===policy.prefix:policy.prefixes.some(p=>parsed.pathname.startsWith(p)))||
   parsed.username||parsed.password||parsed.hash){
   throw new ProviderRequestError('url','허용되지 않은 서비스 주소입니다.');
  }
  return parsed;
 }
 function createClient({fetcher,clock,sleep,gapMs=GAP_MS}={}){
  const doFetch=fetcher||((url,init)=>root.fetch(url,init));
  const now=clock||(()=>Date.now());
  const delay=sleep||wait;
  const slots={nominatim:0,osrm:0};
  async function requestJson(provider,url,{signal,timeoutMs=TIMEOUT_MS,headers}={}){
   assertDestination(provider,url);
   if(signal?.aborted)throw cancelled();
   const timestamp=now();
   const reserved=Math.max(timestamp,slots[provider]);
   slots[provider]=reserved+Math.max(1000,gapMs);
   if(reserved>timestamp)await delay(reserved-timestamp,signal);
   if(signal?.aborted)throw cancelled();
   const ctrl=new AbortController(),onAbort=()=>ctrl.abort();
   signal?.addEventListener?.('abort',onAbort,{once:true});
   if(signal?.aborted)ctrl.abort();
   const timer=setTimeout(()=>ctrl.abort(),Math.max(1000,Math.min(20000,timeoutMs)));
   try{
    const response=await doFetch(url,{signal:ctrl.signal,headers:headers||{'Accept':'application/json'}});
    if(response.status===429)throw new ProviderRequestError('rate_limited','공개 경로 서비스 요청 한도에 도달했습니다. 잠시 후 다시 시도하거나 Google Maps로 확인하세요.');
    if(response.status===503||response.status===502||response.status===504)throw new ProviderRequestError('unavailable','공개 경로 서비스가 일시적으로 응답하지 않습니다. Google Maps로 확인하세요.');
    if(!response.ok)throw new ProviderRequestError('http','공개 경로 서비스를 사용할 수 없습니다. Google Maps로 확인하세요.');
    try{return await response.json()}catch{throw new ProviderRequestError('invalid_json','공개 경로 서비스 응답을 읽지 못했습니다. Google Maps로 확인하세요.')}
   }catch(error){
    if(error instanceof ProviderRequestError)throw error;
    if(signal?.aborted)throw cancelled();
    if(ctrl.signal.aborted)throw new ProviderRequestError('timeout','공개 경로 서비스 응답 시간이 초과되었습니다. Google Maps로 확인하세요.');
    throw new ProviderRequestError('network','공개 경로 서비스 연결에 실패했습니다. Google Maps로 확인하세요.');
   }finally{
    clearTimeout(timer);
    signal?.removeEventListener?.('abort',onAbort);
   }
  }
  return Object.freeze({requestJson});
 }
 const api=createClient();
 root.TxProviderRequests=api;
 if(typeof module!=='undefined'&&module.exports){
  module.exports={createClient,ProviderRequestError,assertDestination,GAP_MS,TIMEOUT_MS};
 }
})(typeof window!=='undefined'?window:globalThis);
