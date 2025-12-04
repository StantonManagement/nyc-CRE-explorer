# PRP 0.4: Update Frontend for New API

**Phase:** 0 - Foundation  
**Estimated Time:** 30 minutes  
**Dependencies:** PRP 0.3 complete (server routes working)  
**Outputs:** Frontend uses new API features (FAR gap display, owner links, opportunities)

---

## Goal

Update `public/index.html` to:
- Display FAR gap and unused SF on property cards
- Add opportunity score indicator
- Link owner names to owner search
- Add "Opportunities" tab/view
- Handle new API response format

---

## Prerequisites

- PRP 0.3 complete (all API endpoints working)
- Server running with data

---

## Overview of Changes

This PRP focuses on **minimal changes** to integrate new data. Major UI overhaul comes in Phase 1.

| Change | Location | Impact |
|--------|----------|--------|
| Add FAR gap display | Property cards | Shows unused potential |
| Add opportunity badge | Property cards | Visual priority indicator |
| Owner name clickable | Detail panel | Links to owner search |
| New Opportunities view | Tab bar | Shows ranked properties |

---

## Step 1: Backup Frontend

```bash
cp public/index.html public/index.backup.html
```

---

## Step 2: Add FAR Gap to Property Cards

Find the property card template/render function in your `index.html`. Look for where properties are displayed in the list.

Add this to each property card (adjust based on your existing structure):

```html
<!-- Add inside property card, after existing info -->
<div class="property-metrics">
  <div class="metric ${property.far_gap > 2 ? 'metric-highlight' : ''}">
    <span class="metric-label">FAR Gap</span>
    <span class="metric-value">${property.far_gap?.toFixed(1) || 'N/A'}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Unused SF</span>
    <span class="metric-value">${property.unused_sf?.toLocaleString() || 'N/A'}</span>
  </div>
</div>
```

---

## Step 3: Add CSS for Metrics

Add to your `<style>` section:

```css
/* FAR Gap & Opportunity Metrics */
.property-metrics {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color, #333);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted, #888);
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.metric-highlight .metric-value {
  color: #22c55e;
}

/* Opportunity Badge */
.opportunity-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.opportunity-badge.high {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.opportunity-badge.very-high {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

/* Clickable owner */
.owner-link {
  color: var(--primary, #3b82f6);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
}

.owner-link:hover {
  text-decoration-style: solid;
}
```

---

## Step 4: Add Opportunity Badge Logic

In your JavaScript, add a helper function:

```javascript
function getOpportunityBadge(property) {
  const farGap = property.far_gap || 0;
  const age = new Date().getFullYear() - (property.yearbuilt || 2000);
  
  // Simple scoring
  let score = 0;
  score += Math.min(farGap * 10, 40);
  score += Math.min(age / 2, 30);
  
  if (score >= 50) {
    return '<span class="opportunity-badge very-high">HOT</span>';
  } else if (score >= 35) {
    return '<span class="opportunity-badge high">OPPORTUNITY</span>';
  } else if (farGap > 2) {
    return '<span class="opportunity-badge">UPSIDE</span>';
  }
  return '';
}
```

Use in your card render:
```javascript
// Inside property card HTML
${getOpportunityBadge(property)}
```

---

## Step 5: Make Owner Names Clickable

In your property detail panel, change owner display from:
```html
<span>${property.ownername}</span>
```

To:
```html
<span class="owner-link" onclick="searchOwner('${property.ownername}')">${property.ownername}</span>
```

Add the handler:
```javascript
async function searchOwner(name) {
  if (!name) return;
  
  // Show loading state
  showLoading('Searching owner portfolio...');
  
  try {
    const response = await fetch(`/api/owners/${encodeURIComponent(name)}`);
    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    // Display owner results (customize based on your UI)
    showOwnerResults(data);
    
  } catch (error) {
    console.error('Owner search failed:', error);
    showError('Could not load owner portfolio');
  }
}

function showOwnerResults(data) {
  // Example: show in a modal or side panel
  const owner = data.owners[0];
  if (!owner) {
    showError('No properties found for this owner');
    return;
  }
  
  const html = `
    <div class="owner-panel">
      <h3>${owner.name}</h3>
      <div class="owner-stats">
        <div class="stat">
          <span class="stat-value">${owner.properties.length}</span>
          <span class="stat-label">Properties</span>
        </div>
        <div class="stat">
          <span class="stat-value">$${(owner.totalAssessed / 1000000).toFixed(1)}M</span>
          <span class="stat-label">Total Assessed</span>
        </div>
        <div class="stat">
          <span class="stat-value">${owner.totalSF.toLocaleString()}</span>
          <span class="stat-label">Total SF</span>
        </div>
      </div>
      <div class="owner-properties">
        ${owner.properties.map(p => `
          <div class="mini-card" onclick="selectProperty('${p.bbl}')">
            <span class="address">${p.address}</span>
            <span class="class">${p.bldgclass}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // Show in your modal/panel system
  showModal('Owner Portfolio', html);
}
```

---

## Step 6: Add Opportunities Tab (Optional)

If you have a tab system, add an "Opportunities" tab:

```javascript
// Add to your tab data
const tabs = [
  { id: 'properties', label: 'Properties' },
  { id: 'sales', label: 'Recent Sales' },
  { id: 'opportunities', label: '🔥 Opportunities' }, // New
  { id: 'portfolio', label: 'My Portfolio' }
];

// Load opportunities
async function loadOpportunities() {
  const response = await fetch('/api/opportunities?limit=25');
  const data = await response.json();
  
  // Render with scores
  renderPropertyList(data.properties, {
    showScore: true
  });
}
```

---

## Step 7: Update API Calls

Make sure your fetch calls handle new response format:

```javascript
// Old (if using combined_data.json structure)
// const properties = data;

// New (API response has wrapper)
async function loadProperties(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/properties?${params}`);
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  // Properties are in data.properties, not data directly
  return data.properties;
}
```

---

## Step 8: Add FAR Gap Filter

Add to your filter UI:

```html
<div class="filter-group">
  <label for="far-filter">Min FAR Gap</label>
  <select id="far-filter" onchange="applyFilters()">
    <option value="">Any</option>
    <option value="1">1+ (Some upside)</option>
    <option value="2">2+ (Good upside)</option>
    <option value="4">4+ (Major opportunity)</option>
  </select>
</div>
```

Update filter logic:
```javascript
function applyFilters() {
  const filters = {
    bldgclass: document.getElementById('class-filter')?.value || '',
    minFarGap: document.getElementById('far-filter')?.value || '',
    // ... other filters
  };
  
  loadProperties(filters).then(renderPropertyList);
}
```

---

## Validation Checklist

- [ ] Property cards show FAR gap
- [ ] Property cards show unused SF
- [ ] High FAR gap values highlighted in green
- [ ] Opportunity badges appear on qualifying properties
- [ ] Owner names are clickable
- [ ] Owner click shows portfolio modal/panel
- [ ] FAR gap filter works
- [ ] No console errors
- [ ] Map still works
- [ ] Search still works

---

## Quick Test Flow

1. Open `http://localhost:3000`
2. Properties should load with FAR gap visible
3. Find a property with FAR gap > 2, verify green highlight
4. Click an owner name, verify portfolio loads
5. Use FAR gap filter, verify results change
6. Click "Opportunities" tab (if added), verify ranked list

---

## Troubleshooting

### FAR gap shows "undefined"
Check your render template uses `property.far_gap` not `property.farGap`.

### Owner search returns 404
Make sure owner name is URL encoded: `encodeURIComponent(name)`

### Styles not applying
Check CSS variable names match your existing theme.

### Properties not loading
Verify API returns `data.properties` array, not properties at root.

---

## Next Step

Proceed to **PRP 0.5: Fetch Full Midtown South Dataset**

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Added metrics display, owner links, opportunity badges |
| `public/index.backup.html` | Created (backup) |

---

## Rollback

```bash
mv public/index.backup.html public/index.html
```
