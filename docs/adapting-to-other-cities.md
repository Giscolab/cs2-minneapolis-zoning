# Adapter l'extraction à une autre ville

Le pipeline est générique : toute ville disposant d'une couverture OpenStreetMap correcte peut être extraite avec une boîte géographique adaptée.

Le format attendu par `extract_zoning.py` et par Overpass QL est toujours :

```text
sud,ouest,nord,est
```

Soit, en coordonnées :

```text
latitude_min,longitude_min,latitude_max,longitude_max
```

---

## Étape 1 — Trouver la boîte géographique

### Option A — Nominatim

Recherchez la ville sur [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org/), ou utilisez l'API :

```text
https://nominatim.openstreetmap.org/search?q=Paris,France&format=json&limit=1
```

La réponse contient souvent un champ `boundingbox` au format :

```json
["south", "north", "west", "east"]
```

Réordonnez-le en `south,west,north,east` avant de le passer au script.

### Option B — bbox-mcp-server

Si vous utilisez un assistant compatible MCP et que `bbox-mcp-server` est installé, demandez par exemple :

```text
Quelle est la bounding box de Lyon, France ?
```

Voir [bbox-mcp-server.md](bbox-mcp-server.md) pour le contexte d'utilisation.

### Option C — Outil cartographique manuel

Vous pouvez aussi dessiner une zone sur un outil comme [bboxfinder.com](http://bboxfinder.com/).

Vérifiez toujours l'ordre des coordonnées avant l'extraction : beaucoup d'outils SIG affichent `ouest,sud,est,nord`, alors que ce projet attend `sud,ouest,nord,est`.

### Exemples

| Ville | BBOX au format `sud,ouest,nord,est` |
|:------|:------------------------------------|
| Paris | `48.766147,2.161560,48.945053,2.485657` |
| Minneapolis | `44.86,-93.38,45.05,-93.17` |
| Chicago | `41.64,-87.94,42.02,-87.52` |
| Portland | `45.43,-122.84,45.65,-122.47` |
| Austin | `30.10,-97.97,30.52,-97.56` |

---

## Étape 2 — Lancer l'extraction

Depuis le dossier `src` :

```bash
python extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657" --city "Paris"
```

Avec `uv` :

```bash
uv run extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657" --city "Paris"
```

Il n'est pas nécessaire de modifier le code pour changer de ville. Les constantes `EXAMPLE_BBOX_PARIS` et `EXAMPLE_BBOX_MINNEAPOLIS` dans `src/cs2_zones.py` ne sont que des exemples.

---

## Étape 3 — Comprendre ce que fait le script

Le script :

1. télécharge les bâtiments avec `building:levels` pour construire un index de densité ;
2. télécharge les catégories de zonage OSM une par une ;
3. classe les polygones vers les catégories CS2 ;
4. écrit `../visualizer/datos_zonificacion.js`.

La taille du fichier de sortie dépend de l'emprise choisie et de la densité des données OSM.

---

## Étape 4 — Ouvrir le visualiseur

Ouvrez `visualizer/index.html` dans un navigateur moderne.

Si la carte est vide :

- vérifiez que `visualizer/datos_zonificacion.js` existe ;
- ouvrez la console du navigateur ;
- vérifiez que le chemin du fichier généré correspond bien au fichier chargé par `index.html` ;
- assurez-vous que la bbox n'est pas inversée.

---

## Étape 5 — Ajuster les seuils si nécessaire

La classification résidentielle utilise des seuils simples dans `src/classifiers.py` :

```python
if effective_levels >= 5:
    return "high"

if effective_levels >= 3:
    return "medium"
```

Ces seuils sont volontairement faciles à ajuster.

- Trop de haute densité dans des zones peu denses : augmentez le seuil `>= 5`.
- Centre dense classé trop bas : baissez le seuil `>= 5` ou `>= 3`.
- Presque toute la ville sort en basse densité : la donnée `building:levels` est probablement peu renseignée dans OSM.

---

## Qualité des données OpenStreetMap

Le résultat dépend directement des tags présents dans OSM.

Le pipeline fonctionne mieux quand la zone contient :

- des polygones `landuse=residential/commercial/industrial/retail` ;
- des parkings avec `amenity=parking` ;
- des bâtiments avec `building:levels` ou `levels` ;
- des bureaux avec `office=*`, `building=office` ou `landuse=office`.

Si une ville donne un résultat incomplet, améliorer la couverture OpenStreetMap locale avant de relancer l'extraction produira souvent un meilleur résultat.
