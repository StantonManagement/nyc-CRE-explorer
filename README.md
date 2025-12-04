# NYC CRE Explorer - Midtown South

A real-time commercial real estate deal sourcing tool for NYC, powered by NYC Open Data APIs.

## Features

- **Interactive Map**: Zoom, pan, click on properties
- **Property Details**: Building specs, zoning/FAR, ownership, tax data, sales history
- **Recent Sales Feed**: Track all transactions in your target area
- **Multi-Parameter Search**: By address, owner name, BBL, building class
- **Portfolio Tracking**: Save properties, get alerts on changes
- **Real-Time Data**: Pull directly from NYC Open Data APIs

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Fetch real NYC data (requires internet)
node fetch_nyc_data.js

# 3. Start the app
node server.js

# 4. Open browser to http://localhost:3000
```

The app ships with sample data so you can explore immediately without fetching.

## Data Sources

All data is pulled from **free, public NYC Open Data APIs**:

| Source | Data | API Endpoint |
|--------|------|--------------|
| **PLUTO** | Property characteristics, zoning, FAR, ownership | data.cityofnewyork.us/resource/64uk-42ks |
| **DOF Rolling Sales** | Sale transactions | data.cityofnewyork.us/resource/usep-8jbt |
| **DOB Permits** | Building permits | data.cityofnewyork.us/resource/ipu4-2vj7 |
| **DOB Violations** | Building violations | data.cityofnewyork.us/resource/3h2n-5cm9 |
| **Property Valuation** | Tax assessments | data.cityofnewyork.us/resource/yjxr-fw8i |

## Project Structure

```
nyc-cre-app/
├── server.js              # Express API server
├── fetch_nyc_data.js      # NYC Open Data fetcher
├── planning/              # Project planning & context
│   ├── prps/              # Product Requirement Proposals
│   ├── thoughts/          # Claude conversation logs & brainstorming
│   └── research/          # Data sources & research docs
├── public/
│   └── index.html         # Frontend app (single file)
├── data/
│   └── combined_data.json # Cached property data
├── package.json
└── README.md
```

## API Endpoints

```
GET /api/properties          - List all properties (with filters)
GET /api/properties/:bbl     - Single property details
GET /api/search?q=&type=     - Search properties
GET /api/sales               - Recent sales
GET /api/stats               - Summary statistics
GET /api/portfolio/:userId   - User's saved properties
POST /api/portfolio/:userId/add    - Add to portfolio
POST /api/portfolio/:userId/remove - Remove from portfolio
```

## Expanding to Other Neighborhoods

Edit `fetch_nyc_data.js` to change the target area:

```javascript
const CONFIG = {
  neighborhood: 'Chelsea',
  zips: ['10011', '10001'],  // Update zip codes
  buildingClasses: ['D', 'E', 'K', 'O', 'R'],
  // ...
};
```

## Setting Up Alerts (Future Enhancement)

To add real-time alerts for new filings:

1. Set up a cron job to run `fetch_nyc_data.js` daily
2. Compare new data against previous day
3. Send notifications for:
   - New sales in your target area
   - New permits filed
   - Properties matching your criteria

Example cron (daily at 7am):
```bash
0 7 * * * cd /path/to/nyc-cre-app && node fetch_nyc_data.js >> /var/log/nyc-cre.log 2>&1
```

## Production Deployment

For production use:

1. **Database**: Replace JSON file with PostgreSQL
2. **Mapbox**: Get your own API key at mapbox.com
3. **Authentication**: Add user auth (Auth0, Firebase, etc.)
4. **Hosting**: Deploy to Heroku, Railway, or AWS

```bash
# Example: Deploy to Railway
railway login
railway init
railway up
```

## Data Refresh Schedule

NYC Open Data updates at different frequencies:

| Dataset | Update Frequency |
|---------|-----------------|
| Rolling Sales | Monthly |
| PLUTO | Annually |
| DOB Permits | Daily |
| DOB Violations | Daily |
| ACRIS | Real-time |

## Limitations

- **Lease Data**: Not available in public records (CoStar/Reonomy proprietary)
- **Contact Info**: Phone/email requires manual research or paid services
- **Tenant Info**: Limited to Certificate of Occupancy data
- **Income/Expenses**: Only available for some commercial properties via RPIE

## Adding More Data Sources

To add ACRIS (deeds/mortgages):

```javascript
// In fetch_nyc_data.js, add:
const acrisQuery = buildQuery('https://data.cityofnewyork.us/resource/bnx9-e6tj.json', {
  '$where': `borough='1' AND doc_type IN ('DEED','MTGE')`,
  '$limit': 1000,
  '$order': 'document_date DESC'
});
```

## License

MIT - Use freely for your deal sourcing needs.

## Support

For questions about NYC Open Data APIs:
- Documentation: https://opendata.cityofnewyork.us/
- Socrata API docs: https://dev.socrata.com/

---

Built for Andrea @ Land Resource Partners
