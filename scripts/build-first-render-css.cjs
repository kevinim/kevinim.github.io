#!/usr/bin/env node
'use strict';
// Deterministic first-render CSS bundling. No npm dependencies, no minifier,
// no CSS semantics changes, no remote fetches and no asset url() rebasing.
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const INPUTS=Object.freeze([
 'features/theme-toggle.css',
 'features/map-control-contrast.css',
 'features/track-b-reference-warning.css',
 'features/commute/sourced-cost.css',
 'features/first-fold-ux.css',
 'features/school-reference-preview.css'
]);
const OUTPUT='features/first-render-ui.bundle.css';
function render(){
 const chunks=['/* AUTO-GENERATED, DO NOT EDIT. Run node scripts/build-first-render-css.cjs. */'];
 for(const source of INPUTS){
  const value=fs.readFileSync(path.join(ROOT,source),'utf8').replace(/\r\n?/g,'\n');
  // Import statements and relative url() would change resolution after moving CSS.
  // Require explicit source review if either is introduced.
  if(/@(?:import|charset)\b|url\s*\(/i.test(value))
   throw new Error('Source requires CSS import/url review: '+source);
  chunks.push('/* SOURCE: '+source+' */\n'+value.trimEnd()+'\n');
 }
 return chunks.join('\n')+'\n';
}
function run(){
 const out=path.join(ROOT,OUTPUT),actual=render();
 const checking=process.argv.includes('--check');
 if(checking){
  if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==actual)
   throw new Error('Stale CSS bundle: run node scripts/build-first-render-css.cjs');
 }else fs.writeFileSync(out,actual,'utf8');
 console.log('First-render CSS '+(checking?'verified':'generated')+
  ': '+INPUTS.length+' sources -> 1 CSS file, '+Buffer.byteLength(actual)+' bytes');
}
if(require.main===module)try{run()}catch(e){console.error(e.message);process.exitCode=1}
module.exports={INPUTS,OUTPUT,render};
