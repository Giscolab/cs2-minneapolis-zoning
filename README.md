<div align="center">

# 🏙️ Extracteur CS2 de zonage réel
## Extracteur SIG de zonage réel v1.0

> **Données de zonage issues d'OpenStreetMap → Cities: Skylines 2**  
> *100 % open source · Aucune clé API · Exécution locale*

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
| *Carte interactive de zonage — fond de carte CartoDB Dark Matter* | *Exemple de rendu avec couches de densité visibles* |

</div>

---

## ⚙️ Fonctionnement

Cet outil extrait des polygones réels depuis OpenStreetMap via l'API Overpass, puis les classe automatiquement vers des types de zones compatibles avec Cities: Skylines 2.

```text
┌─────────────────────────────┐
│  OpenStreetMap              │
│  (API Overpass)             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  extract_zoning.py          │
│  ← requêtes séquentielles   │
│    + réessai multi-serveurs │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  zoning_data.js             │
│  ← polygones classés        │
│    au format JavaScript     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  visualizer/index.html      │
│  ← carte interactive        │
│    Leaflet.js               │
└─────────────────────────────┘
```

> 💡 **Aucune clé API. Aucun service payant. Pas de PostGIS.**  
> Seulement Python + requests.

---

## 🗺️ Types de zones détectés

| Tag OSM | Condition | Zone CS2 | Couleur |
|:--------|:----------|:---------|:--------|
| `landuse=residential` | ≥5 étages ou appartements | 🏢 Résidentiel haute densité | `#e74c3c` 🔴 Rouge |
| `landuse=residential` | ≥3 étages ou maisons de ville | 🏘️ Résidentiel moyenne densité | `#f39c12` 🟠 Orange |
| `landuse=residential` | par défaut | 🏡 Résidentiel basse densité | `#f1c40f` 🟡 Jaune |
| `landuse=commercial` | ≥4 étages | 🏬 Commercial haute densité | `#3498db` 🔵 Bleu |
| `landuse=commercial` | par défaut | 🏪 Commercial basse densité | `#85c1e9` 🔵 Bleu clair |
| `landuse=retail` | — | 🛒 Commerce de détail | `#6ab4f7` 🔵 Bleu ciel |
| `landuse=industrial` | — | 🏭 Industrie | `#c8a000` 🟠 Or |
| `amenity=parking` | plusieurs niveaux | 🅿️ Parking en ouvrage | `#7f8c8d` ⚫ Gris foncé |
| `amenity=parking` | par défaut | 🅿️ Parking de surface | `#95a5a6` ⚪ Gris |
| `building=office` | — | 🏢 Bureaux / administration | `#9b59b6` 🟣 Violet |
| `landuse=mixed` | — | 🏗️ Usage mixte | `#00e5ff` 🔵 Cyan |

📄 Voir [`docs/cs2-zone-reference.md`](docs/cs2-zone-reference.md) pour le tableau complet.

---

## 🚀 Démarrage rapide

### 1️⃣ Cloner le dépôt

```powershell
git clone https://github.com/<owner>/cs2-real-zoning-extractor
cd cs2-real-zoning-extractor\src
```

### 2️⃣ Installer les dépendances

```powershell
C:\Python314\python.exe -m pip install requests tqdm
```

### 3️⃣ Exécuter l'extraction

```powershell
C:\Python314\python.exe .\extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657"
```

### 4️⃣ Visualiser la carte

```powershell
cd ..\visualizer
start index.html
```

---

## 🌍 Adapter à une ville

L'outil fonctionne avec une **boîte géographique** au format :

```text
latitude_min,longitude_min,latitude_max,longitude_max
```

### Exemples

| Ville | Commande |
|:------|:---------|
| **Paris** | `C:\Python314\python.exe .\extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657"` |
| **New York** | `C:\Python314\python.exe .\extract_zoning.py --bbox "40.70,-74.02,40.83,-73.91"` |

> 🎯 La carte se recentre automatiquement sur les données générées.

---

## 🎯 Objectif du projet

Ce fork vise à rendre l'outil plus générique :

- [x] Ne plus dépendre d'une ville unique par défaut
- [x] Permettre l'extraction de n'importe quelle ville
- [ ] Améliorer la classification pour les villes européennes *(en cours)*
- [ ] Préparer une interface multilingue *(en cours)*
- [ ] Produire des données utiles pour Cities: Skylines 2 *(en cours)*

---

## 📐 Méthodologie

Les choix techniques sont documentés dans [`METHODOLOGY.md`](METHODOLOGY.md).

---

## 🛠️ Outils utilisés

| Technologie | Usage |
|:------------|:------|
| **Python 3.11+** | Extraction et traitement des données |
| **requests** | Requêtes HTTP vers l'API Overpass |
| **tqdm** | Barres de progression |
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

⭐ *Si ce projet vous est utile, n'hésitez pas à laisser une étoile sur le dépôt !* ⭐

</div>
