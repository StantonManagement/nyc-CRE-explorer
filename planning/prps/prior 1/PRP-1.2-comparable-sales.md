# PRP 1.2: Comparable Sales Context

**Phase:** 1 - Core Investment Analytics  
**Estimated Time:** 2 hours  
**Dependencies:** PRP 1.0 complete  
**Outputs:** Market context section in property detail view

> **Architectural Note:** This PRP adds the specialized `/api/properties/:bbl/comps` endpoint for comparable sales analysis. This remains separate from the unified `/api/data` endpoint (PRP-1.0) because comps require property-specific spatial and similarity calculations that don't fit the general filtering model.

---

## Goal

Add market context to property detail view by showing comparable recent sales for similar nearby properties.

**Current state:** Property panel shows only that property's sales history  
**Target state:** Property panel includes "Comps" section with similar nearby sales and market stats

---

## Prerequisites

- Properties and sales tables populated in Supabase
- At least 100+ sales records for meaningful comps
- Properties have `lat`, `lng`, `bldgclass`, `bldgarea` fields

---

## Backend Changes

### Step 1: Add Comps Endpoint

**File:** `server.js`  
**Location:** Add after existing `/api/properties/:bbl` route

```javascript
/**
 * GET /api/properties/:bbl/comps
 * Returns comparable properties with recent sales
 * 
 * Query params:
 *   radius - Search radius in miles (default 0.25)
 *   limit - Max comps to return (default 5)
 *   sizeTolerance - Size match tolerance as decimal (default 0.3 = ±30%)
 */
app.get('/api/properties/:bbl/comps', async (req, res) => {
  try {
    const { bbl } = req.params;
    const {
      radius = 0.25,
      limit = 5,
      sizeTolerance = 0.3
    } = req.query;
    
    // Get subject property
    const { data: subject, error: subjectError } = await supabase
      .from('properties')
      .select('*')
      .eq('bbl', bbl)
      .single();
    
    if (subjectError) {
      if (subjectError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Property not found' });
      }
      throw subjectError;
    }
    
    // Need coordinates for distance calc
    if (!subject.lat || !subject.lng) {
      return res.json({
        subject: formatSubject(subject),
        comps: [],
        marketStats: null,
        error: 'Subject property missing coordinates'
      });
    }
    
    // Get subject's last sale
    const { data: subjectSales } = await supabase
      .from('sales')
      .select('sale_price, sale_date, price_per_sf')
      .eq('bbl', bbl)
      .order('sale_date', { ascending: false })
      .limit(1);
    
    const subjectLastSale = subjectSales?.[0] || null;
    
    // Building class prefix for matching (O4 → O, K1 → K, etc.)
    const classPrefix = (subject.bldgclass || '').charAt(0);
    if (!classPrefix) {
      return res.json({
        subject: formatSubject(subject, subjectLastSale),
        comps: [],
        marketStats: null,
        error: 'Subject property missing building class'
      });
    }
    
    // Size range for matching
    const subjectSize = subject.bldgarea || 0;
    const minSize = Math.round(subjectSize * (1 - parseFloat(sizeTolerance)));
    const maxSize = Math.round(subjectSize * (1 + parseFloat(sizeTolerance)));
    
    // Convert radius to approximate lat/lng degrees
    // 1 mile ≈ 0.0145 degrees latitude in NYC
    const radiusMiles = parseFloat(radius);
    const latDelta = radiusMiles * 0.0145;
    const lngDelta = radiusMiles * 0.018; // slightly wider for longitude at this latitude
    
    // Query nearby properties with same class prefix
    const { data: nearbyProperties, error: nearbyError } = await supabase
      .from('properties')
      .select('bbl, address, bldgclass, bldgarea, lotarea, assesstot, yearbuilt, lat, lng')
      .neq('bbl', bbl) // exclude subject
      .ilike('bldgclass', `${classPrefix}%`)
      .gte('bldgarea', minSize)
      .lte('bldgarea', maxSize)
      .gte('lat', subject.lat - latDelta)
      .lte('lat', subject.lat + latDelta)
      .gte('lng', subject.lng - lngDelta)
      .lte('lng', subject.lng + lngDelta)
      .limit(50); // get more than needed, we'll filter and sort
    
    if (nearbyError) throw nearbyError;
    
    if (!nearbyProperties || nearbyProperties.length === 0) {
      return res.json({
        subject: formatSubject(subject, subjectLastSale),
        comps: [],
        marketStats: null,
        message: 'No comparable properties found nearby'
      });
    }
    
    // Get sales for nearby properties
    const nearbyBbls = nearbyProperties.map(p => p.bbl);
    const { data: nearbySales } = await supabase
      .from('sales')
      .select('*')
      .in('bbl', nearbyBbls)
      .order('sale_date', { ascending: false });
    
    // Build map of most recent sale per BBL
    const lastSaleByBbl = {};
    (nearbySales || []).forEach(sale => {
      if (!lastSaleByBbl[sale.bbl]) {
        lastSaleByBbl[sale.bbl] = sale;
      }
    });
    
    // Calculate distance and build comp objects
    const comps = nearbyProperties
      .map(prop => {
        const distance = calculateDistance(
          subject.lat, subject.lng,
          prop.lat, prop.lng
        );
        const sale = lastSaleByBbl[prop.bbl];
        
        return {
          bbl: prop.bbl,
          address: prop.address,
          bldgclass: prop.bldgclass,
          bldgarea: prop.bldgarea,
          yearbuilt: prop.yearbuilt,
          assesstot: prop.assesstot,
          distance: Math.round(distance * 100) / 100, // miles, 2 decimals
          lastSalePrice: sale?.sale_price || null,
          lastSaleDate: sale?.sale_date || null,
          pricePerSF: sale?.price_per_sf || null,
          assessedPerSF: prop.assesstot && prop.bldgarea 
            ? Math.round(prop.assesstot / prop.bldgarea) 
            : null
        };
      })
      .filter(comp => comp.lastSalePrice) // only include properties with sales
      .sort((a, b) => a.distance - b.distance) // sort by distance
      .slice(0, parseInt(limit));
    
    // Calculate market stats from comps
    const marketStats = calculateMarketStats(comps);
    
    res.json({
      subject: formatSubject(subject, subjectLastSale),
      comps,
      marketStats
    });
    
  } catch (error) {
    console.error('Comps error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Calculate distance between two points in miles (Haversine formula)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Format subject property for response
 */
function formatSubject(property, lastSale = null) {
  return {
    bbl: property.bbl,
    address: property.address,
    bldgclass: property.bldgclass,
    bldgarea: property.bldgarea,
    assesstot: property.assesstot,
    lastSalePrice: lastSale?.sale_price || null,
    lastSaleDate: lastSale?.sale_date || null,
    pricePerSF: lastSale?.price_per_sf || null
  };
}

/**
 * Calculate market statistics from comps
 */
function calculateMarketStats(comps) {
  if (!comps || comps.length === 0) return null;
  
  const pricesPerSF = comps
    .map(c => c.pricePerSF)
    .filter(p => p && p > 0)
    .sort((a, b) => a - b);
  
  if (pricesPerSF.length === 0) return null;
  
  const sum = pricesPerSF.reduce((a, b) => a + b, 0);
  const avg = sum / pricesPerSF.length;
  
  // Median
  const mid = Math.floor(pricesPerSF.length / 2);
  const median = pricesPerSF.length % 2 === 0
    ? (pricesPerSF[mid - 1] + pricesPerSF[mid]) / 2
    : pricesPerSF[mid];
  
  // Price range
  const minPrice = Math.min(...comps.map(c => c.lastSalePrice).filter(Boolean));
  const maxPrice = Math.max(...comps.map(c => c.lastSalePrice).filter(Boolean));
  
  return {
    avgPricePerSF: Math.round(avg),
    medianPricePerSF: Math.round(median),
    minPricePerSF: Math.min(...pricesPerSF),
    maxPricePerSF: Math.max(...pricesPerSF),
    priceRange: { min: minPrice, max: maxPrice },
    saleCount: comps.length
  };
}
```

### Step 2: Validation - Backend

```bash
# Start server
node server.js

# Test comps endpoint (use a real BBL from your data)
curl "http://localhost:3000/api/properties/1008010001/comps" | jq

# Expected response:
# {
#   "subject": {
#     "bbl": "1008010001",
#     "address": "123 MAIN ST",
#     "bldgclass": "O4",
#     "bldgarea": 50000,
#     ...
#   },
#   "comps": [
#     {
#       "bbl": "1008020015",
#       "address": "125 MAIN ST",
#       "distance": 0.08,
#       "lastSalePrice": 5000000,
#       "pricePerSF": 450,
#       ...
#     }
#   ],
#   "marketStats": {
#     "avgPricePerSF": 425,
#     "medianPricePerSF": 410,
#     "saleCount": 5
#   }
# }

# Test with different radius
curl "http://localhost:3000/api/properties/1008010001/comps?radius=0.5&limit=10" | jq
```

---

## Frontend Changes

### Step 3: Add Comps Section CSS

**File:** `public/index.html`  
**Location:** Inside `<style>` section, add:

```css
/* ===== Comparable Sales Section ===== */
.comps-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #333);
}

.comps-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.comps-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.comps-refresh {
  background: none;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  font-size: 12px;
}

.comps-refresh:hover {
  color: var(--primary, #3b82f6);
}

.comps-market-context {
  background: var(--bg-light, #2a2a3e);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.comps-market-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.comps-market-label {
  font-size: 12px;
  color: var(--text-muted, #888);
}

.comps-market-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.comps-market-value.highlight {
  color: #22c55e;
}

.comps-table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}

.comps-table th {
  text-align: left;
  padding: 8px 6px;
  font-weight: 600;
  color: var(--text-muted, #888);
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-color, #333);
}

.comps-table td {
  padding: 10px 6px;
  color: var(--text-primary, #fff);
  border-bottom: 1px solid var(--border-color, #222);
}

.comps-table tr:hover td {
  background: var(--bg-light, #2a2a3e);
}

.comps-table .address {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comps-table .distance {
  color: var(--text-muted, #888);
}

.comps-table .price {
  font-weight: 600;
}

.comps-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-muted, #888);
  font-size: 13px;
}

.comps-loading {
  text-align: center;
  padding: 20px;
  color: var(--text-muted, #888);
}

.subject-vs-market {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color, #333);
}

.subject-vs-market-item {
  flex: 1;
  text-align: center;
  padding: 8px;
  background: var(--bg-dark, #1a1a2e);
  border-radius: 4px;
}

.subject-vs-market-label {
  font-size: 10px;
  color: var(--text-muted, #888);
  text-transform: uppercase;
}

.subject-vs-market-value {
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}

.subject-vs-market-value.above {
  color: #ef4444;
}

.subject-vs-market-value.below {
  color: #22c55e;
}

.subject-vs-market-value.neutral {
  color: var(--text-primary, #fff);
}
```

### Step 4: Add Comps Section HTML Template

**File:** `public/index.html`  
**Location:** Inside your property detail panel, after existing content (sales history, violations, etc.)

Add a container div:

```html
<!-- Comparable Sales Section -->
<div id="comps-section" class="comps-section" style="display: none;">
  <div class="comps-header">
    <span class="comps-title">Comparable Sales</span>
    <button class="comps-refresh" onclick="refreshComps()">↻ Refresh</button>
  </div>
  <div id="comps-content">
    <!-- Filled by JS -->
  </div>
</div>
```

### Step 5: Add Comps JavaScript

**File:** `public/index.html`  
**Location:** Inside `<script>` section, add:

```javascript
// ===== Comparable Sales =====

let currentCompsData = null;

async function loadComps(bbl) {
  const section = document.getElementById('comps-section');
  const content = document.getElementById('comps-content');
  
  if (!section || !content) return;
  
  section.style.display = 'block';
  content.innerHTML = '<div class="comps-loading">Loading comparables...</div>';
  
  try {
    const response = await fetch(`/api/properties/${bbl}/comps?radius=0.25&limit=5`);
    const data = await response.json();
    
    if (data.error && !data.comps) {
      throw new Error(data.error);
    }
    
    currentCompsData = data;
    renderComps(data);
    
  } catch (error) {
    console.error('Comps error:', error);
    content.innerHTML = `<div class="comps-empty">Unable to load comparables</div>`;
  }
}

function renderComps(data) {
  const content = document.getElementById('comps-content');
  if (!content) return;
  
  const { subject, comps, marketStats } = data;
  
  if (!comps || comps.length === 0) {
    content.innerHTML = '<div class="comps-empty">No comparable sales found nearby</div>';
    return;
  }
  
  // Market context box
  let marketHtml = '';
  if (marketStats) {
    // Calculate subject vs market
    let vsMarketHtml = '';
    if (subject.pricePerSF && marketStats.avgPricePerSF) {
      const diff = subject.pricePerSF - marketStats.avgPricePerSF;
      const pctDiff = Math.round((diff / marketStats.avgPricePerSF) * 100);
      const diffClass = pctDiff > 5 ? 'above' : pctDiff < -5 ? 'below' : 'neutral';
      const diffSign = pctDiff > 0 ? '+' : '';
      
      vsMarketHtml = `
        <div class="subject-vs-market">
          <div class="subject-vs-market-item">
            <div class="subject-vs-market-label">Subject $/SF</div>
            <div class="subject-vs-market-value neutral">$${subject.pricePerSF.toLocaleString()}</div>
          </div>
          <div class="subject-vs-market-item">
            <div class="subject-vs-market-label">Market Avg</div>
            <div class="subject-vs-market-value neutral">$${marketStats.avgPricePerSF.toLocaleString()}</div>
          </div>
          <div class="subject-vs-market-item">
            <div class="subject-vs-market-label">Difference</div>
            <div class="subject-vs-market-value ${diffClass}">${diffSign}${pctDiff}%</div>
          </div>
        </div>
      `;
    }
    
    marketHtml = `
      <div class="comps-market-context">
        <div class="comps-market-stat">
          <span class="comps-market-label">Avg $/SF (${marketStats.saleCount} sales)</span>
          <span class="comps-market-value">$${marketStats.avgPricePerSF.toLocaleString()}</span>
        </div>
        <div class="comps-market-stat">
          <span class="comps-market-label">Median $/SF</span>
          <span class="comps-market-value">$${marketStats.medianPricePerSF.toLocaleString()}</span>
        </div>
        <div class="comps-market-stat">
          <span class="comps-market-label">$/SF Range</span>
          <span class="comps-market-value">$${marketStats.minPricePerSF.toLocaleString()} - $${marketStats.maxPricePerSF.toLocaleString()}</span>
        </div>
        ${vsMarketHtml}
      </div>
    `;
  }
  
  // Comps table
  const tableRows = comps.map(comp => {
    const saleDate = comp.lastSaleDate 
      ? new Date(comp.lastSaleDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '-';
    const price = comp.lastSalePrice 
      ? '$' + (comp.lastSalePrice / 1000000).toFixed(2) + 'M'
      : '-';
    const ppsf = comp.pricePerSF 
      ? '$' + comp.pricePerSF.toLocaleString()
      : '-';
    
    return `
      <tr onclick="selectProperty('${comp.bbl}')" style="cursor: pointer;">
        <td class="address" title="${comp.address}">${comp.address || comp.bbl}</td>
        <td class="distance">${comp.distance}mi</td>
        <td>${(comp.bldgarea || 0).toLocaleString()}</td>
        <td class="price">${price}</td>
        <td>${ppsf}</td>
        <td>${saleDate}</td>
      </tr>
    `;
  }).join('');
  
  const tableHtml = `
    <table class="comps-table">
      <thead>
        <tr>
          <th>Address</th>
          <th>Dist</th>
          <th>SF</th>
          <th>Price</th>
          <th>$/SF</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
  
  content.innerHTML = marketHtml + tableHtml;
}

function refreshComps() {
  // Get current property BBL from your state
  const currentBbl = state?.selectedProperty?.bbl || state?.currentBbl;
  if (currentBbl) {
    loadComps(currentBbl);
  }
}
```

### Step 6: Integrate with Property Detail Load

**File:** `public/index.html`  
**Location:** Find your existing property detail loading function (might be called `showPropertyDetail`, `selectProperty`, `loadPropertyDetail`, etc.)

Add a call to `loadComps` at the end of that function:

```javascript
// Example integration - adapt to your actual function name
async function showPropertyDetail(bbl) {
  // ... your existing code to load and display property ...
  
  // Add this at the end:
  loadComps(bbl);
}
```

Or if you have a different pattern, just ensure `loadComps(bbl)` is called whenever a property detail view is opened.

---

## Validation Checklist

### Backend
- [ ] Server starts without errors
- [ ] `/api/properties/:bbl/comps` returns subject, comps, marketStats
- [ ] Distance calculation produces reasonable values (< 1 mile)
- [ ] Building class filtering works (O4 matches O5, O6, etc.)
- [ ] Size tolerance filters correctly (±30% by default)
- [ ] Empty comps returns gracefully with message

### Frontend
- [ ] Comps section appears in property detail
- [ ] Market context box shows avg/median $/SF
- [ ] Subject vs market comparison shows when subject has sale
- [ ] Comps table displays correctly
- [ ] Clicking comp row navigates to that property
- [ ] Refresh button reloads comps
- [ ] Loading state shows while fetching
- [ ] Empty state shows when no comps found
- [ ] No console errors

### Quick Test Flow
1. Open app, click a property that has sales history
2. Scroll down in detail panel
3. "Comparable Sales" section should appear
4. Market stats should show avg $/SF
5. Table should show 1-5 nearby sales
6. Click a comp → should navigate to that property
7. Try a property with no nearby sales → should show empty message

---

## Troubleshooting

### No comps returned
- Check that nearby properties exist in same building class
- Try increasing radius: `?radius=0.5`
- Verify properties have lat/lng coordinates
- Check that sales table has data for the area

### Distance values seem wrong
- Verify lat/lng are in correct format (decimal degrees)
- Check that coordinates are in NYC area (~40.7, -74.0)

### Market stats null
- Need at least 1 comp with price_per_sf
- Check that sales have gross_sf populated

### Subject pricePerSF missing
- Subject property needs at least one sale with price_per_sf calculated
- May need to recalculate in fetch script

### Clicking comp doesn't work
- Verify `selectProperty` function exists and handles BBL
- Check onclick is properly bound in table row

---

## Performance Notes

- Query limits to 50 nearby properties before filtering
- Consider adding database index if slow:
  ```sql
  CREATE INDEX idx_properties_geo ON properties(lat, lng);
  CREATE INDEX idx_properties_class_size ON properties(bldgclass, bldgarea);
  ```

---

## Files Modified

| File | Changes |
|------|---------|
| `server.js` | Added `/api/properties/:bbl/comps` endpoint with helper functions |
| `public/index.html` | Added comps CSS, HTML container, and JavaScript |

---

## Rollback

Remove the following:
- `/api/properties/:bbl/comps` route from server.js
- `calculateDistance`, `formatSubject`, `calculateMarketStats` functions
- Comps CSS section
- Comps HTML container
- Comps JavaScript functions

---

## Next Steps

After this PRP is complete:
- **PRP 1.3**: Supabase Auth + Persistent Portfolios
