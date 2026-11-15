'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..','..');
function context(fetch){
 const elements=new Map(),listeners={};
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',disabled:false,textContent:'',innerHTML:'',replaceChildren(){},focus(){},addEventListener(){}});return elements.get(id)};
 const ctx={URLSearchParams,URL,AbortController,AbortSignal,DOMException,setTimeout,clearTimeout,fetch,
  DISTRICT_REGISTRY:{},console:{error(){},warn(){}},document:{getElementById:el,addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)}}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'features/commute/provider-requests.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(path.join(root,'dashboard-main.js'),'utf8'),ctx);
 ctx.__inits=0;vm.runInContext('init=()=>{__inits++};toast=()=>{};drawSchools=()=>{};drawList=()=>{};',ctx);
 return {ctx,el,listeners,run:s=>vm.runInContext(s,ctx),loadHome(){vm.runInContext(fs.readFileSync(path.join(root,'home-lookup-v2.js'),'utf8'),ctx)}};
}
const response=json=>({ok:true,status:200,json:async()=>json});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
module.exports={context,response,flush};
