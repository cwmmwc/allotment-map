# Allotment Patent Pattern Analysis

A research tool for analyzing spatial and temporal patterns in Native American land allotment patent conversions (trust to fee) across 239,845 records from 1854-1960. Built for Christian McMillen, professor of Native American History at the University of Virginia.

The tool connects to an Esri Feature Service serving patent records where each record represents a land patent with polygon geometry, patent type (trust or fee), tribe, date, county, state, and metadata including whether it was a "forced fee" patent (where the BIA unilaterally removed trust protections).

## Setup

No build step required. The app is entirely client-side with CDN dependencies.

```bash
# Serve via local HTTP (required for API calls)
python3 -m http.server 8000
# Open http://localhost:8000
```

Opening `index.html` directly via `file://` will work for core functionality but some external API calls (boundary overlays) may be blocked by CORS.

## How to Use

1. **Select filters** in the left panel: patent category, time range, state, and/or tribe
2. **Click "Run Analysis"** to fetch and display patent data
3. **Explore the map** — zoom in past level 9 to see individual parcel polygons; zoom out for circle markers
4. **Toggle map layers** — heatmap, individual patents, forced fee highlighting
5. **Read the analysis panel** on the right for temporal, spatial, and tribal pattern breakdowns
6. **Enable "Cumulative timeline mode"** to scrub through years and watch the reservation change over time

### Cumulative Timeline Mode

This is the key analytical feature. Unlike the time-range filter (which shows patents *issued during* a window), timeline mode shows the cumulative state of the land *through* a given year — revealing how the reservation was progressively converted.

- Drag the slider or click the track to jump to any year
- Press play to animate year by year (adjustable speed: 1, 2, or 5 yr/sec)
- The stacked area chart shows trust (blue) vs. fee (amber) patent volume per year
- Stats update in real time with cumulative trust/fee/forced counts and fee percentage
- A large semi-transparent year number overlays the map

### Time Range Presets

| Preset | Years | Context |
|--------|-------|---------|
| Dawes Era | 1887-1906 | General Allotment Act period |
| Burke Act | 1906-1920 | Accelerated fee patenting |
| Declaration | 1917-1921 | Declaration of Policy era |
| 1921-IRA | 1921-1934 | Pre-Indian Reorganization Act |
| IRA Era | 1934-1953 | Indian Reorganization Act period |
| Termination | 1953-1960 | Termination policy era |

## Data Source

- **Feature Service:** Esri ArcGIS at `services2.arcgis.com` (mirrored from `land-sales.iath.virginia.edu`)
- **Records:** 239,845 allotment patents with full polygon geometry
- **Key fields:** `preferred_name` (tribe), `signature_date`, `authority` (patent type), `state`, `county`, `forced_fee`, `aliquot_parts`, `section/township/range`
- **Classification:** Patents are classified as trust, fee, or forced fee based on `authority` field values and the `forced_fee` flag

## Analysis Features

The right panel computes and visualizes several analyses on each query:

- **Summary stats** — patent count, tribes, states, year span
- **Temporal distribution** — bar chart of patents per year with clustering coefficient
- **Trust vs. Fee timeline** — stacked bars showing when each type peaked, with trust-to-fee lag analysis
- **Spatial clustering** — nearest-neighbor index (NNI) measuring whether patent locations are clustered or random
- **Conversion velocity** — median trust-to-fee lag by tribe, flagging rapid conversions under 10 years
- **Top counties** — horizontal bar chart of the most active counties

## Architecture

Vanilla JavaScript, no build tools or frameworks. Modular file structure:

```
index.html          Main layout (three-column grid + timeline bar)
css/styles.css      Light theme styles
js/config.js        App state and configuration
js/utils.js         Helpers (haversine, median, patent classification)
js/data.js          Esri Feature Service queries and data loading
js/map.js           Leaflet map, heatmap, parcels, markers
js/controls.js      Filter UI and event wiring
js/analysis.js      Charts and statistical analysis (canvas-drawn)
js/timeline.js      Cumulative timeline mode (scrubber, playback, area chart)
js/main.js          Boot sequence
```

### Dependencies (CDN)

- [Leaflet 1.9.4](https://leafletjs.com/) — map rendering
- [Leaflet.heat 0.2.0](https://github.com/Leaflet/Leaflet.heat) — density heatmap
- Google Fonts: Source Serif 4, IBM Plex Mono, Newsreader

### Map Rendering

- **Zoom < 9:** Circle markers colored by patent type (blue = trust, amber = fee, red = forced)
- **Zoom >= 9:** Full polygon parcels with colored fills
- **Heatmap:** Fee and forced fee patents only, 0.4-mile radius scaled to current zoom, with dynamic max to prevent saturation
- **Basemap:** ESRI World Light Gray

## Design Decisions

**Full polygon geometry** — The tool fetches complete parcel polygons, not just centroids. You can't understand land dispossession without seeing parcels as actual pieces of land.

**Heatmap shows only fee/forced patents** — The density overlay shows where alienation concentrated, not total activity. Forced fee patents are weighted higher (1.0 vs 0.5) to highlight coercive conversion.

**25,000 patent fetch limit** — Keeps the browser responsive. Sufficient for single-tribe queries (e.g., Crow has ~11,643 patents). "All States" queries will hit the cap.

**Cumulative timeline swaps data, not code** — Timeline mode temporarily replaces the dataset for rendering, reusing all existing map/heatmap/parcel code without duplication.

## Research Context

This tool supports research on systematic federal violations of Native American land rights, particularly the Crow Act of 1920 and broader patterns of tribal land dispossession during the allotment era (1887-1934). The data reveals that 23% of Crow patents were converted from trust to fee, with 1,643 forced fee patents where the BIA unilaterally removed trust protections. Fee patent conversion concentrated along transportation corridors and near towns, with the eastern portion of the Crow reservation seeing 40-70% conversion rates versus 0-15% in the western half.

## License

Research tool developed for the University of Virginia. Data served by UVA's Institute for Advanced Technology in the Humanities (IATH).
