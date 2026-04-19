#!/usr/bin/env python3
"""
extract_zoning.py — CS2 Minneapolis Zoning Pipeline v1.0
=========================================================
Extracts real-world zoning polygons from OpenStreetMap via Overpass API
and exports them as a JavaScript data file ready to be loaded by the
Leaflet.js visualizer.

Usage:
    cd src
    uv run extract_zoning.py
    uv run extract_zoning.py --bbox "44.86,-93.38,45.05,-93.17"
    uv run extract_zoning.py --out ../visualizer/datos_zonificacion.js

Requirements:
    uv (https://docs.astral.sh/uv/) — no manual pip install needed.
    Run `uv sync` once, then `uv run extract_zoning.py`.

Output:
    A .js file containing 7 JavaScript arrays (DATA_RESIDENTIAL,
    DATA_COMMERCIAL, DATA_INDUSTRIAL, DATA_RETAIL, DATA_PARKING,
    DATA_OFFICE, DATA_MIXED) ready to be <script src="..."> in index.html.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from overpass_client import query_with_retry
from classifiers import classify_residential, classify_commercial, classify_parking
from cs2_zones import CS2_LABELS, MINNEAPOLIS_BBOX, build_queries


# ── Geometry helpers ─────────────────────────────────────────────────────────

def coords_from_way(element: dict) -> list | None:
    geom = element.get("geometry", [])
    if len(geom) < 3:
        return None
    return [[pt["lat"], pt["lon"]] for pt in geom]


def coords_from_relation(element: dict) -> list | None:
    members = element.get("members", [])
    outers = [
        m for m in members
        if m.get("role") == "outer"
        and len(m.get("geometry", [])) > 2
    ]
    if not outers:
        return None
    outers.sort(key=lambda m: len(m["geometry"]), reverse=True)
    return [[pt["lat"], pt["lon"]] for pt in outers[0]["geometry"]]


def extract_coords(element: dict) -> list | None:
    if element["type"] == "way":
        return coords_from_way(element)
    return coords_from_relation(element)


# ── Main pipeline ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Extract OSM zoning data for CS2")
    parser.add_argument(
        "--bbox",
        default=MINNEAPOLIS_BBOX,
        help=f"Bounding box 'south,west,north,east' (default: {MINNEAPOLIS_BBOX})"
    )
    parser.add_argument(
        "--out",
        default="../visualizer/datos_zonificacion.js",
        help="Output .js file path"
    )
    args = parser.parse_args()

    bbox = args.bbox
    out_path = Path(args.out)
    queries = build_queries(bbox)

    print(f"CS2 Minneapolis Zoning Extractor v1.0")
    print(f"Bounding Box : {bbox}")
    print(f"Output       : {out_path}\n")

    # ── Step 1: Build density index ───────────────────────────────────────────
    print("[1/3] Building residential density index...")
    bld_data = query_with_retry(queries["buildings_levels"], "buildings_levels")
    building_index: dict[int, int] = {}
    for el in bld_data.get("elements", []):
        lvl = int((el.get("tags") or {}).get("building:levels", 0))
        if lvl > 0:
            building_index[el["id"]] = lvl
    print(f"      Index: {len(building_index)} buildings with level data\n")

    # ── Step 2: Download all polygons ─────────────────────────────────────────
    print("[2/3] Downloading zoning polygons (7 sequential queries)...")
    CATEGORIES = ["residential", "commercial", "industrial", "retail", "parking", "office", "mixed"]
    raw: dict[str, list] = {}
    for cat in CATEGORIES:
        result = query_with_retry(queries[cat], cat)
        raw[cat] = result.get("elements", [])
        print(f"      {cat}: {len(raw[cat])} elements")

    # ── Step 3: Classify ──────────────────────────────────────────────────────
    print("\n[3/3] Classifying zones...")

    output: dict[str, list] = {cat: [] for cat in CATEGORIES}
    skipped = 0
    commercial_ids: set[int] = set()

    # Commercial must run first to build dedup set for office pass
    for el in raw["commercial"]:
        commercial_ids.add(el["id"])
        tags = el.get("tags") or {}
        coords = extract_coords(el)
        if not coords:
            skipped += 1
            continue
        zone = classify_commercial(tags)
        output["commercial"].append({
            "id": el["id"],
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
        zone = classify_residential(tags, building_index, el["id"])
        cs2_key = {"high": "res_high", "medium": "res_med", "low": "res_low"}[zone]
        output["residential"].append({
            "id": el["id"],
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
            "id": el["id"],
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
            "id": el["id"],
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
            "id": el["id"],
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": zone,
            "cs2": CS2_LABELS[f"prk_{zone}"],
        })

    for el in raw["office"]:
        if el["id"] in commercial_ids:
            continue  # deduplicate office areas already captured as commercial
        tags = el.get("tags") or {}
        coords = extract_coords(el)
        if not coords:
            skipped += 1
            continue
        output["office"].append({
            "id": el["id"],
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
            "id": el["id"],
            "name": tags.get("name", ""),
            "coords": coords,
            "zone": "mixed",
            "cs2": CS2_LABELS["mixed"],
        })

    # ── Summary ───────────────────────────────────────────────────────────────
    total = sum(len(v) for v in output.values())
    res = output["residential"]
    print(f"\n  Residential  high/med/low : "
          f"{sum(1 for r in res if r['zone']=='high')} / "
          f"{sum(1 for r in res if r['zone']=='medium')} / "
          f"{sum(1 for r in res if r['zone']=='low')}")
    com = output["commercial"]
    print(f"  Commercial   high/low     : "
          f"{sum(1 for c in com if c['zone']=='high')} / "
          f"{sum(1 for c in com if c['zone']=='low')}")
    for cat in ["industrial", "retail", "parking", "office", "mixed"]:
        print(f"  {cat:<12}             : {len(output[cat])}")
    print(f"  Skipped (no geometry)     : {skipped}")
    print(f"  TOTAL                     : {total}")

    # ── Write output ──────────────────────────────────────────────────────────
    ts = datetime.now(timezone.utc).isoformat()
    lines = [
        f"// Auto-generated by extract_zoning.py — {ts}",
        f"// Minneapolis Zoning v1.0 — bbox: {bbox}",
        f"// Total polygons: {total}",
        "",
    ]
    for cat in CATEGORIES:
        var = f"DATA_{cat.upper()}"
        lines.append(f"const {var} = {json.dumps(output[cat])};")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"\nDone. {out_path} — {size_mb:.1f} MB — {total} polygons")


if __name__ == "__main__":
    main()
