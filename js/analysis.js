// ═══════════════════════════════════════════════
// Pattern Analysis
// ═══════════════════════════════════════════════
App.analyzePatterns = function() {
  if (App.currentData.length === 0) return;

  // ── Summary stats ──
  var tribes = new Set();
  var states = new Set();
  var years = [];

  App.currentData.forEach(function(f) {
    var p = f.properties;
    if (p.preferred_name) tribes.add(p.preferred_name);
    if (p.state) states.add(p.state);
    if (p.signature_date) {
      var y = new Date(p.signature_date).getFullYear();
      if (y >= 1850 && y <= 2018) years.push(y);
    }
  });

  years.sort(function(a, b) { return a - b; });

  document.getElementById('s-total').textContent = App.currentData.length.toLocaleString();
  document.getElementById('s-tribes').textContent = tribes.size;
  document.getElementById('s-states').textContent = states.size;
  document.getElementById('s-span').textContent = years.length > 0 ? years[0] + '\u2013' + years[years.length - 1] : '\u2014';

  // ── Temporal distribution ──
  App.drawTemporalChart(years);

  // ── Trust vs Fee comparison ──
  App.drawCompareChart();

  // ── Spatial clustering ──
  App.analyzeSpatialClustering();

  // ── Conversion velocity by tribe ──
  App.drawVelocityChart();

  // ── County breakdown ──
  App.drawCountyBars();
};

App.drawTemporalChart = function(years) {
  var canvas = document.getElementById('chart-temporal');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 140 * dpr;
  canvas.style.height = '140px';
  ctx.scale(dpr, dpr);
  var W = rect.width, H = 140;

  // Bin by year
  var bins = {};
  years.forEach(function(y) { bins[y] = (bins[y] || 0) + 1; });

  var allYears = [];
  var minY = Math.min.apply(null, years), maxY = Math.max.apply(null, years);
  for (var y = minY; y <= maxY; y++) allYears.push(y);

  var maxCount = Math.max.apply(null, allYears.map(function(y) { return bins[y] || 0; }).concat([1]));
  var barW = (W - 40) / allYears.length;

  ctx.clearRect(0, 0, W, H);

  // Draw bars
  allYears.forEach(function(year, i) {
    var count = bins[year] || 0;
    var barH = (count / maxCount) * (H - 28);
    var x = 30 + i * barW;
    var y = H - 14 - barH;

    ctx.fillStyle = 'rgba(212, 160, 23, 0.7)';
    ctx.fillRect(x, y, Math.max(barW - 0.5, 1), barH);
  });

  // Y axis labels
  ctx.fillStyle = '#9a9490';
  ctx.font = '9px "IBM Plex Mono"';
  ctx.textAlign = 'right';
  ctx.fillText(maxCount.toLocaleString(), 28, 16);
  ctx.fillText('0', 28, H - 14);

  // X axis labels
  ctx.textAlign = 'center';
  var step = Math.max(Math.floor(allYears.length / 8), 1);
  for (var i = 0; i < allYears.length; i += step) {
    ctx.fillText(allYears[i], 30 + i * barW + barW / 2, H - 2);
  }

  // ── Temporal insight ──
  var peakYear = minY, peakCount = 0;
  for (var [yStr, c] of Object.entries(bins)) {
    if (c > peakCount) { peakCount = c; peakYear = parseInt(yStr); }
  }

  var mean = years.length / allYears.length;
  var variance = allYears.reduce(function(s, y) { return s + Math.pow((bins[y] || 0) - mean, 2); }, 0) / allYears.length;
  var cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  var clusterDesc = cv > 2 ? 'strongly clustered' : cv > 1 ? 'moderately clustered' : 'relatively evenly distributed';

  document.getElementById('insight-temporal').innerHTML =
    'Peak year: <strong class="highlight">' + peakYear + '</strong> with <strong>' + peakCount.toLocaleString() + '</strong> patents. ' +
    'Distribution is <strong>' + clusterDesc + '</strong> (CV=' + cv.toFixed(2) + '). ' +
    (cv > 1.5 ? 'This indicates <strong class="warn">significant temporal waves</strong> \u2014 patents were not issued steadily but in concentrated bursts.' : '');
};

App.drawCompareChart = function() {
  var canvas = document.getElementById('chart-compare');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 140 * dpr;
  canvas.style.height = '140px';
  ctx.scale(dpr, dpr);
  var W = rect.width, H = 140;

  var feeY = App.analysisCache.feeByYear || {};
  var trustY = App.analysisCache.trustByYear || {};
  var forcedY = App.analysisCache.forcedByYear || {};

  // All years present
  var allYearsSet = new Set(Object.keys(feeY).concat(Object.keys(trustY)).concat(Object.keys(forcedY)).map(Number));
  if (allYearsSet.size === 0) return;

  var allYearsArr = Array.from(allYearsSet);
  var minY = Math.min.apply(null, allYearsArr), maxY = Math.max.apply(null, allYearsArr);
  var allYears = [];
  for (var y = minY; y <= maxY; y++) allYears.push(y);

  var maxCount = Math.max.apply(null, allYears.map(function(y) { return Math.max(feeY[y] || 0, trustY[y] || 0); }).concat([1]));

  var barW = (W - 40) / allYears.length;
  ctx.clearRect(0, 0, W, H);

  // Draw trust bars (background)
  allYears.forEach(function(year, i) {
    var count = trustY[year] || 0;
    var barH = (count / maxCount) * (H - 28);
    var x = 30 + i * barW;
    ctx.fillStyle = 'rgba(41, 128, 185, 0.5)';
    ctx.fillRect(x, H - 14 - barH, Math.max(barW - 0.5, 1), barH);
  });

  // Draw fee bars (overlaid, narrower)
  allYears.forEach(function(year, i) {
    var count = feeY[year] || 0;
    var barH = (count / maxCount) * (H - 28);
    var x = 30 + i * barW;
    ctx.fillStyle = 'rgba(212, 160, 23, 0.7)';
    ctx.fillRect(x + barW * 0.2, H - 14 - barH, Math.max(barW * 0.6, 1), barH);
  });

  // Draw forced fee line
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  var started = false;
  allYears.forEach(function(year, i) {
    var count = forcedY[year] || 0;
    var barH = (count / maxCount) * (H - 28);
    var x = 30 + i * barW + barW / 2;
    var y = H - 14 - barH;
    if (!started && count > 0) { ctx.moveTo(x, y); started = true; }
    else if (started) ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#9a9490';
  ctx.font = '9px "IBM Plex Mono"';
  ctx.textAlign = 'right';
  ctx.fillText(maxCount.toLocaleString(), 28, 16);
  ctx.textAlign = 'center';
  var step = Math.max(Math.floor(allYears.length / 8), 1);
  for (var i = 0; i < allYears.length; i += step) {
    ctx.fillText(allYears[i], 30 + i * barW, H - 2);
  }

  // Legend
  ctx.font = '9px "IBM Plex Mono"';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(41,128,185,0.8)'; ctx.fillRect(W - 120, 6, 8, 8);
  ctx.fillStyle = '#6a6460'; ctx.fillText('Trust', W - 108, 14);
  ctx.fillStyle = 'rgba(212,160,23,0.8)'; ctx.fillRect(W - 120, 18, 8, 8);
  ctx.fillStyle = '#6a6460'; ctx.fillText('Fee', W - 108, 26);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W - 120, 34); ctx.lineTo(W - 112, 34); ctx.stroke();
  ctx.fillStyle = '#6a6460'; ctx.fillText('Forced', W - 108, 38);

  // Insight: find lag between trust peak and fee peak
  var trustPeak = 0, trustPeakYear = 0, feePeak = 0, feePeakYear = 0;
  for (var yi = 0; yi < allYears.length; yi++) {
    var yr = allYears[yi];
    if ((trustY[yr] || 0) > trustPeak) { trustPeak = trustY[yr]; trustPeakYear = yr; }
    if ((feeY[yr] || 0) > feePeak) { feePeak = feeY[yr]; feePeakYear = yr; }
  }

  var lag = feePeakYear - trustPeakYear;
  document.getElementById('insight-compare').innerHTML =
    'Trust patents peaked in <strong class="highlight">' + trustPeakYear + '</strong>, ' +
    'fee patents peaked in <strong class="highlight">' + feePeakYear + '</strong>' +
    (lag > 0 ? ' \u2014 a <strong>' + lag + '-year lag</strong> between allotment and conversion to alienable title.' : '.') +
    (lag >= 15 ? ' This long gap suggests trust periods were often being honored.' : '') +
    (lag > 0 && lag < 10 ? ' <span class="warn">This short gap suggests rapid, possibly coerced conversion.</span>' : '');
};

App.analyzeSpatialClustering = function() {
  // Compute nearest-neighbor statistics
  var points = [];
  App.currentData.forEach(function(f) {
    var lat, lng;
    if (f.geometry.type === 'Point') {
      lng = f.geometry.coordinates[0];
      lat = f.geometry.coordinates[1];
    } else if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
      var coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
      lng = coords.reduce(function(s, c) { return s + c[0]; }, 0) / coords.length;
      lat = coords.reduce(function(s, c) { return s + c[1]; }, 0) / coords.length;
    }
    if (lat && lng) points.push([lat, lng]);
  });

  if (points.length < 20) {
    document.getElementById('insight-spatial').innerHTML = 'Not enough data points for spatial analysis.';
    return;
  }

  // Sample for performance (NNI on full set too expensive)
  var sampleSize = Math.min(points.length, 500);
  var sample = [];
  var used = new Set();
  while (sample.length < sampleSize) {
    var idx = Math.floor(Math.random() * points.length);
    if (!used.has(idx)) { sample.push(points[idx]); used.add(idx); }
  }

  // Compute mean nearest-neighbor distance
  var totalNND = 0;
  sample.forEach(function(p1) {
    var minDist = Infinity;
    sample.forEach(function(p2) {
      if (p1 === p2) return;
      var d = App.haversine(p1[0], p1[1], p2[0], p2[1]);
      if (d < minDist) minDist = d;
    });
    totalNND += minDist;
  });

  var meanNND = totalNND / sampleSize;

  // Expected NND for random distribution: 0.5 / sqrt(density)
  var lats = sample.map(function(p) { return p[0]; }), lngs = sample.map(function(p) { return p[1]; });
  var areaKm2 = (Math.max.apply(null, lats) - Math.min.apply(null, lats)) * 111 * (Math.max.apply(null, lngs) - Math.min.apply(null, lngs)) * 85;
  var density = sampleSize / Math.max(areaKm2, 1);
  var expectedNND = 0.5 / Math.sqrt(density);
  var nni = meanNND / expectedNND;

  var clusterLevel = nni < 0.5 ? 'very strongly clustered' :
    nni < 0.7 ? 'strongly clustered' :
    nni < 0.9 ? 'moderately clustered' :
    nni < 1.1 ? 'approximately random' :
    'dispersed';

  // County concentration
  var counties = {};
  App.currentData.forEach(function(f) {
    var c = f.properties.county;
    if (c) counties[c] = (counties[c] || 0) + 1;
  });
  var sortedCounties = Object.entries(counties).sort(function(a, b) { return b[1] - a[1]; });
  var topCounty = sortedCounties[0];
  var topCountyPct = topCounty ? Math.round(topCounty[1] / App.currentData.length * 100) : 0;

  document.getElementById('insight-spatial').innerHTML =
    'Nearest Neighbor Index: <strong class="highlight">' + nni.toFixed(3) + '</strong> \u2014 spatial distribution is <strong>' + clusterLevel + '</strong>. ' +
    'Mean nearest-neighbor distance: <strong>' + meanNND.toFixed(1) + ' km</strong>. ' +
    (topCounty ? '<br>Most concentrated in <strong>' + topCounty[0] + ' County</strong> (' + topCountyPct + '% of patents). ' : '') +
    (nni < 0.7 ? '<span class="warn">Strong clustering suggests systematic, geographically targeted patent issuance rather than organic individual applications.</span>' : '') +
    (sortedCounties.length > 2 ? '<br>Top 3 counties hold <strong>' + Math.round((sortedCounties.slice(0,3).reduce(function(s,c) { return s+c[1]; },0) / App.currentData.length) * 100) + '%</strong> of all patents in view.' : '');
};

App.drawVelocityChart = function() {
  // For each tribe in current data, compute median trust year and median fee year
  var tribeYears = {};
  App.currentData.forEach(function(f) {
    var p = f.properties;
    if (!p.preferred_name || !p.signature_date) return;
    var year = new Date(p.signature_date).getFullYear();
    if (year < 1850 || year > 2018) return;

    if (!tribeYears[p.preferred_name]) tribeYears[p.preferred_name] = { trust: [], fee: [], forced: [] };

    var type = App.classifyPatent(p.authority);

    if (p.forced_fee === 'True') tribeYears[p.preferred_name].forced.push(year);
    if (type === 'fee') tribeYears[p.preferred_name].fee.push(year);
    else if (type === 'trust') tribeYears[p.preferred_name].trust.push(year);
  });

  // Compute medians, filter to tribes with both trust and fee data
  var velocityData = [];
  for (var [tribe, data] of Object.entries(tribeYears)) {
    if (data.trust.length < 3 || data.fee.length < 3) continue;
    var medTrust = App.median(data.trust);
    var medFee = App.median(data.fee);
    velocityData.push({
      tribe: tribe,
      medTrust: medTrust,
      medFee: medFee,
      lag: medFee - medTrust,
      trustCount: data.trust.length,
      feeCount: data.fee.length,
      forcedCount: data.forced.length
    });
  }

  velocityData.sort(function(a, b) { return a.lag - b.lag; });

  var canvas = document.getElementById('chart-velocity');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  var rows = Math.min(velocityData.length, 18);
  var rowH = 16;
  var chartH = rows * rowH + 30;
  canvas.height = chartH * dpr;
  canvas.style.height = chartH + 'px';
  ctx.scale(dpr, dpr);
  var W = rect.width;

  ctx.clearRect(0, 0, W, chartH);

  if (velocityData.length === 0) {
    document.getElementById('insight-velocity').innerHTML = 'Need both trust and fee patents in the data to compute conversion velocity.';
    return;
  }

  var minYear = Math.min.apply(null, velocityData.map(function(d) { return Math.min(d.medTrust, d.medFee); }));
  var maxYear = Math.max.apply(null, velocityData.map(function(d) { return Math.max(d.medTrust, d.medFee); }));
  var labelW = 130;
  var chartW = W - labelW - 20;
  var yearToX = function(y) { return labelW + ((y - minYear) / (maxYear - minYear + 1)) * chartW; };

  // Draw rows
  velocityData.slice(0, rows).forEach(function(d, i) {
    var y = i * rowH + 20;

    // Tribe label
    ctx.fillStyle = '#6a6460';
    ctx.font = '9px "IBM Plex Mono"';
    ctx.textAlign = 'right';
    var displayName = d.tribe.length > 18 ? d.tribe.substring(0, 17) + '\u2026' : d.tribe;
    ctx.fillText(displayName, labelW - 8, y + 4);

    // Trust → Fee line
    var x1 = yearToX(d.medTrust);
    var x2 = yearToX(d.medFee);

    ctx.strokeStyle = d.lag < 10 ? 'rgba(192,57,43,0.6)' : 'rgba(154,148,144,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();

    // Trust dot
    ctx.fillStyle = '#2980b9';
    ctx.beginPath();
    ctx.arc(x1, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Fee dot
    ctx.fillStyle = d.forcedCount > 0 ? '#c0392b' : '#d4a017';
    ctx.beginPath();
    ctx.arc(x2, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Lag label
    ctx.fillStyle = d.lag < 10 ? '#c0392b' : '#9a9490';
    ctx.textAlign = 'left';
    ctx.fillText((d.lag > 0 ? '+' : '') + d.lag.toFixed(0) + 'y', x2 + 6, y + 3);
  });

  // X axis
  ctx.fillStyle = '#9a9490';
  ctx.textAlign = 'center';
  ctx.font = '9px "IBM Plex Mono"';
  var axisY = rows * rowH + 24;
  for (var yr = Math.ceil(minYear / 10) * 10; yr <= maxYear; yr += 10) {
    ctx.fillText(yr, yearToX(yr), axisY);
  }

  // Insight
  var fastConversions = velocityData.filter(function(d) { return d.lag < 10; });
  var avgLag = velocityData.reduce(function(s, d) { return s + d.lag; }, 0) / velocityData.length;

  document.getElementById('insight-velocity').innerHTML =
    'Average trust\u2192fee lag: <strong class="highlight">' + avgLag.toFixed(1) + ' years</strong>. ' +
    (fastConversions.length > 0 ?
      '<span class="warn"><strong>' + fastConversions.length + ' tribe(s)</strong> show a lag under 10 years</span>' +
      ' (' + fastConversions.map(function(d) { return d.tribe; }).join(', ') + '), suggesting rapid or coerced conversion. ' : '') +
    '<span style="color:var(--trust-color)">\u25cf</span> Trust median \u00b7 ' +
    '<span style="color:var(--fee-color)">\u25cf</span> Fee median \u00b7 ' +
    '<span style="color:var(--forced-color)">\u25cf</span> Forced fee present';
};

App.drawCountyBars = function() {
  var counties = {};
  App.currentData.forEach(function(f) {
    var c = f.properties.county;
    var st = f.properties.state;
    if (c) {
      var key = c + ', ' + (st || '');
      counties[key] = (counties[key] || 0) + 1;
    }
  });

  var sorted = Object.entries(counties).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 12);
  var maxCount = (sorted[0] && sorted[0][1]) || 1;
  var container = document.getElementById('county-bars');
  container.innerHTML = '';

  sorted.forEach(function(entry) {
    var name = entry[0], count = entry[1];
    var pct = (count / maxCount * 100).toFixed(0);
    container.innerHTML +=
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">' +
        '<span style="width:120px;text-align:right;color:var(--text-dim);font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + name + '">' + name + '</span>' +
        '<div style="flex:1;height:10px;background:var(--bg-inset);border-radius:1px;overflow:hidden;">' +
          '<div style="width:' + pct + '%;height:100%;background:rgba(212,160,23,0.5);border-radius:1px;"></div>' +
        '</div>' +
        '<span style="width:48px;text-align:right;color:var(--text-faint);font-size:10px;font-variant-numeric:tabular-nums;">' + count.toLocaleString() + '</span>' +
      '</div>';
  });
};
