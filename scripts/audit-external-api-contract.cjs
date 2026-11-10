#!/usr/bin/env node
'use strict';

/**
 * Read-only contract checks for user-entered address / route information.
 * Scans source structure; never sends user input or makes network requests.
 *
 * A green result means documented, known integration markers remain intact.
 * It does NOT establish compliance with provider quotas, licenses or privacy law.
 */
const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_FILES = Object.freeze([
  'index.html',
  'dashboard-main.js',
  'reviewed.html',
  'features/reviewed-bootstrap.js',
  'texas-address-suggest.js',
  'home-lookup-v2.js',
  'collin-parcel-check.js',
]);

function auditProviderContract(files) {
  const errors = [];
  const warnings = [];
  const get = name => typeof files?.[name] === 'string' ? files[name] : '';
  for (const name of REQUIRED_FILES) {
    if (!get(name)) errors.push('missing required source: ' + name);
  }
  if (errors.length) return { errors, warnings, coverage: null };

  const main = get('index.html')+'\n'+get('dashboard-main.js');
  if(!get('index.html').includes('<script src="./dashboard-main.js?v=4"></script>'))errors.push('main external bootstrap tag missing');
  const archivedHtml = get('reviewed.html');
  const archivedBootstrap = get('features/reviewed-bootstrap.js');
  const archived = archivedHtml+'\n'+archivedBootstrap;
  if(!archivedHtml.includes('src="./features/reviewed-bootstrap.js?v=1"'))errors.push('legacy reviewed bootstrap script reference removed');
  const suggest = get('texas-address-suggest.js');
  const home = get('home-lookup-v2.js');
  const parcel = get('collin-parcel-check.js');

  const requiredMarkers = [
    ['main-destination-Nominatim', main, 'https://nominatim.openstreetmap.org/search'],
    ['main-route-OSRM', main, 'https://router.project-osrm.org/table/v1/driving/'],
    ['home-geocode-Esri', home, 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'],
    ['home-route-OSRM', home, 'https://router.project-osrm.org/route/v1/driving/'],
    ['home-autocomplete-Esri', suggest, 'https://geocode.arcgis.com'],
    ['parcel-CollinCAD', parcel, 'https://services2.arcgis.com/'],
    ['legacy-destination-Nominatim', archived, 'https://nominatim.openstreetmap.org/search'],
    ['legacy-route-OSRM', archived, 'https://router.project-osrm.org/table/v1/driving/'],
  ];
  for (const [code, source, marker] of requiredMarkers) {
    if (!source.includes(marker)) errors.push('provider contract changed without review: ' + code);
  }

  if (/nominatim\.openstreetmap\.org/i.test(suggest)) {
    errors.push('forbidden integration: Nominatim public server used by house-address autocomplete');
  }
  if (!/forStorage\s*:\s*['"]false['"]/.test(home)) {
    errors.push('Esri home geocoder no longer explicitly requests forStorage=false');
  }
  if (!/outFields\s*:\s*['"]OBJECTID,situsConcat,propYear['"]/.test(parcel)) {
    errors.push('parcel fetch field allowlist changed; review owner/PII exposure');
  }
  if (!main.includes('id="homePrivacy"') || !main.includes('Esri') ||
      !main.includes('OSRM') || !main.includes('Collin CAD') || !main.includes('Google Maps')) {
    errors.push('home address external-disclosure element or known provider names removed');
  }
  for (const [name, body] of [['index.html', main], ['reviewed.html + reviewed-bootstrap.js', archived]]) {
    const canonicalTile = body.includes('https://tile.openstreetmap.org/');
    const legacySubdomainTile = body.includes('https://{s}.tile.openstreetmap.org/');
    if (!canonicalTile && !legacySubdomainTile) {
      errors.push(name + ': no recognized OSM HTTPS tile endpoint');
    }
    if (legacySubdomainTile) {
      warnings.push(name + ': legacy {s}.tile.openstreetmap.org subdomain endpoint is not the current canonical OSM tile URL; migrate in a separate UI PR');
    }
    if (!body.includes('OpenStreetMap contributors')) {
      errors.push(name + ': visible OSM attribution source marker missing');
    }
    if (body.includes('http://tile.openstreetmap.org/') ||
        body.includes('http://{s}.tile.openstreetmap.org/')) {
      errors.push(name + ': insecure OSM tile protocol');
    }
  }

  // These issues are known open items, not evidence of noncompliance.
  if (!/privacy|개인정보|외부\s*서비스|주소\s*전송/i.test(archived)) {
    warnings.push('reviewed.html: verify destination-search data-sharing disclosure if public entrypoint remains accessible');
  }
  warnings.push('Nominatim and OSRM public demos require aggregate rate limits; independent static browsers cannot enforce cross-user quotas');
  warnings.push('Nominatim/OSRM usage policies and Esri/OSM tile licensing need owner-approved public provider plan');
  warnings.push('Static markers are not an HTTP traffic measurement, runtime network interception, or provider-side licensing check');

  return {
    errors,
    warnings,
    coverage: {
      reviewedFiles: REQUIRED_FILES.length,
      monitoredProviderMarkers: requiredMarkers.length,
      addressesSentByBrowser: ['destination text', 'partial residential address', 'full residential address', 'route coordinates', 'optional parcel coordinates'],
    },
  };
}

function main() {
  const root = path.resolve(__dirname, '..');
  const files = Object.fromEntries(REQUIRED_FILES.map(name => [
    name, fs.readFileSync(path.join(root, name), 'utf8'),
  ]));
  const report = auditProviderContract(files);
  if (report.coverage) {
    console.log('Provider source paths checked: ' + report.coverage.reviewedFiles);
    console.log('Known provider markers checked: ' + report.coverage.monitoredProviderMarkers);
  }
  for (const warning of report.warnings) console.log('FOLLOW-UP: ' + warning);
  for (const error of report.errors) console.error('ERROR: ' + error);
  if (report.errors.length) {
    console.error('FAIL: Existing external provider/privacy contract has changed.');
    process.exitCode = 1;
  } else {
    console.log('PASS: Tracked provider integration and disclosure markers are intact.');
    console.log('NOT CERTIFIED: provider quotas, user consent, live network privacy or public scale.');
  }
}

if (require.main === module) main();
module.exports = { REQUIRED_FILES, auditProviderContract };
