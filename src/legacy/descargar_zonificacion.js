/**
 * descargar_zonificacion.js — v2
 * Minneapolis Zonificación · bbox expandido · Oficinas · Uso Mixto
 * Ejecutar: node descargar_zonificacion.js
 */
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const OUT_FILE = path.join(__dirname, 'datos_zonificacion.js');
const BBOX     = '44.86,-93.38,45.05,-93.17';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const data = Buffer.from(body, 'utf8');
    const req = mod.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': data.length,
        'User-Agent':     'Minneapolis-Realism/2.0'
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0, 200)}`));
        } else {
          resolve(Buffer.concat(chunks).toString('utf8'));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function queryWithRetry(query, label) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const ep of ENDPOINTS) {
      try {
        process.stdout.write(`  ${label} -> ${ep.split('/')[2]} (intento ${attempt})... `);
        const r = await post(ep, 'data=' + encodeURIComponent(query));
        console.log(`OK (${(r.length / 1024).toFixed(0)} KB)`);
        return r;
      } catch (e) {
        console.log(`FALLO: ${e.message.slice(0, 60)}`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  throw new Error(`No se pudo descargar: ${label}`);
}

function coordsFromWay(el) {
  if (!el.geometry || el.geometry.length < 3) return null;
  return el.geometry.map(pt => [pt.lat, pt.lon]);
}

function coordsFromRelation(el) {
  if (!el.members) return null;
  const outers = el.members.filter(m => m.role === 'outer' && m.geometry && m.geometry.length > 2);
  if (!outers.length) return null;
  outers.sort((a, b) => b.geometry.length - a.geometry.length);
  return outers[0].geometry.map(pt => [pt.lat, pt.lon]);
}

function extractCoords(el) {
  return el.type === 'way' ? coordsFromWay(el) : coordsFromRelation(el);
}

function residentialZone(tags, buildingIndex, elId) {
  const levels    = parseInt(tags['building:levels'] || tags['levels'] || '0', 10);
  const res       = (tags.residential || '').toLowerCase();
  const bld       = (tags.building    || '').toLowerCase();
  const idxLevels = buildingIndex.get(elId) || 0;
  const effective = Math.max(levels, idxLevels);

  if (effective >= 5 || res === 'apartments' || res === 'condominium' || res === 'condo') return 'high';
  if (effective >= 3 || bld === 'terrace' || bld === 'dormitory' || bld === 'townhouse' ||
      res === 'townhouse' || res === 'dormitory' || res === 'semi') return 'medium';
  return 'low';
}

const CS2_LABELS = {
  res_high:    'North American High Density Residential',
  res_med:     'North American Medium Density Residential',
  res_low:     'North American Low Density Residential',
  com_high:    'North American High Density Commercial',
  com_low:     'North American Low Density Commercial',
  retail:      'North American Retail Hub',
  industrial:  'North American Industrial Zone',
  prk_ramp:    'Parking Garage / Ramp',
  prk_surface: 'Surface Parking Lot',
  office:      'Office / Government Building',
  mixed:       'Mixed-Use Development',
};

const QUERIES = {
  buildings_levels: `[out:json][timeout:120];\nway["building"="apartments"]["building:levels"](${BBOX});\nout ids tags;`,
  residential: `[out:json][timeout:180];\n(way["landuse"="residential"](${BBOX});relation["landuse"="residential"](${BBOX}););\nout geom;`,
  commercial:  `[out:json][timeout:180];\n(way["landuse"="commercial"](${BBOX});relation["landuse"="commercial"](${BBOX}););\nout geom;`,
  industrial:  `[out:json][timeout:180];\n(way["landuse"="industrial"](${BBOX});relation["landuse"="industrial"](${BBOX});way["building"~"^(industrial|warehouse|factory)$"](${BBOX}););\nout geom;`,
  retail:      `[out:json][timeout:180];\n(way["landuse"="retail"](${BBOX});relation["landuse"="retail"](${BBOX}););\nout geom;`,
  parking:     `[out:json][timeout:180];\n(way["amenity"="parking"](${BBOX});relation["amenity"="parking"](${BBOX}););\nout geom;`,
  office:      `[out:json][timeout:180];\n(way["building"="office"](${BBOX});relation["building"="office"](${BBOX});way["office"](${BBOX});relation["office"](${BBOX});way["landuse"="office"](${BBOX}););\nout geom;`,
  mixed:       `[out:json][timeout:180];\n(way["landuse"="mixed"](${BBOX});relation["landuse"="mixed"](${BBOX});way["building"="mixed_use"](${BBOX});relation["building"="mixed_use"](${BBOX}););\nout geom;`,
};

async function main() {
  console.log('[0/5] Minneapolis Zonificacion v2');
  console.log(`      Bounding Box: ${BBOX}\n`);

  console.log('[1/5] Construyendo indice de densidad...');
  const bldRaw = await queryWithRetry(QUERIES.buildings_levels, 'buildings_levels');
  const bldEls = JSON.parse(bldRaw).elements || [];
  const buildingIndex = new Map();
  for (const el of bldEls) {
    const lvl = parseInt((el.tags || {})['building:levels'] || '0', 10);
    if (lvl > 0) buildingIndex.set(el.id, lvl);
  }
  console.log(`      Indice: ${buildingIndex.size} edificios con datos de niveles\n`);

  const MAIN = ['residential', 'commercial', 'industrial', 'retail', 'parking', 'office', 'mixed'];
  console.log('[2/5] Descargando poligonos (7 consultas)...');
  const results = {};
  for (const key of MAIN) {
    const raw = await queryWithRetry(QUERIES[key], key);
    results[key] = JSON.parse(raw).elements || [];
    console.log(`      ${key}: ${results[key].length} elementos`);
  }

  console.log('\n[3/5] Clasificando...');
  const DATA_RESIDENTIAL = [];
  const DATA_COMMERCIAL  = [];
  const DATA_INDUSTRIAL  = [];
  const DATA_RETAIL      = [];
  const DATA_PARKING     = [];
  const DATA_OFFICE      = [];
  const DATA_MIXED       = [];
  let skipped = 0;

  // Commercial must run first — populates commercialIds used to dedup office elements below
  const commercialIds = new Set();
  for (const el of results.commercial) {
    commercialIds.add(el.id);
    const tags   = el.tags || {};
    const coords = extractCoords(el);
    if (!coords) { skipped++; continue; }
    const lvl  = parseInt(tags['building:levels'] || tags['levels'] || '1', 10);
    const zone = lvl >= 4 ? 'high' : 'low';
    DATA_COMMERCIAL.push({
      id: el.id, name: tags.name || 'Sin nombre', coords, zone,
      cs2: zone === 'high' ? CS2_LABELS.com_high : CS2_LABELS.com_low
    });
  }

  for (const el of results.residential) {
    const tags   = el.tags || {};
    const coords = extractCoords(el);
    if (!coords) { skipped++; continue; }
    const zone = residentialZone(tags, buildingIndex, el.id);
    const cs2  = zone === 'high' ? CS2_LABELS.res_high
               : zone === 'medium' ? CS2_LABELS.res_med
               : CS2_LABELS.res_low;
    DATA_RESIDENTIAL.push({ id: el.id, name: tags.name || 'Sin nombre', coords, zone, cs2 });
  }

  for (const el of results.industrial) {
    const tags   = el.tags || {};
    const coords = extractCoords(el);
    if (!coords) { skipped++; continue; }
    DATA_INDUSTRIAL.push({
      id: el.id, name: tags.name || 'Sin nombre', coords,
      zone: 'industrial', cs2: CS2_LABELS.industrial
    });
  }

  for (const el of results.retail) {
    const tags   = el.tags || {};
    const coords = extractCoords(el);
    if (!coords) { skipped++; continue; }
    DATA_RETAIL.push({
      id: el.id, name: tags.name || 'Sin nombre', coords,
      zone: 'retail', cs2: CS2_LABELS.retail
    });
  }

  for (const el of results.parking) {
    const tags    = el.tags || {};
    const coords  = extractCoords(el);
    if (!coords) { skipped++; continue; }
    const parking = (tags.parking || '').toLowerCase();
    const zone    = (parking === 'multi-storey' || parking === 'multistorey' ||
                     parking === 'structure'    || parking === 'underground')
                    ? 'ramp' : 'surface';
    DATA_PARKING.push({
      id: el.id, name: tags.name || 'Sin nombre', coords, zone,
      cs2: zone === 'ramp' ? CS2_LABELS.prk_ramp : CS2_LABELS.prk_surface
    });
  }

  for (const el of results.office) {
    if (commercialIds.has(el.id)) continue;
    const tags   = el.tags || {};
    const coords = extractCoords(el);
    if (!coords) { skipped++; continue; }
    DATA_OFFICE.push({
      id: el.id, name: tags.name || 'Sin nombre', coords,
      zone: 'office', cs2: CS2_LABELS.office
    });
  }

  for (const el of results.mixed) {
    const tags   = el.tags || {};
    const coords = extractCoords(el);
    if (!coords) { skipped++; continue; }
    DATA_MIXED.push({
      id: el.id, name: tags.name || 'Sin nombre', coords,
      zone: 'mixed', cs2: CS2_LABELS.mixed
    });
  }

  const total = DATA_RESIDENTIAL.length + DATA_COMMERCIAL.length + DATA_INDUSTRIAL.length +
                DATA_RETAIL.length + DATA_PARKING.length + DATA_OFFICE.length + DATA_MIXED.length;

  console.log('\n[4/5] Resumen:');
  const hi  = DATA_RESIDENTIAL.filter(f => f.zone === 'high').length;
  const med = DATA_RESIDENTIAL.filter(f => f.zone === 'medium').length;
  const lo  = DATA_RESIDENTIAL.filter(f => f.zone === 'low').length;
  console.log(`  Residencial alta/media/baja : ${hi} / ${med} / ${lo}`);
  console.log(`  Comercial alta/baja         : ${DATA_COMMERCIAL.filter(f=>f.zone==='high').length} / ${DATA_COMMERCIAL.filter(f=>f.zone==='low').length}`);
  console.log(`  Industrial                  : ${DATA_INDUSTRIAL.length}`);
  console.log(`  Retail                      : ${DATA_RETAIL.length}`);
  console.log(`  Parking                     : ${DATA_PARKING.length}`);
  console.log(`  Oficinas NUEVO              : ${DATA_OFFICE.length}`);
  console.log(`  Uso Mixto NUEVO             : ${DATA_MIXED.length}`);
  console.log(`  Sin geometria (omitidos)    : ${skipped}`);
  console.log(`  TOTAL                       : ${total}`);

  console.log('\n[5/5] Escribiendo datos_zonificacion.js...');
  const js = [
    '// Generado automaticamente -- ' + new Date().toISOString(),
    '// Minneapolis Zonificacion v2 -- bbox: ' + BBOX,
    '',
    'const DATA_RESIDENTIAL = ' + JSON.stringify(DATA_RESIDENTIAL) + ';',
    'const DATA_COMMERCIAL  = ' + JSON.stringify(DATA_COMMERCIAL)  + ';',
    'const DATA_INDUSTRIAL  = ' + JSON.stringify(DATA_INDUSTRIAL)  + ';',
    'const DATA_RETAIL      = ' + JSON.stringify(DATA_RETAIL)      + ';',
    'const DATA_PARKING     = ' + JSON.stringify(DATA_PARKING)     + ';',
    'const DATA_OFFICE      = ' + JSON.stringify(DATA_OFFICE)      + ';',
    'const DATA_MIXED       = ' + JSON.stringify(DATA_MIXED)       + ';',
  ].join('\n');

  fs.writeFileSync(OUT_FILE, js, 'utf8');
  const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`\nListo. ${OUT_FILE} -- ${sizeMB} MB -- ${total} poligonos`);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
