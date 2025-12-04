# PRP 1.0: Unified Data Endpoint (Server Does Everything)

**Phase:** 1 - Architecture Fix  
**Estimated Time:** 2-3 hours  
**Dependencies:** Current app functional  
**Outputs:** Single `/api/data` endpoint, simplified frontend, zero client-side filtering

---

## Problem Statement

Every filter addition requires changes in 6+ places:
1. HTML button markup
2. JS state handling
3. API call construction  
4. Server query logic
5. Client-side filtering (sales list)
6. Rendering logic

This creates constant breakage. The fix is architectural: **server returns exactly what to display, frontend only renders.**

---

## Goal

After this PRP:
- ONE endpoint (`/api/data`) returns all display data
- ONE place to define filter logic (server-side `FILTER_CONFIG`)
- Frontend calls endpoint, renders result, nothing else
- Adding a filter = add to `FILTER_CONFIG` + add HTML button

---

## Architecture Overview

### Before (Current)
```
Frontend                          Backend
────────                          ───────
state.filters ─────────────────►  /api/properties (partial filter)
     │                            /api/sales (no filter)
     │                            /api/stats (separate call)
     ▼
client-side filtering ◄───────── raw data
     │
     ▼
render (map, list, sales)
```

### After (Target)
```
Frontend                          Backend
────────                          ───────
state.filters ─────────────────►  /api/data
                                      │
                                      ▼
                                  FILTER_CONFIG
                                      │
                                      ▼
render(data) ◄─────────────────  { properties, sales, stats }
```

---

## Step 1: Define Filter Configuration (Server)

Create the single source of truth for all filters.

### 1.1 Add to top of `server.js`:

```javascript
// =============================================
// FILTER CONFIGURATION (Single Source of Truth)
// =============================================

const FILTER_CONFIG = {
  // Building Class Filters
  bldgclass: {
    office: {
      prefixes: ['O'],
      label: 'Office',
      description: 'Office buildings (O1-O9)'
    },
    retail: {
      prefixes: ['K'],
      label: 'Retail', 
      description: 'Store buildings (K1-K9)'
    },
    multifam: {
      prefixes: ['C', 'D', 'S', 'R'],
      label: 'Multifamily',
      description: 'Walk-ups, Elevator Apts, Mixed-Use, Condos'
    },
    industrial: {
      prefixes: ['E', 'F', 'G', 'L'],
      label: 'Industrial',
      description: 'Warehouses, Factories, Garages, Lofts'
    }
  },
  
  // Numeric Range Filters
  ranges: {
    minFarGap: { column: 'far_gap', operator: 'gte' },
    maxFarGap: { column: 'far_gap', operator: 'lte' },
    minYear: { column: 'yearbuilt', operator: 'gte' },
    maxYear: { column: 'yearbuilt', operator: 'lte' },
    minAssessed: { column: 'assesstot', operator: 'gte' },
    maxAssessed: { column: 'assesstot', operator: 'lte' }
  },
  
  // Text Search Filters
  search: {
    owner: { column: 'ownername', mode: 'ilike' },
    address: { column: 'address', mode: 'ilike' },
    zipcode: { column: 'zipcode', mode: 'eq' }
  },
  
  // Sort Options
  sort: {
    options: ['far_gap', 'assesstot', 'yearbuilt', 'bldgarea', 'lotarea', 'opportunityScore'],
    default: 'far_gap',
    defaultOrder: 'desc'
  }
};

// Helper: Check if property matches building class filter
function matchesBldgClass(bldgclass, filterValue) {
  if (!filterValue || filterValue === 'all') return true;
  const config = FILTER_CONFIG.bldgclass[filterValue];
  if (!config) return true;
  const prefix = (bldgclass || '').charAt(0).toUpperCase();
  return config.prefixes.includes(prefix);
}

// Helper: Build Supabase query for building class
function applyBldgClassFilter(query, filterValue) {
  if (!filterValue || filterValue === 'all') return query;
  const config = FILTER_CONFIG.bldgclass[filterValue];
  if (!config) return query;
  
  const conditions = config.prefixes.map(p => `bldgclass.ilike.${p}%`).join(',');
  return query.or(conditions);
}
```

---

## Step 2: Create Unified Data Endpoint

### 2.1 Add new endpoint to `server.js`:

```javascript
/**
 * GET /api/data
 * 
 * THE unified endpoint. Returns everything the frontend needs to render.
 * Frontend should NEVER filter data - just render what this returns.
 * 
 * Query params:
 *   bldgclass    - Semantic filter: office|retail|multifam|industrial|all
 *   minFarGap    - Minimum FAR gap
 *   maxFarGap    - Maximum FAR gap  
 *   minYear      - Minimum year built
 *   maxYear      - Maximum year built
 *   owner        - Owner name search (partial)
 *   address      - Address search (partial)
 *   zipcode      - Exact zipcode match
 *   distress     - true = only distressed properties
 *   sort         - Sort field
 *   order        - asc|desc
 *   limit        - Max properties (default 500)
 *   salesDays    - Sales from last N days (default 365)
 *   salesLimit   - Max sales (default 100)
 */
app.get('/api/data', async (req, res) => {
  try {
    const {
      bldgclass = 'all',
      minFarGap,
      maxFarGap,
      minYear,
      maxYear,
      owner,
      address,
      zipcode,
      distress,
      sort = FILTER_CONFIG.sort.default,
      order = FILTER_CONFIG.sort.defaultOrder,
      limit = 500,
      salesDays = 365,
      salesLimit = 100
    } = req.query;
    
    // ─────────────────────────────────────────
    // 1. QUERY PROPERTIES
    // ─────────────────────────────────────────
    let propQuery = supabase
      .from('properties')
      .select('*');
    
    // Building class filter
    propQuery = applyBldgClassFilter(propQuery, bldgclass);
    
    // Range filters
    if (minFarGap) propQuery = propQuery.gte('far_gap', parseFloat(minFarGap));
    if (maxFarGap) propQuery = propQuery.lte('far_gap', parseFloat(maxFarGap));
    if (minYear) propQuery = propQuery.gte('yearbuilt', parseInt(minYear));
    if (maxYear) propQuery = propQuery.lte('yearbuilt', parseInt(maxYear));
    
    // Text search filters
    if (owner) propQuery = propQuery.ilike('ownername', `%${owner}%`);
    if (address) propQuery = propQuery.ilike('address', `%${address}%`);
    if (zipcode) propQuery = propQuery.eq('zipcode', zipcode);
    
    // Distress filter (has open violations)
    // Note: This requires a subquery or join - simplified version below
    // Full implementation would use the violations table
    
    // Sorting
    const sortField = FILTER_CONFIG.sort.options.includes(sort) ? sort : FILTER_CONFIG.sort.default;
    const ascending = order === 'asc';
    propQuery = propQuery.order(sortField, { ascending, nullsFirst: false });
    
    // Limit
    propQuery = propQuery.limit(parseInt(limit));
    
    const { data: properties, error: propError } = await propQuery;
    if (propError) throw propError;
    
    // ─────────────────────────────────────────
    // 2. QUERY SALES (matching same filters)
    // ─────────────────────────────────────────
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(salesDays));
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    let salesQuery = supabase
      .from('sales')
      .select(`
        *,
        properties!inner (
          address,
          bldgclass,
          ownername,
          zonedist1,
          far_gap
        )
      `)
      .gte('sale_date', cutoffStr)
      .order('sale_date', { ascending: false })
      .limit(parseInt(salesLimit));
    
    const { data: rawSales, error: salesError } = await salesQuery;
    if (salesError) throw salesError;
    
    // Filter sales by building class (applied to joined property)
    const sales = rawSales.filter(s => 
      matchesBldgClass(s.properties?.bldgclass, bldgclass)
    );
    
    // ─────────────────────────────────────────
    // 3. COMPUTE STATS
    // ─────────────────────────────────────────
    const stats = {
      propertyCount: properties.length,
      salesCount: sales.length,
      
      // By building class (of filtered results)
      byClass: properties.reduce((acc, p) => {
        const prefix = (p.bldgclass || 'X').charAt(0);
        acc[prefix] = (acc[prefix] || 0) + 1;
        return acc;
      }, {}),
      
      // Totals
      totalAssessed: properties.reduce((sum, p) => sum + (p.assesstot || 0), 0),
      totalSF: properties.reduce((sum, p) => sum + (p.bldgarea || 0), 0),
      
      // Opportunity metrics
      highFarGapCount: properties.filter(p => p.far_gap > 2).length,
      avgFarGap: properties.length > 0 
        ? properties.reduce((sum, p) => sum + (p.far_gap || 0), 0) / properties.length 
        : 0,
      
      // Sales metrics
      avgSalePrice: sales.length > 0
        ? sales.reduce((sum, s) => sum + (s.sale_price || 0), 0) / sales.length
        : 0,
      avgPricePerSF: sales.filter(s => s.price_per_sf).length > 0
        ? sales.filter(s => s.price_per_sf).reduce((sum, s) => sum + s.price_per_sf, 0) / sales.filter(s => s.price_per_sf).length
        : 0,
      
      // Active filters (echo back for UI state sync)
      activeFilters: {
        bldgclass,
        minFarGap: minFarGap || null,
        maxFarGap: maxFarGap || null,
        minYear: minYear || null,
        maxYear: maxYear || null,
        owner: owner || null,
        address: address || null,
        zipcode: zipcode || null,
        sort: sortField,
        order
      }
    };
    
    // ─────────────────────────────────────────
    // 4. RETURN UNIFIED RESPONSE
    // ─────────────────────────────────────────
    res.json({
      properties,
      sales,
      stats,
      meta: {
        timestamp: new Date().toISOString(),
        filterConfig: FILTER_CONFIG.bldgclass // Send filter options for UI
      }
    });
    
  } catch (error) {
    console.error('Data endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 3: Simplify Frontend

### 3.1 Replace filter-related JS with this pattern:

```javascript
// =============================================
// STATE (Simplified)
// =============================================
const state = {
  filters: {
    bldgclass: 'all',
    minFarGap: null,
    sort: 'far_gap',
    order: 'desc'
    // Add more as needed - they're just passed through
  },
  data: {
    properties: [],
    sales: [],
    stats: {}
  }
};

// =============================================
// DATA FETCHING (One function)
// =============================================
async function fetchData() {
  showLoading(true);
  
  try {
    // Build query string from state.filters
    const params = new URLSearchParams();
    Object.entries(state.filters).forEach(([key, value]) => {
      if (value !== null && value !== '' && value !== 'all') {
        params.append(key, value);
      }
    });
    
    // Special case: always send bldgclass even if 'all'
    if (!params.has('bldgclass')) {
      params.append('bldgclass', state.filters.bldgclass || 'all');
    }
    
    const response = await fetch(`/api/data?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    // Store the data
    state.data = data;
    
    // Render everything
    renderAll();
    
  } catch (error) {
    console.error('Fetch error:', error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// =============================================
// RENDERING (Just displays state.data)
// =============================================
function renderAll() {
  renderMap(state.data.properties);
  renderPropertyList(state.data.properties);
  renderSalesList(state.data.sales);
  renderStats(state.data.stats);
  updateFilterUI(state.data.stats.activeFilters);
}

function renderMap(properties) {
  // Clear existing markers
  clearMarkers();
  
  // Add markers for each property
  properties.forEach(p => {
    if (p.lat && p.lng) {
      addMarker(p);
    }
  });
  
  // Fit bounds if properties exist
  if (properties.length > 0) {
    fitMapToMarkers();
  }
}

function renderPropertyList(properties) {
  const container = document.getElementById('property-list');
  
  if (properties.length === 0) {
    container.innerHTML = '<div class="empty-state">No properties match your filters</div>';
    return;
  }
  
  container.innerHTML = properties.map(p => `
    <div class="property-card" data-bbl="${p.bbl}" onclick="selectProperty('${p.bbl}')">
      <div class="property-address">${p.address || 'No address'}</div>
      <div class="property-class">${p.bldgclass || '?'}</div>
      <div class="property-metrics">
        <span class="metric">FAR Gap: ${p.far_gap?.toFixed(1) || 'N/A'}</span>
        <span class="metric">SF: ${p.bldgarea?.toLocaleString() || 'N/A'}</span>
      </div>
    </div>
  `).join('');
}

function renderSalesList(sales) {
  const container = document.getElementById('sales-list');
  
  if (sales.length === 0) {
    container.innerHTML = '<div class="empty-state">No recent sales match your filters</div>';
    return;
  }
  
  container.innerHTML = sales.map(s => `
    <div class="sale-card" onclick="selectProperty('${s.bbl}')">
      <div class="sale-address">${s.properties?.address || s.bbl}</div>
      <div class="sale-price">$${(s.sale_price / 1000000).toFixed(1)}M</div>
      <div class="sale-date">${s.sale_date}</div>
      <div class="sale-psf">${s.price_per_sf ? `$${s.price_per_sf}/SF` : ''}</div>
    </div>
  `).join('');
}

function renderStats(stats) {
  document.getElementById('stat-properties').textContent = stats.propertyCount.toLocaleString();
  document.getElementById('stat-sales').textContent = stats.salesCount.toLocaleString();
  document.getElementById('stat-assessed').textContent = `$${(stats.totalAssessed / 1000000000).toFixed(1)}B`;
  document.getElementById('stat-opportunities').textContent = stats.highFarGapCount;
}

// =============================================
// FILTER HANDLERS (Just update state + refetch)
// =============================================
function setFilter(key, value) {
  state.filters[key] = value;
  fetchData();
}

function clearFilters() {
  state.filters = {
    bldgclass: 'all',
    minFarGap: null,
    sort: 'far_gap',
    order: 'desc'
  };
  fetchData();
}

// =============================================
// EVENT BINDING
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  // Building class buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.filter;
      setFilter('bldgclass', value);
      
      // Update active state
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // FAR gap filter
  document.getElementById('far-filter')?.addEventListener('change', (e) => {
    setFilter('minFarGap', e.target.value || null);
  });
  
  // Sort dropdown
  document.getElementById('sort-select')?.addEventListener('change', (e) => {
    setFilter('sort', e.target.value);
  });
  
  // Initial load
  fetchData();
});
```

### 3.2 Update HTML filter buttons:

```html
<div class="filter-bar">
  <button data-filter="all" class="filter-btn active">All</button>
  <button data-filter="office" class="filter-btn">Office</button>
  <button data-filter="retail" class="filter-btn">Retail</button>
  <button data-filter="multifam" class="filter-btn">Multifam</button>
  <button data-filter="industrial" class="filter-btn">Industrial</button>
</div>

<div class="filter-controls">
  <select id="far-filter">
    <option value="">Any FAR Gap</option>
    <option value="1">1+ (Some upside)</option>
    <option value="2">2+ (Good upside)</option>
    <option value="4">4+ (Major)</option>
  </select>
  
  <select id="sort-select">
    <option value="far_gap">Sort: FAR Gap</option>
    <option value="assesstot">Sort: Assessed Value</option>
    <option value="yearbuilt">Sort: Year Built</option>
    <option value="bldgarea">Sort: Building SF</option>
  </select>
</div>
```

---

## Step 4: Remove Old Code

### 4.1 Delete from `server.js`:
- Individual filter logic scattered in `/api/properties`
- Keep the endpoint but redirect to `/api/data`? Or deprecate entirely.

### 4.2 Delete from `index.html`:
- `matchesFilters()` function
- Any `filter()` calls on sales/properties arrays
- Client-side building class mappings
- Multiple fetch calls on filter change

---

## Step 5: Validation

### 5.1 API Tests
```bash
# All data
curl "http://localhost:3000/api/data"

# Office only
curl "http://localhost:3000/api/data?bldgclass=office"

# Multifamily with FAR gap
curl "http://localhost:3000/api/data?bldgclass=multifam&minFarGap=2"

# Verify response structure
curl "http://localhost:3000/api/data" | jq 'keys'
# Should return: ["meta", "properties", "sales", "stats"]
```

### 5.2 UI Tests
| Action | Expected Result |
|--------|-----------------|
| Page load | All properties shown, stats populated |
| Click "Office" | Only O-class properties, sales filtered to match |
| Click "Multifam" | C, D, S, R classes shown |
| Set FAR Gap > 2 | Both list and sales filtered |
| Change sort | List reorders, map unchanged |
| Click "All" | Everything shown again |

### 5.3 Console Tests
```javascript
// In browser console
state.data.properties.length  // Should match stat-properties display
state.data.sales.length       // Should match stat-sales display
state.data.stats.activeFilters // Should reflect current UI state
```

---

## Step 6: Adding New Filters (Future)

With this architecture, adding a filter is simple:

### Example: Add "Year Built" Range Filter

**1. Server (`FILTER_CONFIG` already has it):**
```javascript
// Already defined in ranges config
minYear: { column: 'yearbuilt', operator: 'gte' },
maxYear: { column: 'yearbuilt', operator: 'lte' }
```

**2. Frontend HTML:**
```html
<input type="number" id="min-year" placeholder="Min Year">
<input type="number" id="max-year" placeholder="Max Year">
```

**3. Frontend JS (event binding only):**
```javascript
document.getElementById('min-year')?.addEventListener('change', (e) => {
  setFilter('minYear', e.target.value || null);
});
```

**That's it.** No query building, no client filtering, no mapping logic.

---

## Rollback Plan

If something breaks:
```bash
# Restore server
git checkout server.js

# Restore frontend
git checkout public/index.html
```

Or if not using git:
```bash
cp server.backup.js server.js
cp public/index.backup.html public/index.html
```

---

## Files Modified

| File | Changes |
|------|---------|
| `server.js` | Add `FILTER_CONFIG`, add `/api/data` endpoint |
| `public/index.html` | Replace filter logic with `fetchData()` pattern |

---

## Success Criteria

- [ ] `/api/data` returns `{ properties, sales, stats, meta }`
- [ ] Clicking filter buttons updates all three lists
- [ ] Sales list respects building class filter
- [ ] Stats update to reflect filtered data
- [ ] Zero `filter()` calls on client-side for display data
- [ ] Adding a new filter only requires ~5 lines of code

---

## Migration Notes

### Keeping Old Endpoints
You can keep `/api/properties`, `/api/sales`, `/api/stats` for backward compatibility or other uses (like the comps feature). They don't conflict with `/api/data`.

### Performance
The unified endpoint does 2 queries (properties + sales) instead of 3 separate requests. Net improvement for typical usage.

### Pagination
Current implementation uses `limit`. For true pagination, add `offset` and return `{ properties, total, page, pageSize }`.
