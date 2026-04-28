# bbox-mcp-server — outil MCP optionnel pour les bounding boxes

`bbox-mcp-server` est un serveur MCP communautaire permettant à certains assistants IA d'interroger des données OpenStreetMap ou de récupérer des boîtes géographiques.

Il a été utilisé pendant le développement du projet, mais il n'est pas requis pour exécuter le pipeline.

**Dépôt :** [github.com/bboxmcp/bbox-mcp-server](https://github.com/bboxmcp/bbox-mcp-server)
Vérifiez l'URL et les instructions actuelles dans le dépôt du projet communautaire.

---

## Ce que fait l'outil

MCP signifie *Model Context Protocol*. C'est un standard permettant à un assistant IA de se connecter à des outils externes.

Dans ce contexte, `bbox-mcp-server` peut aider à répondre à des questions comme :

```text
Quelle est la bounding box de Portland, Oregon ?
Cherche les parcs dans le centre de Minneapolis.
Récupère des données OSM pour une zone donnée.
```

L'assistant interroge alors les services configurés et renvoie des résultats structurés.

---

## Utilisation dans ce projet

Pendant le développement, `bbox-mcp-server` a servi à :

1. obtenir rapidement des coordonnées de bounding box ;
2. vérifier la couverture OSM de certains quartiers ;
3. tester progressivement des requêtes Overpass QL.

Le pipeline actuel n'en dépend pas. Vous pouvez obtenir les mêmes coordonnées avec [Nominatim](https://nominatim.openstreetmap.org/) ou un outil de bbox manuel.

---

## Installation

Les étapes exactes dépendent de l'assistant IA ou de l'éditeur utilisé.

### Exemple de configuration MCP

```json
{
  "mcpServers": {
    "bbox": {
      "command": "npx",
      "args": ["-y", "bbox-mcp-server"]
    }
  }
}
```

### Prérequis

Node.js doit être installé :

```bash
node --version
```

Consultez le dépôt `bbox-mcp-server` pour les instructions spécifiques à Claude Code, VS Code Copilot ou tout autre client MCP.

---

## Exemple d'utilisation

Après installation dans un client compatible MCP :

```text
Utilisateur : Quelle est la bounding box de Paris ?
Assistant   : Bounding box approximative : 48.766147,2.161560,48.945053,2.485657
```

Vous pouvez ensuite passer cette valeur au script :

```bash
python extract_zoning.py --bbox "48.766147,2.161560,48.945053,2.485657" --city "Paris"
```

---

## Ce projet ne nécessite pas bbox-mcp-server

`extract_zoning.py` interroge directement l'API Overpass avec `requests`.

`bbox-mcp-server` est seulement un outil de confort pour le développement et la recherche de coordonnées. Il n'est ni une dépendance Python, ni une dépendance d'exécution du visualiseur.
