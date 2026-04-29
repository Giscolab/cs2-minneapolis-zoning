<div align="center">

# 📐 Méthodologie
## Pipeline d'extraction de zonage réel pour CS2

*Documentation technique des principaux choix de conception du projet.*

---

</div>

## 📌 Table des matières

1. [Problème : limites et timeouts de l'API Overpass](#1-problème--limites-et-timeouts-de-lapi-overpass)
2. [Solution : requêtes séquentielles par catégorie](#2-solution--requêtes-séquentielles-par-catégorie)
3. [Stratégie d'index de densité résidentielle](#3-stratégie-dindex-de-densité-résidentielle)
4. [Rotation multi-serveurs Overpass](#4-rotation-multi-serveurs-overpass)
5. [Correspondance OSM → CS2](#5-correspondance-osm--cs2)
6. [Déduplication commercial / bureaux](#6-déduplication-commercial--bureaux)
7. [Pourquoi pas QGIS, PostGIS ou GeoPandas ?](#7-pourquoi-pas-qgis-postgis-ou-geopandas-)
8. [Adaptation à n'importe quelle ville](#8-adaptation-à-nimporte-quelle-ville)
9. [Qualité des données OpenStreetMap](#9-qualité-des-données-openstreetmap)
10. [Objectif à long terme](#10-objectif-à-long-terme)

---

## 1. Problème : limites et timeouts de l'API Overpass

L'API Overpass est un service communautaire gratuit permettant d'interroger les données OpenStreetMap par zone géographique.

L'approche naïve consiste à faire une seule grosse requête pour récupérer tous les types de zonage. En pratique, cette méthode échoue souvent sur des zones urbaines larges :

```text
❌ HTTP 504 Gateway Timeout
```

### 🔴 Causes principales

| Cause | Explication |
|:------|:------------|
| Surface trop grande | Une ville complète peut couvrir une grande surface |
| Réponse volumineuse | Une requête unique peut produire plusieurs mégaoctets de JSON |
| Délais stricts | Les serveurs Overpass publics imposent des délais stricts |
| Instabilité | Les grosses requêtes peuvent échouer même quand le serveur fonctionne correctement |

---

## 2. Solution : requêtes séquentielles par catégorie

Le pipeline exécute plusieurs requêtes séparées :

```text
buildings_levels → residential → commercial → industrial →
retail → parking → office → mixed
```

### ✅ Avantages

- Chaque réponse est plus petite
- Les timeouts sont moins fréquents
- Une catégorie échouée peut être relancée seule
- L'utilisateur voit la progression en temps réel

### ⚠️ Inconvénient

- Plusieurs allers-retours réseau au lieu d'un seul

> 💡 **Ce compromis est préférable à une requête unique instable.**

---

## 3. Stratégie d'index de densité résidentielle

Dans OpenStreetMap, `landuse=residential` décrit souvent un quartier entier. Ce tag ne suffit pas à distinguer :

- 🏙️ Centre-ville dense
- 🏢 Quartier d'immeubles
- 🏡 Pavillonnaire
- 🏘️ Maisons de ville

La densité est donc déduite à partir des bâtiments et de leurs tags, notamment :

```text
building:levels
levels
building=apartments
building=terrace
building=townhouse
```

### Approche en deux passes

#### 🔄 Passe 1

Téléchargement des bâtiments avec informations d'étages.

Un index mémoire est construit :

```python
{element_id: nombre_etages}
```

#### 🔄 Passe 2

Classification des zones résidentielles en fonction :

- des étages indiqués sur la zone
- des étages indexés
- du type résidentiel
- du type de bâtiment

### 📊 Seuils actuels

| Seuil | Classification | Description |
|:------|:---------------|:------------|
| **≥5 étages** | 🏢 Résidentiel haute densité | Immeubles, appartements |
| **≥3 étages** | 🏘️ Résidentiel moyenne densité | Maisons de ville, petits collectifs |
| **défaut** | 🏡 Résidentiel basse densité | Pavillonnaire |

> ⚙️ Ces seuils sont simples et doivent rester ajustables dans :  
> `src/classifiers.py`

---

## 4. Rotation multi-serveurs Overpass

Le pipeline utilise plusieurs serveurs Overpass publics :

| Serveur | Type | Statut |
|:--------|:-----|:------:|
| `overpass-api.de` | Instance principale | 🟢 |
| `overpass.kumi.systems` | Instance communautaire | 🟢 |
| `overpass.openstreetmap.ru` | Instance communautaire | 🟢 |
| `maps.mail.ru/osm/tools/overpass` | Instance communautaire | 🟢 |

### 🔄 Stratégie

```text
1. Essayer un serveur
   ↓
2. Passer au suivant en cas d'échec
   ↓
3. Attendre progressivement entre les tentatives
   ↓
4. Abandonner seulement après échec de tous les serveurs
```

> ✅ Cette méthode réduit les blocages dus à un serveur temporairement saturé.

---

## 5. Correspondance OSM → CS2

> ⚠️ Le projet ne prétend pas produire un zonage administratif officiel. Il produit une **interprétation jouable** pour Cities: Skylines 2.

### 🏠 Résidentiel

```text
🏢 haute densité   → immeubles, appartements, 5 étages ou plus
🏘️ moyenne densité → maisons de ville, petits collectifs, 3 à 4 étages
🏡 basse densité   → défaut
```

### 🏬 Commercial

```text
🏢 haute densité → grands bâtiments, bureaux, centres commerciaux
🏪 basse densité → commerces de proximité
```

### 🛒 Commerce de détail

`landuse=retail` est gardé séparément, car il correspond souvent à des zones commerciales identifiables.

### 🅿️ Parkings

Les parkings sont séparés en deux catégories :

```text
🅿️ parking en ouvrage → parking à étages / souterrain
🅿️ parking de surface → stationnement au sol
```

### 🏢 Bureaux

Les bureaux peuvent être présents via :

```text
building=office
office=*
landuse=office
```

> 🔄 Un mécanisme évite de compter deux fois les mêmes objets quand ils apparaissent aussi en commercial.

---

## 6. Déduplication commercial / bureaux

OpenStreetMap peut contenir plusieurs tags sur le même objet.

### Exemple

```text
landuse=commercial
building=office
```

❌ Sans déduplication, le visualiseur afficherait deux polygones superposés.

### ✅ Solution actuelle

```text
1. Traiter commercial d'abord
   ↓
2. Mémoriser les identifiants OSM
   ↓
3. Ignorer ces mêmes identifiants dans la passe office
```

---

## 7. Pourquoi pas QGIS, PostGIS ou GeoPandas ?

Ces outils sont puissants, mais ils ajoutent de la complexité.

### 📊 Comparaison des approches

| Outil | Avantage | Inconvénient | Verdict |
|:------|:---------|:-------------|:--------|
| **QGIS** | Très bon outil SIG visuel | Moins adapté à un pipeline léger et reproductible pour joueur CS2 | ❌ |
| **PostGIS** | Très robuste | Nécessite PostgreSQL et une configuration serveur | ❌ |
| **GeoPandas** | Très puissant | Ajoute de nombreuses dépendances lourdes : GDAL, Shapely, Fiona, etc. | ❌ |

### 🎯 Philosophie du projet

```text
✅ installation simple
✅ peu de dépendances
✅ exécution locale rapide
✅ compréhension facile
```

### 📦 Dépendances actuelles

| Package | Version | Usage |
|:--------|:--------|:------|
| `requests` | *latest* | Requêtes HTTP |
| `tqdm` | *latest* | Barres de progression |

---

## 8. Adaptation à n'importe quelle ville

Le pipeline est **générique**.

Il faut fournir une boîte géographique au format Overpass :

```text
sud,ouest,nord,est
```

Soit :

```text
latitude_min,longitude_min,latitude_max,longitude_max
```

### 🌍 Exemples

| Ville | Commande |
|:------|:---------|
| **Paris** | `python extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657" --city "Paris"` |
| **New York** | `python extract_zoning.py --bbox "40.70,-74.02,40.83,-73.91" --city "New York"` |

---

## 9. Qualité des données OpenStreetMap

La qualité du résultat dépend directement de la qualité des données OSM.

Les villes bien couvertes donnent de meilleurs résultats, surtout si les bâtiments possèdent :

```text
building:levels
building
landuse
amenity
office
shop
```

> ⚠️ Dans les zones où les hauteurs de bâtiments sont peu renseignées, beaucoup de résidentiel peut tomber en basse densité par défaut.
>
> Ce n'est **pas une erreur du pipeline** : c'est une **limite de la donnée source**.

---

## 10. Objectif à long terme

Le projet vise à devenir un **extracteur générique de zonage réel** pour Cities: Skylines 2.

### 🗺️ Axes d'amélioration

- [ ] Profils de classification par région
- [ ] Meilleure prise en charge des villes européennes
- [ ] Interface multilingue
- [ ] Détection plus fine de l'usage mixte
- [ ] Export de presets par ville
- [ ] Meilleure documentation pour les créateurs de cartes CS2

---

<div align="center">

📄 *Documentation technique — Projet d'extraction CS2 de zonage réel*  
📝 Sous licence MIT

</div>
