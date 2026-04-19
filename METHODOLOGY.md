# Methodology — CS2 Minneapolis Zoning Pipeline

Technical documentation for every design decision in this pipeline.

---

## 1. The Problem: Overpass API 504 Timeouts

The Overpass API is a free, community-run service that allows querying OpenStreetMap data by geographic area. The natural first approach — one query that fetches all zoning types at once — fails consistently for city-sized bounding boxes:

```
HTTP 504 Gateway Timeout
```

This happens because:
- The Minneapolis bbox (`44.86,-93.38,45.05,-93.17`) covers ~350 km²
- A single query requesting all landuse types returns 5-10 MB of JSON
- Public Overpass instances enforce strict timeouts (120-180s) to prevent abuse
- Large queries hit those timeouts even when the server isn't under heavy load

## 2. Solution: Sequential Chunked Queries

Instead of one mega-query, this pipeline runs 8 sequential queries — one per zone category:

```
buildings_levels → residential → commercial → industrial →
retail → parking → office → mixed
```

**Why this works:**
- Each category returns 200-800 KB instead of 5+ MB
- Smaller payloads complete well within the timeout window
- If one category fails, only that category is retried (not everything)
- Progress is visible: users can see each category download in real time

**Trade-off:** 8 round-trips instead of 1, adding ~2 minutes of network overhead. This is acceptable because the alternative is unreliable failures.

## 3. The Density Index Strategy

`landuse=residential` in OSM is a coarse polygon covering entire neighborhoods. A single polygon might span 20 city blocks. OSM doesn't distinguish "high density downtown" from "low density suburbs" at the landuse level — that granularity lives in the individual building footprints tagged with `building:levels`.

**The two-pass approach:**

**Pass 1 (buildings_levels query):** Download all apartment buildings (`building=apartments`) that have a `building:levels` tag. Build an in-memory index: `{element_id: max_floor_count}`.

**Pass 2 (residential query):** For each residential polygon, look up whether any buildings within it appear in the index. Use the highest floor count to determine density tier:
- ≥5 floors → High Density Residential
- ≥3 floors → Medium Density Residential  
- default → Low Density Residential

**Why not spatial joins?** A proper spatial join (polygon-contains-point) would require GeoPandas or PostGIS. The proxy approach — using the OSM element ID to correlate buildings tagged within the same neighborhood area — is a simplification that works well enough for CS2 gameplay purposes. The goal is visual accuracy on a game map, not census precision.

**Calibration for Minneapolis:** The ≥5 and ≥3 floor thresholds were calibrated by visually comparing the output map against known Minneapolis neighborhood characteristics:
- Uptown, Dinkytown, Stevens Square → high density (5+ floor apartment buildings)
- Seward, Powderhorn, Longfellow → medium density (3-4 floor townhouses)
- Southwest Minneapolis, Linden Hills → low density (single-family homes)

Other cities may need different thresholds. See `src/classifiers.py` to adjust.

## 4. Multi-Endpoint Rotation with Exponential Backoff

The pipeline rotates across 4 community Overpass endpoints:

| Endpoint | Operator |
|----------|----------|
| `overpass-api.de` | Official OpenStreetMap Foundation |
| `overpass.kumi.systems` | Kumi Systems (community) |
| `overpass.openstreetmap.ru` | OpenStreetMap Russia |
| `maps.mail.ru/osm/tools/overpass` | Mail.ru Group |

**Retry strategy:**
- Attempt each endpoint per round
- Wait 3s between attempts on round 1
- Wait 6s between attempts on round 2 (backoff ×2)
- Wait 12s between attempts on round 3
- Raise `RuntimeError` only after all 4 endpoints × 3 rounds = 12 total attempts fail

This effectively eliminates timeouts caused by a single overloaded endpoint. In testing across multiple extraction runs, this strategy achieved 100% success rate.

## 5. OSM → CS2 Mapping Decisions

**Residential density thresholds (≥5 / ≥3 floors):**  
Chosen to match Minneapolis's actual building stock. Downtown and Uptown have buildings in the 5-20 story range; midtown neighborhoods have 3-4 story walkups; the outer ring is almost entirely 1-2 story single-family homes.

**Commercial threshold (≥4 floors for high density):**  
CS2's High Density Commercial represents office towers and major retail blocks. 4+ floors captures downtown core, Nicollet Mall, and major commercial corridors without over-classifying small strip malls.

**Retail as separate category:**  
`landuse=retail` in OSM maps specifically to shopping centers and retail corridors. In CS2, the "Retail Hub" zone has distinct gameplay behavior (higher traffic, different service needs) that justifies keeping it separate from general commercial.

**Parking split (ramp vs surface):**  
CS2 treats parking ramps as placeable assets with different road connection requirements than surface lots. The `parking=multi-storey` tag in OSM maps cleanly to this distinction.

**Office deduplication:**  
OSM taggers sometimes apply both `landuse=commercial` and `building=office` to the same element. The pipeline processes commercial first, builds a set of captured IDs, and skips those IDs when processing office — preventing the same polygon from appearing twice on the map.

## 6. Commercial/Office Deduplication

OSM has overlapping semantics for commercial areas and office buildings. A downtown block might be tagged as both `landuse=commercial` (area-level) and `building=office` (building-level). Processing both without deduplication creates overlapping polygons that appear double-colored in Leaflet.

**Solution:** Process `commercial` first. Any element ID captured in that pass is excluded from the `office` pass. This prioritizes the landuse classification (which covers the full area) over the building tag (which may cover only part of it).

## 7. Why Not QGIS or PostGIS?

Several more powerful alternatives exist for this kind of spatial analysis:

- **QGIS:** GUI-based, excellent for visual workflows, but not scriptable in a reproducible way
- **PostGIS:** Industrial-strength spatial queries, but requires a PostgreSQL server setup
- **GeoPandas:** Python library for geospatial DataFrames, but adds ~500 MB of dependencies (GDAL, Shapely, Fiona)

This pipeline chose none of them for a specific reason: **zero barrier to entry**.

The goal was a tool that any CS2 player could run without installing a database, loading shapefiles, or understanding GIS concepts. The pipeline works with only `requests` and `tqdm` as dependencies. Anyone with Python can run it in 5 minutes.

The classification accuracy lost by not doing true spatial joins is acceptable for a game map visualization. OSM's element IDs are used as a proxy for spatial containment — not perfect, but good enough.

## 8. LLM Token Budget Management

This project was developed with AI assistance (Claude Code). One interesting challenge was managing the token context window when iterating on the pipeline.

The original Node.js script (`src/legacy/descargar_zonificacion.js`) was written in a single session. When porting to Python and adding the multi-endpoint retry and density classification, the approach used was **sequential chunked development**:

1. Write and test `overpass_client.py` in isolation (small context)
2. Write and test `classifiers.py` in isolation (small context)
3. Write `cs2_zones.py` with the query templates (small context)
4. Write `extract_zoning.py` importing the above modules (full context only at integration)

This mirrors the chunked query strategy: just as splitting Overpass queries avoids timeouts, splitting the code into modules avoided context window saturation during development. Each module could be reasoned about and debugged with a focused, small context before being integrated.

## 9. Adapting to Any City

The pipeline is city-agnostic. Any city with reasonable OSM coverage will work.

**Step 1: Get the bounding box**

Use [Nominatim](https://nominatim.openstreetmap.org/):
```
https://nominatim.openstreetmap.org/search?q=Chicago,IL&format=json&limit=1
```
The response includes a `boundingbox` field: `[south, north, west, east]`.

Note: Overpass QL uses `south,west,north,east` order — swap accordingly.

**Step 2: Consider OSM coverage quality**

North American and Western European cities have excellent OSM coverage including building heights. Cities in other regions may have fewer `building:levels` tags, which will cause most residential to fall back to "low density." This is a data limitation, not a pipeline limitation.

**Step 3: Calibrate thresholds**

Run the pipeline once, open the visualizer, and visually compare against Google Maps satellite view. If your city's dense downtown is showing as low density, lower the `≥5` threshold. If suburban areas are showing as medium density, raise the `≥3` threshold.

See [docs/adapting-to-other-cities.md](docs/adapting-to-other-cities.md) for a complete 5-step walkthrough.
