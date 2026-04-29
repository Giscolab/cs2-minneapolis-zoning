# Publication du dépôt sur GitHub

Cette note décrit une publication propre du projet sous forme de dépôt public générique.

Remplacez les noms, chemins et URL d'exemple par ceux du dépôt réel.

---

## Étape 1 — Créer le dépôt GitHub

1. Ouvrez [github.com/new](https://github.com/new).
2. Renseignez :
   - **Repository name:** `cs2-real-zoning-extractor` ou le nom choisi pour le fork ;
   - **Description:** `Extracteur SIG de zonage OpenStreetMap pour Cities: Skylines 2` ;
   - **Visibility:** Public ou Private selon le besoin ;
   - **Initialize repository:** laissez les cases décochées si le dépôt local existe déjà.
3. Cliquez sur **Create repository**.

---

## Étape 2 — Vérifier le dépôt local

Depuis la racine du projet :

```bash
git status
git diff
```

Avant de publier, vérifiez en particulier :

- `.gitignore` est présent ;
- les environnements locaux (`.venv/`) ne sont pas ajoutés ;
- les caches Python (`__pycache__/`) ne sont pas ajoutés ;
- les fichiers générés lourds ne sont pas ajoutés par accident ;
- `visualizer/zoning_data.js` n'est publié que si c'est un choix volontaire ;
- `data/sample_zoning_output.js` reste un échantillon raisonnable.

---

## Étape 3 — Initialiser et pousser

Si le dépôt n'est pas encore initialisé :

```bash
git init
git add .
git status
git commit -m "feat: publish generic CS2 zoning extractor"
```

Ajoutez ensuite le dépôt distant :

```bash
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

Si le dépôt est déjà lié à GitHub, utilisez seulement :

```bash
git status
git push
```

---

## Étape 4 — Configurer la page GitHub

Dans l'onglet principal du dépôt, configurez la section **About** :

- **Description:** `Extracteur SIG de zonage OpenStreetMap pour Cities: Skylines 2`
- **Website:** laissez vide, ou indiquez l'URL GitHub Pages si elle existe
- **Topics:**

```text
cities-skylines-2 gis openstreetmap overpass-api leaflet
urban-planning open-source python zoning
```

---

## Étape 5 — Vérifier le rendu GitHub

Avant de partager le dépôt :

- [ ] `README.md` s'affiche correctement ;
- [ ] `METHODOLOGY.md` est lisible ;
- [ ] les fichiers de `docs/` sont en français ;
- [ ] les captures dans `docs/screenshots/` s'affichent ;
- [ ] `src/` contient les scripts nécessaires ;
- [ ] `LICENSE` est présent ;
- [ ] aucun fichier local ou temporaire n'a été ajouté.

---

## Option — GitHub Pages pour le visualiseur

Pour publier une démo statique :

1. ouvrez **Settings → Pages** ;
2. choisissez **Deploy from a branch** ;
3. sélectionnez `main` et le dossier `/visualizer` ;
4. enregistrez.

La page sera disponible à l'adresse indiquée par GitHub Pages.

Attention : le visualiseur charge `zoning_data.js`. Si ce fichier n'est pas publié avec des données réelles, la carte affichera une démonstration vide ou partielle.

---

## Vérification de taille des fichiers

Avant un push important, listez les plus gros fichiers suivis :

```bash
git ls-files | xargs ls -lh | sort -k5 -rh | head -20
```

Si un fichier généré volumineux apparaît sans intention claire, retirez-le du commit et vérifiez `.gitignore`.
