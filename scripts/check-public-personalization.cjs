'use strict';
// P0 public artifact privacy gate. No personal values are printed.
// Run: node scripts/check-public-personalization.cjs [directory]
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || '.');
const checks = [
  {name:'personalized office preset', re:/\bJPM_ADDRESS\b|<option\s+value=["']jpm["']|\bjpm\s*:\s*JPM_ADDRESS/i},
  {name:'precomputed personal commute dataset', re:/jpm-(?:60min-isochrone|road-times|outside-dfw)/i},
  {name:'precomputed personal commute field', re:/\bjpmMinutes\b/i},
  {name:'personal office address', re:/8181\s+Communications\s+(?:Pkwy|Parkway)/i}
];
const findings = [];
const excluded = new Set(['.git','node_modules','.cache','coverage']);
function walk(dir, rel = '') {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (entry.isSymbolicLink()) throw Error('Public artifact contains a symlink: '+entry.name);
    const name = rel ? rel+'/'+entry.name : entry.name;
    if (entry.isDirectory()) {
      if (!excluded.has(entry.name)) walk(path.join(dir,entry.name),name);
      continue;
    }
    if (!entry.isFile()) continue;
    if (/^jpm-(?:60min-isochrone|road-times|outside-dfw)/i.test(entry.name)) {
      findings.push({file:name,category:'personalized commute dataset'});
    }
    if (!/\.?:html|js|json|geojson|css)$/i.test(entry.name)) continue;
    const file = path.join(dir,entry.name);
    if (fs.statSync(file).size > 8*1024*1024) continue;
    const content = fs.readFileSync(file,'utf8');
    for (const check of checks) if (check.re.test(content)) findings.push({file:name,category:check.name});
  }
}
walk(root);
if (findings.length) {
  process.stderr.write('PUBLIC PRIVACY GATE: BLOCKED ('+findings.length+' findings)\n');
  for (const f of findings) process.stderr.write('- '+f.file+': '+f.category+'\n');
  process.exitCode = 1;
} else {
  process.stdout.write('PUBLIC PRIVACY GATE: no known personalized commute artifacts found. This is not a full secret or privacy audit.\n');
}
