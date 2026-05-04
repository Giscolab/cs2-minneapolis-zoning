<div align="center">

# CS2 Real OSM Extractor
## Extracteur OpenStreetMap vers couches Cities: Skylines 2

> Données OSM réelles -> familles CS2 lisibles -> pack GeoJSON exploitable dans un visualiseur Leaflet.
>
> Projet local, sans clé API, sans base PostGIS, avec export scindé par couches et fallback JavaScript legacy.

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Données OSM](https://img.shields.io/badge/Donn%C3%A9es-OpenStreetMap-7B3F00?style=for-the-badge&logo=openstreetmap)](https://www.openstreetmap.org/)

</div>

---

## Aperçu

<div align="center">

| Carte interactive complète | Zoom centre-ville |
|:---:|:---:|
| ![Aperçu complet](docs/screenshots/preview_full.png) | ![Zoom centre-ville](docs/screenshots/preview_downtown.png) |
| Visualiseur Leaflet des objets OSM classés | Exemple de rendu avec couches de densité visibles |

</div>

---

## Ce que fait le projet

Le projet interroge OpenStreetMap via Overpass, récupère des objets réels avec géométrie, puis les transforme en couches proches de la lecture Cities: Skylines 2 :

- zones résidentielles, commerciales, retail, industrielles, parkings, bureaux et usage mixte ;
- routes routières utiles à CS2 ;
- chemins, footways, steps et rues piétonnes séparés des routes ;
- exports GeoJSON par couche, plus rapports d'extraction ;
- visualiseur Leaflet capable de lire le pack `exports/zone-cs2` ou l'ancien `visualizer/zoning_data.js`.

Le projet ne fabrique pas un zonage officiel absent d'OSM. Quand les tags OpenStreetMap sont incomplets, la classification reste prudente et conserve les informations sources utiles au diagnostic.

```text
OpenStreetMap / Overpass
  -> src/extract_zoning.py
  -> classification OSM vers familles CS2
  -> exports/<ville>/geojson/*.geojson
  -> exports/<ville>/reports/layer_index.json
  -> visualizer/index.html
```

---

## Pack inclus

Le dépôt contient un pack `exports/zone-cs2` déjà généré.

| Champ | Valeur |
|:------|:-------|
| Ville / zone | `Zone CS2` |
| BBOX source | `33.581040,-117.870958,33.752752,-117.664642` |
| Ordre BBOX | `south,west,north,east` |
| Date du rapport | `2026-05-03T20:10:35.617926+00:00` |
| Total objets exportés | `76 425` |
| Rapport principal | `exports/zone-cs2/reports/extraction_report.json` |
| Index visualiseur | `exports/zone-cs2/reports/layer_index.json` |

Répartition du pack courant :

| Couche | Géométrie | Objets |
|:-------|:----------|------:|
| `residential` | Polygon | 691 |
| `commercial` | Polygon | 792 |
| `industrial` | Polygon | 245 |
| `retail` | Polygon | 255 |
| `parking` | Polygon | 2 070 |
| `office` | Polygon | 293 |
| `mixed` | Polygon | 0 |
| `zoning_polygons` | Polygon | 4 346 |
| `roads` | LineString | 53 449 |
| `roads_major_clipped` | LineString | 14 187 |
| `roads_driveable_clipped` | LineString | 53 449 |
| `paths` | LineString | 18 630 |
| `all_features` | Mixed | 76 425 |

Le dossier `analysis_zoning_data` contient aussi des rapports et exports de diagnostic issus du fichier JS legacy et d'un clipping heightmap. Ces fichiers servent à contrôler les volumes, les BBOX et les sous-ensembles routiers.

---

## Installation

### Prérequis

- Python 3.11 ou plus récent ;
- `requests` pour Overpass ;
- `tqdm` déclaré dans le projet Python ;
- navigateur moderne pour le visualiseur Leaflet ;
- optionnel : `shapely` pour `tools/clip_to_heightmap_bbox.py`.

Depuis la racine :

```powershell
cd src
python -m pip install requests tqdm
```

Avec `uv`, depuis `src` :

```powershell
uv sync
```

---

## Générer un pack GeoJSON

Le script principal est `src/extract_zoning.py`. Il produit le pack GeoJSON scindé par défaut dans `exports/<slug-ville>`.

```powershell
cd src
python .\extract_zoning.py --city "Zone CS2" --bbox "33.581040,-117.870958,33.752752,-117.664642"
```

Options utiles :

| Option | Rôle |
|:-------|:-----|
| `--bbox "sud,ouest,nord,est"` | Emprise Overpass à extraire. |
| `--city "Nom"` | Nom de ville utilisé pour les rapports et le dossier `exports/<slug>`. |
| `--out-dir "..\exports\zone-cs2"` | Dossier de sortie explicite pour le pack GeoJSON. |
| `--out "..\visualizer\zoning_data.js"` | Active l'ancien fichier JS `DATA_*` pour compatibilité. |

Le fichier `visualizer/zoning_data.js` est ignoré par `.gitignore`, car il peut devenir très lourd. Le dépôt conserve `data/sample_zoning_output.js` comme échantillon léger.

---

## Ouvrir le visualiseur

Le visualiseur charge le pack GeoJSON avec `fetch`. Pour le mode pack, servez donc la racine du dépôt en HTTP local :

```powershell
python -m http.server 8000
```

Puis ouvrez :

```text
http://localhost:8000/visualizer/
```

Comportement de chargement :

1. `visualizer/js/pack-loader.js` tente de lire `../exports/zone-cs2/reports/layer_index.json`.
2. Les couches GeoJSON listées sont converties en objets internes `[lat, lon]`.
3. Si le pack est absent ou illisible, le visualiseur retombe sur les tableaux globaux `DATA_*` de `visualizer/zoning_data.js`.

Le tableau de bord affiche les indicateurs, la légende, les boutons d'activation des couches, les popups OSM et le recentrage sur les données disponibles.

---

## Aide CS2 et TimelineMod

Le visualiseur intègre un module d'aide pour caler une zone CS2 :

- rectangle `world map` par défaut à `57.344 km` ;
- rectangle `heightmap` par défaut à `19.115 km` ;
- déplacement précis par pas de `1 m`, `10 m`, `100 m` ou `1 km` ;
- BBOX `world map` et `heightmap` au format `south,west,north,east` ;
- commande Python préremplie pour relancer l'extraction ;
- génération et copie/téléchargement d'un `manifest.json` TimelineMod ;
- génération et copie/téléchargement d'un `config.json` CityTimelineMod.

Le fichier `analysis_zoning_data/clipped/bbox_manifest.json` documente l'emprise heightmap actuellement analysée :

```text
33.584339,-117.869246,33.756051,-117.662922
```

---

## Couches et classification

### Zones

| Couche | Sources OSM principales | Lecture CS2 |
|:-------|:------------------------|:------------|
| `residential` | `landuse=residential`, niveaux de bâtiments | Résidentiel haute / moyenne / basse densité |
| `commercial` | `landuse=commercial` | Commercial haute / basse densité |
| `retail` | `landuse=retail` | Commerce de détail |
| `industrial` | `landuse=industrial`, `building=industrial/warehouse/factory` | Industrie |
| `parking` | `amenity=parking` | Parking de surface / en ouvrage |
| `office` | `building=office`, `office=*`, `landuse=office` | Bureaux / administration |
| `mixed` | `landuse=mixed`, `building=mixed_use` | Usage mixte |

### Routes et chemins

| Couche | Sources OSM | Rendu |
|:-------|:------------|:------|
| `roads` | `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `unclassified`, `residential`, `living_street`, `service` et liens | Lignes Leaflet classées en route, autoroute, bretelle, service, pont, tunnel ou rond-point |
| `paths` | `footway`, `path`, `steps`, `pedestrian` | Lignes Leaflet séparées de la couche routière |

Les tags `cycleway`, `busway`, `sidewalk`, `surface`, `lanes`, `oneway`, `maxspeed`, `bridge`, `tunnel` et `junction` sont conservés quand ils existent pour aider au diagnostic.

---

## Structure du dépôt

| Chemin | Rôle |
|:-------|:-----|
| `src/` | Pipeline Python Overpass, classification et export GeoJSON. |
| `visualizer/` | Interface Leaflet statique, dashboard, overlay CS2, navigation mondiale et fallback legacy. |
| `exports/zone-cs2/` | Pack GeoJSON courant et rapports `layer_index` / `extraction_report`. |
| `analysis_zoning_data/` | Diagnostics issus du JS legacy, exports intermédiaires et clipping heightmap. |
| `tools/` | Scripts d'analyse, diagnostic, clipping et sous-ensembles routiers. |
| `docs/` | Notes d'adaptation, référence des zones, bbox MCP, publication GitHub et captures. |
| `data/` | Échantillon léger de sortie JS. |
| `METHODOLOGY.md` | Justification technique du pipeline et des choix de classification. |
| `arborescence.html` | Vue HTML de l'arborescence locale du projet. |

---

## Outils annexes

| Script | Usage |
|:-------|:------|
| `tools/analyze_zoning_data_v2.py` | Extrait les tableaux `DATA_*` du JS legacy et génère CSV + GeoJSON. |
| `tools/analyze_zoning_data.py` | Analyse générique d'un payload JS/GeoJSON et regroupe les features. |
| `tools/clip_to_heightmap_bbox.py` | Clippe les GeoJSON d'analyse sur la BBOX heightmap avec Shapely. |
| `tools/export_road_subsets.py` | Produit `roads_major_clipped.geojson` et `roads_driveable_clipped.geojson`. |
| `tools/diagnose_zoning_js.py` | Inspecte la structure d'un `visualizer/zoning_data.js`. |

---

## Documentation

- [METHODOLOGY.md](METHODOLOGY.md) : choix techniques, limites Overpass et stratégie de classification.
- [docs/cs2-zone-reference.md](docs/cs2-zone-reference.md) : table détaillée tags OSM -> couches CS2.
- [docs/adapting-to-other-cities.md](docs/adapting-to-other-cities.md) : trouver une BBOX et extraire une autre ville.
- [docs/bbox-mcp-server.md](docs/bbox-mcp-server.md) : contexte de l'outil MCP optionnel.
- [docs/github-publishing.md](docs/github-publishing.md) : checklist de publication GitHub.

---

## Limites connues

- La qualité dépend directement des tags OpenStreetMap.
- `building:levels` est souvent incomplet ; la densité résidentielle peut donc rester basse par défaut.
- Les exports eau `water_lines_clipped.geojson` et `water_areas_clipped.geojson` sont référencés dans le manifeste TimelineMod mais ne sont pas encore produits par `extract_zoning.py`.
- Les couches transport public, services, électricité, eau/égouts, déchets, ressources naturelles, parcs et `unknown` sont prévues mais non implémentées.
- Les anciens fichiers `.before-*` sont des instantanés de travail conservés dans le dépôt, pas le chemin d'exécution courant.

---

## Licence

MIT - voir [LICENSE](LICENSE).

Données cartographiques © contributeurs [OpenStreetMap](https://www.openstreetmap.org/), sous licence [ODbL](https://www.openstreetmap.org/copyright).
