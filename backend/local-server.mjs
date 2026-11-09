// Account-free LOCAL ONLY backend harness (Node 24+).
// It uses no third-party APIs, credentials, user database or deployment account.
// Never bind this process to 0.0.0.0 or expose it to the public internet.
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {handleApiRequest} from './api.mjs';
const MAX_REQUEST=4096;
function tinyError(res,status,code){
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  });
  res.end(JSON.stringify({error:code}));
}
export function createLocalServer(){
  const server=http.createServer(async(req,res)=>{
    try{
      const target=req.url||'/';
      if(!target.startsWith('/')||target.startsWith('//')||target.length>512){
        tinyError(res,400,'invalid_request');return;
      }
      const chunks=[];let length=0;
      for await(const chunk of req){
        length+=chunk.byteLength;
        if(length>MAX_REQUEST){
          tinyError(res,413,'payload_too_large');return;
        }
        chunks.push(chunk);
      }
      const request=new Request('http://127.0.0.1'+target,{
        method:req.method,
        headers:req.headers,
        ...(chunks.length&&req.method!=='GET'&&req.method!=='HEAD'?
          {body:Buffer.concat(chunks),duplex:'half'}:{})
      });
      const result=await handleApiRequest(request,{RUNTIME_MODE:'local'});
      res.writeHead(result.status,Object.fromEntries(result.headers.entries()));
      if(result.body)res.end(Buffer.from(await result.arrayBuffer()));
      else res.end();
    }catch{
      // Never log request URL, address, coordinates or user-entered content.
      if(!res.headersSent)tinyError(res,500,'internal_error');
      else res.end();
    }
  });
  server.requestTimeout=15000;
  server.headersTimeout=12000;
  server.keepAliveTimeout=5000;
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const raw=process.env.PORT||'8787';
  const port=Number(raw);
  if(!Number.isInteger(port)||port<1024||port>65535)
    throw Error('PORT must be an unprivileged port from 1024 to 65535');
  if(process.env.HOST&&process.env.HOST!=='127.0.0.1')
    throw Error('Only HOST=127.0.0.1 is permitted for the local harness');
  createLocalServer().listen(port,'127.0.0.1',()=>{
    process.stdout.write('Local-only API listening on 127.0.0.1:'+port+
      '. Providers disabled; no credentials; no deployment.\n');
  });
}
