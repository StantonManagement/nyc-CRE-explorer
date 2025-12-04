# NYC CRE Explorer - Project Rules

## Project Overview
NYC Commercial Real Estate deal sourcing tool for Midtown South, powered by NYC Open Data APIs.

**Stack**: Express.js 5.x backend, vanilla JS frontend, Mapbox GL JS, NYC Open Data APIs

## File Structure
```
nyc-cre-app/
├── server.js              # Express API server (main entry)
├── fetch_nyc_data.js      # NYC Open Data fetcher script
├── public/
│   └── index.html         # Frontend (single-file SPA)
├── data/
│   └── combined_data.json # Cached property data
├── planning/              # Project planning & context
│   ├── prps/              # Product Requirement Proposals
│   ├── thoughts/          # Claude conversation logs & brainstorming
│   └── research/          # Data sources & research docs
├── package.json
└── README.md
```

## Code Conventions

### Backend (server.js)
- Use Express 5.x patterns (async route handlers work natively)
- All API routes under `/api/`
- Return consistent JSON: `{ count, [items] }` for lists, `{ error }` for errors
- Keep data in memory (DATA object) - production would use PostgreSQL
- Use 404 status for not found, 400 for bad requests

### Frontend (index.html)
- **Single-file architecture** - HTML + CSS + JS in one file
- State management via `state` object at top of script
- Use vanilla JS only - no frameworks
- Mapbox GL JS for mapping
- CSS custom properties for theming (--primary, --bg-dark, etc.)

### Data Patterns
- **BBL** (Borough-Block-Lot) is the unique property identifier
- Format: `1008010001` = Borough 1, Block 00801, Lot 0001
- All prices in whole dollars (no cents)
- Dates as ISO strings or YYYY-MM-DD

## NYC Open Data APIs
```
PLUTO:      https://data.cityofnewyork.us/resource/64uk-42ks.json
Sales:      https://data.cityofnewyork.us/resource/usep-8jbt.json  
Permits:    https://data.cityofnewyork.us/resource/ipu4-2vj7.json
Violations: https://data.cityofnewyork.us/resource/3h2n-5cm9.json
ACRIS:      https://data.cityofnewyork.us/resource/bnx9-e6tj.json
```

## Key Data Types

```javascript
// Property object
{
  bbl: string,           // "1008010001"
  address: string,
  zipcode: string,
  bldgclass: string,     // "O4", "K1", "D1", etc.
  ownername: string,
  lotarea: number,       // SF
  bldgarea: number,      // SF
  numfloors: number,
  yearbuilt: number,
  zonedist1: string,     // "C6-6", "M1-6", etc.
  builtfar: number,
  commfar: number,
  assesstot: number,     // dollars
  latitude: number,
  longitude: number,
  lastSalePrice: number | null,
  lastSaleDate: string | null
}

// Sale object
{
  bbl: string,
  address: string,
  sale_price: number,
  sale_date: string,     // "YYYY-MM-DD"
  gross_sf: number,
  price_per_sf: number | null,
  building_class: string
}
```

## Building Classes
| Code | Type |
|------|------|
| O | Office (O4, O5, O6) |
| K | Retail/Store (K1, K4) |
| D | Elevator Apartments (D1, D4) |
| E | Warehouse (E1, E4) |
| R | Condo |

## Testing Commands
```bash
node server.js                              # Start server
node fetch_nyc_data.js                      # Fetch fresh data
curl http://localhost:3000/api/stats        # Verify API
curl http://localhost:3000/api/properties   # List properties
curl http://localhost:3000/api/sales?limit=10
```

## Anti-Patterns - DO NOT
- Add npm dependencies without explicit approval
- Break single-file frontend architecture
- Use React/Vue/Angular - keep vanilla JS
- Hardcode API tokens (Mapbox demo token is temporary)
- Create separate CSS or JS files
- Modify combined_data.json directly (use fetch script)

## When Adding Features
1. Backend changes → `server.js`
2. Frontend changes → `public/index.html`
3. Data fetching → `fetch_nyc_data.js`
4. Update `README.md` if adding new endpoints
5. Always test with `node server.js` before committing
