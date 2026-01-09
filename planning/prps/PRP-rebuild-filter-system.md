# PRP: Rebuild Filtering System

## Scope
Rebuild ONLY the filter → fetch → render pipeline. Keep everything else.

## Keep (Do Not Touch)
- `server.js` - API endpoints work fine
- Map rendering - markers display correctly
- Database/Supabase connection
- CSS styling
- HTML structure (mostly)

## Rebuild From Scratch
- Filter state management
- Filter UI event handlers
- Data fetching function
- Property list rendering
- Stats display

---

## Architecture

### Single Source of Truth
```javascript
const App = {
  // State
  properties: [],
  sales: [],
  filters: {
    bldgclass: 'all',
    minFarGap: null,
    minDistress: null
  },
  
  // Methods
  async fetchData() { },
  renderList() { },
  renderMap() { },
  updateStats() { },
  
  // Init
  init() { }
};
```

### Data Flow
```
User clicks filter
    ↓
App.filters.bldgclass = 'office'
    ↓
App.fetchData()
    ↓
fetch('/api/data?' + params)
    ↓
App.properties = response.properties
    ↓
App.renderList()
App.renderMap()
App.updateStats()
```

---

## Implementation

### Step 1: Create App Object (top of script section)

Replace all existing filter/state code with:

```javascript
const App = {
  properties: [],
  sales: [],
  stats: {},
  
  filters: {
    bldgclass: 'all',
    minFarGap: '',
    minDistress: ''
  },
  
  // Pagination
  page: 1,
  pageSize: 50,
  
  // Map reference (keep existing)
  map: null,
  markers: []
};
```

### Step 2: Fetch Function

```javascript
App.fetchData = async function() {
  // Build query string from filters
  const params = new URLSearchParams();
  
  if (this.filters.bldgclass && this.filters.bldgclass !== 'all') {
    params.append('bldgclass', this.filters.bldgclass);
  }
  if (this.filters.minFarGap) {
    params.append('minFarGap', this.filters.minFarGap);
  }
  if (this.filters.minDistress) {
    params.append('minDistress', this.filters.minDistress);
  }
  
  params.append('limit', '500');
  params.append('sort', 'far_gap');
  params.append('order', 'desc');
  
  console.log('Fetching:', '/api/data?' + params.toString());
  
  try {
    const response = await fetch('/api/data?' + params.toString());
    const data = await response.json();
    
    console.log('Received:', data.properties?.length, 'properties');
    
    this.properties = data.properties || [];
    this.sales = data.sales || [];
    this.stats = data.stats || {};
    this.page = 1; // Reset to first page
    
    this.renderList();
    this.renderMap();
    this.updateStats();
    
  } catch (err) {
    console.error('Fetch error:', err);
  }
};
```

### Step 3: List Rendering

```javascript
App.renderList = function() {
  const container = document.getElementById('propertyList');
  if (!container) {
    console.error('propertyList container not found!');
    return;
  }
  
  // Calculate pagination
  const start = (this.page - 1) * this.pageSize;
  const end = start + this.pageSize;
  const pageProperties = this.properties.slice(start, end);
  
  console.log('Rendering', pageProperties.length, 'of', this.properties.length, 'properties');
  
  // Clear container
  container.innerHTML = '';
  
  if (pageProperties.length === 0) {
    container.innerHTML = '<div class="no-results">No properties match filters</div>';
    return;
  }
  
  // Render each property
  pageProperties.forEach(p => {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.dataset.bbl = p.bbl;
    
    card.innerHTML = `
      <div class="property-address">${p.address || 'No address'}</div>
      <div class="property-meta">
        <span class="bldg-class">${p.bldgclass || '?'}</span>
        <span class="far-gap">FAR Gap: ${p.far_gap?.toFixed(1) || 'N/A'}</span>
      </div>
      <div class="property-owner">${p.ownername || 'Unknown owner'}</div>
    `;
    
    card.addEventListener('click', () => App.selectProperty(p.bbl));
    container.appendChild(card);
  });
  
  // Add pagination controls
  this.renderPagination(container);
};

App.renderPagination = function(container) {
  const totalPages = Math.ceil(this.properties.length / this.pageSize);
  if (totalPages <= 1) return;
  
  const pager = document.createElement('div');
  pager.className = 'pagination';
  pager.innerHTML = `
    <button ${this.page <= 1 ? 'disabled' : ''} onclick="App.prevPage()">← Prev</button>
    <span>Page ${this.page} of ${totalPages}</span>
    <button ${this.page >= totalPages ? 'disabled' : ''} onclick="App.nextPage()">Next →</button>
  `;
  container.appendChild(pager);
};

App.nextPage = function() {
  const totalPages = Math.ceil(this.properties.length / this.pageSize);
  if (this.page < totalPages) {
    this.page++;
    this.renderList();
  }
};

App.prevPage = function() {
  if (this.page > 1) {
    this.page--;
    this.renderList();
  }
};
```

### Step 4: Stats Update

```javascript
App.updateStats = function() {
  const propCount = document.getElementById('propertyCount');
  const salesCount = document.getElementById('salesCount');
  const avgPsf = document.getElementById('avgPsf');
  
  if (propCount) propCount.textContent = this.properties.length;
  if (salesCount) salesCount.textContent = this.sales.length;
  if (avgPsf && this.stats.avgPricePerSF) {
    avgPsf.textContent = '$' + Math.round(this.stats.avgPricePerSF);
  }
};
```

### Step 5: Filter Event Handlers

```javascript
App.initFilters = function() {
  // Building class buttons
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update filter and fetch
      App.filters.bldgclass = btn.dataset.filter;
      App.fetchData();
    });
  });
  
  // FAR Gap dropdown
  const farFilter = document.getElementById('farFilter');
  if (farFilter) {
    farFilter.addEventListener('change', (e) => {
      App.filters.minFarGap = e.target.value;
      App.fetchData();
    });
  }
  
  // Distress dropdown
  const distressFilter = document.getElementById('distressFilter');
  if (distressFilter) {
    distressFilter.addEventListener('change', (e) => {
      App.filters.minDistress = e.target.value;
      App.fetchData();
    });
  }
};
```

### Step 6: Property Selection

```javascript
App.selectProperty = function(bbl) {
  const property = this.properties.find(p => p.bbl === bbl);
  if (!property) return;
  
  // Highlight in list
  document.querySelectorAll('.property-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-bbl="${bbl}"]`)?.classList.add('selected');
  
  // Center map
  if (this.map && property.lat && property.lng) {
    this.map.flyTo({ center: [property.lng, property.lat], zoom: 16 });
  }
  
  // Show detail panel (keep existing showPropertyDetail function if it works)
  if (typeof showPropertyDetail === 'function') {
    showPropertyDetail(property);
  }
};
```

### Step 7: Initialize

```javascript
App.init = function() {
  console.log('App initializing...');
  this.initFilters();
  this.fetchData();
  console.log('App ready');
};

// Start when DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
```

---

## HTML Requirements

Ensure these elements exist in index.html:

```html
<!-- Property list container - MUST have this ID -->
<div id="propertyList"></div>

<!-- Stats display -->
<span id="propertyCount">0</span>
<span id="salesCount">0</span>
<span id="avgPsf">$0</span>

<!-- Filter buttons - MUST have data-filter attribute -->
<button data-filter="all" class="active">All</button>
<button data-filter="office">Office</button>
<button data-filter="retail">Retail</button>
<button data-filter="multifam">Multifam</button>
<button data-filter="industrial">Industrial</button>

<!-- Filter dropdowns - MUST have these IDs -->
<select id="farFilter">
  <option value="">Any</option>
  <option value="1">1+</option>
  <option value="2">2+</option>
  <option value="4">4+</option>
</select>

<select id="distressFilter">
  <option value="">Any Status</option>
  <option value="10">Some Distress (10+)</option>
  <option value="25">High Distress (25+)</option>
</select>
```

---

## CSS Requirements

Add if missing:

```css
.property-card {
  padding: 12px;
  border-bottom: 1px solid #333;
  cursor: pointer;
}

.property-card:hover {
  background: #2a2a2a;
}

.property-card.selected {
  background: #1a3a5c;
  border-left: 3px solid #3b82f6;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-results {
  padding: 24px;
  text-align: center;
  color: #888;
}
```

---

## Implementation Order

1. Add the `App` object at top of script section
2. Add all the App methods
3. Verify HTML has required IDs
4. Remove OLD filter handlers (search for `addEventListener` on filter elements and remove)
5. Remove OLD renderList/fetchData functions
6. Add `App.init()` call
7. Test each filter one at a time

---

## Validation Checklist

After implementation:

- [ ] Page loads without console errors
- [ ] Initial load shows properties in list
- [ ] "All" shows all properties
- [ ] "Office" shows only O-class buildings
- [ ] "Retail" shows only K-class buildings
- [ ] FAR Gap filter reduces results
- [ ] Distress filter reduces results
- [ ] Pagination works (Next/Prev buttons)
- [ ] Clicking property highlights it
- [ ] Map still works
- [ ] Stats update with filter changes

---

## Do Not

- Do not modify server.js
- Do not modify /api/data or /api/properties endpoints
- Do not add npm packages
- Do not split into multiple files
- Do not modify map rendering (if it works, leave it)
