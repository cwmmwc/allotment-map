// ═══════════════════════════════════════════════
// Map Rendering
// ═══════════════════════════════════════════════
App.initMap = function() {
  App.map = L.map('map', {
    center: [43, -104],
    zoom: 5,
    preferCanvas: true,
    zoomControl: true,
    maxZoom: 16,
    minZoom: 3
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(App.map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, pane: 'overlayPane'
  }).addTo(App.map);

  App.heatLayer = L.heatLayer([], {
    radius: 18,
    blur: 22,
    maxZoom: 10,
    gradient: {0.1: '#1a1a4a', 0.3: '#3a5a8a', 0.5: '#5a9a6a', 0.7: '#c8a44a', 0.9: '#c85a4a', 1.0: '#f0e0c0'}
  }).addTo(App.map);

  App.pointLayer = L.layerGroup().addTo(App.map);
};

App.renderMap = function() {
  App.pointLayer.clearLayers();
  var heatPoints = [];
  var showHeat = document.getElementById('chk-heatmap').checked;
  var showPoints = document.getElementById('chk-points').checked;
  var highlightForced = document.getElementById('chk-forced-highlight').checked;

  var feeCount = 0, trustCount = 0, forcedCount = 0;

  App.currentData.forEach(function(f) {
    var p = f.properties;
    var lat, lng;

    if (f.geometry.type === 'Point') {
      lng = f.geometry.coordinates[0];
      lat = f.geometry.coordinates[1];
    } else if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
      var coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
      lng = coords.reduce(function(s, c) { return s + c[0]; }, 0) / coords.length;
      lat = coords.reduce(function(s, c) { return s + c[1]; }, 0) / coords.length;
    }
    if (!lat || !lng) return;

    var isForced = p.forced_fee === 'True';
    var isFee = p.authority && p.authority.includes('Fee');
    var isTrust = p.authority && (p.authority.includes('Trust') || p.authority.includes('Reissue'));

    if (isForced) forcedCount++;
    else if (isFee) feeCount++;
    else if (isTrust) trustCount++;

    // Heatmap point (with weight)
    if (showHeat) {
      heatPoints.push([lat, lng, isForced ? 1.5 : 1.0]);
    }

    // Circle markers
    if (showPoints) {
      var color, radius, opacity;
      if (isForced && highlightForced) {
        color = '#b85450'; radius = 4; opacity = 0.8;
      } else if (isFee) {
        color = '#c8a44a'; radius = 3; opacity = 0.5;
      } else if (isTrust) {
        color = '#5a8a9a'; radius = 2.5; opacity = 0.4;
      } else {
        color = '#8a8478'; radius = 2; opacity = 0.3;
      }

      var marker = L.circleMarker([lat, lng], {
        radius: radius, fillColor: color, fillOpacity: opacity,
        color: 'rgba(255,255,255,0.08)', weight: 0.5
      });

      marker.bindPopup(function() { return App.makePopup(p); });
      App.pointLayer.addLayer(marker);
    }
  });

  App.heatLayer.setLatLngs(showHeat ? heatPoints : []);

  // Legend counts
  document.getElementById('leg-trust').textContent = trustCount.toLocaleString();
  document.getElementById('leg-fee').textContent = feeCount.toLocaleString();
  document.getElementById('leg-forced').textContent = forcedCount.toLocaleString();

  // Fit bounds
  if (heatPoints.length > 0) {
    var lats = heatPoints.map(function(p) { return p[0]; });
    var lngs = heatPoints.map(function(p) { return p[1]; });
    App.map.fitBounds([[Math.min.apply(null, lats), Math.min.apply(null, lngs)], [Math.max.apply(null, lats), Math.max.apply(null, lngs)]], { padding: [30, 30] });
  }

  document.getElementById('map-stat').innerHTML = '<strong>' + App.currentData.length.toLocaleString() + '</strong> patents displayed';
};

App.makePopup = function(p) {
  var date = p.signature_date ? new Date(p.signature_date).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'}) : '\u2014';
  var isFee = p.authority && p.authority.includes('Fee');
  var isForced = p.forced_fee === 'True';
  var tagClass = isForced ? 'forced' : (isFee ? 'fee' : 'trust');
  var tagText = isForced ? 'Forced Fee' : (isFee ? 'Fee Patent' : 'Trust Patent');

  return '<div>' +
    '<div class="popup-name">' + (p.full_name || 'Unknown') + '</div>' +
    '<span class="popup-tag ' + tagClass + '">' + tagText + '</span>' +
    '<div class="popup-row"><span class="k">Tribe</span><span class="v">' + (p.preferred_name || '\u2014') + '</span></div>' +
    '<div class="popup-row"><span class="k">Date</span><span class="v">' + date + '</span></div>' +
    '<div class="popup-row"><span class="k">Authority</span><span class="v">' + (p.authority || '\u2014') + '</span></div>' +
    '<div class="popup-row"><span class="k">State/County</span><span class="v">' + (p.state || '') + (p.county ? ', ' + p.county : '') + '</span></div>' +
    '<div class="popup-row"><span class="k">Location</span><span class="v">T' + (p.township_number || '?') + ' R' + (p.range_number || '?') + ' \u00a7' + (p.section_number || '?') + ' ' + (p.aliquot_parts || '') + '</span></div>' +
    '<div class="popup-row"><span class="k">Accession</span><span class="v">' + (p.accession_number || '\u2014') + '</span></div>' +
    (p.cancelled_doc === 'True' ? '<div style="color:var(--text-faint);font-style:italic;margin-top:4px;">Cancelled</div>' : '') +
    '</div>';
};
