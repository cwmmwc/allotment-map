// ═══════════════════════════════════════════════
// Config & Shared State
// ═══════════════════════════════════════════════
window.App = {
  BASE: 'https://services2.arcgis.com/8k2PygHqghVevhzy/arcgis/rest/services/tribal_land_patents_aliquot_20240304/FeatureServer/0/query',
  FETCH_LIMIT: 25000,

  CATEGORIES: {
    fee: "authority IN ('Indian Fee Patent','Indian Homestead Fee Patent','Indian Fee Patent (Heir)','Indian Trust to Fee','Indian Fee Patent-Misc.','Indian Fee Patent (Non-IRA)','Indian Fee Patent-Term or Non','Indian Fee Patent (IRA)')",
    trust: "authority IN ('Indian Trust Patent','Indian Reissue Trust','Indian Homestead Trust','Indian Trust Patent (Wind R)','Indian Allotment','Indian General')",
    forced: "forced_fee = 'True'",
    all: '1=1'
  },

  // Mutable state
  map: null,
  heatLayer: null,
  pointLayer: null,
  parcelLayer: null,
  currentData: [],
  tribeMap: {},
  stateMap: {},
  selectedTribe: null,
  analysisCache: {},
  lastZoom: null,

  // Timeline state
  timelineMode: false,
  timelineIndex: [],
  timelineYear: null,
  timelineInterval: null
};
