// Runtime-independent JSON API core for a FUTURE Cloudflare Worker or Pages Function.
// No credentials, no accounts, no provider integrations and no deployment here.
// In production, provider endpoints MUST remain closed until owner signoff AND
// a real distributed rate limiter binding AND a reviewed provider adapter exist.
export const BACKEND_API_VERSION='v1';
const BYTE_LIMIT=2048;
const MAX_ADDRESS=160;
const ALLOWED_ENDPOINTS={
  '/api/v1/health':'GET',
  '/api/v1/ready':'GET',
  '/api/v1/addresses/suggest':'POST',
  '/api/v1/routes/estimate':'POST',
};
const JSON_HEADERS=Object.freeze({
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store, max-age=0',
  'Pragma':'no-cache',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'Cross-Origin-Resource-Policy':'same-origin',
  'X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
});

function json(status, data, extraHeaders={}){
  return new Response(JSON.stringify(data),{
    status,headers:{...JSON_HEADERS,...extraHeaders},
  });
}
function error(status,code,extraHeaders){
  // Never echo request paths, address strings, lat/lon, client IPs or provider errors.
  return json(status,{error:code},extraHeaders);
}
function validOrigin(raw,env){
  let u;try{u=new URL(raw);}catch{return false;}
  const local=env.RUNTIME_MODE==='local'&&u.protocol==='http:'&&
    ['localhost','127.0.0.1'].includes(u.hostname);
  return (u.protocol==='https:'||local)&&!u.username&&!u.password&&
    u.pathname==='/'&&!u.search&&!u.hash;
}
function getAllowlist(env){
  const raw=String(env.API_ALLOWED_ORIGINS||'').trim();
  if(!raw)return [];
  const entries=raw.split(',').map(x=>x.trim()).filter(Boolean);
  if(entries.length>8||entries.some(x=>x==='*'||!validOrigin(x,env)))return [];
  return entries.map(x=>new URL(x).origin);
}
function corsHeaders(origin,env){
  if(!origin)return {};
  if(!getAllowlist(env).includes(origin))return null;
  return {
    'Access-Control-Allow-Origin':origin,
    'Vary':'Origin',
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Max-Age':'600'
  };
}
async function limitedJson(request){
  const type=request.headers.get('content-type')||'';
  if(!/^application\/json(?:\s*;|$)/i.test(type))
    return {error:'content_type_required',status:415};
  const declared=request.headers.get('content-length');
  if(declared!==null&&Number(declared)>BYTE_LIMIT)
    return {error:'payload_too_large',status:413};
  const chunks=[];let total=0;
  if(request.body){
    const reader=request.body.getReader();
    try{
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        total+=value.byteLength;
        if(total>BYTE_LIMIT){
          await reader.cancel().catch(()=>{});
          return {error:'payload_too_large',status:413};
        }
        chunks.push(value);
      }
    }finally{reader.releaseLock();}
  }
  try{
    const content=new Uint8Array(total);let offset=0;
    for(const chunk of chunks){content.set(chunk,offset);offset+=chunk.length;}
    const decoded=new TextDecoder('utf-8',{fatal:true}).decode(content);
    const body=JSON.parse(decoded);
    if(!body||typeof body!=='object'||Array.isArray(body))
      return {error:'invalid_json',status:400};
    return {body};
  }catch{return {error:'invalid_json',status:400};}
}
function checkSuggest(body){
  if(Object.keys(body).length!==1||typeof body.query!=='string')return null;
  if(/[\u0000-\u001f\u007f]/u.test(body.query))return null;
  const q=body.query.trim().normalize('NFC');
  if(q.length<3||q.length>MAX_ADDRESS||
     /[\u0000-\u001f\u007f]/u.test(q)||
     /^https?:\/\//i.test(q))return null;
  return {query:q};
}
function checkPoint(p){
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='lat,lon')
    return false;
  const {lat,lon}=p;
  return typeof lat==='number'&&Number.isFinite(lat)&&lat>=-90&&lat<=90&&
    typeof lon==='number'&&Number.isFinite(lon)&&lon>=-180&&lon<=180;
}
function checkRoute(body){
  if(Object.keys(body).sort().join(',')!=='destination,origin'||!checkPoint(body.origin)||!checkPoint(body.destination))
    return null;
  return {origin:{...body.origin},destination:{...body.destination}};
}
function available(env,providers,endpoint){
  const approved=env.API_OWNER_APPROVED==='confirmed'&&
    env.API_PROVIDER_TERMS_APPROVED==='confirmed'&&
    env.API_DATA_LICENSES_CONFIRMED==='confirmed';
  if(!approved)return false;
  if(!env.API_RATE_LIMITER||typeof env.API_RATE_LIMITER.limit!=='function')return false;
  if(endpoint==='suggest')return typeof providers.suggest==='function';
  if(endpoint==='route')return typeof providers.route==='function';
  return typeof providers.suggest==='function'&&typeof providers.route==='function';
}
async function applyLimit(request,env){
  // For Cloudflare Workers only: CF overwrites CF-Connecting-IP at the edge.
  // Never trust x-forwarded-for, user-provided client IDs or a local Map in prod.
  const key=env.RUNTIME_MODE==='cloudflare'?(request.headers.get('cf-connecting-ip')||''):'';
  if(!key||key.length>64)return {error:'rate_limiter_unavailable',status:503};
  try{
    const outcome=await env.API_RATE_LIMITER.limit({key});
    return outcome?.success===true?null:{error:'rate_limited',status:429};
  }catch{return {error:'rate_limiter_unavailable',status:503};}
}
function sanitizeSuggest(data){
  if(!Array.isArray(data))throw Error('provider_shape');
  return data.slice(0,5).map(d=>{
    if(!d||typeof d.address!=='string'||d.address.length>240||
       !checkPoint(d.location))throw Error('provider_shape');
    return {address:d.address,location:{lat:d.location.lat,lon:d.location.lon}};
  });
}
function sanitizeRoute(data){
  if(!data||typeof data!=='object'||!Number.isFinite(data.durationMinutes)||
     !Number.isFinite(data.distanceKm)||data.durationMinutes<0||data.distanceKm<0||
     data.durationMinutes>100000||data.distanceKm>100000)throw Error('provider_shape');
  return {durationMinutes:Math.round(data.durationMinutes*10)/10,
    distanceKm:Math.round(data.distanceKm*10)/10,
    trafficIncluded:data.trafficIncluded===true};
}

/**
 * handler accepts a standard Fetch Request, an env object, and optional
 * dependency-injected providers for local tests/future independently reviewed
 * adapter. There is no provider implementation in this repository.
 */
export async function handleApiRequest(request,env={},providers={}){
  try{
    const pathname=new URL(request.url).pathname;
    const origin=request.headers.get('origin');
    const cors=corsHeaders(origin,env);
    if(cors===null)return error(403,'origin_not_allowed');
    if(request.method==='OPTIONS'){
      if(!(pathname in ALLOWED_ENDPOINTS)||!origin)return error(404,'not_found',cors);
      return new Response(null,{status:204,headers:{...JSON_HEADERS,...cors}});
    }
    const method=ALLOWED_ENDPOINTS[pathname];
    if(!method)return error(404,'not_found',cors);
    if(request.method!==method)return error(405,'method_not_allowed',{'Allow':method,...cors});
    const url=new URL(request.url);
    if(url.search||url.hash)return error(400,'query_parameters_not_supported',cors);
    if(pathname==='/api/v1/health')
      return json(200,{status:'ok',api:BACKEND_API_VERSION,providerCallsEnabled:false},cors);
    if(pathname==='/api/v1/ready'){
      const isReady=available(env,providers,'both');
      return json(isReady?200:503,{
        status:isReady?'ready':'not_configured',
        api:BACKEND_API_VERSION
      },cors);
    }
    const parsed=await limitedJson(request);
    if(parsed.error)return error(parsed.status,parsed.error,cors);
    const operation=pathname.endsWith('/suggest')?'suggest':'route';
    const payload=operation==='suggest'?checkSuggest(parsed.body):checkRoute(parsed.body);
    if(!payload)return error(422,'invalid_input',cors);
    if(!available(env,providers,operation))return error(503,'provider_not_configured',cors);
    const limited=await applyLimit(request,env);
    if(limited)return error(limited.status,limited.error,cors);
    try{
      const value=await providers[operation](payload,{signal:AbortSignal.timeout(8000)});
      const result=operation==='suggest'?{suggestions:sanitizeSuggest(value)}:
        {route:sanitizeRoute(value)};
      return json(200,result,cors);
    }catch{
      // Provider errors are intentionally non-reflective. No logging of user input.
      return error(502,'upstream_unavailable',cors);
    }
  }catch{
    return error(500,'internal_error');
  }
}
