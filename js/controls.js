// ═══════════════════════════════════════════════
// UI Controls
// ═══════════════════════════════════════════════
App.initControls = function() {
  // Year selectors
  var ys = document.getElementById('sel-year-start');
  var ye = document.getElementById('sel-year-end');
  for (var y = 1854; y <= 1960; y++) {
    ys.add(new Option(y, y));
    ye.add(new Option(y, y));
  }
  ys.value = '1854';
  ye.value = '1960';

  // States
  var ss = document.getElementById('sel-state');
  for (var [st, ct] of Object.entries(App.stateMap)) {
    ss.add(new Option(st + ' (' + ct.toLocaleString() + ')', st));
  }

  // Tribes
  App.renderTribes();
  document.getElementById('tribe-search').addEventListener('input', App.renderTribes);

  // Tab switching
  document.querySelectorAll('.header-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.header-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
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
    var div = document.createElement('div');
    div.className = 'tribe-opt' + (App.selectedTribe === name ? ' selected' : '');
    div.innerHTML = '<span>' + name + '</span><span class="ct">' + count.toLocaleString() + '</span>';
    div.onclick = function() {
      App.selectedTribe = App.selectedTribe === name ? null : name;
      App.renderTribes();
    };
    container.appendChild(div);
  });
};

App.setTimePreset = function(start, end) {
  document.getElementById('sel-year-start').value = start;
  document.getElementById('sel-year-end').value = end;
};
