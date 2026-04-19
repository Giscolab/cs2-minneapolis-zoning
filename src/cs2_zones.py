"""
cs2_zones.py
Mapping between OSM landuse/building tags and Cities: Skylines 2 zone names.

These zone names correspond to the North American zone set in CS2 (base game).
If you're using a modded zone pack, adjust the values in CS2_LABELS accordingly.
"""

CS2_LABELS = {
    "res_high":    "North American High Density Residential",
    "res_med":     "North American Medium Density Residential",
    "res_low":     "North American Low Density Residential",
    "com_high":    "North American High Density Commercial",
    "com_low":     "North American Low Density Commercial",
    "retail":      "North American Retail Hub",
    "industrial":  "North American Industrial Zone",
    "prk_ramp":    "Parking Garage / Ramp",
    "prk_surface": "Surface Parking Lot",
    "office":      "Office / Government Building",
    "mixed":       "Mixed-Use Development",
}

# Overpass QL query templates.
# BBOX format: "south,west,north,east" — standard for Overpass QL.
# Minneapolis full city bbox (with immediate border areas):
MINNEAPOLIS_BBOX = "44.86,-93.38,45.05,-93.17"


def build_queries(bbox: str) -> dict:
    """
    Build all Overpass QL queries for the given bounding box.

    Queries are split by category (not a single mega-query) for two reasons:
    1. Large single queries time out frequently on public Overpass instances
    2. Splitting allows per-category retry without re-downloading everything

    The buildings_levels query runs FIRST as a separate pre-pass to build
    the density index used by classify_residential().
    """
    return {
        "buildings_levels": f"""
[out:json][timeout:120];
way["building"="apartments"]["building:levels"]({bbox});
out ids tags;
""".strip(),
        "residential": f"""
[out:json][timeout:180];
(
  way["landuse"="residential"]({bbox});
  relation["landuse"="residential"]({bbox});
);
out geom;
""".strip(),
        "commercial": f"""
[out:json][timeout:180];
(
  way["landuse"="commercial"]({bbox});
  relation["landuse"="commercial"]({bbox});
);
out geom;
""".strip(),
        "industrial": f"""
[out:json][timeout:180];
(
  way["landuse"="industrial"]({bbox});
  relation["landuse"="industrial"]({bbox});
  way["building"~"^(industrial|warehouse|factory)$"]({bbox});
);
out geom;
""".strip(),
        "retail": f"""
[out:json][timeout:180];
(
  way["landuse"="retail"]({bbox});
  relation["landuse"="retail"]({bbox});
);
out geom;
""".strip(),
        "parking": f"""
[out:json][timeout:180];
(
  way["amenity"="parking"]({bbox});
  relation["amenity"="parking"]({bbox});
);
out geom;
""".strip(),
        "office": f"""
[out:json][timeout:180];
(
  way["building"="office"]({bbox});
  relation["building"="office"]({bbox});
  way["office"]({bbox});
  relation["office"]({bbox});
  way["landuse"="office"]({bbox});
);
out geom;
""".strip(),
        "mixed": f"""
[out:json][timeout:180];
(
  way["landuse"="mixed"]({bbox});
  relation["landuse"="mixed"]({bbox});
  way["building"="mixed_use"]({bbox});
  relation["building"="mixed_use"]({bbox});
);
out geom;
""".strip(),
    }
