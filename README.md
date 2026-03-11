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

1. **Search by name** — type an allottee's name (e.g., "Caleb Carter") in the Name Search box at the top of the left panel and hit Enter or click Find. Results show the name, patent type, tribe, year, and location. Click any result to zoom directly to that patent on the map with a highlighted parcel and popup.
2. **Show context** — after searching, toggle "Show all [tribe] patents" to load all patents for that reservation, so you can see the searched person's allotment in context with surrounding patents.
3. **Select filters** in the left panel: patent category, time range, state, and/or tribe
4. **Click "Run Analysis"** to fetch and display patent data
5. **Explore the map** — zoom in past level 9 to see individual parcel polygons; zoom out for circle markers
6. **Switch basemaps** — toggle between Esri World Topographic (detailed terrain, roads, rivers) and Light Gray
7. **Toggle overlays** — Federal Indian Reservation boundaries (US Census TIGERweb) and the Rankin Map of the Allotted Land of the Crow Reservation 1907 (georeferenced historic map, UVA Library)
8. **Toggle map layers** — heatmap, individual patents, forced fee highlighting
9. **Read the analysis panel** on the right for temporal, spatial, and tribal pattern breakdowns
10. **Enable "Cumulative timeline mode"** to scrub through years and watch the reservation change over time

### Name Search

Search the full 239,845-record dataset by allottee name, independent of any filters. The search is case-insensitive and matches partial names. Each result shows:

- Allottee name and patent type (trust / fee / forced fee)
- Tribe, year, township/range/section, state and county

Clicking a result fetches the full parcel geometry and zooms to it with a yellow highlight. The "Show all [tribe] patents" toggle loads all patents for the same reservation so you can see the individual allotment in its broader spatial context.

### Basemaps and Overlays

| Layer | Description |
|-------|-------------|
| Esri World Topographic | Default basemap with terrain, roads, rivers, place names, contours (zoom to 19) |
| Esri Light Gray | Minimal basemap for when patent data needs to dominate visually |
| Federal Indian Reservations | US Census TIGERweb AIANNHA boundaries at 50% opacity |
| Rankin Map 1907 | Georeferenced historic map of Crow Reservation allotments (UVA Library, zoom 6-18) |

### Cumulative Timeline Mode

This is the key analytical feature. Unlike the time-range filter (which shows patents *issued during* a window), timeline mode shows the cumulative state of the land *through* a given year — revealing how the reservation was progressively converted.

- The timeline starts 10 years before the first patent, showing the "blank slate" before allotment begins
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
- **Key fields:** `preferred_name` (tribe), `full_name` (allottee), `signature_date`, `authority` (patent type), `state`, `county`, `forced_fee`, `aliquot_parts`, `section/township/range`
- **Classification:** Patents are classified as trust, fee, or forced fee based on `authority` field values and the `forced_fee` flag

## Analysis Features

The right panel computes and visualizes several analyses on each query:

- **Summary stats** — patent count, tribes, states, year span
- **Temporal distribution** — bar chart of patents per year with clustering coefficient
- **Trust vs. Fee timeline** — stacked bars showing when each type peaked, with trust-to-fee lag analysis
- **Forced fee rate by reservation** — what share of each reservation's fee patents were forced
- **Conversion velocity** — median trust-to-fee lag by tribe, flagging rapid conversions under 10 years
- **Top counties** — horizontal bar chart of the most active counties

## Architecture

Vanilla JavaScript, no build tools or frameworks. Modular file structure:

```
index.html          Main layout (three-column grid + timeline bar)
css/styles.css      Light theme styles
js/config.js        App state, configuration, tribe aliases
js/utils.js         Helpers (haversine, median, patent classification)
js/data.js          Esri Feature Service queries and data loading
js/map.js           Leaflet map, basemaps, overlays, parcels, markers
js/controls.js      Filter UI, name search, event wiring
js/analysis.js      Charts and statistical analysis (canvas-drawn)
js/timeline.js      Cumulative timeline mode (scrubber, playback, area chart)
js/main.js          Boot sequence and URL parameter handling
```

### Dependencies (CDN)

- [Leaflet 1.9.4](https://leafletjs.com/) — map rendering
- [Leaflet.heat 0.2.0](https://github.com/Leaflet/Leaflet.heat) — density heatmap
- Google Fonts: Source Serif 4, IBM Plex Mono, Newsreader

### Map Rendering

- **Zoom < 9:** Circle markers colored by patent type (blue = trust, amber = fee, red = forced)
- **Zoom >= 9:** Full polygon parcels with colored fills
- **Heatmap:** Fee and forced fee patents only, geographic radius scaled to current zoom, with dynamic max to prevent saturation
- **Basemaps:** Esri World Topographic (default) or Esri Light Gray, switchable via buttons
- **Overlays:** Federal Indian Reservations (Census TIGERweb), Rankin 1907 historic map (UVA Library)

### External Services

| Service | URL | Purpose |
|---------|-----|---------|
| Esri Feature Service | `services2.arcgis.com` | Patent data (239,845 records with polygon geometry) |
| Esri World Topo Map | `services.arcgisonline.com` | Topographic basemap |
| Esri Light Gray | `services.arcgisonline.com` | Minimal basemap |
| Census TIGERweb | `tigerweb.geo.census.gov` | Federal Indian Reservation boundaries |
| UVA Library Tiles | `tiles.arcgis.com` | Rankin 1907 Crow Reservation historic map |

## Design Decisions

**Full polygon geometry** — The tool fetches complete parcel polygons, not just centroids. You can't understand land dispossession without seeing parcels as actual pieces of land.

**Heatmap shows only fee/forced patents** — The density overlay shows where alienation concentrated, not total activity. Forced fee patents are weighted higher (1.0 vs 0.5) to highlight coercive conversion.

**Timeline starts before first patent** — The timeline begins 10 years before the earliest patent so that users see the reservation as a blank slate before allotment, making the scale of transformation visible.

**Cumulative timeline swaps data, not code** — Timeline mode temporarily replaces the dataset for rendering, reusing all existing map/heatmap/parcel code without duplication.

**Name search queries the full dataset** — The name search is independent of filters, querying the entire 239,845-record service directly. This lets researchers find a specific allottee without needing to know their tribe or state first.

## Research Context

This tool supports research on systematic federal violations of Native American land rights, particularly the Crow Act of 1920 and broader patterns of tribal land dispossession during the allotment era (1887-1934). The data reveals that 23% of Crow patents were converted from trust to fee, with 1,643 forced fee patents where the BIA unilaterally removed trust protections. Fee patent conversion concentrated along transportation corridors and near towns, with the eastern portion of the Crow reservation seeing 40-70% conversion rates versus 0-15% in the western half.

## Related Projects

- [Crow Nation Digital Archive](https://github.com/cwmmwc/crow-nation-digital-archive) — web app providing access to historical Crow documents with extracted entities
- [Exhaustive Extraction Pipeline](https://github.com/cwmmwc/exhaustive-extraction-pipeline) — AI pipeline extracting structured entities from archival documents into PostgreSQL

## License

Research tool developed for the University of Virginia. Data served by UVA's Institute for Advanced Technology in the Humanities (IATH).
