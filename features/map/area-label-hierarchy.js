/* Zoom-aware ZIP/place labels. Independent of school, zone and selection layers. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AreaLabelHierarchy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const PREFIX = /^(North|South|East|West|NW|NE|SW|SE)\s+(.+)$/i;
  const SUFFIX = /^(.+?)\s+(North|South|East|West)$/i;

  // An approximate directional description is only displayed when it already
  // exists in the ZIP metadata and matches the canonical city. No invented
  // neighborhood boundary, school assignment, or municipality is implied.
  function directionalDetail(name, city) {
    const raw = String(name || '').trim();
    const canonical = String(city || '').trim();
    if (!raw || !canonical || raw.toLowerCase() === canonical.toLowerCase()) return '';
    const prefixed = raw.match(PREFIX);
    if (prefixed && prefixed[2].toLowerCase() === canonical.toLowerCase()) return raw;
    const suffixed = raw.match(SUFFIX);
    if (suffixed && suffixed[1].toLowerCase() === canonical.toLowerCase()) return raw;
    return '';
  }
  function cityFor(record, places) {
    const canonical = places && places[record.z];
    if (canonical) return String(canonical).trim();
    const name = String(record.name || '').trim();
    if (!name || / County$/i.test(name)) return '';
    const prefixed = name.match(PREFIX);
    if (prefixed) return prefixed[2];
    const suffixed = name.match(SUFFIX);
    return suffixed ? suffixed[1] : name;
  }
  function valid(record) {
    return record && /^[0-9]{5}$/.test(String(record.z)) &&
      Array.isArray(record.ll) && record.ll.length === 2 &&
      Number.isFinite(record.ll[0]) && Number.isFinite(record.ll[1]);
  }

  function buildCandidates(visibleRecords, places, zoom, selectedZip) {
    const records = (visibleRecords || []).filter(valid);
    if (zoom <= 10) {
      const groups = new Map();
      for (const r of records) {
        const city = cityFor(r, places);
        if (!city) continue;
        const key = city.toLocaleLowerCase('en');
        if (!groups.has(key)) groups.set(key, {name: city, count: 0, sumLat: 0, sumLng: 0, selected: false});
        const group = groups.get(key);
        group.count++;
        group.sumLat += r.ll[0];
        group.sumLng += r.ll[1];
        if (r.z === selectedZip) group.selected = true;
      }
      return [...groups.values()]
        .map(g => ({name: g.name, zip: null, level: 'city', selected: g.selected,
          ll: [g.sumLat / g.count, g.sumLng / g.count], count: g.count}))
        .sort((a, b) => Number(b.selected) - Number(a.selected) || b.count - a.count || a.name.localeCompare(b.name));
    }
    return records.map(r => {
      const city = cityFor(r, places);
      const detail = directionalDetail(r.name, city);
      const base = detail || city;
      const name = !base ? r.z : (zoom >= 13 || !detail ? base + ' · ' + r.z : base);
      return {name, zip: r.z, level: zoom >= 13 ? 'zip' : 'region',
        selected: r.z === selectedZip, ll: [r.ll[0], r.ll[1]], count: 1};
    }).sort((a, b) => Number(b.selected) - Number(a.selected) || a.zip.localeCompare(b.zip));
  }
  return {buildCandidates, cityFor, directionalDetail};
});
