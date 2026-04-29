(function (App) {
  "use strict";

  var DEFAULT_SIZE_KM = 57.344;
  var EARTH_KM_PER_DEGREE = 111.32;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value, digits) {
    var factor = Math.pow(10, digits);
    return Math.round(value * factor) / factor;
  }

  function formatNumber(value, digits) {
    return round(value, digits).toFixed(digits);
  }

  function readMapSize(input) {
    var value = Number(input && input.value);
    if (!Number.isFinite(value) || value <= 0) {
      return DEFAULT_SIZE_KM;
    }
    return clamp(value, 0.1, 500);
  }

  function getCityName(input) {
    var value = input && input.value ? String(input.value).trim() : "";
    return value || "Zone CS2";
  }

  function quoteArg(value) {
    return '"' + String(value).replace(/"/g, "'") + '"';
  }

  function buildBBox(center, mapSizeKm) {
    var lat = Number(center.lat);
    var lon = Number(center.lng);
    var halfKm = mapSizeKm / 2;
    var latRadians = lat * Math.PI / 180;
    var cosLat = Math.max(0.01, Math.abs(Math.cos(latRadians)));
    var deltaLat = halfKm / EARTH_KM_PER_DEGREE;
    var deltaLon = halfKm / (EARTH_KM_PER_DEGREE * cosLat);

    return {
      south: clamp(lat - deltaLat, -85, 85),
      west: clamp(lon - deltaLon, -180, 180),
      north: clamp(lat + deltaLat, -85, 85),
      east: clamp(lon + deltaLon, -180, 180)
    };
  }

  function formatBBox(bbox) {
    return [
      formatNumber(bbox.south, 4),
      formatNumber(bbox.west, 4),
      formatNumber(bbox.north, 4),
      formatNumber(bbox.east, 4)
    ].join(",");
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

  function update(context) {
    var center = context.map.getCenter();
    var zoom = context.map.getZoom();
    var mapSize = readMapSize(context.sizeInput);
    var bbox = buildBBox(center, mapSize);
    var bboxText = formatBBox(bbox);
    var command = buildCommand(getCityName(context.cityInput), bboxText);

    context.currentBBox = bboxText;
    context.currentCommand = command;

    setText(context.latOutput, formatNumber(center.lat, 5));
    setText(context.lonOutput, formatNumber(center.lng, 5));
    setText(context.zoomOutput, formatNumber(zoom, 2));
    setText(context.bboxOutput, bboxText);
    setText(context.commandOutput, command);
    setText(context.status, formatNumber(mapSize, 3) + " km");
  }

  function bind(context) {
    context.map.on("moveend zoomend", function () {
      update(context);
    });

    context.sizeInput.addEventListener("input", function () {
      update(context);
    });

    context.cityInput.addEventListener("input", function () {
      update(context);
    });

    context.copyBBox.addEventListener("click", function () {
      copyText(context.currentBBox, function () {
        flashButton(context.copyBBox, "Copié");
      });
    });

    context.copyCommand.addEventListener("click", function () {
      copyText(context.currentCommand, function () {
        flashButton(context.copyCommand, "Copié");
      });
    });
  }

  function create(options) {
    var mapController = options && options.mapController;
    var context = {
      map: mapController && mapController.map,
      status: byId("cs2-helper-status"),
      cityInput: byId("cs2-helper-city"),
      sizeInput: byId("cs2-helper-size"),
      latOutput: byId("cs2-helper-lat"),
      lonOutput: byId("cs2-helper-lon"),
      zoomOutput: byId("cs2-helper-zoom"),
      bboxOutput: byId("cs2-helper-bbox"),
      commandOutput: byId("cs2-helper-command"),
      copyBBox: byId("copy-cs2-bbox"),
      copyCommand: byId("copy-cs2-command"),
      currentBBox: "",
      currentCommand: ""
    };

    if (!context.map ||
      !context.cityInput ||
      !context.sizeInput ||
      !context.bboxOutput ||
      !context.commandOutput ||
      !context.copyBBox ||
      !context.copyCommand) {
      return null;
    }

    bind(context);
    update(context);

    return {
      update: function () {
        update(context);
      }
    };
  }

  App.CS2MapHelper = {
    create: create
  };
})(window.CS2Zoning = window.CS2Zoning || {});
