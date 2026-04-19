# Reddit Post Drafts

> Author: u/Kingleyend (Reddit) / Osyanne (GitHub)
> Post these AFTER creating the GitHub repo and uploading screenshots.
> Replace `[SCREENSHOT: ...]` placeholders with actual image uploads.

---

## Post 1 — r/CitiesSkylines + r/CitiesSkylinesModding

**Title:**
```
I built a free GIS tool to extract real-world zoning data from OpenStreetMap for CS2 maps — Minneapolis 1:1 v1.0 [OC]
```

**Body:**

---

Hey r/CitiesSkylines!

After months of work on my Minneapolis 1:1 recreation in CS2, I've open-sourced the GIS pipeline I built to generate the zoning layer. Figured the community might find it useful.

**What it does:**
Pulls real zoning polygons directly from OpenStreetMap (Overpass API) and classifies them into CS2-native zone types automatically:

| Real World                    | CS2 Zone                                    |
|-------------------------------|---------------------------------------------|
| landuse=residential + ≥5 fl.  | North American High Density Residential     |
| landuse=residential + ≥3 fl.  | North American Medium Density Residential   |
| landuse=residential (default) | North American Low Density Residential      |
| landuse=commercial + ≥4 fl.   | North American High Density Commercial      |
| landuse=commercial (default)  | North American Low Density Commercial       |
| landuse=retail                | North American Retail Hub                   |
| landuse=industrial            | North American Industrial Zone              |
| amenity=parking + multi-storey| Parking Garage / Ramp                       |
| amenity=parking (default)     | Surface Parking Lot                         |
| building=office               | Office / Government Building                |
| landuse=mixed                 | Mixed-Use Development                       |

**What's included in the repo:**
- Python extraction script (runs in ~15 minutes)
- Interactive Leaflet.js visualizer with dark map (CartoDB Dark Matter)
- Full methodology explaining every design decision
- Guide to adapt it to ANY city, not just Minneapolis

**Tech stack:** Python + uv, Overpass API, Leaflet.js. All 100% free, no API keys.

**Coverage:** Full city of Minneapolis + immediate borders (~44.86,-93.38 to 45.05,-93.17)

[SCREENSHOT: preview_full.png]
[SCREENSHOT: preview_downtown.png]

GitHub: https://github.com/Osyanne/cs2-minneapolis-zoning

Happy to answer questions about the methodology or help anyone adapt this to their own city. The density thresholds (≥5 floors = high density) were calibrated specifically for Minneapolis — other cities may need adjustment.

---

## Post 2 — r/gis

**Title:**
```
Free pipeline: OpenStreetMap → Leaflet.js zoning visualizer, built for Cities Skylines 2 but works for any urban analysis [OC]
```

**Body:**

---

Sharing a small open-source project that might interest the OSM/GIS community.

I needed real zoning data for a 1:1 recreation of Minneapolis in Cities: Skylines 2. Instead of using proprietary city GIS portals, I built a pipeline entirely on top of OpenStreetMap via the Overpass API.

**Technical highlights:**

1. **Sequential queries, not one mega-query**
   Splitting by category (residential/commercial/industrial/etc.) avoids the 504 timeouts that kill large bbox queries on public Overpass instances.

2. **Two-pass density classification**
   First pass: index all `building:levels` tags from apartment footprints.
   Second pass: when classifying `landuse=residential` polygons, look up the max floor count from buildings within each polygon to infer density. Simple but effective without needing spatial joins.

3. **Multi-endpoint rotation with exponential backoff**
   Rotates across 4 community Overpass endpoints (overpass-api.de, kumi.systems, openstreetmap.ru, maps.mail.ru) with 3s/6s/12s backoff. Practically eliminates failures on large bboxes.

4. **Zero dependencies beyond Python + requests**
   No PostGIS, no QGIS, no GeoPandas. Everything runs in a single script.

**Output:** A JavaScript data file with classified polygon arrays, rendered via Leaflet.js on a CartoDB Dark Matter basemap. The dark basemap is intentional — it mirrors the CS2 map editor aesthetic.

[SCREENSHOT: preview_full.png]

GitHub: https://github.com/Osyanne/cs2-minneapolis-zoning

The pipeline should work for any city with decent OSM coverage. Methodology doc explains all the classification decisions and edge cases.

---

## Post 3 — r/openstreetmap

**Title:**
```
I used Overpass API to extract and classify zoning data for a 1:1 city recreation in Cities Skylines 2 — full pipeline open sourced [OC]
```

**Body:**

---

Sharing a small open-source project that might interest the OSM/GIS community.

I needed real zoning data for a 1:1 recreation of Minneapolis in Cities: Skylines 2. Instead of using proprietary city GIS portals, I built a pipeline entirely on top of OpenStreetMap via the Overpass API.

**Technical highlights:**

1. **Sequential queries, not one mega-query**
   Splitting by category (residential/commercial/industrial/etc.) avoids the 504 timeouts that kill large bbox queries on public Overpass instances.

2. **Two-pass density classification**
   First pass: index all `building:levels` tags from apartment footprints.
   Second pass: when classifying `landuse=residential` polygons, look up the max floor count from buildings within each polygon to infer density. Simple but effective without needing spatial joins.

3. **Multi-endpoint rotation with exponential backoff**
   Rotates across 4 community Overpass endpoints (overpass-api.de, kumi.systems, openstreetmap.ru, maps.mail.ru) with 3s/6s/12s backoff. Practically eliminates failures on large bboxes.

4. **Zero dependencies beyond Python + requests**
   No PostGIS, no QGIS, no GeoPandas. Everything runs in a single script.

**Output:** A JavaScript data file with classified polygon arrays, rendered via Leaflet.js on a CartoDB Dark Matter basemap. The dark basemap is intentional — it mirrors the CS2 map editor aesthetic.

[SCREENSHOT: preview_full.png]

GitHub: https://github.com/Osyanne/cs2-minneapolis-zoning

The pipeline should work for any city with decent OSM coverage. Methodology doc explains all the classification decisions and edge cases.

---

## Posting checklist

- [ ] GitHub repo is public and accessible
- [ ] Screenshots uploaded to the repo (so Reddit image embeds work from GitHub)
- [ ] Preview images show in the repo README
- [ ] Post to r/CitiesSkylines first (largest audience)
- [ ] Cross-post to r/CitiesSkylinesModding
- [ ] Post separately (not cross-post) to r/gis and r/openstreetmap with adapted text
- [ ] Reply to comments within first hour for visibility boost
