(function (App) {
  "use strict";

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
    return "C:\\Python314\\python.exe .\\extract_zoning.py --city " + quoteArg(cityName) + " --bbox " + quoteArg(bboxText);
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

  function update(context, state) {
    var zoom = context.map.getZoom();
    var command = buildCommand(getCityName(context.cityInput), state.heightmapBBoxText);

    context.currentWorldBBox = state.worldMapBBoxText;
    context.currentHeightmapBBox = state.heightmapBBoxText;
    context.currentCommand = command;

    syncInputs(context, state);
    setText(context.latOutput, formatNumber(state.center.lat, 6));
    setText(context.lonOutput, formatNumber(state.center.lng, 6));
    setText(context.zoomOutput, formatNumber(zoom, 2));
    setText(context.worldBBoxOutput, state.worldMapBBoxText);
    setText(context.heightmapBBoxOutput, state.heightmapBBoxText);
    setText(context.commandOutput, command);
    setText(context.status, "Pas " + formatStep(state.stepMeters));
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
      moveNorth: byId("cs2-move-north"),
      moveSouth: byId("cs2-move-south"),
      moveEast: byId("cs2-move-east"),
      moveWest: byId("cs2-move-west"),
      syncCenter: byId("sync-cs2-overlay"),
      fitOverlay: byId("fit-cs2-overlay"),
      copyWorldBBox: byId("copy-cs2-bbox"),
      copyHeightmapBBox: byId("copy-cs2-heightmap-bbox"),
      copyCommand: byId("copy-cs2-command"),
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
