<div align="center">

# 🗺️ Référence des zones CS2
## Tags OpenStreetMap → Cities: Skylines 2

*Table de correspondance utilisée par le pipeline d'extraction.*

---

</div>

## 📑 Table des matières

- [Principe général](#principe-général)
- [Contrat de sortie](#contrat-de-sortie)
- [Résidentiel](#résidentiel)
- [Commercial](#commercial)
- [Commerce de détail](#commerce-de-détail)
- [Industrie](#industrie)
- [Parkings](#parkings)
- [Bureaux](#bureaux)
- [Usage mixte](#usage-mixte)
- [Réseau routier](#réseau-routier)
- [Chemins et piéton](#chemins-et-piéton)
- [Couches prévues](#couches-prévues)
- [Capture de la légende](#capture-de-la-légende)
- [Packs de zones moddés](#packs-de-zones-moddés)

---

## Principe général

Le pipeline applique volontairement une méthode simple et vérifiable :

```text
OSM / Overpass
→ objets réels récupérés
→ classement par grandes familles CS2
→ nom réel OSM conservé
→ catégorie CS2 utilisée comme libellé de lecture
→ Néant si Overpass ne fournit pas l'information
```

OpenStreetMap fournit des `node`, `way` et `relation` avec des tags. Overpass interroge ces objets, et `out geom` permet de récupérer leurs géométries.

Le projet ne remplace pas un zonage officiel absent d'OSM. Il produit une lecture exploitable pour Cities: Skylines 2 à partir des tags disponibles.

---

## Contrat de sortie

Le fichier généré `visualizer/zoning_data.js` expose des tableaux JavaScript consommés par le visualiseur :

| Tableau | Géométrie | Statut | Rendu Leaflet |
|:--------|:----------|:-------|:--------------|
| `DATA_RESIDENTIAL` | Polygone | Implémenté | `L.polygon` |
| `DATA_COMMERCIAL` | Polygone | Implémenté | `L.polygon` |
| `DATA_RETAIL` | Polygone | Implémenté | `L.polygon` |
| `DATA_INDUSTRIAL` | Polygone | Implémenté | `L.polygon` |
| `DATA_PARKING` | Polygone | Implémenté | `L.polygon` |
| `DATA_OFFICE` | Polygone | Implémenté | `L.polygon` |
| `DATA_MIXED` | Polygone | Implémenté | `L.polygon` |
| `DATA_ROADS` | Ligne | Implémenté | `L.polyline` |
| `DATA_PATHS` | Ligne | Implémenté | `L.polyline` |

Les tableaux historiques restent compatibles. Si un tableau est absent ou vide, le visualiseur considère simplement la source comme vide.

### Champs communs des zones

| Champ | Description |
|:------|:------------|
| `id` | Identifiant OSM de l'objet. |
| `name` | Nom OSM si disponible, chaîne vide pour les anciennes zones sans nom. |
| `coords` | Coordonnées `[lat, lon]`. Minimum 3 points pour les polygones. |
| `zone` | Sous-type interne utilisé par le visualiseur, par exemple `high`, `medium`, `low`, `surface`. |
| `cs2` | Libellé lisible côté CS2. |

### Champs communs des lignes

| Champ | Description |
|:------|:------------|
| `id` | Identifiant OSM du `way`. |
| `name` | Nom OSM, ou `Néant` si OSM ne fournit pas de nom. |
| `category` | Grande famille : `Roads` ou `Paths`. |
| `subcategory` | Sous-catégorie de lecture utilisée par le visualiseur. |
| `sourceTag` | Tag OSM principal ayant justifié la classification. |
| `confidence` | `direct` quand le tag correspond directement, `unknown` quand l'objet reste non classé. |
| `coords` | Coordonnées `[lat, lon]`. Minimum 2 points pour les lignes. |
| `tags` | Tags OSM utiles conservés pour diagnostic. |

---

## Résidentiel

| Source Overpass | Condition de classification | Libellé CS2 | Couleur du visualiseur | Notes |
|:----------------|:----------------------------|:------------|:-----------------------:|:------|
| `way/relation["landuse"="residential"]` | `building:levels` ou `levels` ≥ 5, ou `residential=apartments/apartment/condominium/condo`, ou `building=apartments/residential` | Résidentiel haute densité | `#0b6f3a` | Immeubles et grands ensembles résidentiels. |
| `way/relation["landuse"="residential"]` | `building:levels` ou `levels` ≥ 3, ou `building=terrace/dormitory/townhouse/semidetached_house`, ou sous-type résidentiel équivalent | Résidentiel moyenne densité | `#2d9d54` | Maisons de ville, dortoirs, petits collectifs. |
| `way/relation["landuse"="residential"]` | Cas par défaut quand aucun indice de densité fiable n'est disponible | Résidentiel basse densité | `#7ab64d` | Habitat individuel ou peu dense. |

**Index de densité :** `way["building"="apartments"]["building:levels"]` est interrogé avant la classification pour renforcer les décisions de densité résidentielle.

**Logique associée :** `src/classifiers.py:classify_residential()` et [METHODOLOGY.md §3](../METHODOLOGY.md#3-stratégie-dindex-de-densité-résidentielle).

---

## Commercial

| Source Overpass | Condition de classification | Libellé CS2 | Couleur du visualiseur | Notes |
|:----------------|:----------------------------|:------------|:-----------------------:|:------|
| `way/relation["landuse"="commercial"]` | `building:levels` ou `levels` ≥ 4, ou bâtiment commercial / retail / office d'au moins 3 niveaux, ou `shop=mall/department_store`, ou tag `office=*` | Commercial haute densité | `#1f57d6` | Grands bâtiments commerciaux, bureaux denses, centres commerciaux. |
| `way/relation["landuse"="commercial"]` | Cas par défaut | Commercial basse densité | `#4aa3ff` | Commerces de proximité et zones commerciales peu denses. |

**Logique associée :** `src/classifiers.py:classify_commercial()`.

---

## Commerce de détail

| Source Overpass | Condition de classification | Libellé CS2 | Couleur du visualiseur | Notes |
|:----------------|:----------------------------|:------------|:-----------------------:|:------|
| `way/relation["landuse"="retail"]` | Toute zone correspondante | Commerce de détail | `#74c5ff` | Centres commerciaux, corridors de commerces, grandes zones de vente. |

La sortie est `DATA_RETAIL`. Elle est comptée avec le commercial dans les indicateurs du visualiseur, mais reste une couche indépendante.

---

## Industrie

| Source Overpass | Condition de classification | Libellé CS2 | Couleur du visualiseur | Notes |
|:----------------|:----------------------------|:------------|:-----------------------:|:------|
| `way/relation["landuse"="industrial"]` | Toute zone correspondante | Industrie | `#d6ad32` | Usines, entrepôts, logistique. |
| `way["building"~"^(industrial\|warehouse\|factory)$"]` | Bâtiment capturé sans `landuse=industrial` explicite | Industrie | `#d6ad32` | Même catégorie, détectée via le tag `building`. |

---

## Parkings

| Source Overpass | Condition de classification | Libellé CS2 | Couleur du visualiseur | Notes |
|:----------------|:----------------------------|:------------|:-----------------------:|:------|
| `way/relation["amenity"="parking"]` | `parking=multi-storey/multistorey/structure/underground`, ou `building=parking/garage/garages` | Parking en ouvrage | `#5fe86e` | Parking à étages, structure dédiée ou parking souterrain. |
| `way/relation["amenity"="parking"]` | Cas par défaut | Parking de surface | `#b9ed70` | Stationnement au sol. |

**Logique associée :** `src/classifiers.py:classify_parking()`.

---

## Bureaux

| Source Overpass | Condition de classification | Libellé CS2 | Couleur du visualiseur | Notes |
|:----------------|:----------------------------|:------------|:-----------------------:|:------|
| `way/relation["building"="office"]` | Objet non déjà capturé comme commercial | Bureaux / administration | `#a46bd5` | Immeubles tertiaires, administrations, sièges sociaux. |
| `way/relation["office"]` | Objet non déjà capturé comme commercial | Bureaux / administration | `#a46bd5` | Même catégorie. |
| `way["landuse"="office"]` | Objet non déjà capturé comme commercial | Bureaux / administration | `#a46bd5` | Même catégorie. |

**Déduplication :** les objets déjà présents dans la passe `commercial` sont ignorés dans la passe `office`. Voir [METHODOLOGY.md §6](../METHODOLOGY.md#6-déduplication-commercial--bureaux).

---

## Usage mixte

| Source Overpass | Condition de classification | Libellé CS2 | Couleur du visualiseur | Notes |
|:----------------|:----------------------------|:------------|:-----------------------:|:------|
| `way/relation["landuse"="mixed"]` | Toute zone correspondante | Usage mixte | `#2ed6e5` | Zone combinant plusieurs usages urbains. |
| `way/relation["building"="mixed_use"]` | Bâtiment capturé sans `landuse=mixed` explicite | Usage mixte | `#2ed6e5` | Même catégorie. |

---

## Réseau routier

`DATA_ROADS` ne récupère plus `way["highway"]` brut. La requête est filtrée pour garder seulement les voies utiles à une lecture CS2.

### Requête Overpass

```overpass
way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](bbox);
out geom;
```

### Tags routiers conservés

| Tag conservé | Usage |
|:-------------|:------|
| `highway` | Type principal de voie. |
| `lanes` | Nombre de voies si disponible. |
| `oneway` | Sens unique si disponible. |
| `maxspeed` | Vitesse maximale si disponible. |
| `surface` | Revêtement si disponible. |
| `bridge` | Détection des ponts. |
| `tunnel` | Détection des tunnels. |
| `junction` | Détection des ronds-points. |
| `cycleway` | Conservé comme information OSM, mais ne crée pas de couche vélo. |
| `busway` | Conservé comme information OSM. |
| `sidewalk` | Conservé comme information OSM. |

### Classification

| Source OSM | Priorité | Sous-catégorie | Couleur du visualiseur | Notes |
|:-----------|:--------:|:---------------|:-----------------------:|:------|
| `junction=roundabout` | 1 | Roundabout | `#facc15` | Prime sur les autres tags routiers. |
| `bridge=*` positif | 2 | Bridge | `#7dd3fc` | Tout tag `bridge` non vide et non négatif. |
| `tunnel=*` positif | 3 | Tunnel | `#c084fc` | Tout tag `tunnel` non vide et non négatif. |
| `highway=motorway_link/trunk_link/primary_link/secondary_link/tertiary_link` | 4 | Highway Ramp | `#ff7b54` | Bretelles et liens routiers. |
| `highway=motorway/trunk` | 5 | Highway | `#ffb347` | Autoroutes et voies rapides majeures. |
| `highway=service` | 6 | Service Road | `#9aa7b2` | Accès, parkings, dessertes internes. |
| `highway=primary/secondary/tertiary/residential/living_street/unclassified` | 7 | Road | `#e8edf2` | Routes et rues classiques. |
| Autre valeur reçue | 8 | Unknown Road | `#f87171` | Cas de diagnostic, normalement rare avec la requête filtrée. |

**Exclusions de `DATA_ROADS` :** `footway`, `path`, `steps`, `cycleway`, `pedestrian`, `bridleway`, `corridor`, `elevator`, `platform` et tout autre `highway=*` non listé dans la requête filtrée.

**Logique associée :** `src/overpass_client.py:build_roads_query()` et `src/classifiers.py:classify_road()`.

---

## Chemins et piéton

`DATA_PATHS` sépare les chemins piétons de `DATA_ROADS` pour éviter de gonfler artificiellement la couche routes.

### Requête Overpass

```overpass
way["highway"~"^(footway|path|steps|pedestrian)$"](bbox);
out geom;
```

### Tags conservés

| Tag conservé | Usage |
|:-------------|:------|
| `highway` | Type principal du chemin. |
| `surface` | Revêtement si disponible. |
| `bridge` | Information conservée si disponible. |
| `tunnel` | Information conservée si disponible. |
| `lit` | Éclairage si disponible. |
| `access` | Restrictions d'accès si disponibles. |
| `foot` | Règles piétonnes si disponibles. |
| `bicycle` | Règles vélo si disponibles. |
| `sidewalk` | Information de trottoir si disponible. |

### Classification

| Source OSM | Sous-catégorie | Couleur du visualiseur | Notes |
|:-----------|:---------------|:-----------------------:|:------|
| `highway=pedestrian` | Pedestrian Street | `#d8b4fe` | Rue ou zone piétonne OSM. |
| `highway=footway` | Footway | `#d8b4fe` | Chemin piéton. |
| `highway=steps` | Steps | `#d8b4fe` | Escaliers. |
| `highway=path` | Path | `#d8b4fe` | Chemin générique. |
| Autre valeur reçue | Unknown Path | `#d8b4fe` | Cas de diagnostic, normalement rare avec la requête filtrée. |

Le visualiseur affiche actuellement `DATA_PATHS` comme une seule couche désactivable `Chemins/piéton`, même si chaque objet conserve sa `subcategory`.

**Logique associée :** `src/overpass_client.py:build_paths_query()` et `src/classifiers.py:classify_path()`.

---

## Couches prévues

Ces familles sont prévues mais ne sont pas encore extraites dans le pipeline courant :

| Tableau prévu | Famille CS2 | Statut |
|:--------------|:------------|:-------|
| `DATA_TRANSPORT` | Transports publics, rail, ferry, aéroports | À faire |
| `DATA_SERVICES` | Éducation, santé, police, pompiers, administration, social | À faire |
| `DATA_ELECTRICITY` | Électricité | À faire |
| `DATA_WATER_SEWAGE` | Eau / égouts | À faire |
| `DATA_GARBAGE` | Déchets | À faire |
| `DATA_NATURAL_RESOURCES` | Ressources naturelles | À faire |
| `DATA_PARKS_RECREATION` | Parcs et loisirs | À faire |
| `DATA_UNKNOWN` | Objets non classés utiles au diagnostic | À faire |

Les tableaux ci-dessus ne doivent pas être documentés comme disponibles tant qu'ils ne sont pas générés par `src/extract_zoning.py`.

---

## Capture de la légende

<div align="center">

![Légende des zones](screenshots/preview_legend.png)

*Aperçu de la légende dans le visualiseur Leaflet.*

</div>

---

## Packs de zones moddés

Les libellés historiques de zones sont centralisés dans `CS2_LABELS` dans `src/cs2_zones.py`.

Si vous utilisez un pack de zones moddé, adaptez seulement ces libellés :

```python
CS2_LABELS = {
    "res_high": "Résidentiel haute densité",
    "res_med": "Résidentiel moyenne densité",
    "res_low": "Résidentiel basse densité",
    # ...
}
```

Les couches routes et chemins utilisent leurs libellés côté visualiseur dans `visualizer/js/config.js`, car elles ne correspondent pas à des zones zonables classiques.

La logique de classification dans `src/classifiers.py` reste indépendante des noms affichés.

---

<div align="center">

📄 *Référence des zones — Projet d'extraction CS2 de données OSM réelles*
📝 Sous licence MIT

</div>
