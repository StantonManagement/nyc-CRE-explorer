# PRP 0.5: Fetch Full Midtown South Dataset

**Phase:** 0 - Foundation  
**Estimated Time:** 15 minutes  
**Dependencies:** PRP 0.2-0.4 complete  
**Outputs:** 500+ properties loaded, ready for real use

---

## Goal

Run the data fetcher with expanded parameters to pull a complete, useful dataset for Midtown South. After this, you'll have real data to demo.

---

## Prerequisites

- Supabase connected and working
- `fetch_nyc_data.js` tested with small dataset
- Internet connection to NYC Open Data

---

## Step 1: Expand Geographic Coverage

The default bounding box in `fetch_nyc_data.js` covers core Midtown South. Let's verify and optionally expand:

### Current Coverage (Default)
```javascript
// Roughly 14th to 34th St, 5th to 8th Ave
bbox: {
  minLat: 40.735,  // ~14th St
  maxLat: 40.755,  // ~34th St
  minLng: -73.995, // ~8th Ave
  maxLng: -73.980  // ~5th Ave
}
```

### Expanded Coverage (Optional)
To cover more of Manhattan's commercial core:

```javascript
// Flatiron to Hudson Yards
bbox: {
  minLat: 40.730,  // ~10th St
  maxLat: 40.760,  // ~42nd St
  minLng: -74.005, // ~10th Ave
  maxLng: -73.975  // ~Park Ave
}
```

Edit `CONFIG.bbox` in `fetch_nyc_data.js` if desired.

---

## Step 2: Verify Building Classes

Default classes cover commercial real estate:

```javascript
targetClasses: ['O', 'K', 'D', 'E', 'R']
// O = Office
// K = Retail/Store
// D = Elevator Apartments (multifamily)
// E = Warehouse/Industrial
// R = Condo
```

For pure commercial focus, you might remove 'D' and 'R':
```javascript
targetClasses: ['O', 'K', 'E']
```

---

## Step 3: Run Full Fetch

```bash
# With JSON backup (recommended)
npm run fetch:backup

# Or without backup
npm run fetch
```

Expected output for Midtown South:
```
═══════════════════════════════════════════
  NYC CRE Data Fetcher → Supabase
═══════════════════════════════════════════

📥 Fetching PLUTO data...
   Raw records: ~2000-4000
   After class filter: ~500-1500

📥 Fetching sales data...
   Records: ~300-800

🔄 Transforming data...
   Properties: ~500-1500
   Sales: ~300-800

📤 Upserting properties to Supabase...
   ✅ Upserted: XXX, ❌ Errors: 0

📤 Upserting sales to Supabase...
   ✅ Inserted: XXX, ❌ Errors: 0

═══════════════════════════════════════════
  COMPLETE
═══════════════════════════════════════════
```

---

## Step 4: Verify Data Quality

### Check Property Count
```bash
curl http://localhost:3000/api/stats
```

Expected:
```json
{
  "properties": 500+,
  "sales": 100+,
  "byBuildingClass": {
    "O": 150+,
    "K": 100+,
    ...
  }
}
```

### Check FAR Gap Distribution
In Supabase SQL Editor:
```sql
-- How many underbuilt properties?
select 
  case 
    when far_gap >= 4 then '4+ (Major)'
    when far_gap >= 2 then '2-4 (Good)'
    when far_gap >= 1 then '1-2 (Some)'
    else '0-1 (Minimal)'
  end as opportunity_tier,
  count(*) as count
from properties
group by 1
order by 1;
```

### Check Geographic Coverage
```sql
-- Verify bounding box coverage
select 
  min(lat) as south,
  max(lat) as north,
  min(lng) as west,
  max(lng) as east,
  count(*) as total
from properties;
```

---

## Step 5: Sample Interesting Properties

Find some properties to verify quality:

```sql
-- Top FAR gap opportunities
select 
  address, 
  bldgclass, 
  ownername, 
  far_gap, 
  unused_sf,
  assesstot
from properties 
where far_gap > 3
order by far_gap desc
limit 10;
```

```sql
-- Largest properties
select 
  address, 
  bldgclass, 
  bldgarea,
  numfloors,
  yearbuilt
from properties 
order by bldgarea desc
limit 10;
```

```sql
-- Recent sales over $10M
select 
  p.address,
  s.sale_price,
  s.sale_date,
  s.price_per_sf,
  p.bldgclass
from sales s
join properties p on s.bbl = p.bbl
where s.sale_price > 10000000
order by s.sale_date desc
limit 10;
```

---

## Step 6: Test the App

1. Open `http://localhost:3000`
2. Verify map shows markers across Midtown South
3. Scroll property list - should see variety
4. Apply filters - results should change
5. Click a property - should show details
6. Click owner name - should show portfolio

---

## Data Summary Targets

| Metric | Minimum | Good | Excellent |
|--------|---------|------|-----------|
| Properties | 200 | 500 | 1000+ |
| Sales | 50 | 150 | 300+ |
| Avg FAR Gap > 2 | 20 | 50 | 100+ |
| Owner Diversity | 100 | 250 | 500+ |

---

## Optional: Expand to Other Neighborhoods

Once Midtown South works, you can fetch additional areas:

### Tribeca/SoHo
```javascript
bbox: {
  minLat: 40.715,
  maxLat: 40.730,
  minLng: -74.015,
  maxLng: -73.995
}
```

### Hudson Yards
```javascript
bbox: {
  minLat: 40.750,
  maxLat: 40.765,
  minLng: -74.010,
  maxLng: -73.995
}
```

You can run the fetcher multiple times with different bboxes - upsert will merge data.

---

## Validation Checklist

- [ ] Fetcher completes without errors
- [ ] 500+ properties in database
- [ ] 100+ sales in database
- [ ] FAR gap values look reasonable (0-10 range typical)
- [ ] Map shows markers in correct area
- [ ] Can find specific buildings you know
- [ ] Sales data matches real transactions

---

## Troubleshooting

### Very few properties returned
Bounding box might be too small or outside commercial areas. Expand bbox.

### No sales matching properties
Sales API uses different BBL format sometimes. Check that BBLs align:
```sql
select count(*) from sales 
where bbl in (select bbl from properties);
```

### API rate limited
NYC Open Data has a soft limit of 1000 requests/hour. Wait and retry.

### Data looks stale
PLUTO updates quarterly, sales monthly. Data may be 1-3 months behind.

---

## Phase 0 Complete! 🎉

You now have:
- ✅ Supabase database with schema
- ✅ Data fetcher writing to Supabase
- ✅ API server querying Supabase
- ✅ Frontend displaying new data
- ✅ Real dataset for Midtown South

**Demo Ready:** You can now show this to Andrea with real properties, FAR gaps, and opportunity signals.

---

## Next Phase

Proceed to **Phase 1: Core Investment Analytics**

Phase 1 builds on this foundation to add:
- Refined opportunity scoring
- Sale vs. assessed value analysis
- Ownership tenure calculation
- Visual analytics dashboard
