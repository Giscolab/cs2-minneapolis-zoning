<div align="center">

# 🏙️ CS2 Real OSM Extractor
## Extracteur SIG OpenStreetMap pour Cities: Skylines 2

> **Objets réels OpenStreetMap → grandes familles lisibles pour Cities: Skylines 2**  
> *100 % open source · Aucune clé API · Exécution locale · Visualiseur Leaflet*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Licence MIT](https://img.shields.io/badge/Licence-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Données OSM](https://img.shields.io/badge/Données-OpenStreetMap-7B3F00?style=for-the-badge&logo=openstreetmap)](https://www.openstreetmap.org/)

---

</div>

## 📸 Aperçu

<div align="center">

| Carte interactive complète | Zoom centre-ville |
|:---:|:---:|
| ![Aperçu complet](docs/screenshots/preview_full.png) | ![Zoom centre-ville](docs/screenshots/preview_downtown.png) |
| *Visualiseur Leaflet des objets OSM classés* | *Exemple de rendu avec couches de densité visibles* |

</div>

---

## ⚙️ Fonctionnement

Le projet extrait des objets réels depuis OpenStreetMap via Overpass, conserve leurs noms et tags utiles, puis les classe dans des familles proches de la lecture Cities: Skylines 2.

L'objectif n'est pas d'inventer des données absentes d'OSM : si Overpass ne fournit pas une information fiable, l'outil garde un résultat neutre ou `Néant`.

```text
┌─────────────────────────────┐
│  OpenStreetMap              │
│  nodes / ways / relations   │
└──────────────┬──────────────┘
               │ Overpass QL + out geom
               ▼
┌─────────────────────────────┐
│  extract_zoning.py          │
│  requêtes séparées          │
│  classification OSM → CS2   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  zoning_data.js             │
│  DATA_RESIDENTIAL           │
│  DATA_ROADS / DATA_PATHS    │
│  autres DATA_*              │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  visualizer/index.html      │
│  carte interactive Leaflet  │
│  polygones + lignes         │
└─────────────────────────────┘
```

> 💡 **Aucune clé API. Aucun service payant. Pas de PostGIS.**  
> Seulement Python, requests, Overpass et un visualiseur HTML statique.

---

## 🗺️ Couches extraites

### Zones et bâtiments

| Sortie JS | Source OSM principale | Lecture CS2 |
|:----------|:----------------------|:------------|
| `DATA_RESIDENTIAL` | `landuse=residential` + niveaux de bâtiments | Résidentiel haute / moyenne / basse densité |
| `DATA_COMMERCIAL` | `landuse=commercial` | Commercial haute / basse densité |
| `DATA_RETAIL` | `landuse=retail` | Commerce de détail |
| `DATA_INDUSTRIAL` | `landuse=industrial`, bâtiments industriels | Industrie |
| `DATA_PARKING` | `amenity=parking` | Parking de surface / en ouvrage |
| `DATA_OFFICE` | `building=office`, `office=*`, `landuse=office` | Bureaux / administration |
| `DATA_MIXED` | `landuse=mixed`, `building=mixed_use` | Usage mixte |

### Réseau viaire

| Sortie JS | Source OSM filtrée | Lecture visualiseur |
|:----------|:-------------------|:--------------------|
| `DATA_ROADS` | `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `unclassified`, `residential`, `living_street`, `service` et leurs liens | Routes, autoroutes, bretelles, voies de service, ponts, tunnels, ronds-points |
| `DATA_PATHS` | `footway`, `path`, `steps`, `pedestrian` | Chemins et rues piétonnes |

Les valeurs `cycleway`, `bridleway`, `corridor`, `elevator`, `platform` et autres `highway=*` ne sont pas intégrées à `DATA_ROADS`. Une couche vélo séparée pourra être ajoutée plus tard si elle devient utile.

---

## 📦 Sortie générée

Le script écrit un fichier JavaScript consommé directement par le visualiseur :

```js
const DATA_ROADS = [
  {
    id: 123,
    name: "Boulevard périphérique",
    category: "Roads",
    subcategory: "Highway",
    sourceTag: "highway=motorway",
    confidence: "direct",
    coords: [[48.85, 2.30], [48.86, 2.31]],
    tags: {
      highway: "motorway",
      lanes: "3",
      maxspeed: "70"
    }
  }
];
```

Les zones sont rendues comme polygones Leaflet. Les routes et chemins sont rendus comme lignes Leaflet.

---

## 🚀 Démarrage rapide

### 1️⃣ Cloner le dépôt

```powershell
git clone https://github.com/<owner>/cs2-minneapolis-zoning
cd cs2-minneapolis-zoning\src
```

### 2️⃣ Installer les dépendances

```powershell
python -m pip install requests tqdm
```

### 3️⃣ Exécuter l'extraction

```powershell
python .\extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657" --city "Paris"
```

Par défaut, le fichier généré est :

```text
visualizer/zoning_data.js
```

### 4️⃣ Visualiser la carte

```powershell
cd ..\visualizer
start index.html
```

---

## 🌍 Adapter à une ville

L'outil fonctionne avec une **boîte géographique** au format Overpass :

```text
latitude_min,longitude_min,latitude_max,longitude_max
```

### Exemples

| Ville | Commande |
|:------|:---------|
| **Paris** | `python .\extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657" --city "Paris"` |
| **Minneapolis** | `python .\extract_zoning.py --bbox "44.86,-93.38,45.05,-93.17" --city "Minneapolis"` |
| **New York** | `python .\extract_zoning.py --bbox "40.70,-74.02,40.83,-73.91" --city "New York"` |

> 🎯 La carte se recentre automatiquement sur les données générées.

Pour les grandes régions, commencez par une bbox réduite. Les routes et chemins peuvent produire beaucoup d'objets et donc un fichier `zoning_data.js` volumineux.

---

## 📊 Rapport d'extraction

À la fin d'une extraction, le script affiche un résumé console :

```text
Routes récupérées
Chemins/piéton récupérés
Ignorés sans géométrie
Routes ignorées sans géom.
Chemins ignorés sans géom.
TOTAL
```

Ce rapport sert à éviter les illusions : une couche vide peut simplement signifier qu'OSM ou Overpass ne fournit pas l'information exploitable dans la bbox.

---

## 🎯 Objectif du projet

Ce projet évolue vers un extracteur OSM → CS2 plus global, couche par couche :

- [x] Extraire les zones principales : résidentiel, commercial, industrie, retail, parking, bureaux, mixte
- [x] Ajouter les routes utiles à CS2 dans `DATA_ROADS`
- [x] Séparer les chemins piétons dans `DATA_PATHS`
- [ ] Ajouter les transports dans `DATA_TRANSPORT`
- [ ] Ajouter les services publics dans `DATA_SERVICES`
- [ ] Ajouter les utilités : électricité, eau/égouts, déchets
- [ ] Ajouter ressources naturelles, parcs et loisirs
- [ ] Ajouter une couche `DATA_UNKNOWN` pour les objets non classés utiles au diagnostic

---

## 📐 Méthodologie

Les choix techniques sont documentés dans [`METHODOLOGY.md`](METHODOLOGY.md).

Principe général :

```text
OSM / Overpass
→ objets réels récupérés
→ classement par grandes familles CS2
→ nom réel OSM conservé
→ catégorie CS2 utilisée comme libellé de lecture
→ néant si Overpass ne peut pas fournir l'info
```

---

## 🛠️ Outils utilisés

| Technologie | Usage |
|:------------|:------|
| **Python 3.11+** | Extraction et traitement des données |
| **requests** | Requêtes HTTP vers l'API Overpass |
| **API Overpass** | Données OpenStreetMap en temps réel |
| **Leaflet.js** | Rendu de la carte interactive |
| **CartoDB Dark Matter** | Fond de carte sombre |

---

## 📜 Licence

<div align="center">

**MIT** — voir [`LICENSE`](LICENSE)

Données cartographiques © contributeurs [OpenStreetMap](https://www.openstreetmap.org/), sous licence [ODbL](https://www.openstreetmap.org/copyright).

</div>

---

<div align="center">

⭐ *Si ce projet vous est utile, n'hésitez pas à laisser une étoile sur le dépôt.* ⭐

</div>
