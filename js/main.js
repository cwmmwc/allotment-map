// ═══════════════════════════════════════════════
// Init & Boot
// ═══════════════════════════════════════════════
App.init = async function() {
  App.initMap();
  await App.loadMetadata();
  App.initControls();
  document.getElementById('loading').classList.add('done');

  // Read URL parameters for deep-linking (e.g. ?tribe=Blackfeet)
  var params = new URLSearchParams(window.location.search);
  var tribe = params.get('tribe');
  if (tribe) {
    var match = App.findTribe(tribe);
    if (match) {
      App.selectedTribes = [match];
      App.renderTribes();
      App.runAnalysis();
    }
  }
};

// Expose globals for onclick handlers in HTML
window.runAnalysis = function() { return App.runAnalysis(); };
window.setTimePreset = function(start, end) { return App.setTimePreset(start, end); };

// Boot
App.init().catch(function(err) {
  console.error(err);
  document.getElementById('load-msg').textContent = 'Error: ' + err.message;
});
