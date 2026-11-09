#!/usr/bin/env node
'use strict';
// Publisher-hosted Dallas ISD school-zone layer metadata/shape probe.
// Never submit a residential address or store/rehost district geometries.
const {load}=require('../dallas-attendance-live.js');
(async()=>{
 const a=await load(fetch);
 if(a.summary.length!==3||a.summary.some(x=>x.campusYearConfirmed!==false))throw Error('missing provenance caveat');
 for(const d of a.summary)console.log(JSON.stringify(d));
 console.log('DALLAS_PUBLIC_GIS_PROBE_VALID',a.features.length,
  'zones; campus 2026-27 vintage remains independently unconfirmed');
})().catch(err=>{console.error('DALLAS_GIS_PROBE_FAILED',err.stack||String(err));process.exitCode=1});
