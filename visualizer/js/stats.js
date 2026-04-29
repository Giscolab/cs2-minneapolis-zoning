(function (App) {
  "use strict";

  function sourceCount(dataset, key) {
    return dataset.sources[key] ? dataset.sources[key].count : 0;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("fr-FR");
  }

  function compute(dataset) {
    var residential = sourceCount(dataset, "residential");
    var commercial = sourceCount(dataset, "commercial") + sourceCount(dataset, "retail");
    var industrial = sourceCount(dataset, "industrial");
    var parking = sourceCount(dataset, "parking");
    var office = sourceCount(dataset, "office");
    var mixed = sourceCount(dataset, "mixed");

    return {
      total: dataset.totalRaw,
      residential: residential,
      commercial: commercial,
      industrial: industrial,
      parking: parking,
      office: office,
      mixed: mixed,
      cards: [
        { key: "total", label: "Polygones", value: dataset.totalRaw },
        { key: "residential", label: "Résidentiel", value: residential },
        { key: "commercial", label: "Commercial", value: commercial },
        { key: "industrial", label: "Industrie", value: industrial },
        { key: "parking", label: "Stationnement", value: parking },
        { key: "office", label: "Bureaux", value: office },
        { key: "mixed", label: "Usage mixte", value: mixed }
      ]
    };
  }

  App.Stats = {
    compute: compute,
    formatNumber: formatNumber
  };
})(window.CS2Zoning = window.CS2Zoning || {});
