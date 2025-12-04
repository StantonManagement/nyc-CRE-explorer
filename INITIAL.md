# Feature Request: [Your Feature Name]

## FEATURE:
[Describe what you want to build. Be specific about functionality, user interactions, and expected outcomes.]

**Example features:**
- Add ACRIS deed/mortgage document links to property panel
- Implement property comparison view (side-by-side)
- Add owner portfolio aggregation (group by owner)
- Create saved search alerts
- Add permit timeline visualization
- Implement export to CSV/Excel
- Add neighborhood boundary overlays on map

---

## CURRENT STATE:

### Existing Features
- Property list with filtering by building class (O, K, D, E)
- Recent sales feed with price/SF calculations
- Portfolio tracking (localStorage)
- Interactive Mapbox map with color-coded markers
- Property detail panel: zoning, tax, FAR, sales history
- Search by address, owner, or BBL

### API Endpoints Available
```
GET  /api/properties              - List properties (query: north, south, east, west, minSF, maxSF, buildingClass)
GET  /api/properties/:bbl         - Single property + sales + permits
GET  /api/search?q=&type=         - Search (type: address, owner, bbl, or omit for all)
GET  /api/sales                   - Recent sales (query: minPrice, maxPrice, days, limit)
GET  /api/stats                   - Summary statistics
GET  /api/portfolio/:userId       - User's saved properties
POST /api/portfolio/:userId/add   - Add property (body: { bbl })
POST /api/portfolio/:userId/remove - Remove property (body: { bbl })
```

### Data Available
- 12 sample properties in Midtown South
- 11 sales records (2013-2023)
- Property fields: BBL, address, owner, SF, floors, year built, zoning, FAR, assessed value, lat/lng
- Sale fields: BBL, address, price, date, SF, price/SF, building class

---

## EXAMPLES:

### Backend Pattern (server.js)
```javascript
// Endpoint structure - see lines 40-80
app.get('/api/[resource]', (req, res) => {
  const { queryParam } = req.query;
  let filtered = DATA.[resource];
  // Apply filters...
  res.json({ count: filtered.length, [resource]: filtered });
});
```

### Frontend Pattern (public/index.html)
```javascript
// Fetch and render - see renderList() around line 380
async function loadData() {
  const res = await fetch('/api/endpoint');
  const data = await res.json();
  // Update state and render
}

// UI component - see property-item class
`<div class="property-item" data-bbl="${p.bbl}">
  <div class="property-address">${p.address}</div>
  <div class="property-meta">...</div>
</div>`
```

### NYC Open Data Query (fetch_nyc_data.js)
```javascript
// Socrata query - see fetchPLUTO() around line 95
const query = buildQuery(ENDPOINTS.pluto.url, {
  '$where': `borough='MN' AND zipcode IN ('10001','10010')`,
  '$limit': 5000,
  '$order': 'bbl'
});
```

---

## DOCUMENTATION:

**NYC Open Data (Socrata API):**
- PLUTO: https://dev.socrata.com/foundry/data.cityofnewyork.us/64uk-42ks
- Rolling Sales: https://dev.socrata.com/foundry/data.cityofnewyork.us/usep-8jbt
- DOB Permits: https://dev.socrata.com/foundry/data.cityofnewyork.us/ipu4-2vj7
- DOB Violations: https://dev.socrata.com/foundry/data.cityofnewyork.us/3h2n-5cm9
- ACRIS Master: https://dev.socrata.com/foundry/data.cityofnewyork.us/bnx9-e6tj

**Mapbox GL JS:** https://docs.mapbox.com/mapbox-gl-js/api/

**Socrata Query Docs:** https://dev.socrata.com/docs/queries/

---

## OTHER CONSIDERATIONS:

### Constraints
- Keep frontend as single HTML file (no separate JS/CSS files)
- No new npm dependencies without explicit approval
- Vanilla JS only - no React/Vue/Angular

### Data Formats
- BBL: `1008010001` (1-digit borough + 5-digit block + 4-digit lot)
- Prices: whole dollars (no cents)
- Dates: ISO string or YYYY-MM-DD
- SF: integers

### API Response Standards
- Lists: `{ count: number, [items]: array }`
- Single item: `{ property: object, sales: array, permits: array }`
- Errors: `{ error: "message" }` with appropriate status code

### Testing
```bash
# After any changes, verify:
node server.js
curl http://localhost:3000/api/stats
# Then test in browser at http://localhost:3000
```
