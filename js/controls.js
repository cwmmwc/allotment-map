// ═══════════════════════════════════════════════
// UI Controls
// ═══════════════════════════════════════════════
App.initControls = function() {
  // Year selectors
  var ys = document.getElementById('sel-year-start');
  var ye = document.getElementById('sel-year-end');
  for (var y = 1854; y <= 2018; y++) {
    ys.add(new Option(y, y));
    ye.add(new Option(y, y));
  }
  ys.value = '1854';
  ye.value = '2018';

  // States
  var ss = document.getElementById('sel-state');
  for (var [st, ct] of Object.entries(App.stateMap)) {
    ss.add(new Option(st + ' (' + ct.toLocaleString() + ')', st));
  }

  // Tribes
  App.renderTribes();
  document.getElementById('tribe-search').addEventListener('input', App.renderTribes);
  document.getElementById('tribe-clear').addEventListener('click', function() {
    App.selectedTribes = [];
    App.renderTribes();
  });

  // Timeline checkbox
  document.getElementById('chk-timeline').addEventListener('change', function() {
    App.toggleTimeline(this.checked);
  });

  // Timeline track interactions
  App.initTimelineTrack();

  // Tab switching
  document.querySelectorAll('.header-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.header-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      App.switchView(tab.getAttribute('data-view'));
    });
  });
};

App.renderTribes = function() {
  var search = document.getElementById('tribe-search').value.toLowerCase();
  var container = document.getElementById('tribe-list');
  container.innerHTML = '';

  var sorted = Object.entries(App.tribeMap)
    .filter(function(entry) { return !search || entry[0].toLowerCase().includes(search); })
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 60);

  sorted.forEach(function(entry) {
    var name = entry[0], count = entry[1];
    var isSelected = App.selectedTribes.indexOf(name) !== -1;
    var div = document.createElement('div');
    div.className = 'tribe-opt' + (isSelected ? ' selected' : '');
    div.innerHTML = '<span>' + name + '</span><span class="ct">' + count.toLocaleString() + '</span>';
    div.onclick = function() {
      var idx = App.selectedTribes.indexOf(name);
      if (idx !== -1) {
        App.selectedTribes.splice(idx, 1);
      } else {
        App.selectedTribes.push(name);
      }
      App.renderTribes();
    };
    container.appendChild(div);
  });

  // Update clear button visibility
  var clearBtn = document.getElementById('tribe-clear');
  clearBtn.style.display = App.selectedTribes.length > 0 ? '' : 'none';
};

App.setTimePreset = function(start, end) {
  document.getElementById('sel-year-start').value = start;
  document.getElementById('sel-year-end').value = end;
};

// View switching (Density / Compare)
App.switchView = function(view) {
  var analysisPanel = document.getElementById('analysis-panel');
  var comparePanel = document.getElementById('compare-panel');
  if (view === 'compare') {
    analysisPanel.style.display = 'none';
    comparePanel.style.display = '';
    App.renderCompare();
  } else {
    analysisPanel.style.display = '';
    comparePanel.style.display = 'none';
  }
};

// Render compare table from loaded data
App.renderCompare = function() {
  var container = document.getElementById('compare-content');
  if (App.currentData.length === 0) {
    container.innerHTML = '<div class="insight">Run an analysis first to compare tribes.</div>';
    return;
  }

  // Group current data by tribe
  var tribes = {};
  App.currentData.forEach(function(f) {
    var p = f.properties;
    var tribe = p.preferred_name || 'Unknown';
    if (!tribes[tribe]) tribes[tribe] = { trust: 0, fee: 0, forced: 0, years: [] };
    var type = App.classifyPatent(p.authority);
    if (p.forced_fee === 'True') tribes[tribe].forced++;
    if (type === 'fee') tribes[tribe].fee++;
    else if (type === 'trust') tribes[tribe].trust++;
    if (p.signature_date) {
      var y = new Date(p.signature_date).getFullYear();
      if (y >= 1850 && y <= 1975) tribes[tribe].years.push(y);
    }
  });

  // Sort by total patents descending
  var sorted = Object.entries(tribes).sort(function(a, b) {
    var totalA = a[1].trust + a[1].fee + a[1].forced;
    var totalB = b[1].trust + b[1].fee + b[1].forced;
    return totalB - totalA;
  });

  var html = '<table class="compare-table">';
  html += '<thead><tr><th>Tribe</th><th>Total</th><th>Trust</th><th>Fee</th><th>Forced</th><th>Fee %</th><th>Span</th></tr></thead>';
  html += '<tbody>';

  sorted.forEach(function(entry) {
    var name = entry[0], d = entry[1];
    var total = d.trust + d.fee + d.forced;
    var feePct = total > 0 ? ((d.fee + d.forced) / total * 100).toFixed(1) : '0.0';
    d.years.sort(function(a, b) { return a - b; });
    var span = d.years.length > 0 ? d.years[0] + '–' + d.years[d.years.length - 1] : '—';

    var feeClass = '';
    if (parseFloat(feePct) >= 50) feeClass = ' class="warn"';
    else if (parseFloat(feePct) >= 25) feeClass = ' class="highlight"';

    html += '<tr>';
    html += '<td class="compare-tribe">' + name + '</td>';
    html += '<td>' + total.toLocaleString() + '</td>';
    html += '<td style="color:var(--trust-color)">' + d.trust.toLocaleString() + '</td>';
    html += '<td style="color:var(--fee-color)">' + d.fee.toLocaleString() + '</td>';
    html += '<td style="color:var(--forced-color)">' + d.forced.toLocaleString() + '</td>';
    html += '<td' + feeClass + '>' + feePct + '%</td>';
    html += '<td>' + span + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
};
