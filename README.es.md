# CS2 Minneapolis Zoning — Herramienta GIS de Extracción v1.0

> Datos reales de zonificación desde OpenStreetMap → Cities: Skylines 2  
> 100% open source · Sin API keys · Se ejecuta en ~15 minutos

![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue)
![Licencia MIT](https://img.shields.io/badge/Licencia-MIT-green)
![Datos OSM](https://img.shields.io/badge/Datos-OpenStreetMap-orange)

## Vista previa

![Mapa completo](docs/screenshots/preview_full.png)

*Mapa interactivo de zonificación de Minneapolis — fondo CartoDB Dark Matter*

## Historia del proyecto

Este proyecto nació de querer recrear Minneapolis con el máximo realismo posible en Cities: Skylines 2.

Llevaba meses construyendo una réplica 1:1 de la ciudad — copiando calles, infraestructura, transporte público — cuando llegué al problema de la zonificación. ¿Cómo saber qué partes de la ciudad son residenciales de alta densidad y cuáles son industriales? ¿Dónde están exactamente los distritos comerciales? Los portales GIS de Minneapolis tienen datos, pero en formatos propietarios y con licencias complicadas.

La solución fue OpenStreetMap. Los colaboradores de OSM han mapeado con increíble detalle no solo las calles, sino también el uso del suelo, los tipos de edificios y las alturas. Y todo está disponible gratuitamente a través de la Overpass API.

Lo que empezó como un script rápido se convirtió en un pipeline completo con manejo de errores, rotación de endpoints, clasificación por densidad y un visualizador interactivo. Ahora lo comparto para que cualquiera pueda recrear su ciudad favorita con datos reales.

## Qué hace esta herramienta

Extrae polígonos de zonificación reales de OpenStreetMap via la Overpass API y los clasifica automáticamente en los tipos de zona nativos de Cities: Skylines 2. El pipeline es:

```
OpenStreetMap (Overpass API)
        ↓
  extract_zoning.py          ← 8 queries secuenciales, reintento multi-endpoint
        ↓
  datos_zonificacion.js      ← Arrays JavaScript con polígonos clasificados
        ↓
  visualizer/index.html      ← Mapa interactivo Leaflet.js
```

Sin API keys. Sin servicios de pago. Sin PostGIS. Solo Python + requests.

## Tipos de zona mapeados

| Tag OSM | Condición | Zona CS2 | Color en el mapa |
|---------|-----------|----------|-----------------|
| `landuse=residential` | ≥5 pisos o apartamentos | High Density Residential | Rojo |
| `landuse=residential` | ≥3 pisos o casas adosadas | Medium Density Residential | Naranja |
| `landuse=residential` | por defecto | Low Density Residential | Amarillo |
| `landuse=commercial` | ≥4 pisos | High Density Commercial | Azul |
| `landuse=commercial` | por defecto | Low Density Commercial | Azul claro |
| `landuse=retail` | — | Retail Hub | Celeste |
| `landuse=industrial` | — | Industrial Zone | Dorado |
| `amenity=parking` | multi-planta | Parking Garage / Ramp | Gris oscuro |
| `amenity=parking` | por defecto | Surface Parking Lot | Gris |
| `building=office` | — | Office / Government Building | Morado |
| `landuse=mixed` | — | Mixed-Use Development | Cian |

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/Osyanne/cs2-minneapolis-zoning
cd cs2-minneapolis-zoning

# 2. Instalar uv (si no está instalado)
# Linux/Mac:
curl -LsSf https://astral.sh/uv/install.sh | sh
# Windows (PowerShell):
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 3. Instalar dependencias
cd src
uv sync

# 4. Extraer datos (~10-15 min, descarga desde OpenStreetMap)
uv run extract_zoning.py

# 5. Abrir el visualizador
# El script escribe en ../visualizer/datos_zonificacion.js automáticamente.
# Abrir visualizer/index.html en el navegador.
```

El script descargará ~5-6 MB de datos de zonificación desde OpenStreetMap en 8 queries secuenciales. El progreso se imprime en tiempo real.

## Adaptar a otra ciudad

1. Buscar el bounding box de tu ciudad con [Nominatim](https://nominatim.openstreetmap.org/)
2. Editar `MINNEAPOLIS_BBOX` en `src/cs2_zones.py`:
   ```python
   MINNEAPOLIS_BBOX = "44.86,-93.38,45.05,-93.17"  # cambiar esto
   ```
3. O pasarlo como argumento:
   ```bash
   uv run extract_zoning.py --bbox "40.70,-74.02,40.83,-73.91"  # ejemplo Nueva York
   ```
4. Abrir `visualizer/index.html` — el mapa se centra automáticamente en tus datos
5. Ajustar los umbrales de densidad en `src/classifiers.py` si tu ciudad tiene patrones distintos

Ver [docs/adapting-to-other-cities.md](docs/adapting-to-other-cities.md) para la guía completa.

## Metodología

Todas las decisiones de diseño están documentadas en [METHODOLOGY.md](METHODOLOGY.md): por qué queries secuenciales en vez de una sola, por qué la clasificación de densidad en dos pasadas, por qué rotación multi-endpoint.

## Herramientas utilizadas

- **Python 3.11** + **[uv](https://docs.astral.sh/uv/)** — gestión de paquetes
- **[Overpass API](https://overpass-api.de/)** — extracción de datos OSM (gratis, sin key)
- **[Leaflet.js](https://leafletjs.com/)** — renderizado del mapa interactivo
- **[CartoDB Dark Matter](https://carto.com/basemaps/)** — capa base (tiles gratuitos)

## Licencia

MIT — ver [LICENSE](LICENSE)  
Datos del mapa © colaboradores de OpenStreetMap, disponibles bajo la [Open Database License (ODbL)](https://www.openstreetmap.org/copyright)
