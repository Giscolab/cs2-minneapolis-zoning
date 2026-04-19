"""
overpass_client.py
Multiendpoint Overpass API client with exponential backoff and 504 retry logic.
"""
import time
import requests
from typing import Optional

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

HEADERS = {
    "User-Agent": "CS2-Minneapolis-Zoning/1.0 (github.com/Osyanne/cs2-minneapolis-zoning)",
    "Content-Type": "application/x-www-form-urlencoded",
}


def query_with_retry(query: str, label: str, max_attempts: int = 3) -> dict:
    """
    Send an Overpass QL query across all endpoints with retry logic.

    Strategy:
    - Round-robin across 4 community endpoints (avoids single point of failure)
    - Exponential backoff between attempts (3s, 6s, 12s)
    - Raises RuntimeError only when all endpoints fail all attempts

    This pattern is essential because Overpass's public instance frequently
    returns HTTP 429 (rate limit) or 504 (gateway timeout) for large bboxes.
    Rotating endpoints distributes load and improves reliability significantly.
    """
    wait = 3
    for attempt in range(1, max_attempts + 1):
        for endpoint in ENDPOINTS:
            try:
                host = endpoint.split("/")[2]
                print(f"  [{label}] {host} (attempt {attempt})... ", end="", flush=True)
                resp = requests.post(
                    endpoint,
                    data={"data": query},
                    headers=HEADERS,
                    timeout=200,
                )
                if resp.status_code == 200:
                    size_kb = len(resp.content) / 1024
                    print(f"OK ({size_kb:.0f} KB)")
                    return resp.json()
                print(f"HTTP {resp.status_code}")
            except requests.exceptions.Timeout:
                print("TIMEOUT")
            except requests.exceptions.RequestException as e:
                print(f"ERROR: {str(e)[:60]}")
            time.sleep(wait)
        wait *= 2  # exponential backoff

    raise RuntimeError(f"All endpoints failed for query: {label}")
