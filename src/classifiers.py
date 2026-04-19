"""
classifiers.py
Density classification logic: OSM tags → CS2 zone types.

Key insight: OSM's landuse=residential is a coarse polygon that covers
entire neighborhoods. To determine HIGH vs MEDIUM vs LOW density within
those polygons, we cross-reference building:levels tags from individual
building footprints. This two-pass strategy is what makes the classification
realistic instead of assigning uniform density to entire districts.
"""


def classify_residential(tags: dict, building_levels_index: dict, element_id: int) -> str:
    """
    Classify a residential landuse polygon into CS2 density tiers.

    Priority order:
    1. building:levels or levels tag on the polygon itself
    2. Max building:levels from buildings indexed within the polygon
    3. Explicit residential sub-tags (apartments, townhouse, etc.)
    4. Fallback: low density

    CS2 thresholds (calibrated against real Minneapolis neighborhoods):
    - HIGH   (>=5 floors OR apartments/condo)  -> North American High Density Residential
    - MEDIUM (>=3 floors OR terrace/townhouse) -> North American Medium Density Residential
    - LOW    (default)                         -> North American Low Density Residential
    """
    tag_levels = int(tags.get("building:levels") or tags.get("levels") or 0)
    idx_levels = building_levels_index.get(element_id, 0)
    effective_levels = max(tag_levels, idx_levels)

    residential_subtype = tags.get("residential", "").lower()
    building_type = tags.get("building", "").lower()

    if (effective_levels >= 5
            or residential_subtype in ("apartments", "condominium", "condo")):
        return "high"

    if (effective_levels >= 3
            or building_type in ("terrace", "dormitory", "townhouse")
            or residential_subtype in ("townhouse", "dormitory", "semi")):
        return "medium"

    return "low"


def classify_commercial(tags: dict) -> str:
    """
    Classify commercial zones into HIGH or LOW density.

    CS2 thresholds:
    - HIGH (>=4 floors) -> North American High Density Commercial
    - LOW  (default)   -> North American Low Density Commercial
    """
    levels = int(tags.get("building:levels") or tags.get("levels") or 1)
    return "high" if levels >= 4 else "low"


def classify_parking(tags: dict) -> str:
    """
    Distinguish structured parking (ramps) from surface lots.

    CS2 distinction:
    - RAMP    -> Parking Garage / Ramp asset
    - SURFACE -> Surface Parking Lot (counts as no-zone area in gameplay)
    """
    parking_type = tags.get("parking", "").lower()
    if parking_type in ("multi-storey", "multistorey", "structure", "underground"):
        return "ramp"
    return "surface"
