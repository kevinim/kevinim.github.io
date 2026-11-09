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
const inspect = ['index.html','dashboard-main.js','reviewed.html'];
const findings = [];
for (const name of inspect) {
  const file = path.join(root,name);
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file,'utf8');
  for (const check of checks) if (check.re.test(text)) findings.push({file:name,category:check.name});
}
for (const name of ['jpm-60min-isochrone-2026-11-04.geojson','jpm-road-times-2026-11-04.json','jpm-outside-dfw.json']) {
  if (fs.existsSync(path.join(root,name))) findings.push({file:name,category:'personalized commute dataset'});
}
if (findings.length) {
  process.stderr.write('PUBLIC PRIVACY GATE: BLOCKED ('+findings.length+' findings)\n');
  for (const f of findings) process.stderr.write('- '+f.file+': '+f.category+'\n');
  process.exitCode = 1;
} else {
  process.stdout.write('PUBLIC PRIVACY GATE: no known personalized commute artifacts found. This is not a full secret or privacy audit.\n');
}
