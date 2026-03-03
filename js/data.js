// ═══════════════════════════════════════════════
// Data Fetching
// ═══════════════════════════════════════════════
App.query = async function(params) {
  var url = new URL(App.BASE);
  var defaults = { f: 'json', outSR: 4326 };
  for (var [k, v] of Object.entries({ ...defaults, ...params })) {
    url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  var r = await fetch(url);
  return r.json();
};

App.loadMetadata = async function() {
  App.setLoad(20, 'Loading tribe data\u2026');
  var tribeRes = await App.query({
    where: '1=1',
    outStatistics: [{statisticType:'count',onStatisticField:'OBJECTID',outStatisticFieldName:'cnt'}],
    groupByFieldsForStatistics: 'preferred_name',
    orderByFields: 'cnt DESC'
  });
  tribeRes.features.forEach(function(f) {
    if (f.attributes.preferred_name) App.tribeMap[f.attributes.preferred_name] = f.attributes.cnt;
  });

  App.setLoad(50, 'Loading state data\u2026');
  var stateRes = await App.query({
    where: '1=1',
    outStatistics: [{statisticType:'count',onStatisticField:'OBJECTID',outStatisticFieldName:'cnt'}],
    groupByFieldsForStatistics: 'state',
    orderByFields: 'cnt DESC'
  });
  stateRes.features.forEach(function(f) {
    if (f.attributes.state) App.stateMap[f.attributes.state] = f.attributes.cnt;
  });

  App.setLoad(100, 'Ready');
};

App.runAnalysis = async function() {
  var category = document.getElementById('sel-category').value;
  var yearStart = parseInt(document.getElementById('sel-year-start').value);
  var yearEnd = parseInt(document.getElementById('sel-year-end').value);
  var state = document.getElementById('sel-state').value;

  document.getElementById('status').textContent = 'Querying\u2026';
  document.getElementById('map-stat').innerHTML = 'Loading patent data\u2026';

  // Build where clause
  var clauses = [App.CATEGORIES[category]];
  if (yearStart > 1854 || yearEnd < 1960) {
    clauses.push("signature_date >= timestamp '" + yearStart + "-01-01' AND signature_date < timestamp '" + (yearEnd + 1) + "-01-01'");
  }
  if (state) clauses.push("state = '" + state + "'");
  if (App.selectedTribe) clauses.push("preferred_name = '" + App.selectedTribe.replace(/'/g, "''") + "'");

  var where = clauses.join(' AND ');

  // Get total count
  var countRes = await App.query({ where: where, returnCountOnly: true });
  var total = countRes.count || 0;

  // For large queries (nationwide), use centroids only for performance
  var useCentroidsOnly = total > App.FETCH_LIMIT;
  var maxFetch = useCentroidsOnly ? App.FETCH_LIMIT_NATIONWIDE : App.FETCH_LIMIT;

  // Fetch features
  var allFeatures = [];
  var offset = 0;
  var batchSize = 2000;

  while (offset < Math.min(total, maxFetch)) {
    var queryParams = {
      where: where,
      outFields: 'OBJECTID,accession_number,preferred_name,full_name,signature_date,authority,state,county,forced_fee,cancelled_doc,aliquot_parts,section_number,township_number,range_number',
      resultRecordCount: batchSize,
      resultOffset: offset
    };
    if (useCentroidsOnly) {
      // Esri JSON with centroids — much smaller payload than full polygons
      queryParams.returnGeometry = false;
      queryParams.returnCentroid = true;
      queryParams.f = 'json';
    } else {
      queryParams.returnGeometry = true;
      queryParams.returnCentroid = true;
      queryParams.f = 'geojson';
    }
    var res = await App.query(queryParams);

    if (useCentroidsOnly) {
      // Convert Esri JSON centroids to GeoJSON-like features
      if (!res.features || res.features.length === 0) break;
      res.features.forEach(function(f) {
        if (f.centroid) {
          allFeatures.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [f.centroid.x, f.centroid.y] },
            properties: f.attributes
          });
        }
      });
      offset += res.features.length;
    } else {
      if (!res.features || res.features.length === 0) break;
      allFeatures = allFeatures.concat(res.features);
      offset += res.features.length;
    }

    var pct = Math.round((offset / Math.min(total, maxFetch)) * 100);
    document.getElementById('status').textContent = 'Loading\u2026 ' + pct + '% (' + allFeatures.length.toLocaleString() + ')';
  }

  App.currentData = allFeatures;
  var statusText = App.currentData.length.toLocaleString() + ' of ' + total.toLocaleString() + ' loaded';
  if (useCentroidsOnly) statusText += ' (centroids — zoom in and select a tribe for parcels)';
  document.getElementById('status').textContent = statusText;

  // Also load comparison data (trust vs fee) for the same filters
  await App.loadComparisonData(yearStart, yearEnd, state);

  // Render everything
  App.renderMap();
  App.analyzePatterns();

  // Build timeline index for cumulative mode
  App.buildTimelineIndex();
  if (App.timelineMode && App.timelineIndex.length > 0) {
    App.drawTimelineChart();
    App.setTimelineYear(App.timelineIndex[0]._tlYear);
  }
};

App.loadComparisonData = async function(yearStart, yearEnd, state) {
  // Load year-by-year counts for both trust and fee
  var timeClauses = [];
  if (yearStart > 1854 || yearEnd < 1960) {
    timeClauses.push("signature_date >= timestamp '" + yearStart + "-01-01' AND signature_date < timestamp '" + (yearEnd + 1) + "-01-01'");
  }
  if (state) timeClauses.push("state = '" + state + "'");
  if (App.selectedTribe) timeClauses.push("preferred_name = '" + App.selectedTribe.replace(/'/g, "''") + "'");

  var extraWhere = timeClauses.length ? ' AND ' + timeClauses.join(' AND ') : '';

  // Fee patents per year
  var feeYears = await App.query({
    where: App.CATEGORIES.fee + extraWhere,
    outStatistics: [{statisticType:'count',onStatisticField:'OBJECTID',outStatisticFieldName:'cnt'}],
    groupByFieldsForStatistics: 'signature_date',
    orderByFields: 'signature_date ASC'
  });

  // Trust patents per year
  var trustYears = await App.query({
    where: App.CATEGORIES.trust + extraWhere,
    outStatistics: [{statisticType:'count',onStatisticField:'OBJECTID',outStatisticFieldName:'cnt'}],
    groupByFieldsForStatistics: 'signature_date',
    orderByFields: 'signature_date ASC'
  });

  // Forced fee per year
  var forcedYears = await App.query({
    where: App.CATEGORIES.forced + extraWhere,
    outStatistics: [{statisticType:'count',onStatisticField:'OBJECTID',outStatisticFieldName:'cnt'}],
    groupByFieldsForStatistics: 'signature_date',
    orderByFields: 'signature_date ASC'
  });

  // Aggregate into year bins
  App.analysisCache.feeByYear = App.binByYear(feeYears.features || []);
  App.analysisCache.trustByYear = App.binByYear(trustYears.features || []);
  App.analysisCache.forcedByYear = App.binByYear(forcedYears.features || []);
};

App.binByYear = function(features) {
  var bins = {};
  features.forEach(function(f) {
    var ts = f.attributes.signature_date;
    if (!ts) return;
    var year = new Date(ts).getFullYear();
    if (year >= 1850 && year <= 1970) {
      bins[year] = (bins[year] || 0) + f.attributes.cnt;
    }
  });
  return bins;
};
