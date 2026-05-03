(function (App) {
  "use strict";

  var CS2_TARGET_PLAYABLE_METERS = 14335;
  var HEIGHTMAP_PIXELS = 4096;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function formatNumber(value, digits) {
    return Number(value).toFixed(digits);
  }

  function getCityName(input) {
    var value = input && input.value ? String(input.value).trim() : "";
    return value || "Zone CS2";
  }

  function quoteArg(value) {
    return '"' + String(value).replace(/"/g, "'") + '"';
  }

  function buildCommand(cityName, bboxText) {
    var pythonExe = "C:\\Python314\\python.exe";
    var scriptPath = "C:\\Users\\cadet\\Documents\\GitHub\\cs2-minneapolis-zoning\\src\\extract_zoning.py";

    return quoteArg(pythonExe) + " " + quoteArg(scriptPath) + " --city " + quoteArg(cityName) + " --bbox " + quoteArg(bboxText);
  }

  function roundNumber(value, digits) {
    var factor = Math.pow(10, digits);
    return Math.round(Number(value) * factor) / factor;
  }

  function buildTimelineManifest(cityName, state, command) {
    var centerLat = roundNumber(state.center.lat, 6);
    var centerLon = roundNumber(state.center.lng, 6);
    var worldMapKm = roundNumber(state.worldMapSizeKm, 3);
    var heightmapKm = roundNumber(state.heightmapSizeKm, 3);
    var worldScale = CS2_TARGET_PLAYABLE_METERS / (Number(state.heightmapSizeKm) * 1000);

    var manifest = {
      version: 1,
      source: "cs2-minneapolis-zoning",
      city: cityName,
      bboxOrder: "south,west,north,east",
      center: {
        lat: centerLat,
        lon: centerLon
      },
      worldMap: {
        sizeKm: worldMapKm,
        bbox: state.worldMapBBoxText
      },
      heightmap: {
        sizeKm: heightmapKm,
        bbox: state.heightmapBBoxText,
        pixels: HEIGHTMAP_PIXELS,
        format: "PNG grayscale 16-bit"
      },
      timelineMod: {
        useGeoJsonCenter: false,
        originLon: centerLon,
        originLat: centerLat,
        worldOriginX: 0.0,
        worldOriginZ: 0.0,
        worldScale: roundNumber(worldScale, 8),
        overlayRotationDegrees: 0.0,
        overlayScaleX: 1.0,
        overlayScaleZ: 1.0,
        flipX: false,
        flipZ: false
      },
      expectedFiles: {
        heightmapPng: "heightmap_" + centerLon + "_" + centerLat + "_" + heightmapKm + ".png",
        worldmapPng: "worldmap_" + centerLon + "_" + centerLat + "_" + worldMapKm + ".png",
        roadsGeoJson: "roads_major_clipped.geojson",
        waterLinesGeoJson: "water_lines_clipped.geojson",
        waterAreasGeoJson: "water_areas_clipped.geojson"
      },
      commands: {
        extractZoning: command
      }
    };

    return JSON.stringify(manifest, null, 2);
  }

  function fallbackCopy(text) {
    var field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "readonly");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }

  function copyText(text, onDone) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onDone).catch(function () {
        fallbackCopy(text);
        onDone();
      });
      return;
    }

    fallbackCopy(text);
    onDone();
  }

  function flashButton(button, label) {
    if (!button) {
      return;
    }
    var original = button.textContent;
    button.textContent = label;
    window.setTimeout(function () {
      button.textContent = original;
    }, 1100);
  }

  function syncInputs(context, state) {
    if (document.activeElement !== context.worldSizeInput) {
      context.worldSizeInput.value = formatNumber(state.worldMapSizeKm, 3);
    }
    if (document.activeElement !== context.heightmapSizeInput) {
      context.heightmapSizeInput.value = formatNumber(state.heightmapSizeKm, 3);
    }
    if (document.activeElement !== context.stepSelect) {
      context.stepSelect.value = String(state.stepMeters);
    }
  }


  function buildTimelineConfig(state) {
    var centerLat = roundNumber(state.center.lat, 6);
    var centerLon = roundNumber(state.center.lng, 6);
    var worldScale = roundNumber(
      CS2_TARGET_PLAYABLE_METERS / (Number(state.heightmapSizeKm) * 1000),
      8
    );

    var config = {
      useGeoJsonCenter: false,
      originLon: centerLon,
      originLat: centerLat,
      worldOriginX: 0,
      worldOriginZ: 0,
      worldScale: worldScale,
      overlayRotationDegrees: 0,
      overlayScaleX: 1,
      overlayScaleZ: 1,
      flipX: false,
      flipZ: false,
      groundMargin: 512,
      segmentWidth: 2,
      segmentHeight: 2,
      roadSegmentWidth: 2,
      roadSegmentHeight: 2,
      pointStride: 1
    };

    return JSON.stringify(config, null, 2);
  }
  function update(context, state) {
    var zoom = context.map.getZoom();
    var cityName = getCityName(context.cityInput);
    var command = buildCommand(cityName, state.heightmapBBoxText);
    var timelineManifest = buildTimelineManifest(cityName, state, command);
    var timelineConfig = buildTimelineConfig(state);

    context.currentWorldBBox = state.worldMapBBoxText;
    context.currentHeightmapBBox = state.heightmapBBoxText;
    context.currentCommand = command;
    context.currentTimelineManifest = timelineManifest;
    context.currentTimelineConfig = timelineConfig;

    syncInputs(context, state);
    setText(context.latOutput, formatNumber(state.center.lat, 6));
    setText(context.lonOutput, formatNumber(state.center.lng, 6));
    setText(context.zoomOutput, formatNumber(zoom, 2));
    setText(context.worldBBoxOutput, state.worldMapBBoxText);
    setText(context.heightmapBBoxOutput, state.heightmapBBoxText);
    setText(context.commandOutput, command);
    setText(context.timelineManifestOutput, timelineManifest);
    setText(context.timelineConfigOutput, timelineConfig);
    setText(context.status, "Pas " + formatStep(state.stepMeters));
  }


  function downloadTimelineManifest(context) {
    var manifestText = context.currentTimelineManifest || "";

    if (!manifestText.trim()) {
      console.warn("[CS2 Helper] Aucun manifest TimelineMod à télécharger.");
      return;
    }

    var filename = "manifest.json";

    try {
      var manifest = JSON.parse(manifestText);
      var city = String(manifest.city || "zone-cs2")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

      filename = city ? city + "_manifest.json" : "manifest.json";
    } catch (error) {
      filename = "manifest.json";
    }

    var blob = new Blob([manifestText], {
      type: "application/json;charset=utf-8"
    });

    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadTimelineConfig(context) {
    var configText = context.currentTimelineConfig || "";

    if (!configText.trim()) {
      console.warn("[CS2 Helper] Aucun config TimelineMod à télécharger.");
      return;
    }

    var city = getCityName(context.cityInput)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    var filename = city ? city + "_config.json" : "config.json";

    var blob = new Blob([configText], {
      type: "application/json;charset=utf-8"
    });

    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    link.remove();
    URL.revokeObjectURL(url);
  }
  function formatStep(stepMeters) {
    return stepMeters >= 1000 ? "1 km" : stepMeters + " m";
  }

  function updateFromController(context) {
    update(context, context.overlayController.getState());
  }

  function bindSizeInputs(context) {
    context.worldSizeInput.addEventListener("input", function () {
      context.overlayController.setWorldMapSizeKm(context.worldSizeInput.value);
    });

    context.heightmapSizeInput.addEventListener("input", function () {
      context.overlayController.setHeightmapSizeKm(context.heightmapSizeInput.value);
    });

    context.stepSelect.addEventListener("change", function () {
      context.overlayController.setStepMeters(context.stepSelect.value);
    });

    context.cityInput.addEventListener("input", function () {
      updateFromController(context);
    });
  }

  function bindMoveButtons(context) {
    context.moveNorth.addEventListener("click", context.overlayController.moveNorth);
    context.moveSouth.addEventListener("click", context.overlayController.moveSouth);
    context.moveEast.addEventListener("click", context.overlayController.moveEast);
    context.moveWest.addEventListener("click", context.overlayController.moveWest);
    context.syncCenter.addEventListener("click", context.overlayController.syncWithMapCenter);
    context.fitOverlay.addEventListener("click", context.overlayController.centerViewOnOverlay);
  }

  function bindCopyButtons(context) {
    context.copyWorldBBox.addEventListener("click", function () {
      copyText(context.currentWorldBBox, function () {
        flashButton(context.copyWorldBBox, "Copié");
      });
    });

    context.copyHeightmapBBox.addEventListener("click", function () {
      copyText(context.currentHeightmapBBox, function () {
        flashButton(context.copyHeightmapBBox, "Copié");
      });
    });

    context.copyCommand.addEventListener("click", function () {
      copyText(context.currentCommand, function () {
        flashButton(context.copyCommand, "Copié");
      });
    });

    context.copyTimelineManifest.addEventListener("click", function () {
      copyText(context.currentTimelineManifest, function () {
        flashButton(context.copyTimelineManifest, "Copié");
      });
    });

    context.downloadTimelineManifest.addEventListener("click", function () {
      downloadTimelineManifest(context);
      flashButton(context.downloadTimelineManifest, "Téléchargé");
    });

    context.copyTimelineConfig.addEventListener("click", function () {
      copyText(context.currentTimelineConfig, function () {
        flashButton(context.copyTimelineConfig, "Copié");
      });
    });

    context.downloadTimelineConfig.addEventListener("click", function () {
      downloadTimelineConfig(context);
      flashButton(context.downloadTimelineConfig, "Téléchargé");
    });
  }

  function bind(context) {
    context.overlayController.onChange(function (state) {
      update(context, state);
    });

    context.map.on("zoomend", function () {
      updateFromController(context);
    });

    bindSizeInputs(context);
    bindMoveButtons(context);
    bindCopyButtons(context);
  }

  function create(options) {
    var mapController = options && options.mapController;
    var overlayController = options && options.overlayController;
    var context = {
      map: mapController && mapController.map,
      overlayController: overlayController,
      status: byId("cs2-helper-status"),
      cityInput: byId("cs2-helper-city"),
      worldSizeInput: byId("cs2-helper-size"),
      heightmapSizeInput: byId("cs2-helper-heightmap-size"),
      stepSelect: byId("cs2-helper-step"),
      latOutput: byId("cs2-helper-lat"),
      lonOutput: byId("cs2-helper-lon"),
      zoomOutput: byId("cs2-helper-zoom"),
      worldBBoxOutput: byId("cs2-helper-bbox"),
      heightmapBBoxOutput: byId("cs2-helper-heightmap-bbox"),
      commandOutput: byId("cs2-helper-command"),
      timelineManifestOutput: byId("cs2-helper-timeline-manifest"),
      timelineConfigOutput: byId("cs2-helper-timeline-config"),
      moveNorth: byId("cs2-move-north"),
      moveSouth: byId("cs2-move-south"),
      moveEast: byId("cs2-move-east"),
      moveWest: byId("cs2-move-west"),
      syncCenter: byId("sync-cs2-overlay"),
      fitOverlay: byId("fit-cs2-overlay"),
      copyWorldBBox: byId("copy-cs2-bbox"),
      copyHeightmapBBox: byId("copy-cs2-heightmap-bbox"),
      copyCommand: byId("copy-cs2-command"),
      copyTimelineManifest: byId("copy-cs2-timeline-manifest"),
      downloadTimelineManifest: byId("download-cs2-timeline-manifest"),
      copyTimelineConfig: byId("copy-cs2-timeline-config"),
      downloadTimelineConfig: byId("download-cs2-timeline-config"),
      currentWorldBBox: "",
      currentHeightmapBBox: "",
      currentCommand: ""
    };

    if (!context.map ||
      !context.overlayController ||
      !context.cityInput ||
      !context.worldSizeInput ||
      !context.heightmapSizeInput ||
      !context.stepSelect ||
      !context.worldBBoxOutput ||
      !context.heightmapBBoxOutput ||
      !context.commandOutput ||
      !context.timelineManifestOutput ||
      !context.timelineConfigOutput ||
      !context.moveNorth ||
      !context.moveSouth ||
      !context.moveEast ||
      !context.moveWest ||
      !context.syncCenter ||
      !context.fitOverlay ||
      !context.copyWorldBBox ||
      !context.copyHeightmapBBox ||
      !context.copyCommand) {
      return null;
    }

    bind(context);
    updateFromController(context);

    return {
      update: function () {
        updateFromController(context);
      }
    };
  }

  App.CS2MapHelper = {
    create: create
  };
})(window.CS2Zoning = window.CS2Zoning || {});
