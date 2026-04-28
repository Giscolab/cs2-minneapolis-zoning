(function (App) {
  "use strict";

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function layerButtonHTML(layerData) {
    var layer = layerData.definition;
    return '<button type="button" class="layer-toggle" role="listitem" aria-pressed="true" data-layer-key="' +
      App.SafeHTML.escapeAttribute(layer.key) +
      '" style="--layer-color:' +
      App.SafeHTML.escapeAttribute(layer.color) +
      ';">' +
      '<span class="layer-swatch" aria-hidden="true"></span>' +
      '<span class="layer-main">' +
      '<span class="layer-name">' + App.SafeHTML.escapeHTML(layer.label) + "</span>" +
      '<span class="layer-description">' + App.SafeHTML.escapeHTML(layer.description) + "</span>" +
      "</span>" +
      '<span class="layer-count" aria-label="' + App.SafeHTML.escapeAttribute(layerData.count + " polygones") + '">' +
      App.Stats.formatNumber(layerData.count) +
      "</span>" +
      "</button>";
  }

  function metricCardHTML(card) {
    return '<article class="metric-card">' +
      '<div class="metric-value">' + App.Stats.formatNumber(card.value) + "</div>" +
      '<div class="metric-label">' + App.SafeHTML.escapeHTML(card.label) + "</div>" +
      "</article>";
  }

  function legendItemHTML(layer) {
    return '<div class="legend-item" style="--layer-color:' + App.SafeHTML.escapeAttribute(layer.color) + ';">' +
      '<span class="legend-swatch" aria-hidden="true"></span>' +
      '<span>' + App.SafeHTML.escapeHTML(layer.label) + "</span>" +
      "</div>";
  }

  function updateVisibleCount(dataset) {
    var active = dataset.layers.filter(function (layerData) {
      return layerData.active;
    }).length;
    setText("visible-count", active + " active" + (active > 1 ? "s" : ""));
  }

  function updateButtonState(key, active) {
    var button = document.querySelector('[data-layer-key="' + key + '"]');
    if (button) {
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
  }

  function create(options) {
    var dataset = options.dataset;
    var stats = options.stats;
    var mapController = options.mapController;
    var layerList = document.getElementById("layer-controls");
    var metricsGrid = document.getElementById("metrics-grid");
    var legendList = document.getElementById("legend-list");
    var panelToggle = document.getElementById("panel-toggle");

    function renderStatus() {
      var status = document.getElementById("dataset-status");
      if (dataset.hasData) {
        setText("dataset-status", "Données chargées");
        setText("dataset-substatus", App.Stats.formatNumber(dataset.totalRaw) + " polygones détectés");
        if (status) {
          status.classList.remove("is-empty");
        }
      } else {
        setText("dataset-status", "Aucune donnée");
        setText("dataset-substatus", "Contrat DATA_* absent ou vide");
        if (status) {
          status.classList.add("is-empty");
        }
      }
      setText("metrics-context", dataset.hasRenderableData ? "Polygones OSM exploitables" : "Mode attente de données");
    }

    function renderMetrics() {
      if (metricsGrid) {
        metricsGrid.innerHTML = stats.cards.map(metricCardHTML).join("");
      }
    }

    function renderLayers() {
      if (layerList) {
        layerList.innerHTML = dataset.layers.map(layerButtonHTML).join("");
      }
      updateVisibleCount(dataset);
    }

    function renderLegend() {
      if (legendList) {
        legendList.innerHTML = dataset.layers.map(function (layerData) {
          return legendItemHTML(layerData.definition);
        }).join("");
      }
    }

    function bindLayerControls() {
      if (!layerList) {
        return;
      }
      layerList.addEventListener("click", function (event) {
        var button = event.target.closest("[data-layer-key]");
        if (!button) {
          return;
        }
        var key = button.getAttribute("data-layer-key");
        var layerData = dataset.layers.find(function (entry) {
          return entry.definition.key === key;
        });
        if (!layerData) {
          return;
        }
        layerData.active = !layerData.active;
        mapController.setLayerVisible(key, layerData.active);
        updateButtonState(key, layerData.active);
        updateVisibleCount(dataset);
      });
    }

    function bindToolbar() {
      var showAll = document.getElementById("show-all-layers");
      var hideAll = document.getElementById("hide-all-layers");
      var resetView = document.getElementById("reset-view");

      if (showAll) {
        showAll.addEventListener("click", function () {
          dataset.layers.forEach(function (layerData) {
            layerData.active = true;
            updateButtonState(layerData.definition.key, true);
          });
          mapController.setAllVisible(true);
          updateVisibleCount(dataset);
        });
      }

      if (hideAll) {
        hideAll.addEventListener("click", function () {
          dataset.layers.forEach(function (layerData) {
            layerData.active = false;
            updateButtonState(layerData.definition.key, false);
          });
          mapController.setAllVisible(false);
          updateVisibleCount(dataset);
        });
      }

      if (resetView) {
        resetView.addEventListener("click", function () {
          mapController.resetView();
        });
      }
    }

    function bindPanelToggle() {
      if (!panelToggle) {
        return;
      }
      panelToggle.addEventListener("click", function () {
        var collapsed = document.body.classList.toggle("panel-collapsed");
        panelToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
        mapController.invalidateSize();
      });
    }

    function render() {
      renderStatus();
      renderMetrics();
      renderLayers();
      renderLegend();
      bindLayerControls();
      bindToolbar();
      bindPanelToggle();
    }

    return {
      render: render
    };
  }

  App.PanelController = {
    create: create
  };
})(window.CS2Zoning = window.CS2Zoning || {});
