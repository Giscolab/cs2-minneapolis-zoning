#!/usr/bin/env python3
"""
extract_zoning.py — Pipeline d’extraction de zonage réel pour CS2.

Exemples :
    python extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657" --city "Paris"
    python extract_zoning.py --bbox "40.70,-74.02,40.83,-73.91" --city "New York"
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from overpass_client import query_with_retry
from classifiers import classify_residential, classify_commercial, classify_parking
from cs2_zones import CS2_LABELS, EXAMPLE_BBOX_PARIS, build_queries


def coords_from_way(element: dict) -> list | None:
    geom = element.get("geometry", [])
    if len(geom) < 3:
        return None
    return [[pt["lat"], pt["lon"]] for pt in geom]


def coords_from_relation(element: dict) -> list | None:
    members = element.get("members", [])
    outers = [
        m for m in members
        if m.get("role") == "outer" and len(m.get("geometry", [])) > 2
    ]
    if not outers:
        return None
    outers.sort(key=lambda m: len(m["geometry"]), reverse=True)
    return [[pt["lat"], pt["lon"]] for pt in outers[0]["geometry"]]


def extract_coords(element: dict) -> list | None:
    if element.get("type") == "way":
        return coords_from_way(element)
    if element.get("type") == "relation":
        return coords_from_relation(element)
    return None


def parse_building_levels(value) -> int:
    if value is None:
        return 0

    text = str(value).strip().replace(",", ".")
    if not text:
        return 0

    try:
        return int(float(text))
    except (ValueError, TypeError):
        return 0


def main():
    parser = argparse.ArgumentParser(
        description="Extrait les données de zonage OpenStreetMap pour Cities: Skylines 2"
    )
    parser.add_argument(
        "--bbox",
        default=EXAMPLE_BBOX_PARIS,
        help="Boîte géographique au format 'sud,ouest,nord,est'. Par défaut : exemple Paris.",
    )
    parser.add_argument(
        "--city",
        default="Ville personnalisée",
        help="Nom de la ville ou zone extraite.",
    )
    parser.add_argument(
        "--out",
        default="../visualizer/datos_zonificacion.js",
        help="Chemin du fichier JavaScript généré.",
    )

    args = parser.parse_args()

    bbox = args.bbox
    city = args.city
    out_path = Path(args.out)
    queries = build_queries(bbox)

    print("Extracteur de zonage réel pour CS2 v1.0")
    print(f"Ville / zone : {city}")
    print(f"BBOX         : {bbox}")
    print(f"Sortie       : {out_path}\n")

    print("[1/3] Construction de l’index de densité résidentielle...")
    bld_data = query_with_retry(queries["buildings_levels"], "buildings_levels")
    building_index: dict[int, int] = {}

    for el in bld_data.get("elements", []):
        tags = el.get("tags") or {}
        lvl = parse_building_levels(tags.get("building:levels"))

        if lvl > 0 and "id" in el:
            building_index[el["id"]] = lvl

    print(f"      Index : {len(building_index)} bâtiments avec données d’étages\n")

    print("[2/3] Téléchargement des polygones de zonage...")
    categories = ["residential", "commercial", "industrial", "retail", "parking", "office", "mixed"]
    raw: dict[str, list] = {}

    for cat in categories:
        result = query_with_retry(queries[cat], cat)
        raw[cat] = result.get("elements", [])
        print(f"      {cat}: {len(raw[cat])} éléments")

    print("\n[3/3] Classification des zones...")

    output: dict[str, list] = {cat: [] for cat in categories}
    skipped = 0
    commercial_ids: set[int] = set()

    for el in raw["commercial"]:
        if "id" in el:
            commercial_ids.add(el["id"])

        tags = el.get("tags") or {}
        coords = extract_coords(el)

        if not coords:
            skipped += 1
            continue

        zone = classify_commercial(tags)

        output["commercial"].append({
            "id": el.get("id"),
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": zone,
            "cs2": CS2_LABELS[f"com_{zone}"],
        })

    for el in raw["residential"]:
        tags = el.get("tags") or {}
        coords = extract_coords(el)

        if not coords:
            skipped += 1
            continue

        zone = classify_residential(tags, building_index, el.get("id"))
        cs2_key = {"high": "res_high", "medium": "res_med", "low": "res_low"}[zone]

        output["residential"].append({
            "id": el.get("id"),
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": zone,
            "cs2": CS2_LABELS[cs2_key],
        })

    for el in raw["industrial"]:
        tags = el.get("tags") or {}
        coords = extract_coords(el)

        if not coords:
            skipped += 1
            continue

        output["industrial"].append({
            "id": el.get("id"),
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": "industrial",
            "cs2": CS2_LABELS["industrial"],
        })

    for el in raw["retail"]:
        tags = el.get("tags") or {}
        coords = extract_coords(el)

        if not coords:
            skipped += 1
            continue

        output["retail"].append({
            "id": el.get("id"),
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": "retail",
            "cs2": CS2_LABELS["retail"],
        })

    for el in raw["parking"]:
        tags = el.get("tags") or {}
        coords = extract_coords(el)

        if not coords:
            skipped += 1
            continue

        zone = classify_parking(tags)

        output["parking"].append({
            "id": el.get("id"),
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": zone,
            "cs2": CS2_LABELS[f"prk_{zone}"],
        })

    for el in raw["office"]:
        if el.get("id") in commercial_ids:
            continue

        tags = el.get("tags") or {}
        coords = extract_coords(el)

        if not coords:
            skipped += 1
            continue

        output["office"].append({
            "id": el.get("id"),
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": "office",
            "cs2": CS2_LABELS["office"],
        })

    for el in raw["mixed"]:
        tags = el.get("tags") or {}
        coords = extract_coords(el)

        if not coords:
            skipped += 1
            continue

        output["mixed"].append({
            "id": el.get("id"),
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": "mixed",
            "cs2": CS2_LABELS["mixed"],
        })

    total = sum(len(v) for v in output.values())
    res = output["residential"]
    com = output["commercial"]

    print(f"\n  Résidentiel haut/moyen/bas : "
          f"{sum(1 for r in res if r['zone'] == 'high')} / "
          f"{sum(1 for r in res if r['zone'] == 'medium')} / "
          f"{sum(1 for r in res if r['zone'] == 'low')}")

    print(f"  Commercial haut/bas        : "
          f"{sum(1 for c in com if c['zone'] == 'high')} / "
          f"{sum(1 for c in com if c['zone'] == 'low')}")

    for cat in ["industrial", "retail", "parking", "office", "mixed"]:
        print(f"  {cat:<12}              : {len(output[cat])}")

    print(f"  Ignorés sans géométrie     : {skipped}")
    print(f"  TOTAL                      : {total}")

    ts = datetime.now(timezone.utc).isoformat()

    lines = [
        f"// Généré par extract_zoning.py — {ts}",
        f"// Ville / zone : {city}",
        f"// BBOX : {bbox}",
        f"// Total polygones : {total}",
        "",
    ]

    for cat in categories:
        var = f"DATA_{cat.upper()}"
        lines.append(f"const {var} = {json.dumps(output[cat], ensure_ascii=False)};")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    size_mb = out_path.stat().st_size / (1024 * 1024)

    print(f"\nTerminé. {out_path} — {size_mb:.1f} MB — {total} polygones")


if __name__ == "__main__":
    main()
