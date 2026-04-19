# Adapting This Pipeline to Other Cities

This pipeline is city-agnostic. Any city with reasonable OpenStreetMap coverage can be processed in under 20 minutes. Here is a 5-step guide.

---

## Step 1: Get Your City's Bounding Box

You need four coordinates in `south,west,north,east` format.

**Option A — Nominatim (easiest):**

Search your city on [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org/). The search result page shows a bounding box at the bottom, or you can use the API:

```
https://nominatim.openstreetmap.org/search?q=Chicago,IL,USA&format=json&limit=1
```

The response includes `"boundingbox": ["south", "north", "west", "east"]` — reorder to `south,west,north,east` for Overpass QL.

**Option B — bbox-mcp-server (if you use AI tools):**

If you have bbox-mcp-server installed, ask your AI assistant:
> "What is the bounding box for Chicago, IL?"

See [bbox-mcp-server.md](bbox-mcp-server.md) for setup instructions.

**Option C — Manual from a map:**

Go to [bboxfinder.com](http://bboxfinder.com/) and draw a rectangle over your city. The coordinates are shown at the bottom in the correct format.

**Examples:**

| City | Bounding Box |
|------|--------------|
| Minneapolis, MN | `44.86,-93.38,45.05,-93.17` |
| Chicago, IL | `41.64,-87.94,42.02,-87.52` |
| Portland, OR | `45.43,-122.84,45.65,-122.47` |
| Austin, TX | `30.10,-97.97,30.52,-97.56` |
| Denver, CO | `39.61,-105.11,39.91,-104.60` |

---

## Step 2: Update the Bounding Box in the Code

Edit `src/cs2_zones.py` and replace the default bbox:

```python
# Before
MINNEAPOLIS_BBOX = "44.86,-93.38,45.05,-93.17"

# After (example: Chicago)
MINNEAPOLIS_BBOX = "41.64,-87.94,42.02,-87.52"
```

Or pass it as a CLI argument without editing the file:

```bash
uv run extract_zoning.py --bbox "41.64,-87.94,42.02,-87.52"
```

---

## Step 3: Run the Extraction

```bash
cd src
uv run extract_zoning.py
```

The script will:
1. Download `building:levels` data to build the density index (~30s)
2. Download 7 zoning categories sequentially (~10-15 min total)
3. Classify all polygons
4. Write `../visualizer/datos_zonificacion.js`

Expected output size: 2-8 MB depending on city size and OSM coverage.

---

## Step 4: Open the Visualizer

Open `visualizer/index.html` in any modern browser. The map will center automatically on the data extent of your new city.

If the map appears blank, check the browser console (F12) for errors. Most likely cause: the output file path doesn't match what index.html expects.

---

## Step 5: Calibrate Density Thresholds (if needed)

Open your city's visualizer and compare it against Google Maps or local knowledge:

- **Too much red (high density) in suburban areas?** Raise the `≥5` threshold to `≥7` or `≥10` in `src/classifiers.py`.
- **Dense downtown showing as yellow (low density)?** Lower the `≥5` threshold to `≥3` or `≥4`.
- **Entire city showing as low density?** Your city may have sparse `building:levels` data in OSM. Try using `residential_subtype` tags instead, or consult local OSM mapping communities.

The thresholds in `classify_residential()` were calibrated for Minneapolis specifically. European cities tend to have higher density at lower floor counts; US Sun Belt cities tend to be more spread out.

```python
# src/classifiers.py — adjust these thresholds:
if (effective_levels >= 5   # <-- change this for high density
        or residential_subtype in ("apartments", "condominium", "condo")):
    return "high"

if (effective_levels >= 3   # <-- change this for medium density
        or building_type in ("terrace", "dormitory", "townhouse")
        ...):
    return "medium"
```

---

## OSM Coverage Considerations

The pipeline works best for cities with:
- High OSM coverage (most North American and Western European cities)
- `building:levels` tags on apartment buildings (common in OSM-active communities)
- Standard `landuse=residential/commercial/industrial` tagging

Cities with sparse OSM data will produce fewer polygons and less granular density classification. Contributing to OSM for your city before running the pipeline will improve results.

Check your city's OSM coverage at [osmstats.neis-one.org](https://osmstats.neis-one.org/).
