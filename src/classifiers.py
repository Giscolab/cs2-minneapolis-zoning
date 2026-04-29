"""
classifiers.py

Logique de classification :
tags OpenStreetMap → catégories de zones Cities: Skylines 2.

La classification reste volontairement simple :
OSM ne fournit pas toujours un vrai zonage urbain officiel.
On déduit donc une catégorie jouable CS2 à partir des tags disponibles.
"""


def parse_levels(value, default: int = 0) -> int:
    """
    Convertit building:levels / levels en entier robuste.

    Exemples acceptés :
    - "5"   -> 5
    - "3.5" -> 3
    - "3,5" -> 3
    - vide / invalide -> default
    """
    if value is None:
        return default

    text = str(value).strip().replace(",", ".")
    if not text:
        return default

    try:
        return int(float(text))
    except (ValueError, TypeError):
        return default


def classify_residential(tags: dict, building_levels_index: dict, element_id: int) -> str:
    """
    Classe une zone résidentielle en haute, moyenne ou basse densité.

    Logique adaptée aux villes nord-américaines et européennes :
    - haute densité : immeubles, appartements, 5 étages ou plus ;
    - moyenne densité : maisons de ville, dortoirs, 3 à 4 étages ;
    - basse densité : défaut quand aucune information de densité n’est fiable.
    """
    tag_levels = parse_levels(tags.get("building:levels") or tags.get("levels"), 0)
    idx_levels = building_levels_index.get(element_id, 0)
    effective_levels = max(tag_levels, idx_levels)

    residential_subtype = tags.get("residential", "").lower()
    building_type = tags.get("building", "").lower()

    if (
        effective_levels >= 5
        or residential_subtype in ("apartments", "apartment", "condominium", "condo")
        or building_type in ("apartments", "residential")
    ):
        return "high"

    if (
        effective_levels >= 3
        or building_type in ("terrace", "dormitory", "townhouse", "semidetached_house")
        or residential_subtype in ("townhouse", "dormitory", "semi", "terrace")
    ):
        return "medium"

    return "low"


def classify_commercial(tags: dict) -> str:
    """
    Classe une zone commerciale en haute ou basse densité.
    """
    levels = parse_levels(tags.get("building:levels") or tags.get("levels"), 1)
    building_type = tags.get("building", "").lower()
    shop = tags.get("shop", "").lower()
    office = tags.get("office", "").lower()

    if levels >= 4:
        return "high"

    if building_type in ("commercial", "retail", "office") and levels >= 3:
        return "high"

    if shop in ("mall", "department_store") or office:
        return "high"

    return "low"


def classify_parking(tags: dict) -> str:
    """
    Distingue parking en ouvrage et parking de surface.
    """
    parking_type = tags.get("parking", "").lower()
    building_type = tags.get("building", "").lower()

    if parking_type in ("multi-storey", "multistorey", "structure", "underground"):
        return "ramp"

    if building_type in ("parking", "garage", "garages"):
        return "ramp"

    return "surface"