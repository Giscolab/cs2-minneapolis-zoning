from __future__ import annotations

import argparse
import json
import math
from pathlib import Path



def round_number(value: float, digits: int) -> float:
    return round(float(value), digits)


def meters_per_degree(lat_deg: float) -> tuple[float, float]:
    lat = math.radians(lat_deg)

    meters_per_deg_lat = (
        111132.92
        - 559.82 * math.cos(2 * lat)
        + 1.175 * math.cos(4 * lat)
        - 0.0023 * math.cos(6 * lat)
    )

    meters_per_deg_lon = (
        111412.84 * math.cos(lat)
        - 93.5 * math.cos(3 * lat)
        + 0.118 * math.cos(5 * lat)
    )

    return meters_per_deg_lon, meters_per_deg_lat


def bbox_text_from_center_size(center_lon: float, center_lat: float, size_km: float) -> str:
    half_m = size_km * 1000.0 / 2.0
    meters_lon, meters_lat = meters_per_degree(center_lat)

    dlon = half_m / meters_lon
    dlat = half_m / meters_lat

    south = center_lat - dlat
    west = center_lon - dlon
    north = center_lat + dlat
    east = center_lon + dlon

    return f"{south:.6f},{west:.6f},{north:.6f},{east:.6f}"


def ps_path(*parts: str) -> str:
    return ".\\" + "\\".join(part.strip("\\/") for part in parts)


def build_manifest(args: argparse.Namespace) -> dict:
    center_lon = round_number(args.center_lon, 6)
    center_lat = round_number(args.center_lat, 6)
    worldmap_km = round_number(args.worldmap_size_km, 3)
    heightmap_km = round_number(args.heightmap_size_km, 3)

    world_bbox = args.world_bbox or bbox_text_from_center_size(
        center_lon,
        center_lat,
        worldmap_km,
    )
    heightmap_bbox = args.heightmap_bbox or bbox_text_from_center_size(
        center_lon,
        center_lat,
        heightmap_km,
    )

    exports_root = args.exports_root.strip("\\/")
    suffix = f"{center_lon}_{center_lat}"

    png_dir = args.png_dir or ps_path(exports_root, f"png_{suffix}")
    geojson_dir = args.geojson_dir or ps_path(exports_root, f"geojson_{suffix}")

    bundle_manifest = args.out or ps_path(
        exports_root,
        f"cs2_export_manifest_{suffix}.json",
    )

    worldmap_name = f"worldmap_{center_lon}_{center_lat}_{worldmap_km}.png"
    heightmap_name = f"heightmap_{center_lon}_{center_lat}_{heightmap_km}.png"

    timeline_config_path = ps_path(
        exports_root,
        "timeline_config.json",
    )

    world_scale = 1.0

    return {
        "version": 1,
        "source": "cs2-minneapolis-zoning",
        "kind": "cs2-export-bundle",
        "city": args.city,
        "center": {
            "lon": center_lon,
            "lat": center_lat,
        },
        "bboxOrder": "south,west,north,east",
        "worldMap": {
            "sizeKm": worldmap_km,
            "bbox": world_bbox,
        },
        "heightmap": {
            "sizeKm": heightmap_km,
            "bbox": heightmap_bbox,
            "pixels": args.pixels,
            "format": "PNG grayscale 16-bit",
            "validMinElev": args.valid_min_elev,
            "validMaxElev": args.valid_max_elev,
            "normalization": {
                "mode": args.heightmap_normalization,
                "baseLevelMeters": args.cs2_base_level,
                "belowSeaReserveMeters": args.below_sea_reserve_meters,
                "seaLevelMeters": args.cs2_base_level,
                "elevationScaleMeters": args.cs2_elevation_scale,
                "verticalScale": args.cs2_vertical_scale,
                "encodedMinElevationMeters": round_number(args.cs2_base_level - args.below_sea_reserve_meters, 3),
                "encodedMaxElevationMeters": round_number(
                    args.cs2_base_level - args.below_sea_reserve_meters + args.cs2_elevation_scale / args.cs2_vertical_scale,
                    6,
                ),
                "cs2HeightScale": args.cs2_elevation_scale,
            },
        },
        "paths": {
            "bundleManifest": bundle_manifest,
            "pngDir": png_dir,
            "geojsonDir": geojson_dir,
            "worldmapPng": png_dir + "\\" + worldmap_name,
            "heightmapPng": png_dir + "\\" + heightmap_name,
        },
        "geojson": {
            "allFeatures": geojson_dir + "\\geojson\\all_features.geojson",
            "zoningPolygons": geojson_dir + "\\geojson\\zoning_polygons.geojson",
            "roads": geojson_dir + "\\geojson\\roads.geojson",
            "roadsMajor": geojson_dir + "\\geojson\\roads_major_clipped.geojson",
            "roadsDriveable": geojson_dir + "\\geojson\\roads_driveable_clipped.geojson",
            "paths": geojson_dir + "\\geojson\\paths.geojson",
            "waterLines": geojson_dir + "\\geojson\\water_lines_clipped.geojson",
            "waterAreas": geojson_dir + "\\geojson\\water_areas_clipped.geojson",
            "layerIndex": geojson_dir + "\\reports\\layer_index.json",
            "extractionReport": geojson_dir + "\\reports\\extraction_report.json",
        },
        "timelineMod": {
            "configPath": timeline_config_path,
            "useGeoJsonCenter": False,
            "originLon": center_lon,
            "originLat": center_lat,
            "worldOriginX": 0,
            "worldOriginZ": 0,
            "worldScale": world_scale,
            "overlayRotationDegrees": 0,
            "overlayScaleX": 1,
            "overlayScaleZ": 1,
            "flipX": False,
            "flipZ": False,
        },
        "expectedFiles": {
            "worldmapPng": worldmap_name,
            "heightmapPng": heightmap_name,
            "roadsMajorGeoJson": "roads_major_clipped.geojson",
            "roadsDriveableGeoJson": "roads_driveable_clipped.geojson",
            "waterLinesGeoJson": "water_lines_clipped.geojson",
            "waterAreasGeoJson": "water_areas_clipped.geojson",
        },
    }


def resolve_repo_path(repo_root: Path, value: str) -> Path:
    normalized = value.replace("\\", "/")

    if normalized.startswith("./"):
        normalized = normalized[2:]

    return repo_root / normalized


def collect_referenced_paths(manifest: dict) -> list[str]:
    paths = [
        manifest["paths"]["pngDir"],
        manifest["paths"]["geojsonDir"],
        manifest["paths"]["worldmapPng"],
        manifest["paths"]["heightmapPng"],
        manifest["geojson"]["roadsMajor"],
        manifest["geojson"]["roadsDriveable"],
        manifest["geojson"]["waterLines"],
        manifest["geojson"]["waterAreas"],
        manifest["geojson"]["layerIndex"],
        manifest["geojson"]["extractionReport"],
    ]

    return paths


def check_existing(repo_root: Path, manifest: dict) -> int:
    missing = []

    for value in collect_referenced_paths(manifest):
        path = resolve_repo_path(repo_root, value)

        if not path.exists():
            missing.append(value)

    if not missing:
        print("[OK] Tous les fichiers principaux référencés existent.")
        return 0

    print("[ERREUR] Fichiers manquants :")

    for value in missing:
        print(f"  - {value}")

    return 1


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Write a CS2 export bundle manifest for a generated map center."
    )

    parser.add_argument("--center-lon", type=float, required=True)
    parser.add_argument("--center-lat", type=float, required=True)
    parser.add_argument("--city", default="Zone CS2")

    parser.add_argument("--worldmap-size-km", type=float, default=57.344)
    parser.add_argument("--heightmap-size-km", type=float, default=14.336)
    parser.add_argument("--pixels", type=int, default=4096)
    parser.add_argument("--tiles", type=int, default=4)
    parser.add_argument("--tile-overlap-px", type=int, default=128)
    parser.add_argument("--valid-min-elev", type=float, default=-200)
    parser.add_argument("--valid-max-elev", type=float, default=5000)
    parser.add_argument(
        "--heightmap-normalization",
        default="nonta-manual",
        choices=("local-minmax", "nonta-manual", "absolute", "absolute-0-scale"),
    )
    parser.add_argument("--cs2-base-level", type=float, default=1.0)
    parser.add_argument("--below-sea-reserve-meters", type=float, default=0.0)
    parser.add_argument("--cs2-elevation-scale", type=float, default=4096.0)
    parser.add_argument("--cs2-vertical-scale", type=float, default=2.5)

    parser.add_argument("--world-bbox", default=None)
    parser.add_argument("--heightmap-bbox", default=None)

    parser.add_argument("--exports-root", default="exports")
    parser.add_argument("--png-dir", default=None)
    parser.add_argument("--geojson-dir", default=None)
    parser.add_argument("--out", default=None)

    parser.add_argument("--write-timeline-config", action="store_true")
    parser.add_argument("--check-existing", action="store_true")

    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    manifest = build_manifest(args)

    out_path = resolve_repo_path(repo_root, manifest["paths"]["bundleManifest"])
    write_json(out_path, manifest)

    print("=== CS2 EXPORT BUNDLE MANIFEST ===")
    print(f"Manifest : {out_path}")

    if args.write_timeline_config:
        timeline_config_path = resolve_repo_path(
            repo_root,
            manifest["timelineMod"]["configPath"],
        )

        timeline_config = dict(manifest["timelineMod"])
        timeline_config.pop("configPath", None)

        write_json(timeline_config_path, timeline_config)
        print(f"Timeline : {timeline_config_path}")

    if args.check_existing:
        return check_existing(repo_root, manifest)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
