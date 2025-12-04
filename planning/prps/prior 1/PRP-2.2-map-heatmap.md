# PRP 2.2: Map Heatmap Layers

**Phase:** 2 - Enhanced Analytics  
**Estimated Time:** 3 hours  
**Dependencies:** PRP 1.0 complete  
**Outputs:** Toggle heatmap overlays (price, FAR gap, tenure)

> **Architectural Note:** Heatmap data should be fetched from the unified `/api/data` endpoint (PRP-1.0) with active filters applied. The endpoint already returns filtered properties with computed metrics (FAR gap, tenure, etc.). Frontend transforms this data into heatmap format. All filtering uses the centralized `FILTER_CONFIG` to ensure map heatmaps respect the same building class groups and filter logic as other views.  
**Outputs:** Toggle-able heatmap overlays showing opportunity density, price, and distress

---

## Goal

Add visual heatmap layers to the map so users can spot patterns at a glance - where are the opportunities clustered? Where are prices highest? Where is distress concentrated?

**Current state:** Map shows individual property markers  
**Target state:** Map has toggle buttons for 3 heatmap modes + markers

---

## Heatmap Modes

### Mode 1: Opportunity Density

**What it shows:** Concentration of high FAR-gap properties

**Data source:** Properties table, weighted by `far_gap`

**Color scale:** Green (low opportunity) → Yellow → Red (high opportunity)

**Use case:** "Where should I be looking for underbuilt properties?"

---

### Mode 2: Price Heatmap

**What it shows:** Recent sale $/SF by area

**Data source:** Sales table, aggregated by location

**Color scale:** Blue (low $/SF) → Purple → Red (high $/SF)

**Use case:** "What are the expensive vs affordable micro-markets?"

---

### Mode 3: Distress Concentration

**What it shows:** Where open violations are clustered

**Data source:** Violations table (status = OPEN), grouped by property location

**Color scale:** Green (few violations) → Orange → Red (many violations)

**Use case:** "Where are the troubled buildings?"

---

## Backend Changes

### New Endpoint: `GET /api/heatmap`

Query params:
- `metric` - one of: `opportunity`, `price`, `distress`
- `resolution` - grid cell size in degrees (default 0.002 ≈ 1 block)

Response format:
```json
{
  "metric": "opportunity",
  "cells": [
    { "lat": 40.745, "lng": -73.988, "value": 45, "count": 12 },
    { "lat": 40.746, "lng": -73.988, "value": 32, "count": 8 }
  ],
  "min": 0,
  "max": 100,
  "generated": "2025-12-03T..."
}
```

### Aggregation Logic

**Opportunity metric:**
```sql
-- Pseudocode
SELECT 
  ROUND(lat / 0.002) * 0.002 as grid_lat,
  ROUND(lng / 0.002) * 0.002 as grid_lng,
  AVG(far_gap) * 10 as value,  -- scale to 0-100ish
  COUNT(*) as count
FROM properties
WHERE far_gap > 0
GROUP BY grid_lat, grid_lng
```

**Price metric:**
```sql
SELECT 
  ROUND(p.lat / 0.002) * 0.002 as grid_lat,
  ROUND(p.lng / 0.002) * 0.002 as grid_lng,
  AVG(s.price_per_sf) as value,
  COUNT(*) as count
FROM sales s
JOIN properties p ON s.bbl = p.bbl
WHERE s.sale_date > now() - interval '2 years'
GROUP BY grid_lat, grid_lng
```

**Distress metric:**
```sql
SELECT 
  ROUND(p.lat / 0.002) * 0.002 as grid_lat,
  ROUND(p.lng / 0.002) * 0.002 as grid_lng,
  COUNT(*) as value,
  COUNT(DISTINCT v.bbl) as count
FROM violations v
JOIN properties p ON v.bbl = p.bbl
WHERE v.status = 'OPEN'
GROUP BY grid_lat, grid_lng
```

---

## Frontend Changes

### Toggle UI

Add toggle buttons above or beside the map:

```
[Markers] [Opportunity] [Price] [Distress]
```

- One active at a time (radio behavior)
- "Markers" shows current property dots
- Other three show heatmap + can optionally keep markers dimmed

### Mapbox Heatmap Layer

Mapbox GL JS has built-in heatmap support:

```javascript
// Add heatmap source
map.addSource('heatmap-data', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] }
});

// Add heatmap layer
map.addLayer({
  id: 'heatmap-layer',
  type: 'heatmap',
  source: 'heatmap-data',
  paint: {
    'heatmap-weight': ['get', 'value'],
    'heatmap-intensity': 1,
    'heatmap-radius': 30,
    'heatmap-color': [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(0,0,0,0)',
      0.2, '#22c55e',
      0.4, '#eab308', 
      0.6, '#f97316',
      1, '#ef4444'
    ]
  }
});
```

### Data Flow

1. User clicks heatmap toggle
2. Frontend fetches `/api/heatmap?metric=opportunity`
3. Convert response to GeoJSON FeatureCollection
4. Update heatmap source data
5. Show/hide heatmap layer
6. Optionally dim marker layer

### Legend

Show a simple legend when heatmap is active:

```
[gradient bar]
Low ←――――――→ High
```

Position: bottom-left or bottom-right of map.

---

## Implementation Notes

### Converting API Response to GeoJSON

```javascript
function toHeatmapGeoJSON(cells) {
  return {
    type: 'FeatureCollection',
    features: cells.map(cell => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [cell.lng, cell.lat]
      },
      properties: {
        value: cell.value / 100  // normalize to 0-1
      }
    }))
  };
}
```

### Color Scales by Metric

| Metric | Low | Mid | High |
|--------|-----|-----|------|
| Opportunity | Green #22c55e | Yellow #eab308 | Red #ef4444 |
| Price | Blue #3b82f6 | Purple #8b5cf6 | Red #ef4444 |
| Distress | Green #22c55e | Orange #f97316 | Red #ef4444 |

### Performance

- Cache heatmap data (doesn't change frequently)
- Consider server-side caching for 5-10 minutes
- Grid resolution of 0.002 degrees ≈ 200m cells, reasonable count

---

## Validation Checklist

- [ ] Toggle buttons appear near map
- [ ] Clicking "Opportunity" shows green-yellow-red heatmap
- [ ] Clicking "Price" shows blue-purple-red heatmap
- [ ] Clicking "Distress" shows green-orange-red heatmap
- [ ] Clicking "Markers" hides heatmap, shows normal markers
- [ ] Heatmap loads in < 1 second
- [ ] Legend appears when heatmap active
- [ ] Heatmap updates if user pans to new area (optional: viewport-based query)
- [ ] No console errors

---

## Edge Cases

| Case | Handling |
|------|----------|
| No data in area | Show empty heatmap (transparent) |
| API error | Show toast, keep previous view |
| Zoom out too far | Aggregate to larger grid cells or disable heatmap |
| Mobile/small screen | Stack toggles vertically or use dropdown |

---

## Optional Enhancements

**Click heatmap cell:** Show tooltip with stats for that grid cell

**Viewport-aware:** Only fetch data for visible map bounds (reduces payload)

**Animation:** Fade between heatmap modes

**Combine with markers:** Show markers on top of heatmap, but dimmed/smaller

---

## Files Modified

| File | Changes |
|------|---------|
| `server.js` | Add `GET /api/heatmap` endpoint with 3 metric types |
| `public/index.html` | Add toggle UI, heatmap layer setup, legend |

---

## Next Steps

After this PRP:
- **PRP 2.3**: Property Due Diligence Page (full-page tabbed view)
- **PRP 3.1**: Saved Searches with Alerts
