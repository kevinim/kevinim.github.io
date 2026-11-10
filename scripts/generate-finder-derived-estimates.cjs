'use strict';
// Candidate-only CLI. NEVER publishes to the dashboard's data folder.
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('./finder-derived-estimate-engine.cjs');
const args=process.argv.slice(2);
const demo=args.includes('--demo');
const positional=args.filter(x=>x!=='--demo');
const inputFile=positional[0],outputFile=positional[1];
if(!inputFile||!outputFile){
 console.error('usage: node scripts/generate-finder-derived-estimates.cjs [--demo] INPUT.json artifacts/finder-derived/OUTPUT.json');
 process.exit(2);
}
try{
 const root=process.cwd();
 const file=path.resolve(root,outputFile);
 const safeRoot=path.join(root,'artifacts','finder-derived')+path.sep;
 if(!file.startsWith(safeRoot))throw Error('output_restricted_to_artifacts_only');
 const data=JSON.parse(fs.readFileSync(path.resolve(root,inputFile),'utf8'));
 if(data.demoOnly!==demo)throw Error('demo_flag_mismatch');
 const result=build(data);
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'w',mode:0o600});
 console.log('FINDER_DERIVED_CANDIDATES '+JSON.stringify({
  district:result.metadata.district,status:result.metadata.status,
  demoOnly:result.metadata.demoOnly,features:result.features.length,
  diagnostics:result.metadata.diagnostics,published:false
 }));
 if(!result.features.length)process.exitCode=1;
}catch(e){
 console.error('FINDER_DERIVED_BLOCKED '+String(e.message).replace(/[\r\n]/g,' '));
 process.exitCode=1;
}
