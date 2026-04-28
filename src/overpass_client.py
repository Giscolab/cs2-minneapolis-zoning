"""
overpass_client.py

Client Overpass API avec :
- plusieurs serveurs publics ;
- rotation automatique ;
- attente progressive ;
- messages lisibles en console.
"""

import time
import requests

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

HEADERS = {
    "User-Agent": "CS2-Real-Zoning-Extractor/1.0 (OpenStreetMap Overpass client)",
    "Content-Type": "application/x-www-form-urlencoded",
}


def query_with_retry(query: str, label: str, max_attempts: int = 3) -> dict:
    """
    Envoie une requête Overpass QL avec réessais automatiques.

    Les serveurs Overpass publics peuvent répondre :
    - HTTP 429 : trop de requêtes ;
    - HTTP 504 : délai dépassé ;
    - timeout réseau.

    En cas d’échec, on essaie le serveur suivant.
    """
    wait_seconds = 3

    for attempt in range(1, max_attempts + 1):
        for endpoint in ENDPOINTS:
            host = endpoint.split("/")[2]

            try:
                print(f"  [{label}] {host} (essai {attempt})... ", end="", flush=True)

                response = requests.post(
                    endpoint,
                    data={"data": query},
                    headers=HEADERS,
                    timeout=200,
                )

                if response.status_code == 200:
                    size_kb = len(response.content) / 1024
                    print(f"OK ({size_kb:.0f} Ko)")
                    return response.json()

                print(f"HTTP {response.status_code}")

            except requests.exceptions.Timeout:
                print("TIMEOUT")

            except requests.exceptions.RequestException as error:
                print(f"ERREUR : {str(error)[:80]}")

            time.sleep(wait_seconds)

        wait_seconds *= 2

    raise RuntimeError(f"Tous les serveurs Overpass ont échoué pour : {label}")