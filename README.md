<div align="center">

# CS2 Real OSM Extractor
## Pipeline OpenStreetMap -> Cities: Skylines 2

> Extraction Overpass, classification CS2, pack GeoJSON scindé, worldmap/heightmap PNG et manifest TimelineMod.
>
> Projet local orienté création de cartes CS2 : pas de base PostGIS, pas de QGIS obligatoire, un visualiseur Leaflet pour contrôler les données avant intégration.

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Données OSM](https://img.shields.io/badge/Donn%C3%A9es-OpenStreetMap-7B3F00?style=for-the-badge&logo=openstreetmap)](https://www.openstreetmap.org/)
[![Leaflet](https://img.shields.io/badge/Visualiseur-Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)

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

Le dépôt transforme une emprise géographique réelle en ressources exploitables pour préparer une carte Cities: Skylines 2 :

- interroge OpenStreetMap via plusieurs instances Overpass avec réessais ;
- extrait les zones résidentielles, commerciales, retail, industrielles, parkings, bureaux, usage mixte, routes, chemins piétons et couches d'eau ;
- classe les objets OSM vers des familles lisibles côté CS2 ;
- écrit un pack GeoJSON scindé avec `layer_index.json` et `extraction_report.json` ;
- génère des PNG `worldmap` et `heightmap` 4096 px depuis Terrain RGB MapTiler ou Mapbox ;
- produit un `manifest.json` de bundle et un `timeline_config.json` pour TimelineMod / CityTimelineMod ;
- affiche le tout dans un visualiseur Leaflet avec tableau de bord, légende, popups OSM, navigation mondiale et aide de calage CS2.

Le projet ne fabrique pas un zonage administratif officiel absent d'OSM. Il produit une interprétation jouable et vérifiable à partir des tags disponibles.

```text
OpenStreetMap / Overpass
  -> src/extract_zoning.py
  -> exports/bundles/<lon>_<lat>/geojson_pack

Terrain RGB MapTiler ou Mapbox
  -> tools/export_cs2_pngs.py
  -> exports/bundles/<lon>_<lat>/png

Manifest / config
  -> tools/write_cs2_bundle_manifest.py
  -> exports/bundles/<lon>_<lat>/manifest.json
  -> exports/bundles/<lon>_<lat>/timeline_config.json

Contrôle visuel
  -> visualizer/index.html
```

---

## Bundle local actuel

Le workspace contient actuellement un bundle généré sous :

```text
exports/bundles/-117.723999_33.653495/
```

`exports/` est ignoré par Git. Après un clone propre, ce dossier peut donc être absent et doit être régénéré.

| Champ | Valeur |
|:------|:-------|
| Nom | `Zone CS2` |
| Centre | lon `-117.723999`, lat `33.653495` |
| World map | `57.344 km` |
| Heightmap | `14.336 km`, `4096 x 4096`, PNG 16-bit grayscale |
| BBOX world map | `33.394993,-118.033104,33.911997,-117.414894` |
| BBOX heightmap / extraction GeoJSON | `33.588870,-117.801275,33.718120,-117.646723` |
| Rapport GeoJSON | `exports/bundles/-117.723999_33.653495/geojson_pack/reports/extraction_report.json` |
| Index visualiseur | `exports/bundles/-117.723999_33.653495/geojson_pack/reports/layer_index.json` |
| Manifest bundle | `exports/bundles/-117.723999_33.653495/manifest.json` |
| Config TimelineMod | `exports/bundles/-117.723999_33.653495/timeline_config.json` |

Répartition du pack GeoJSON actuel :

| Couche | Géométrie | Objets |
|:-------|:----------|------:|
| `residential` | Polygon | 323 |
| `commercial` | Polygon | 510 |
| `industrial` | Polygon | 128 |
| `retail` | Polygon | 129 |
| `parking` | Polygon | 1 065 |
| `office` | Polygon | 142 |
| `mixed` | Polygon | 0 |
| `zoning_polygons` | Polygon | 2 297 |
| `roads` | LineString | 29 674 |
| `roads_major_clipped` | LineString | 7 699 |
| `roads_driveable_clipped` | LineString | 29 674 |
| `paths` | LineString | 7 803 |
| `water_lines_clipped` | LineString | 423 |
| `water_areas_clipped` | Polygon | 100 |
| `all_features` | Mixed | 40 297 |

Les PNG associés sont :

| Fichier | Rôle |
|:--------|:-----|
| `worldmap_-117.723999_33.653495_57.344.png` | PNG 4096 px couvrant l'emprise world map. |
| `heightmap_-117.723999_33.653495_14.336.png` | PNG 4096 px couvrant l'emprise heightmap. |
| `cs2_png_contract_-117.723999_33.653495.json` | Contrat de génération et de validation des PNG. |
| `*.metadata.json` | Statistiques d'altitude et paramètres d'encodage Terrain RGB. |

---

## Installation

### Prérequis de base

- Python 3.11 ou plus récent ;
- navigateur moderne pour le visualiseur ;
- connexion réseau pour Overpass, Leaflet CDN, fonds de carte CARTO et exports Terrain RGB ;
- une clé `MAPTILER_API_KEY` ou `MAPBOX_TOKEN` pour générer les PNG terrain.

Depuis la racine, pour le pipeline OSM :

```powershell
cd src
uv sync
```

Sans `uv` :

```powershell
python -m pip install requests tqdm
```

Pour les outils PNG et clipping :

```powershell
python -m pip install numpy pillow shapely
```

Avant un export Terrain RGB MapTiler :

```powershell
$env:MAPTILER_API_KEY = "votre-cle"
```

Ou avec Mapbox :

```powershell
$env:MAPBOX_TOKEN = "votre-token"
```

---

## Générer un pack GeoJSON

Depuis la racine du dépôt :

```powershell
python .\src\extract_zoning.py `
  --city "Zone CS2" `
  --bbox "33.588870,-117.801275,33.718120,-117.646723" `
  --out-dir ".\exports\bundles\-117.723999_33.653495\geojson_pack" `
  --split-layers
```

Options principales :

| Option | Rôle |
|:-------|:-----|
| `--bbox "sud,ouest,nord,est"` | Emprise Overpass à extraire. |
| `--city "Nom"` | Nom utilisé dans les rapports. |
| `--out-dir "chemin"` | Dossier du pack GeoJSON scindé. |
| `--split-layers` | Conservé pour compatibilité avec le workflow courant. |
| `--out "visualizer/zoning_data.js"` | Génère l'ancien fichier JS global `DATA_*`. |

Le mode recommandé est le pack GeoJSON scindé. Le fichier `visualizer/zoning_data.js` reste un fallback legacy et est ignoré par `.gitignore`, car il peut devenir très lourd.

---

## Générer les PNG CS2

`tools/export_cs2_pngs.py` orchestre deux exports Terrain RGB :

- une worldmap `57.344 km` ;
- une heightmap `14.336 km` ;
- puis une validation de nommage, centre, taille en kilomètres et résolution.

Exemple :

```powershell
python .\tools\export_cs2_pngs.py `
  --center-lon -117.723999 `
  --center-lat 33.653495 `
  --worldmap-size-km 57.344 `
  --heightmap-size-km 14.336 `
  --pixels 4096 `
  --out-dir ".\exports\bundles\-117.723999_33.653495\png" `
  --provider maptiler `
  --zoom 14 `
  --heightmap-normalization nonta-manual `
  --cs2-base-level 1.0 `
  --cs2-elevation-scale 4096 `
  --cs2-vertical-scale 2.5
```

Par défaut, les fichiers existants sont conservés. Ajoutez `--force` pour les régénérer.

---

## Écrire le manifest du bundle

Après GeoJSON + PNG :

```powershell
python .\tools\write_cs2_bundle_manifest.py `
  --center-lon -117.723999 `
  --center-lat 33.653495 `
  --city "Zone CS2" `
  --worldmap-size-km 57.344 `
  --heightmap-size-km 14.336 `
  --world-bbox "33.394993,-118.033104,33.911997,-117.414894" `
  --heightmap-bbox "33.588870,-117.801275,33.718120,-117.646723" `
  --exports-root "exports\bundles\-117.723999_33.653495" `
  --png-dir ".\exports\bundles\-117.723999_33.653495\png" `
  --geojson-dir ".\exports\bundles\-117.723999_33.653495\geojson_pack" `
  --out ".\exports\bundles\-117.723999_33.653495\manifest.json" `
  --write-timeline-config `
  --check-existing
```

Validation PNG séparée :

```powershell
python .\tools\validate_png_contract.py `
  --manifest ".\exports\bundles\-117.723999_33.653495\manifest.json" `
  --roots ".\exports\bundles\-117.723999_33.653495\png"
```

---

## Ouvrir le visualiseur

Le visualiseur charge des fichiers GeoJSON avec `fetch`. Servez donc la racine du dépôt en HTTP local :

```powershell
python -m http.server 8000
```

Puis ouvrez :

```text
http://localhost:8000/visualizer/
```

Chargement des données :

1. `visualizer/js/pack-loader.js` tente de lire `../exports/bundles/-117.723999_33.653495/geojson_pack/reports/layer_index.json`.
2. Les GeoJSON listés sont convertis en objets internes `[lat, lon]`.
3. Si le pack est absent ou illisible, le visualiseur retombe sur le mode legacy `visualizer/zoning_data.js` quand ce fichier existe.

Fonctions disponibles :

- métriques globales et statut du jeu de données ;
- activation / désactivation des couches ;
- popups avec ID OSM, tags utiles et pinceau CS2 recommandé ;
- légende CS2 ;
- navigation rapide par continent, pays et capitale ;
- overlay `world map` et `heightmap` ;
- déplacement précis du centre par pas de `1 m`, `10 m`, `100 m` ou `1 km` ;
- copie des BBOX, commandes Python, manifests et configs générés ;
- commande "bundle complet" qui recrée le dossier cible, extrait les GeoJSON, génère les PNG, écrit le manifest et valide les fichiers.

Les commandes affichées par l'aide CS2 reflètent l'environnement local actuel. Si le projet est cloné ailleurs, adaptez le chemin Python et le chemin du dépôt.

---

## Couches et classification

### Zones

| Couche | Sources OSM principales | Lecture CS2 |
|:-------|:------------------------|:------------|
| `residential` | `landuse=residential`, `building:levels`, `levels`, types résidentiels | Résidentiel haute / moyenne / basse densité |
| `commercial` | `landuse=commercial`, niveaux, `shop`, `office` | Commercial haute / basse densité |
| `retail` | `landuse=retail` | Commerce de détail |
| `industrial` | `landuse=industrial`, `building=industrial/warehouse/factory` | Industrie |
| `parking` | `amenity=parking`, `parking=*`, `building=parking/garage` | Parking de surface / en ouvrage |
| `office` | `building=office`, `office=*`, `landuse=office` | Bureaux / administration |
| `mixed` | `landuse=mixed`, `building=mixed_use` | Usage mixte |

### Réseau, chemins et eau

| Couche | Sources OSM | Rendu / usage |
|:-------|:------------|:--------------|
| `roads` | `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `residential`, `service`, liens routiers, etc. | Routes, autoroutes, bretelles, services, ponts, tunnels, ronds-points |
| `roads_major_clipped` | Sous-ensemble de `roads` | Axes majeurs pour intégration ou diagnostic |
| `roads_driveable_clipped` | Sous-ensemble de `roads` | Réseau routier carrossable |
| `paths` | `footway`, `path`, `steps`, `pedestrian` | Chemins et rues piétonnes |
| `water_lines_clipped` | `waterway=river/stream/canal/drain/ditch` | Cours d'eau linéaires |
| `water_areas_clipped` | `natural=water`, `water=*`, `landuse=reservoir/basin`, `waterway=riverbank` | Lacs, bassins, réservoirs, surfaces d'eau |

Les tags utiles sont conservés dans les propriétés GeoJSON pour le diagnostic : `highway`, `lanes`, `oneway`, `maxspeed`, `surface`, `bridge`, `tunnel`, `junction`, `cycleway`, `busway`, `sidewalk`, `waterway`, `natural`, `water`, `landuse`, etc.

---

## Structure du dépôt

| Chemin | Rôle |
|:-------|:-----|
| `src/` | Pipeline Python Overpass, classification et export GeoJSON. |
| `visualizer/` | Interface Leaflet statique, tableau de bord, overlay CS2 et fallback legacy. |
| `tools/` | Exports PNG, manifest bundle, validation, clipping et diagnostics. |
| `exports/` | Sorties locales générées, ignorées par Git. |
| `analysis_zoning_data/` | Rapports et exports de diagnostic issus d'analyses précédentes. |
| `docs/` | Documentation technique, adaptation à d'autres villes, publication et captures. |
| `data/` | Échantillon léger de sortie JS. |
| `METHODOLOGY.md` | Justification technique du pipeline OSM -> CS2. |
| `arborescence.html` | Vue HTML locale de l'arborescence du projet. |

Les fichiers `*.before-*` sont des instantanés de travail conservés dans le dépôt. Ils ne sont pas le chemin d'exécution courant.

---

## Outils annexes

| Script | Usage |
|:-------|:------|
| `tools/export_cs2_pngs.py` | Pipeline worldmap + heightmap + contrat + validation. |
| `tools/export_terrain_rgb_png.py` | Télécharge les tuiles Terrain RGB et écrit un PNG 16-bit grayscale. |
| `tools/write_cs2_bundle_manifest.py` | Écrit `manifest.json` et, optionnellement, `timeline_config.json`. |
| `tools/validate_png_contract.py` | Vérifie les PNG attendus par centre, taille et résolution. |
| `tools/clip_existing_pack_to_bbox.py` | Reclipe un pack GeoJSON existant sur sa BBOX déclarée ou une BBOX fournie. |
| `tools/clip_to_heightmap_bbox.py` | Clippe les exports d'analyse historiques sur la BBOX heightmap. |
| `tools/export_road_subsets.py` | Produit des sous-ensembles routiers depuis des exports d'analyse. |
| `tools/analyze_zoning_data_v2.py` | Analyse l'ancien `zoning_data.js` et génère CSV + GeoJSON de diagnostic. |
| `tools/diagnose_zoning_js.py` | Inspecte la structure d'un fichier legacy `visualizer/zoning_data.js`. |

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
- Overpass peut répondre lentement ou échouer sur de grandes emprises. Le pipeline réduit ce risque avec des requêtes séparées et une rotation de serveurs, sans le supprimer.
- Les exports Terrain RGB nécessitent un fournisseur externe, une clé API et une connexion réseau.
- `exports/`, `.env*` et `visualizer/zoning_data.js` sont ignorés pour éviter de publier des fichiers lourds ou sensibles.
- Les couches transport public, services, électricité, égouts, déchets, ressources naturelles, parcs et `unknown` restent prévues mais non implémentées dans le pipeline courant.
- Le projet prépare des ressources et contrats pour CS2 / TimelineMod ; l'intégration finale côté jeu ou mod reste une étape séparée.

---

## Licence

MIT - voir [LICENSE](LICENSE).

Données cartographiques © contributeurs [OpenStreetMap](https://www.openstreetmap.org/), sous licence [ODbL](https://www.openstreetmap.org/copyright).
