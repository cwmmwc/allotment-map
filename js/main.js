// ═══════════════════════════════════════════════
// Init & Boot
// ═══════════════════════════════════════════════
App.init = async function() {
  App.initMap();
  await App.loadMetadata();
  App.initControls();
  document.getElementById('loading').classList.add('done');
};

// Expose globals for onclick handlers in HTML
window.runAnalysis = function() { return App.runAnalysis(); };
window.setTimePreset = function(start, end) { return App.setTimePreset(start, end); };

// Boot
App.init().catch(function(err) {
  console.error(err);
  document.getElementById('load-msg').textContent = 'Error: ' + err.message;
});
