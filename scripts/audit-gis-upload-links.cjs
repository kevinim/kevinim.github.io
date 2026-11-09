#!/usr/bin/env node
'use strict';
// Read-only source and link-trust audit for school district links and GIS text.
// Does not modify the dashboard or certify every DOM source-to-sink flow.
const fs = require('node:fs');
const path = require('node:path');
const { DISTRICT_REGISTRY } = require('../district-registry.js');
const { knownBoundaryException } = require('../school-boundary-match.js');
const {assertVersionedMainBootstrap}=require('./dashboard-bootstrap-contract.cjs');

const TRUSTED_OFFICIAL_HOSTS = Object.freeze([
  'www.friscoisd.org', 'www.prosper-isd.net', 'www.allenisd.org',
  'www.lisd.net', 'www.pisd.edu', 'www.cfbisd.edu',
  'earlycollege.cfbisd.edu', 'www.mckinneyisd.net',
  'portal.metrostudygis.com', 'txschools.gov',
  'apps.myplanware.com', 'www.kellerisd.net', 'www.nisdtx.org',
  'www.gcisd.net', 'www.southlakecarroll.edu', 'www.westlakeacademy.org',
  'enrollment.fwisd.org','www.aisd.net','www.mansfieldisd.org','www.gpisd.org',
  'www.emsisd.com','www.birdvilleschools.net','www.crowleyisdtx.org','www.burlesonisd.net',
  'www.wisd.org', 'www.duncanvilleisd.org', 'www.midlothianisd.org', 'www.c-isd.com', 'www.aledoisd.org', 'www.weatherfordisd.com', 'www.azleisd.net', 'enroll.chisd.net', 'www.desotoisd.org', 'www.lancasterisd.org', 'www.redoakisd.org', 'www.crandall-isd.net',
  'www.rcisd.org', 'www.ennis.k12.tx.us', 'www.eisd.org', 'www.greenvilleisd.com', 'www.joshuaisd.org', 'www.terrellisd.org', 'www.aubreyisd.net', 'www.hpisd.org',
  'www.springtownisd.net', 'www.wsisd.com', 'www.castleberryisd.net', 'www.kaufmanisd.net', 'www.caddomillsisd.org', 'www.decaturisd.us', 'www.ferrisisd.org', 'www.lovejoyisd.net','www.sangerisd.net','www.kempisd.org','www.mabankisd.net','www.ldisd.net','www.alvaradoisd.net','www.godleyisd.net','www.krumisd.net','www.kennedaleisd.net','www.boydisd.net','www.brockisd.net','www.lwisd.org','www.peaster.net','www.pilotpointisd.com','www.bridgeportisd.net','www.commerceisd.org','www.farmersvilleisd.net','www.sunnyvaleisd.com','www.ponderisd.net','www.quinlanisd.net','www.keeneisd.org','www.venusisd.net','www.pisd.net','www.brisd.net','www.maypearlisd.org','www.palmer-isd.org','www.blandisd.us','www.bolesisd.com','www.celesteisd.org','www.loneoakisd.net','www.wcisd.net','www.gvisd.org','www.rvisd.net','www.scurry-rosser.com','www.millsapisd.net','www.poolville.net','www.alvordisd.net','www.italyisd.org','www.campbellisd.org','www.avalonisd.net','www.milfordisd.org','www.garnerisd.net','www.slidellisd.net',
  'www.wylieisd.net', 'www.melissaisd.org', 'www.celinaisd.com', 'www.littleelmisd.net', 'www.dentonisd.org', 'www.coppellisd.com', 'web.risd.org', 'www.princetonisd.net', 'www.annaisd.org', 'www.argyleisd.com', 'www.garlandisd.net', 'www.hebisd.edu', 'www.rockwallisd.com', 'mesquiteisd.org', 'www.irvingisd.net', 'www.forneyisd.net', 'www.dallasisd.org', 'www.communityisd.org',
]);

const SPECIAL_CAMPUSES = Object.freeze([
  { district: 'PISD', name: 'Academy High School' },
  { district: 'AISD', name: 'Lowery Freshman Center' },
  { district: 'LISD', name: 'Mill Street Elementary' },
  { district: '043907', name: 'McNeil Elementary School' },
  { district: '043907', name: 'Serenity High School' },
  { district: '043907', name: 'Caldwell Elementary School' },
  { district: 'CFB', name: 'Early College High School' },
]);

function checkOfficialUrl(value, hosts = TRUSTED_OFFICIAL_HOSTS) {
  if (typeof value !== 'string' || value.length > 2048 ||
      !value.startsWith('https://') || /[\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.username === '' && u.password === '' &&
      u.port === '' && hosts.includes(u.hostname) &&
      !/\\/.test(value.slice('https://'.length).split('/')[0]);
  } catch { return false; }
}

function auditSchoolBoundaryTrust(files, registry = DISTRICT_REGISTRY) {
  const errors = [], warnings = [];
  const page = files?.['index.html'] || '';
  const main = files?.['dashboard-main.js'] || '';
  const source = page+'\n'+main;
  const legacy = files?.['reviewed.html'] || '';
  const legacyScript = files?.['features/reviewed-bootstrap.js'] || '';
  const uploadGuard = files?.['features/geojson-upload-guard.js'] || '';
  const match = files?.['school-boundary-match.js'] || '';
  let validBootstrap=false;
  try { assertVersionedMainBootstrap(page); validBootstrap=true; } catch {}
  if (!page || !main || !validBootstrap || !legacy || !legacyScript || !uploadGuard || !match) {
    errors.push('Missing required school boundary source files');
    return {errors, warnings, inventory: null};
  }
  const checked = [];
  for (const [code, district] of Object.entries(registry)) {
    checked.push(code);
    if (!checkOfficialUrl(district?.official)) errors.push(code + ': invalid official district URL/protocol/host');
  }
  for (const sample of SPECIAL_CAMPUSES) {
    const exception = knownBoundaryException(sample);
    if (!exception || !checkOfficialUrl(exception.sourceUrl)) {
      errors.push(sample.district + '/' + sample.name + ': missing or unsafe official exception URL');
    }
  }
  // Present production behavior must not start treating untrusted missing-boundary
  // explanations as HTML. The textContent calls are monitored verbatim.
  for (const marker of [
    'heading.textContent=failure.reason',
    "footnote.textContent='경계 미표시 각주 · '+failure.footnote",
    'sourceLink.textContent=failure.sourceLinkLabel',
  ]) {
    if (!source.includes(marker)) errors.push('main school GIS warning is no longer text-only: ' + marker);
  }
  if (!source.includes('failure.sourceUrl&&window.TrustedLinkPolicy?.official(failure.sourceUrl)') ||
      !source.includes('sourceLink.href=window.TrustedLinkPolicy.official(failure.sourceUrl)') ||
      !source.includes('<script src="./trusted-link-policy.js?v=1"></script>'))
    errors.push('main official evidence-link is no longer verified by the exact-host HTTPS policy');
  if (!legacy.includes('src="./features/geojson-upload-guard.js?v=1"') ||
      !legacy.includes('src="./features/reviewed-bootstrap.js?v=1"') ||
      !legacyScript.includes('function loadBoundaryFile(') ||
      !legacyScript.includes('SchoolGeoJSONGuard.assertFileSize') ||
      !legacyScript.includes('SchoolGeoJSONGuard.validate') ||
      !uploadGuard.includes('fileBytes:4*1024*1024') ||
      !uploadGuard.includes('totalVertices:50000') ||
      !uploadGuard.includes("source.type!=='FeatureCollection'") ||
      !uploadGuard.includes("['Polygon','MultiPolygon'].includes(geom.type)")) {
    errors.push('legacy uploaded-GeoJSON entrypoint changed; verify external bootstrap, file and geometry limits');
  }
  if (!legacyScript.includes('j.features.map(f=>escape(f.properties.YearUpdated')) {
    errors.push('legacy Allen historical date is no longer explicitly escaped before HTML insertion');
  }
  if (!source.includes("results.map(escape).join('<br>')")) {
    warnings.push('main remote school-loader status output changed; review untrusted error messages');
  }
  warnings.push('Legacy reviewed.html now enforces browser-side GeoJSON limits; this is not a guarantee against every resource-exhaustion case or external data poisoning.');
  warnings.push('Source URL allowlist now guards the main missing-boundary evidence link at runtime; verify the exact-host policy remains current when official domains change.');
  warnings.push('Remote school GIS polygon labels and Leaflet data paths require browser verification; no exploit or integrity guarantee established.');
  return {errors, warnings, inventory: {districts: checked.length, exceptionLinks: SPECIAL_CAMPUSES.length, filesReviewed: 5}};
}

function run() {
  const root = path.resolve(__dirname, '..');
  const files = Object.fromEntries(['index.html','dashboard-main.js','reviewed.html','features/reviewed-bootstrap.js','features/geojson-upload-guard.js','school-boundary-match.js']
    .map(p => [p, fs.readFileSync(path.join(root,p),'utf8')]));
  const r = auditSchoolBoundaryTrust(files);
  if (r.inventory) console.log('GIS official links: ' + r.inventory.districts + ' districts; ' + r.inventory.exceptionLinks + ' special-campus source links');
  for (const w of r.warnings) console.log('FOLLOW-UP: ' + w);
  for (const e of r.errors) console.error('FAIL: ' + e);
  if (r.errors.length) process.exitCode=1;
  else console.log('PASS: tracked GIS text sinks and official link source contract are unchanged; no full XSS certification');
}
if (require.main === module) run();
module.exports={checkOfficialUrl,auditSchoolBoundaryTrust,SPECIAL_CAMPUSES,TRUSTED_OFFICIAL_HOSTS};
