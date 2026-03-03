# Patent Pattern Analysis Tool — Development History

## What This Is

A single-file HTML application for analyzing spatial and temporal patterns in Native American land allotment patent conversions (trust → fee) across 239,845 records from 1854–1960. Built as a research tool for Christian McMillen, professor of Native American History at the University of Virginia.

The tool connects to an Esri Feature Service at `land-sales.iath.virginia.edu` that serves patent records from a Rails/PostgreSQL database. Each record represents a land patent with polygon geometry, patent type (trust or fee), tribe, date, county, state, and metadata including whether it was a "forced fee" patent (where the BIA unilaterally removed trust protections).

## Data Source

- **Feature Service:** `https://land-sales.iath.virginia.edu/server/rest/services/Hosted/Patent_Data/FeatureServer/0`
- **Record count:** 239,845 patents
- **Key fields:** `OBJECTID`, `preferred_name` (tribe), `full_name`, `signature_date`, `authority` (patent type classification), `state`, `county`, `forced_fee`, `cancelled_doc`, `section_number`, `township_number`, `range_number`, `aliquot_parts`, `accession_number`
- **Geometry:** Polygon parcels representing individual land allotments. The service also supports centroids via `returnCentroid: true`.
- **Data quirk:** Some `signature_date` values are corrupted, producing years like 3413. All year parsing must filter to 1850–1975 range.

## Architecture (Current: Single File)

`patent-pattern-analysis.html` (~1,200 lines) contains everything:
- CSS with light theme (cream/white, ESRI Light Gray basemap)
- HTML layout: three-column grid (340px controls | map | 380px analysis panel) with optional timeline row
- JavaScript: data loading, map rendering, analysis calculations, chart drawing on canvas

### Key Dependencies (CDN-loaded)
- Leaflet 1.9.4 — map rendering
- Leaflet.heat 0.2.0 — density heatmap layer
- Google Fonts: Source Serif 4, IBM Plex Mono, Newsreader

### Map Layers (bottom to top)
1. ESRI World Light Gray Base + Reference tiles
2. USGS Hydro overlay (rivers, opacity 0.25, multiply blend)
3. Historical territory boundary (Native Land Digital API, dashed amber)
4. Present-day reservation boundary (TIGERweb, solid dark slate)
5. Heat pane (z-index 350, opacity 0.6) — fee patent density
6. Ratio grid layer — colored rectangles with percentage labels
7. Parcel layer — actual patent polygon geometry
8. Point layer — circle markers and forced fee overlays

### Two Rendering Modes
- **Standard mode:** Load patents for selected tribe/state/time range, render parcels + grid + heatmap
- **Cumulative timeline mode:** Sort patents by year, scrub through time showing cumulative state. Includes playback controls, speed selector, draggable timeline with stacked area chart.

## Patent Classification Logic

```javascript
function classifyPatent(authority) {
  if (!authority) return 'other';
  if (authority.includes('Fee')) return 'fee';
  if (authority.includes('Trust') || authority.includes('Reissue')) return 'trust';
  if (authority.includes('Allotment') || authority.includes('General')) return 'trust';
  return 'other';
}
```

Forced fee is a separate flag (`forced_fee === 'True'`), not derived from authority. A patent can be both fee-type and forced.

## Key Design Decisions and Why

### Polygon geometry, not just centroids
The tool fetches full polygon geometry (`returnGeometry: true, f: 'geojson'`). Earlier versions fetched only centroids for speed, but this loses the fundamental unit of analysis — you can't understand land dispossession without seeing individual parcels as actual pieces of land. At zoom ≥ 9, parcels render as colored polygons. Below that, circle markers at centroids.

### Percentile-trimmed grid extent
The ratio grid uses 2nd–98th percentile of lat/lng to compute cell size, not the full bounding box. This is because some Crow patents are scattered near Billings and other off-reservation locations. Without trimming, a handful of outliers inflate the bounding box from ~1° to ~3°, making cells enormous. The trimmed extent with a /45 divisor produces cells of roughly 1.5 × 1.5 miles (~1,500 acres, ~2 sections) — a meaningful analytical unit for allotment patterns.

### Grid cell minimum: 5 patents
Cells with fewer than 5 patents (`GRID_MIN_PATENTS`) are hidden. Low-count cells produce misleading ratios (1 fee patent in a cell = "100% fee" which is technically true but meaningless).

### Heatmap shows only fee/forced patents
The density heatmap plots fee patents (weight 0.5) and forced fee patents (weight 1.0). Trust patents are excluded. This means the heatmap shows where alienation concentrated, not total patent activity. The label says "Fee patent density heatmap" to make this explicit.

### Tight heatmap radius (0.4 miles)
Earlier versions used 1.5-mile radius, which caused "kernel bleed" — grid cells with 0% fee patents glowed red because adjacent cells' heat radii bled across boundaries. Reduced to 0.4 miles with 40% blur to keep heat where fee patents actually are. Dynamic max scaling (`heatData.length / 500`, capped at 3.0) prevents cumulative views from washing to solid red.

### Year filtering (1850–1975)
Corrupted `signature_date` timestamps produce years like 3413. The timeline builder filters to 1850–1975:
```javascript
const years = currentData.filter(f => f.year && f.year >= 1850 && f.year <= 1975).map(f => f.year);
```

### FETCH_LIMIT: 25,000
The tool caps at 25,000 patents per query to keep the browser responsive. For the Crow Nation (~11,643 patents) this is fine. For "All States" queries it will hit the limit and show a warning.

## Boundary Overlays

### TIGERweb (Present-day Reservation)
- **API:** Census TIGERweb REST API, Layer 2 (Federal American Indian Reservations)
- **URL pattern:** `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/AIANNHA/MapServer/2/query`
- **Fields available:** `BASENAME`, `NAME` (NOT `NAMELSAD` — that field doesn't exist on Layer 2)
- **Format:** `f=geojson` works directly, no need for manual Esri-to-Leaflet conversion
- **Search:** `BASENAME LIKE '%searchName%'` with manual `encodeURIComponent` to avoid double-encoding
- **Tribe name mapping:** `TRIBE_SEARCH_NAMES` object maps `preferred_name` values to TIGERweb search terms (e.g., "Crow" → "Crow")

### Native Land Digital (Historical Territory)
- **API:** `https://native-land.ca/api/index.php?maps=territories&name=SLUG`
- **May require API key** — check https://native-land.ca/resources/api-docs/ for current status
- **Returns:** Array of features (not a FeatureCollection), so wrap in `{ type: 'FeatureCollection', features: data }`
- **Tribe slug mapping:** `TRIBE_SLUGS` object maps tribe names to API slugs (e.g., "Crow" → "crow-apsaalooke")
- **CORS:** May be blocked from `file://` origins. Works from hosted origins.

## Bugs Fixed (and their root causes)

1. **Year 3413 in timeline** — Corrupted `signature_date` timestamps. Fixed by filtering years to 1850–1975 in `buildTimelineIndex()`.

2. **Boundary overlays not loading** — TIGERweb query requested non-existent field `NAMELSAD`. Fixed to use `BASENAME`/`NAME`. Also switched from `f=json` with manual converter to `f=geojson`.

3. **Grid cells too large** — Outlier patents far from reservation inflated bounding box. Fixed with percentile-trimmed extent (2nd–98th percentile) + fixed /45 divisor.

4. **Heatmap red-washing 0% fee cells** — 1.5-mile kernel radius bled across cell boundaries. Fixed with 0.4-mile radius, reduced blur, transparent gradient start, dynamic max scaling.

5. **Heatmap instability across zoom levels** — Leaflet.heat uses pixel-based radius, so patterns changed dramatically with zoom. Fixed by computing radius as a geographic distance converted to pixels at current zoom: `(0.4 / 69) * pixPerDeg`.

6. **Cumulative heatmap saturation** — With 3,000+ fee patents, everything turned solid red. Fixed with dynamic max: `Math.max(1.0, Math.min(3.0, heatData.length / 500))`.

## Color Scheme (Light Theme)

| Element | Color | Hex |
|---------|-------|-----|
| Trust patent fill | Blue | `#2980b9` |
| Trust patent border | Dark blue | `#1a6fa0` |
| Fee patent fill | Amber | `#d4a017` |
| Fee patent border | Dark amber | `#b8860b` |
| Forced fee fill | Red | `#c0392b` |
| Forced fee border | Dark red | `#a93226` |
| Reservation boundary | Dark slate | `#2c3e50` |
| Historical territory | Amber dashed | `#a07818` |
| Background | Cream | `#f5f2ed` |
| Panel background | White | `#ffffff` |
| Text | Dark brown | `#2c2825` |

## Analysis Panel Features

The right panel (380px) renders on "Run Analysis":
- **Summary stats:** Total patents, fee/trust/forced counts, fee percentage, date range
- **County breakdown:** Horizontal stacked bars showing trust/fee ratio per county
- **Temporal chart:** Canvas-drawn stacked area chart showing trust vs. fee patents over time by 5-year bins
- **Interpretive insights:** Auto-generated text highlighting forced fee percentage, peak alienation periods, county concentrations

In timeline mode, the analysis panel shows cumulative statistics through the current year.

## Timeline Mode

Toggle "Cumulative timeline mode" to enable. Features:
- **Year scrubber:** Draggable timeline with stacked area chart background
- **Playback:** Play/pause button with speed selector (1 yr/sec, 2 yr/sec, 5 yr/sec)
- **Cumulative rendering:** Shows all patents through the selected year, not just patents from that year
- **Year display:** Large semi-transparent year number centered on map
- **Stats update:** Fee percentage, counts, and analysis panel update in real time

## Known Issues / Next Steps

- **CORS on boundary overlays:** TIGERweb and Native Land APIs may be blocked when opening from `file://`. Need to host or use a proxy.
- **Single-file architecture:** At 1,200 lines this should be split into modules (data loading, map rendering, analysis, UI controls, timeline).
- **No tests.** No automated verification of data loading, classification, or rendering.
- **The `returnCentroid` fallback was removed.** The tool now always requests full geometry. This is slower (~2× the data transfer) but necessary for parcel rendering. Could add a fast-load mode that fetches centroids first, then backfills geometry.
- **Native Land API may require a key.** The API changelog indicates key requirements were added. Check current docs.
- **Grid labels get cluttered at certain zooms.** The percentage labels overlap when cells are small. Could use a smarter label placement or only show on hover.
- **Parcel rendering performance.** 11,000 L.geoJSON polygon layers can get sluggish. Consider using Canvas renderer or switching to vector tiles for large datasets.
- **No export/save.** User can't export filtered data, save map state, or generate reports.
- **Integration with UVA Rails database.** Currently hits the Esri Feature Service. Could connect directly to the Rails API for richer queries.
- **Ollama/local LLM integration.** Christian wants AI analysis capabilities using local models, not external APIs. Could add a panel that sends filtered patent data to a local Ollama endpoint for pattern interpretation.

## Research Context

This tool supports research on systematic federal violations of Native American land rights, particularly the Crow Act of 1920 and broader patterns of tribal land dispossession during the allotment era (1887–1934). The data shows that 23% of Crow patents were converted from trust to fee, with 1,643 forced fee patents where the BIA unilaterally removed trust protections. Fee patent conversion concentrated along transportation corridors and near towns, with the eastern portion of the Crow reservation seeing 40–70% conversion rates versus 0–15% in the western half. The tool is designed to make these patterns visible and explorable for both academic research and tribal community education.

## Companion Tool

There is also a simpler `tribal-land-patents.html` map viewer in the same outputs directory. It's a straightforward patent browser with tribe color-coding, filtering, and parcel/marker display — no analytical overlays. It was built first and serves as the reference for how the Esri Feature Service API works.

## Session History

This tool was built across 7 Claude Chat sessions on March 1–2, 2026:
1. Initial map viewer with temporal controls
2. Pattern analysis tool with ratio heatmap
3. Ratio grid refinement (density heatmap → ratio grid, finer cells, bolder colors)
4. Cumulative timeline mode with playback
5. Tool rebuild after accidental replacement + UX improvements
6. Boundary overlays (TIGERweb + Native Land) + Farrell et al. methodology integration
7. Bug fixes (year 3413, boundary APIs, grid sizing) + polygon parcel rendering + light theme + density heatmap fixes
