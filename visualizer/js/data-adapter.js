(function (App) {
  "use strict";

  function readGlobalArray(globalName) {
    switch (globalName) {
      case "DATA_RESIDENTIAL":
        return typeof DATA_RESIDENTIAL !== "undefined" && Array.isArray(DATA_RESIDENTIAL) ? DATA_RESIDENTIAL : [];
      case "DATA_COMMERCIAL":
        return typeof DATA_COMMERCIAL !== "undefined" && Array.isArray(DATA_COMMERCIAL) ? DATA_COMMERCIAL : [];
      case "DATA_RETAIL":
        return typeof DATA_RETAIL !== "undefined" && Array.isArray(DATA_RETAIL) ? DATA_RETAIL : [];
      case "DATA_INDUSTRIAL":
        return typeof DATA_INDUSTRIAL !== "undefined" && Array.isArray(DATA_INDUSTRIAL) ? DATA_INDUSTRIAL : [];
      case "DATA_PARKING":
        return typeof DATA_PARKING !== "undefined" && Array.isArray(DATA_PARKING) ? DATA_PARKING : [];
      case "DATA_OFFICE":
        return typeof DATA_OFFICE !== "undefined" && Array.isArray(DATA_OFFICE) ? DATA_OFFICE : [];
      case "DATA_MIXED":
        return typeof DATA_MIXED !== "undefined" && Array.isArray(DATA_MIXED) ? DATA_MIXED : [];
      default:
        return [];
    }
  }

  function normalizeCoord(coord) {
    if (!Array.isArray(coord) || coord.length < 2) {
      return null;
    }
    var lat = Number(coord[0]);
    var lon = Number(coord[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null;
    }
    return [lat, lon];
  }

  function normalizeCoords(coords) {
    if (!Array.isArray(coords)) {
      return [];
    }
    return coords.map(normalizeCoord).filter(Boolean);
  }

  function extendBounds(bounds, coords) {
    coords.forEach(function (coord) {
      var lat = coord[0];
      var lon = coord[1];
      bounds.south = Math.min(bounds.south, lat);
      bounds.west = Math.min(bounds.west, lon);
      bounds.north = Math.max(bounds.north, lat);
      bounds.east = Math.max(bounds.east, lon);
      bounds.valid = true;
    });
  }

  function createDataset(config) {
    var sources = {};
    var missingSources = [];
    var bounds = { south: Infinity, west: Infinity, north: -Infinity, east: -Infinity, valid: false };

    config.dataSources.forEach(function (source) {
      var data = readGlobalArray(source.globalName);
      sources[source.key] = {
        key: source.key,
        globalName: source.globalName,
        label: source.label,
        features: data,
        count: data.length,
        missing: data.length === 0
      };
      if (!data.length) {
        missingSources.push(source.globalName);
      }
    });

    var layers = config.layers.map(function (layer) {
      var source = sources[layer.source] || { features: [], count: 0 };
      var rawFeatures = source.features.filter(function (feature) {
        return !layer.zone || feature.zone === layer.zone;
      });
      var features = rawFeatures.map(function (feature) {
        var coords = normalizeCoords(feature.coords);
        if (coords.length < 3) {
          return null;
        }
        extendBounds(bounds, coords);
        return {
          layer: layer,
          feature: feature,
          coords: coords
        };
      }).filter(Boolean);

      return {
        definition: layer,
        source: source,
        rawCount: rawFeatures.length,
        count: features.length,
        features: features,
        active: true
      };
    });

    var totalRaw = Object.keys(sources).reduce(function (total, key) {
      return total + sources[key].count;
    }, 0);
    var totalRenderable = layers.reduce(function (total, layer) {
      return total + layer.count;
    }, 0);

    return {
      sources: sources,
      layers: layers,
      totalRaw: totalRaw,
      totalRenderable: totalRenderable,
      hasData: totalRaw > 0,
      hasRenderableData: totalRenderable > 0 && bounds.valid,
      missingSources: missingSources,
      bounds: bounds.valid ? [[bounds.south, bounds.west], [bounds.north, bounds.east]] : null
    };
  }

  App.DataAdapter = {
    createDataset: createDataset
  };
})(window.CS2Zoning = window.CS2Zoning || {});
