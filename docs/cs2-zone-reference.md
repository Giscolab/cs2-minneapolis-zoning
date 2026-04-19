# CS2 Zone Reference — OSM Tags to Cities: Skylines 2

Complete mapping table for all zone types in this pipeline. Zone names correspond to the **North American zone set** in the CS2 base game.

---

## Residential Zones

| OSM Tag | Classification Condition | CS2 Zone Name | Map Color | Gameplay Notes |
|---------|--------------------------|---------------|-----------|----------------|
| `landuse=residential` | ≥5 floors OR `residential=apartments/condominium` | North American High Density Residential | `#e74c3c` red | High land value, requires good transit access. Generates most residents per cell. |
| `landuse=residential` | ≥3 floors OR `building=terrace/townhouse` | North American Medium Density Residential | `#f39c12` orange | Balanced density. Works well near parks and schools. |
| `landuse=residential` | default (1-2 floors, single family) | North American Low Density Residential | `#f1c40f` yellow | Lowest density. Requires road access, generates car traffic. |

**Density classification logic:** See `src/classifiers.py:classify_residential()` and [METHODOLOGY.md §3](../METHODOLOGY.md#3-the-density-index-strategy).

---

## Commercial Zones

| OSM Tag | Classification Condition | CS2 Zone Name | Map Color | Gameplay Notes |
|---------|--------------------------|---------------|-----------|----------------|
| `landuse=commercial` | ≥4 floors | North American High Density Commercial | `#3498db` blue | Downtown office towers. Requires high-capacity road connections. |
| `landuse=commercial` | default (<4 floors) | North American Low Density Commercial | `#85c1e9` light blue | Strip malls, neighborhood commercial. Lower traffic demand. |

---

## Retail

| OSM Tag | Classification Condition | CS2 Zone Name | Map Color | Gameplay Notes |
|---------|--------------------------|---------------|-----------|----------------|
| `landuse=retail` | — | North American Retail Hub | `#6ab4f7` sky blue | Shopping centers and retail corridors. High pedestrian traffic. Pairs well with transit stops. |

---

## Industrial

| OSM Tag | Classification Condition | CS2 Zone Name | Map Color | Gameplay Notes |
|---------|--------------------------|---------------|-----------|----------------|
| `landuse=industrial` | — | North American Industrial Zone | `#c8a000` gold | Factories, warehouses, logistics. Generates truck traffic. Keep away from residential (noise, pollution). |
| `building=industrial/warehouse/factory` | — | North American Industrial Zone | `#c8a000` gold | Same as above, captured via building tag. |

---

## Parking

| OSM Tag | Classification Condition | CS2 Zone Name | Map Color | Gameplay Notes |
|---------|--------------------------|---------------|-----------|----------------|
| `amenity=parking` | `parking=multi-storey/underground/structure` | Parking Garage / Ramp | `#7f8c8d` dark grey | Structured parking asset. Counts toward parking supply for adjacent zones. |
| `amenity=parking` | default (surface lot) | Surface Parking Lot | `#95a5a6` grey | Surface lots. In CS2, these often appear as unzoned land or low-density filler. |

---

## Office

| OSM Tag | Classification Condition | CS2 Zone Name | Map Color | Gameplay Notes |
|---------|--------------------------|---------------|-----------|----------------|
| `building=office` | not already captured as commercial | Office / Government Building | `#9b59b6` purple | Government buildings, corporate campuses. Provides high-value jobs. |
| `office=*` | any office tag | Office / Government Building | `#9b59b6` purple | Same zone. |
| `landuse=office` | — | Office / Government Building | `#9b59b6` purple | Same zone. |

**Deduplication note:** Elements already captured in the `commercial` pass are excluded from the `office` pass. See [METHODOLOGY.md §6](../METHODOLOGY.md#6-commercialoffice-deduplication).

---

## Mixed Use

| OSM Tag | Classification Condition | CS2 Zone Name | Map Color | Gameplay Notes |
|---------|--------------------------|---------------|-----------|----------------|
| `landuse=mixed` | — | Mixed-Use Development | `#00e5ff` cyan | Buildings with both residential and commercial uses. Common in urban cores and transit corridors. |
| `building=mixed_use` | — | Mixed-Use Development | `#00e5ff` cyan | Same zone. |

---

## Legend Screenshot

![Zone legend](screenshots/preview_legend.png)

---

## Notes on Modded Zone Packs

If you're using a modded zone pack (e.g., European zones, dense Asian zones), the zone names in CS2 will differ. Update the `CS2_LABELS` dictionary in `src/cs2_zones.py` to match your pack's zone IDs.

The classification logic in `classifiers.py` is independent of CS2 zone names — only the labels in `cs2_zones.py` need changing.
