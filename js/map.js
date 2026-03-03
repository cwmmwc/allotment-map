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

  // ESRI Light Gray basemap
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(App.map);

  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16, pane: 'overlayPane'
  }).addTo(App.map);

  // Heatmap layer — leaflet.heat 0.2.0 always renders on overlayPane
  // so we style its canvas directly after init
  App.heatLayer = L.heatLayer([], {
    radius: 20,
    blur: 8,
    maxZoom: App.map.getZoom() + 1,
    gradient: {
      0: 'rgba(0,0,0,0)',
      0.2: '#fef0d9',
      0.4: '#fdcc8a',
      0.6: '#fc8d59',
      0.8: '#e34a33',
      1.0: '#b30000'
    }
  }).addTo(App.map);

  // Apply opacity and z-index to the heatmap canvas
  if (App.heatLayer._canvas) {
    App.heatLayer._canvas.style.opacity = '0.6';
    App.heatLayer._canvas.style.zIndex = '350';
  }

  App.pointLayer = L.layerGroup().addTo(App.map);
  App.parcelLayer = L.layerGroup().addTo(App.map);

  // Re-render on zoom change — rebuild heatmap and toggle parcels vs markers
  App.map.on('zoomend', function() {
    var newZoom = App.map.getZoom();
    if (App.lastZoom !== null && App.currentData.length > 0) {
      // Always re-render to rebuild heatmap at new zoom
      if (App.timelineMode && App.timelineYear !== null) {
        App.setTimelineYear(App.timelineYear);
      } else {
        App.renderMap(false);
      }
    }
    App.lastZoom = newZoom;
  });

  App.lastZoom = App.map.getZoom();
};

// Rebuild heatmap radius as fixed geographic distance (~2 miles) in pixels
App.updateHeatRadius = function() {
  if (!App.heatLayer) return;
  var zoom = App.map.getZoom();
  var pixPerDeg = 256 * Math.pow(2, zoom) / 360;
  var radiusPx = Math.max(15, Math.min(50, Math.round((2 / 69) * pixPerDeg)));
  var blurPx = Math.max(5, Math.round(radiusPx * 0.4));

  // maxZoom = current zoom + 1 disables leaflet.heat internal scaling
  App.heatLayer.setOptions({ radius: radiusPx, blur: blurPx, maxZoom: zoom + 1 });
};

App.renderMap = function(fitBounds) {
  App.pointLayer.clearLayers();
  App.parcelLayer.clearLayers();
  var heatPoints = [];
  var showHeat = document.getElementById('chk-heatmap').checked;
  var showPoints = document.getElementById('chk-points').checked;
  var highlightForced = document.getElementById('chk-forced-highlight').checked;
  var zoom = App.map.getZoom();
  var showParcels = zoom >= 9;

  var feeCount = 0, trustCount = 0, forcedCount = 0;

  App.currentData.forEach(function(f) {
    var p = f.properties;
    var type = App.classifyPatent(p.authority, p.forced_fee);
    var isForced = p.forced_fee === 'True';

    if (isForced) forcedCount++;
    if (type === 'fee') feeCount++;
    else if (type === 'trust') trustCount++;

    // Compute centroid for heatmap and circle markers
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

    // Heatmap: only fee patents (forced is a subset of fee)
    if (showHeat && type === 'fee') {
      heatPoints.push([lat, lng, isForced ? 1.0 : 0.5]);
    }

    // Parcel polygons at zoom >= 9
    if (showPoints && showParcels && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
      var fillColor, borderColor, fillOpacity;
      if (isForced && highlightForced) {
        fillColor = '#c0392b'; borderColor = '#a93226'; fillOpacity = 0.5;
      } else if (type === 'fee') {
        fillColor = '#d4a017'; borderColor = '#b8860b'; fillOpacity = 0.4;
      } else if (type === 'trust') {
        fillColor = '#2980b9'; borderColor = '#1a6fa0'; fillOpacity = 0.35;
      } else {
        fillColor = '#9a9490'; borderColor = '#6a6460'; fillOpacity = 0.25;
      }

      var parcel = L.geoJSON(f.geometry, {
        style: {
          fillColor: fillColor,
          color: borderColor,
          weight: 1,
          fillOpacity: fillOpacity,
          opacity: 0.7
        }
      });
      parcel.bindPopup(function() { return App.makePopup(p); });
      App.parcelLayer.addLayer(parcel);
    }

    // Circle markers at zoom < 9 (or as fallback for Point geometry)
    if (showPoints && (!showParcels || f.geometry.type === 'Point')) {
      var color, radius, opacity;
      if (isForced && highlightForced) {
        color = '#c0392b'; radius = 4; opacity = 0.8;
      } else if (type === 'fee') {
        color = '#d4a017'; radius = 3; opacity = 0.5;
      } else if (type === 'trust') {
        color = '#2980b9'; radius = 2.5; opacity = 0.4;
      } else {
        color = '#9a9490'; radius = 2; opacity = 0.3;
      }

      var marker = L.circleMarker([lat, lng], {
        radius: radius, fillColor: color, fillOpacity: opacity,
        color: 'rgba(0,0,0,0.15)', weight: 0.5
      });

      marker.bindPopup(function() { return App.makePopup(p); });
      App.pointLayer.addLayer(marker);
    }
  });

  if (heatPoints.length > 0) {
    App.heatLayer.setOptions({ max: Math.max(2, Math.sqrt(heatPoints.length) * 0.3) });
  }
  App.heatLayer.setLatLngs(showHeat ? heatPoints : []);
  App.updateHeatRadius();

  // Ensure heatmap canvas has correct opacity (leaflet.heat 0.2.0 ignores pane option)
  if (App.heatLayer._canvas) {
    App.heatLayer._canvas.style.opacity = '0.6';
  }

  // Legend counts
  document.getElementById('leg-trust').textContent = trustCount.toLocaleString();
  document.getElementById('leg-fee').textContent = feeCount.toLocaleString();
  document.getElementById('leg-forced').textContent = forcedCount.toLocaleString();

  // Fit bounds only on initial load, not on zoom-triggered re-renders
  if (fitBounds !== false) {
    var allLats = [], allLngs = [];
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
      if (lat && lng) { allLats.push(lat); allLngs.push(lng); }
    });

    if (allLats.length > 0) {
      App.map.fitBounds([
        [Math.min.apply(null, allLats), Math.min.apply(null, allLngs)],
        [Math.max.apply(null, allLats), Math.max.apply(null, allLngs)]
      ], { padding: [30, 30] });
    }
  }

  var modeLabel = showParcels ? 'parcels' : 'markers';
  document.getElementById('map-stat').innerHTML = '<strong>' + App.currentData.length.toLocaleString() + '</strong> patents displayed (' + modeLabel + ')';
};

App.makePopup = function(p) {
  var date = p.signature_date ? new Date(p.signature_date).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'}) : '\u2014';
  var type = App.classifyPatent(p.authority, p.forced_fee);
  var isForced = p.forced_fee === 'True';
  var tagClass = isForced ? 'forced' : (type === 'fee' ? 'fee' : 'trust');
  var tagText = isForced ? 'Forced Fee' : (type === 'fee' ? 'Fee Patent' : 'Trust Patent');

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
