# PRP 1.1: Owner Intelligence Upgrade

**Phase:** Priority 1 - Quick Wins  
**Estimated Time:** 2-3 hours  
**Dependencies:** Phases 0-2 complete, violations data loaded  
**Outputs:** Enhanced owner API + full-page owner panel in UI

> **Architectural Note:** This PRP enhances the `/api/owners/:name` endpoint specifically. For general property data, use the unified `/api/data` endpoint defined in PRP-1.0. Owner-specific portfolio data remains a specialized endpoint due to its unique aggregation requirements.

---

## Goal

Transform owner lookup from a basic modal with property list into a full owner intelligence view with portfolio metrics, concentration analysis, and entity type detection.

**Current state:** Click owner → cramped modal showing property list  
**Target state:** Click owner → full panel/tab with portfolio health indicators, violation rollup, holding period analysis, and "view on map" functionality

---

## Prerequisites

- `server.js` has `/api/owners/:name` endpoint working
- Properties and violations loaded in Supabase
- At least 500+ properties for meaningful owner clustering

---

## Backend Changes

### Step 1: Enhance Owner Endpoint

**File:** `server.js`  
**Location:** Find existing `GET /api/owners/:name` route

Replace the endpoint with this enhanced version:

```javascript
/**
 * GET /api/owners/:name
 * Returns all properties for an owner with portfolio analytics
 */
app.get('/api/owners/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Get all properties matching owner name
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .ilike('ownername', `%${name}%`)
      .order('assesstot', { ascending: false });
    
    if (error) throw error;
    
    if (!properties || properties.length === 0) {
      return res.json({
        searchTerm: name,
        matchCount: 0,
        owners: []
      });
    }
    
    // Get violation counts for these BBLs
    const bbls = properties.map(p => p.bbl);
    const { data: violations } = await supabase
      .from('violations')
      .select('bbl, status')
      .in('bbl', bbls);
    
    // Count open violations by BBL
    const violationsByBbl = {};
    (violations || []).forEach(v => {
      if (!violationsByBbl[v.bbl]) violationsByBbl[v.bbl] = { open: 0, total: 0 };
      violationsByBbl[v.bbl].total++;
      if (v.status === 'OPEN' || v.status === 'Open') {
        violationsByBbl[v.bbl].open++;
      }
    });
    
    // Get last sale dates for holding period calculation
    const { data: sales } = await supabase
      .from('sales')
      .select('bbl, sale_date')
      .in('bbl', bbls)
      .order('sale_date', { ascending: false });
    
    // Get most recent sale per BBL
    const lastSaleByBbl = {};
    (sales || []).forEach(s => {
      if (!lastSaleByBbl[s.bbl]) {
        lastSaleByBbl[s.bbl] = s.sale_date;
      }
    });
    
    // Group by exact owner name and calculate metrics
    const byOwner = {};
    properties.forEach(p => {
      const owner = p.ownername || 'Unknown';
      if (!byOwner[owner]) {
        byOwner[owner] = {
          name: owner,
          entityType: detectEntityType(owner),
          properties: [],
          totalAssessed: 0,
          totalSF: 0,
          totalLotArea: 0,
          blocks: new Set(),
          holdingPeriods: [],
          totalOpenViolations: 0,
          totalViolations: 0
        };
      }
      
      const ownerData = byOwner[owner];
      ownerData.properties.push(p);
      ownerData.totalAssessed += p.assesstot || 0;
      ownerData.totalSF += p.bldgarea || 0;
      ownerData.totalLotArea += p.lotarea || 0;
      
      // Extract block from BBL (positions 1-6 for Manhattan)
      if (p.bbl && p.bbl.length >= 6) {
        ownerData.blocks.add(p.bbl.substring(1, 6));
      }
      
      // Holding period calculation
      const lastSale = lastSaleByBbl[p.bbl];
      if (lastSale) {
        const years = (new Date() - new Date(lastSale)) / (365.25 * 24 * 60 * 60 * 1000);
        ownerData.holdingPeriods.push(years);
      }
      
      // Violations
      const viol = violationsByBbl[p.bbl];
      if (viol) {
        ownerData.totalOpenViolations += viol.open;
        ownerData.totalViolations += viol.total;
      }
    });
    
    // Calculate derived metrics for each owner
    const owners = Object.values(byOwner).map(owner => {
      const blockArray = Array.from(owner.blocks);
      
      // Concentration score: 1 = all on same block, 0 = spread across many blocks
      const concentrationScore = owner.properties.length > 1 
        ? 1 - Math.min(blockArray.length / owner.properties.length, 1)
        : 0;
      
      // Average holding period
      const avgHoldingPeriod = owner.holdingPeriods.length > 0
        ? owner.holdingPeriods.reduce((a, b) => a + b, 0) / owner.holdingPeriods.length
        : null;
      
      return {
        name: owner.name,
        entityType: owner.entityType,
        propertyCount: owner.properties.length,
        properties: owner.properties,
        totalAssessed: owner.totalAssessed,
        totalSF: owner.totalSF,
        totalLotArea: owner.totalLotArea,
        avgHoldingPeriod: avgHoldingPeriod ? Math.round(avgHoldingPeriod * 10) / 10 : null,
        totalOpenViolations: owner.totalOpenViolations,
        totalViolations: owner.totalViolations,
        concentrationScore: Math.round(concentrationScore * 100) / 100,
        blocks: blockArray
      };
    });
    
    // Sort by total assessed value
    owners.sort((a, b) => b.totalAssessed - a.totalAssessed);
    
    res.json({
      searchTerm: name,
      matchCount: properties.length,
      owners
    });
    
  } catch (error) {
    console.error('Owner search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Detect entity type from owner name
 */
function detectEntityType(name) {
  if (!name) return 'Unknown';
  const upper = name.toUpperCase();
  
  if (upper.includes(' LLC') || upper.includes(' L.L.C')) return 'LLC';
  if (upper.includes(' LP') || upper.includes(' L.P')) return 'LP';
  if (upper.includes(' INC') || upper.includes(' CORP')) return 'Corporation';
  if (upper.includes(' TRUST') || upper.includes(' TRUSTEES')) return 'Trust';
  if (upper.includes(' PARTNERS') || upper.includes(' PARTNERSHIP')) return 'Partnership';
  if (upper.includes(' ASSOC') || upper.includes(' ASSOCIATION')) return 'Association';
  if (upper.includes('CITY OF') || upper.includes('STATE OF') || upper.includes('USA ')) return 'Government';
  if (upper.includes(' CO ') || upper.includes(' COMPANY')) return 'Company';
  
  // If no patterns match, likely individual
  // Check for common individual name patterns (LASTNAME FIRSTNAME or similar)
  const words = name.trim().split(/\s+/);
  if (words.length <= 3 && !upper.includes(',')) {
    return 'Individual';
  }
  
  return 'Unknown';
}
```

### Step 2: Validation - Backend

```bash
# Start server
node server.js

# Test enhanced owner endpoint
curl "http://localhost:3000/api/owners/LLC" | jq

# Expected response shape:
# {
#   "searchTerm": "LLC",
#   "matchCount": 150,
#   "owners": [{
#     "name": "ACME HOLDINGS LLC",
#     "entityType": "LLC",
#     "propertyCount": 3,
#     "totalAssessed": 45000000,
#     "totalSF": 125000,
#     "avgHoldingPeriod": 8.3,
#     "totalOpenViolations": 12,
#     "concentrationScore": 0.7,
#     "blocks": ["00801", "00802"],
#     "properties": [...]
#   }]
# }

# Test specific owner
curl "http://localhost:3000/api/owners/SL%20GREEN" | jq
```

---

## Frontend Changes

### Step 3: Add Owner Panel CSS

**File:** `public/index.html`  
**Location:** Inside `<style>` section, add at bottom

```css
/* ===== Owner Intelligence Panel ===== */
.owner-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 480px;
  height: 100vh;
  background: var(--bg-dark, #1a1a2e);
  border-left: 1px solid var(--border-color, #333);
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.owner-panel.open {
  transform: translateX(0);
}

.owner-panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #333);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.owner-panel-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  margin: 0 0 4px 0;
}

.owner-panel-subtitle {
  font-size: 12px;
  color: var(--text-muted, #888);
}

.owner-panel-close {
  background: none;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  padding: 0;
}

.owner-panel-close:hover {
  color: var(--text-primary, #fff);
}

.owner-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #333);
}

.owner-stat {
  text-align: center;
}

.owner-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary, #fff);
}

.owner-stat-value.warning {
  color: #f59e0b;
}

.owner-stat-value.danger {
  color: #ef4444;
}

.owner-stat-value.success {
  color: #22c55e;
}

.owner-stat-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted, #888);
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.owner-metrics {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #333);
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.owner-metric {
  flex: 1 1 45%;
  min-width: 140px;
}

.owner-metric-label {
  font-size: 11px;
  color: var(--text-muted, #888);
  margin-bottom: 4px;
}

.owner-metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.owner-metric-bar {
  height: 4px;
  background: var(--bg-light, #2a2a3e);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.owner-metric-bar-fill {
  height: 100%;
  background: var(--primary, #3b82f6);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.owner-actions {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color, #333);
  display: flex;
  gap: 8px;
}

.owner-action-btn {
  flex: 1;
  padding: 10px 16px;
  background: var(--bg-light, #2a2a3e);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  color: var(--text-primary, #fff);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.owner-action-btn:hover {
  background: var(--primary, #3b82f6);
  border-color: var(--primary, #3b82f6);
}

.owner-properties-header {
  padding: 12px 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted, #888);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.owner-properties-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.owner-property-card {
  background: var(--bg-light, #2a2a3e);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.owner-property-card:hover {
  background: var(--bg-hover, #3a3a4e);
}

.owner-property-address {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #fff);
  margin-bottom: 4px;
}

.owner-property-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted, #888);
}

.owner-property-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.owner-property-badge.violation {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.entity-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
}

.entity-badge.llc { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
.entity-badge.corporation { background: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
.entity-badge.trust { background: rgba(236, 72, 153, 0.2); color: #ec4899; }
.entity-badge.individual { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.entity-badge.government { background: rgba(234, 179, 8, 0.2); color: #eab308; }
```

### Step 4: Add Owner Panel HTML

**File:** `public/index.html`  
**Location:** Just before closing `</body>` tag, add:

```html
<!-- Owner Intelligence Panel -->
<div id="owner-panel" class="owner-panel">
  <div class="owner-panel-header">
    <div>
      <h3 class="owner-panel-title" id="owner-panel-name">Loading...</h3>
      <p class="owner-panel-subtitle" id="owner-panel-type"></p>
    </div>
    <button class="owner-panel-close" onclick="closeOwnerPanel()">×</button>
  </div>
  
  <div class="owner-stats-grid" id="owner-stats">
    <!-- Filled by JS -->
  </div>
  
  <div class="owner-metrics" id="owner-metrics">
    <!-- Filled by JS -->
  </div>
  
  <div class="owner-actions">
    <button class="owner-action-btn" onclick="showOwnerOnMap()">📍 View on Map</button>
    <button class="owner-action-btn" onclick="exportOwnerData()">📥 Export CSV</button>
  </div>
  
  <div class="owner-properties-header" id="owner-properties-header">
    Properties (0)
  </div>
  
  <div class="owner-properties-list" id="owner-properties-list">
    <!-- Filled by JS -->
  </div>
</div>
```

### Step 5: Add Owner Panel JavaScript

**File:** `public/index.html`  
**Location:** Inside `<script>` section, add these functions:

```javascript
// ===== Owner Intelligence Panel =====

let currentOwnerData = null;

async function openOwnerPanel(ownerName) {
  const panel = document.getElementById('owner-panel');
  panel.classList.add('open');
  
  // Show loading state
  document.getElementById('owner-panel-name').textContent = 'Loading...';
  document.getElementById('owner-panel-type').textContent = '';
  document.getElementById('owner-stats').innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Loading portfolio...</div>';
  document.getElementById('owner-metrics').innerHTML = '';
  document.getElementById('owner-properties-list').innerHTML = '';
  
  try {
    const response = await fetch(`/api/owners/${encodeURIComponent(ownerName)}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    if (!data.owners || data.owners.length === 0) {
      throw new Error('No properties found for this owner');
    }
    
    // Use first (largest) owner match
    const owner = data.owners[0];
    currentOwnerData = owner;
    
    renderOwnerPanel(owner);
    
  } catch (error) {
    console.error('Owner panel error:', error);
    document.getElementById('owner-panel-name').textContent = 'Error';
    document.getElementById('owner-stats').innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;">${error.message}</div>`;
  }
}

function closeOwnerPanel() {
  document.getElementById('owner-panel').classList.remove('open');
  currentOwnerData = null;
}

function renderOwnerPanel(owner) {
  // Header
  document.getElementById('owner-panel-name').innerHTML = owner.name + 
    `<span class="entity-badge ${owner.entityType.toLowerCase()}">${owner.entityType}</span>`;
  document.getElementById('owner-panel-type').textContent = 
    `${owner.propertyCount} properties in Midtown South`;
  
  // Stats grid
  const violationClass = owner.totalOpenViolations > 10 ? 'danger' : 
                         owner.totalOpenViolations > 5 ? 'warning' : '';
  
  document.getElementById('owner-stats').innerHTML = `
    <div class="owner-stat">
      <div class="owner-stat-value">${owner.propertyCount}</div>
      <div class="owner-stat-label">Properties</div>
    </div>
    <div class="owner-stat">
      <div class="owner-stat-value">$${formatMillions(owner.totalAssessed)}</div>
      <div class="owner-stat-label">Assessed Value</div>
    </div>
    <div class="owner-stat">
      <div class="owner-stat-value ${violationClass}">${owner.totalOpenViolations}</div>
      <div class="owner-stat-label">Open Violations</div>
    </div>
  `;
  
  // Metrics
  const holdingPeriodText = owner.avgHoldingPeriod 
    ? `${owner.avgHoldingPeriod} years` 
    : 'Unknown';
  
  const concentrationPct = Math.round(owner.concentrationScore * 100);
  
  document.getElementById('owner-metrics').innerHTML = `
    <div class="owner-metric">
      <div class="owner-metric-label">Total Building SF</div>
      <div class="owner-metric-value">${owner.totalSF.toLocaleString()} SF</div>
    </div>
    <div class="owner-metric">
      <div class="owner-metric-label">Avg Holding Period</div>
      <div class="owner-metric-value">${holdingPeriodText}</div>
    </div>
    <div class="owner-metric">
      <div class="owner-metric-label">Geographic Concentration</div>
      <div class="owner-metric-value">${concentrationPct}%</div>
      <div class="owner-metric-bar">
        <div class="owner-metric-bar-fill" style="width: ${concentrationPct}%"></div>
      </div>
    </div>
    <div class="owner-metric">
      <div class="owner-metric-label">Unique Blocks</div>
      <div class="owner-metric-value">${owner.blocks.length} blocks</div>
    </div>
  `;
  
  // Properties list
  document.getElementById('owner-properties-header').textContent = 
    `Properties (${owner.properties.length})`;
  
  const propertiesHtml = owner.properties.map(p => {
    const violBadge = (p.openViolations || 0) > 0 
      ? `<span class="owner-property-badge violation">${p.openViolations} violations</span>` 
      : '';
    
    return `
      <div class="owner-property-card" onclick="selectPropertyFromOwner('${p.bbl}')">
        <div class="owner-property-address">${p.address || p.bbl}</div>
        <div class="owner-property-meta">
          <span>${p.bldgclass || '?'}</span>
          <span>${(p.bldgarea || 0).toLocaleString()} SF</span>
          <span>$${formatMillions(p.assesstot)}</span>
          ${violBadge}
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('owner-properties-list').innerHTML = propertiesHtml;
}

function formatMillions(value) {
  if (!value) return '0';
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + 'K';
  }
  return value.toString();
}

function selectPropertyFromOwner(bbl) {
  closeOwnerPanel();
  // Trigger your existing property selection logic
  if (typeof selectProperty === 'function') {
    selectProperty(bbl);
  } else if (typeof showPropertyDetail === 'function') {
    showPropertyDetail(bbl);
  }
}

function showOwnerOnMap() {
  if (!currentOwnerData || !currentOwnerData.properties) return;
  
  closeOwnerPanel();
  
  // Highlight owner's properties on map
  const bbls = currentOwnerData.properties.map(p => p.bbl);
  highlightPropertiesOnMap(bbls);
  
  // Fit map to owner's properties
  const coords = currentOwnerData.properties
    .filter(p => p.lat && p.lng)
    .map(p => [p.lng, p.lat]);
  
  if (coords.length > 0 && typeof map !== 'undefined') {
    const bounds = coords.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coords[0], coords[0]));
    
    map.fitBounds(bounds, { padding: 50 });
  }
}

function highlightPropertiesOnMap(bbls) {
  // Implementation depends on your map setup
  // This is a placeholder - adapt to your marker/layer system
  if (typeof state !== 'undefined' && state.markers) {
    state.markers.forEach(marker => {
      const el = marker.getElement();
      if (bbls.includes(marker.bbl)) {
        el.style.outline = '3px solid #3b82f6';
        el.style.outlineOffset = '2px';
      } else {
        el.style.outline = 'none';
      }
    });
  }
}

function exportOwnerData() {
  if (!currentOwnerData) return;
  
  const owner = currentOwnerData;
  const rows = [
    ['BBL', 'Address', 'Class', 'Building SF', 'Lot SF', 'Assessed Value', 'Year Built', 'FAR Gap']
  ];
  
  owner.properties.forEach(p => {
    rows.push([
      p.bbl,
      p.address || '',
      p.bldgclass || '',
      p.bldgarea || '',
      p.lotarea || '',
      p.assesstot || '',
      p.yearbuilt || '',
      p.far_gap || ''
    ]);
  });
  
  const csv = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${owner.name.replace(/[^a-z0-9]/gi, '_')}_portfolio.csv`;
  a.click();
  
  URL.revokeObjectURL(url);
}
```

### Step 6: Update Owner Link in Property Cards

**File:** `public/index.html`  
**Location:** Find where owner name is displayed (likely in property detail or card)

Change from:
```html
<span class="owner-link" onclick="searchOwner('${property.ownername}')">${property.ownername}</span>
```

To:
```html
<span class="owner-link" onclick="openOwnerPanel('${property.ownername}')">${property.ownername}</span>
```

Or if it's in a template literal, update the function name accordingly.

---

## Validation Checklist

### Backend
- [ ] Server starts without errors
- [ ] `/api/owners/LLC` returns enhanced response with entityType, avgHoldingPeriod, etc.
- [ ] `/api/owners/[specific owner]` returns correct property count
- [ ] concentrationScore is between 0 and 1
- [ ] totalOpenViolations counts correctly

### Frontend
- [ ] Clicking owner name opens slide-in panel (not modal)
- [ ] Panel shows owner name with entity type badge
- [ ] Stats grid shows property count, assessed value, violations
- [ ] Metrics show SF, holding period, concentration
- [ ] Property list scrolls independently
- [ ] Clicking property in list opens property detail
- [ ] "View on Map" highlights owner's properties
- [ ] "Export CSV" downloads valid CSV file
- [ ] Panel closes with × button
- [ ] No console errors

### Quick Test Flow
1. Load app
2. Click any property
3. In detail view, click owner name
4. Panel slides in from right
5. Verify stats look reasonable
6. Click "View on Map" → map should zoom to show properties
7. Click a property in list → detail view updates
8. Click × → panel closes

---

## Troubleshooting

### Panel doesn't open
- Check console for JS errors
- Verify `openOwnerPanel` function exists
- Check that onclick is properly bound

### Stats show null or undefined
- Verify backend returns all fields
- Check `formatMillions` function handles nulls

### Violations always 0
- Verify violations table has data: `select count(*) from violations`
- Check status field values match ('OPEN' vs 'Open')

### Map highlighting doesn't work
- Adapt `highlightPropertiesOnMap` to your marker implementation
- Check that markers have `bbl` property set

### CSV export fails
- Check browser console for errors
- Verify `currentOwnerData` is populated

---

## Files Modified

| File | Changes |
|------|---------|
| `server.js` | Enhanced `/api/owners/:name` endpoint with portfolio analytics |
| `public/index.html` | Added owner panel CSS, HTML, and JavaScript |

---

## Rollback

```bash
# If you backed up before starting
cp server.backup.js server.js
cp public/index.backup.html public/index.html
```

Or selectively remove:
- The enhanced `/api/owners/:name` route (revert to old version)
- Owner panel HTML element
- Owner panel CSS
- Owner panel JavaScript functions

---

## Next Steps

After this PRP is complete:
- **PRP 1.2**: Comparable Sales Context (add comps to property detail)
- **PRP 1.3**: Supabase Auth + Persistent Portfolios
