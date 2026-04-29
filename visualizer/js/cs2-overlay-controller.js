(function (App) {
  "use strict";

  var EARTH_METERS_PER_DEGREE = 111320;
  var DEFAULT_WORLD_SIZE_KM = 57.344;
  var DEFAULT_HEIGHTMAP_SIZE_KM = 19.115;
  var DEFAULT_STEP_METERS = 10;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeLongitude(value) {
    var longitude = Number(value);
    while (longitude > 180) {
      longitude -= 360;
    }
    while (longitude < -180) {
      longitude += 360;
    }
    return longitude;
  }

  function normalizeCenter(center) {
    return {
      lat: clamp(Number(center.lat), -85, 85),
      lng: normalizeLongitude(center.lng)
    };
  }

  function readPositiveNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function formatNumber(value, digits) {
    return Number(value).toFixed(digits);
  }

  function createBBox(center, sizeKm) {
    var halfKm = readPositiveNumber(sizeKm, DEFAULT_WORLD_SIZE_KM) / 2;
    var latRadians = center.lat * Math.PI / 180;
    var cosLat = Math.max(0.01, Math.abs(Math.cos(latRadians)));
    var deltaLat = halfKm / 111.32;
    var deltaLon = halfKm / (111.32 * cosLat);

    return {
      south: clamp(center.lat - deltaLat, -85, 85),
      west: clamp(center.lng - deltaLon, -180, 180),
      north: clamp(center.lat + deltaLat, -85, 85),
      east: clamp(center.lng + deltaLon, -180, 180)
    };
  }

  function bboxToBounds(bbox) {
    return [[bbox.south, bbox.west], [bbox.north, bbox.east]];
  }

  function formatBBox(bbox) {
    return [
      formatNumber(bbox.south, 6),
      formatNumber(bbox.west, 6),
      formatNumber(bbox.north, 6),
      formatNumber(bbox.east, 6)
    ].join(",");
  }

  function createPane(map) {
    if (!map.getPane("cs2-overlay-pane")) {
      map.createPane("cs2-overlay-pane");
      map.getPane("cs2-overlay-pane").style.zIndex = 432;
      map.getPane("cs2-overlay-pane").style.pointerEvents = "none";
    }
  }

  function createRectangle(map, bounds, options) {
    var className = options.className;
    var rectangle = L.rectangle(bounds, Object.assign({
      pane: "cs2-overlay-pane",
      interactive: false,
      bubblingMouseEvents: false,
      weight: 2,
      opacity: 0.92,
      fillOpacity: 0.16,
      dashArray: "8 6"
    }, options)).addTo(map);

    if (className && rectangle.getElement()) {
      rectangle.getElement().classList.add(className);
    }

    return rectangle;
  }

  function createState(map) {
    var center = normalizeCenter(map.getCenter());
    return {
      center: center,
      worldMapSizeKm: DEFAULT_WORLD_SIZE_KM,
      heightmapSizeKm: DEFAULT_HEIGHTMAP_SIZE_KM,
      stepMeters: DEFAULT_STEP_METERS,
      listeners: []
    };
  }

  function buildSnapshot(state) {
    var worldBBox = createBBox(state.center, state.worldMapSizeKm);
    var heightmapBBox = createBBox(state.center, state.heightmapSizeKm);

    return {
      center: {
        lat: state.center.lat,
        lng: state.center.lng
      },
      worldMapSizeKm: state.worldMapSizeKm,
      heightmapSizeKm: state.heightmapSizeKm,
      stepMeters: state.stepMeters,
      worldMapBBox: worldBBox,
      heightmapBBox: heightmapBBox,
      worldMapBBoxText: formatBBox(worldBBox),
      heightmapBBoxText: formatBBox(heightmapBBox)
    };
  }

  function notify(state, snapshot) {
    state.listeners.forEach(function (listener) {
      listener(snapshot);
    });
  }

  function updateRectangles(context) {
    var snapshot = buildSnapshot(context.state);
    context.worldMapRectangle.setBounds(bboxToBounds(snapshot.worldMapBBox));
    context.heightmapRectangle.setBounds(bboxToBounds(snapshot.heightmapBBox));
    notify(context.state, snapshot);
    return snapshot;
  }

  function setCenter(context, center) {
    context.state.center = normalizeCenter(center);
    return updateRectangles(context);
  }

  function move(context, northMeters, eastMeters) {
    var center = context.state.center;
    var deltaLat = northMeters / EARTH_METERS_PER_DEGREE;
    var latRadians = center.lat * Math.PI / 180;
    var cosLat = Math.max(0.01, Math.abs(Math.cos(latRadians)));
    var deltaLon = eastMeters / (EARTH_METERS_PER_DEGREE * cosLat);

    return setCenter(context, {
      lat: center.lat + deltaLat,
      lng: center.lng + deltaLon
    });
  }

  function updateSize(context, key, value) {
    context.state[key] = clamp(readPositiveNumber(value, context.state[key]), 0.1, 500);
    return updateRectangles(context);
  }

  function updateStep(context, value) {
    context.state.stepMeters = clamp(readPositiveNumber(value, DEFAULT_STEP_METERS), 1, 1000);
    return updateRectangles(context);
  }

  function create(options) {
    if (typeof L === "undefined") {
      throw new Error("Leaflet n'est pas chargé.");
    }

    var map = options && options.map;
    if (!map) {
      return null;
    }

    createPane(map);

    var state = createState(map);
    var snapshot = buildSnapshot(state);
    var context = {
      map: map,
      state: state,
      worldMapRectangle: createRectangle(map, bboxToBounds(snapshot.worldMapBBox), {
        className: "cs2-world-map-rectangle",
        color: "#56d68a",
        fillColor: "#56d68a"
      }),
      heightmapRectangle: createRectangle(map, bboxToBounds(snapshot.heightmapBBox), {
        className: "cs2-heightmap-rectangle",
        color: "#58d8ff",
        fillColor: "#58d8ff",
        fillOpacity: 0.2
      })
    };

    window.addEventListener("cs2zoning:location-selected", function () {
      setCenter(context, map.getCenter());
    });

    return {
      getState: function () {
        return buildSnapshot(state);
      },
      onChange: function (listener) {
        state.listeners.push(listener);
        listener(buildSnapshot(state));
      },
      setCenter: function (center) {
        return setCenter(context, center);
      },
      syncWithMapCenter: function () {
        return setCenter(context, map.getCenter());
      },
      centerViewOnOverlay: function () {
        var current = buildSnapshot(state);
        map.fitBounds(bboxToBounds(current.worldMapBBox), { padding: [34, 34] });
      },
      setWorldMapSizeKm: function (value) {
        return updateSize(context, "worldMapSizeKm", value);
      },
      setHeightmapSizeKm: function (value) {
        return updateSize(context, "heightmapSizeKm", value);
      },
      setStepMeters: function (value) {
        return updateStep(context, value);
      },
      moveNorth: function () {
        return move(context, state.stepMeters, 0);
      },
      moveSouth: function () {
        return move(context, -state.stepMeters, 0);
      },
      moveEast: function () {
        return move(context, 0, state.stepMeters);
      },
      moveWest: function () {
        return move(context, 0, -state.stepMeters);
      }
    };
  }

  App.CS2OverlayController = {
    create: create
  };
})(window.CS2Zoning = window.CS2Zoning || {});
