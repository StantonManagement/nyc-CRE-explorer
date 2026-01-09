# Frontend Rebuild: Phase Plan

## Keep (Do Not Touch)
- `server.js` - working
- `supabase` - 3,539 properties
- `/api/data` endpoint - returns correct data

## Rebuild (New index.html)

---

# Phase 1: Skeleton + Data Verification
**Time: 30 min | Verify before Phase 2**

Create minimal HTML that:
1. Fetches from /api/data
2. Logs the response to console
3. Displays raw counts on screen

```html
<!DOCTYPE html>
<html>
<head>
  <title>NYC CRE Explorer</title>
  <style>
    body { font-family: system-ui; background: #1a1a1a; color: white; padding: 20px; }
    .stats { font-size: 24px; margin: 20px 0; }
    .debug { background: #333; padding: 10px; font-family: monospace; white-space: pre; }
  </style>
</head>
<body>
  <h1>NYC CRE Explorer - Rebuild</h1>
  
  <div class="stats">
    Properties: <span id="propCount">loading...</span> |
    Sales: <span id="salesCount">loading...</span> |
    Avg $/SF: <span id="avgPsf">loading...</span>
  </div>
  
  <div class="debug" id="debug"></div>

  <script>
    async function init() {
      try {
        const response = await fetch('/api/data?limit=5000');
        const data = await response.json();
        
        // Log raw response
        console.log('Raw API response:', data);
        
        // Display actual numbers
        document.getElementById('propCount').textContent = data.properties?.length || 0;
        document.getElementById('salesCount').textContent = data.sales?.length || 0;
        
        const avgPsf = data.stats?.avgPricePerSF;
        document.getElementById('avgPsf').textContent = avgPsf ? '$' + Math.round(avgPsf) : 'N/A';
        
        // Debug display
        document.getElementById('debug').textContent = JSON.stringify({
          propertiesReturned: data.properties?.length,
          salesReturned: data.sales?.length,
          stats: data.stats
        }, null, 2);
        
      } catch (err) {
        console.error('Fetch failed:', err);
        document.getElementById('debug').textContent = 'Error: ' + err.message;
      }
    }
    
    init();
  </script>
</body>
</html>
```

### Phase 1 Verification
- [ ] Page loads without errors
- [ ] Console shows raw API response
- [ ] Properties count shows ~3500 (not 500)
- [ ] Sales count shows actual number
- [ ] Avg $/SF shows "N/A" (since no recent sales)

**Do not proceed to Phase 2 until all boxes checked.**

---

# Phase 2: Property List (No Map)
**Time: 45 min | Verify before Phase 3**

Add:
- Simple property list (first 100 items)
- Basic card layout
- Click to see details in console

```html
<!-- Add to existing -->
<style>
  .container { display: flex; gap: 20px; }
  .list { width: 400px; max-height: 600px; overflow-y: auto; }
  .card { 
    background: #2a2a2a; 
    padding: 12px; 
    margin-bottom: 8px; 
    border-radius: 4px;
    cursor: pointer;
  }
  .card:hover { background: #3a3a3a; }
  .card-address { font-weight: bold; }
  .card-meta { font-size: 12px; color: #888; margin-top: 4px; }
</style>

<div class="container">
  <div class="list" id="propertyList"></div>
  <div class="detail" id="propertyDetail">Click a property</div>
</div>

<script>
  // Add to init() after fetching:
  function renderList(properties) {
    const container = document.getElementById('propertyList');
    container.innerHTML = '';
    
    // Only render first 100 for now
    properties.slice(0, 100).forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-address">${p.address || 'No address'}</div>
        <div class="card-meta">
          ${p.bldgclass || '?'} | FAR Gap: ${p.far_gap?.toFixed(1) || 'N/A'} | ${p.ownername || 'Unknown'}
        </div>
      `;
      card.onclick = () => {
        console.log('Selected:', p);
        document.getElementById('propertyDetail').textContent = JSON.stringify(p, null, 2);
      };
      container.appendChild(card);
    });
  }
  
  // Call after fetch:
  renderList(data.properties);
</script>
```

### Phase 2 Verification
- [ ] List shows 100 property cards
- [ ] Each card shows address, class, FAR gap, owner
- [ ] Clicking card logs property to console
- [ ] Clicking card shows JSON in detail panel
- [ ] No console errors

---

# Phase 3: Filters
**Time: 45 min | Verify before Phase 4**

Add:
- Building class buttons
- FAR gap dropdown
- Filters trigger new API call

```html
<div class="filters">
  <button data-class="all" class="active">All</button>
  <button data-class="office">Office</button>
  <button data-class="retail">Retail</button>
  <button data-class="multifam">Multifam</button>
  <button data-class="industrial">Industrial</button>
  
  <select id="farFilter">
    <option value="">Any FAR Gap</option>
    <option value="1">1+</option>
    <option value="2">2+</option>
    <option value="4">4+</option>
  </select>
</div>

<script>
  const state = {
    filters: { bldgclass: 'all', minFarGap: '' },
    properties: [],
    sales: []
  };
  
  async function fetchData() {
    const params = new URLSearchParams();
    if (state.filters.bldgclass !== 'all') {
      params.append('bldgclass', state.filters.bldgclass);
    }
    if (state.filters.minFarGap) {
      params.append('minFarGap', state.filters.minFarGap);
    }
    params.append('limit', '5000');
    
    console.log('Fetching:', '/api/data?' + params);
    
    const response = await fetch('/api/data?' + params);
    const data = await response.json();
    
    state.properties = data.properties || [];
    state.sales = data.sales || [];
    
    updateStats(data.stats);
    renderList(state.properties);
  }
  
  function updateStats(stats) {
    document.getElementById('propCount').textContent = state.properties.length;
    document.getElementById('salesCount').textContent = state.sales.length;
    document.getElementById('avgPsf').textContent = stats?.avgPricePerSF 
      ? '$' + Math.round(stats.avgPricePerSF) 
      : 'N/A';
  }
  
  // Filter handlers
  document.querySelectorAll('[data-class]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-class]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.bldgclass = btn.dataset.class;
      fetchData();
    };
  });
  
  document.getElementById('farFilter').onchange = (e) => {
    state.filters.minFarGap = e.target.value;
    fetchData();
  };
  
  // Initial load
  fetchData();
</script>
```

### Phase 3 Verification
- [ ] "All" shows ~3500 properties
- [ ] "Office" shows different count (fewer)
- [ ] "Retail" shows different count
- [ ] FAR Gap 2+ reduces count
- [ ] Console shows correct API URL for each filter
- [ ] Counts update after each filter change

---

# Phase 4: Map
**Time: 1 hour | Verify before Phase 5**

Add:
- Mapbox map
- Markers for properties
- Click marker to select property

```html
<link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>

<style>
  .container { display: flex; }
  .sidebar { width: 400px; }
  #map { flex: 1; height: 600px; }
</style>

<div class="container">
  <div class="sidebar">
    <!-- filters and list here -->
  </div>
  <div id="map"></div>
</div>

<script>
  let map;
  let markers = [];
  
  function initMap() {
    mapboxgl.accessToken = 'YOUR_TOKEN'; // Get from /api/config or hardcode temporarily
    
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-73.99, 40.745], // Midtown South
      zoom: 14
    });
  }
  
  function renderMap(properties) {
    // Clear existing markers
    markers.forEach(m => m.remove());
    markers = [];
    
    // Add new markers (limit to 500 for performance)
    properties.slice(0, 500).forEach(p => {
      if (!p.lat || !p.lng) return;
      
      const marker = new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      
      marker.getElement().onclick = () => selectProperty(p);
      markers.push(marker);
    });
  }
  
  function selectProperty(p) {
    console.log('Selected:', p.address);
    // Highlight in list, show detail panel
  }
  
  // Call initMap on load
  initMap();
  
  // Call renderMap after fetchData
  renderMap(state.properties);
</script>
```

### Phase 4 Verification
- [ ] Map displays centered on Midtown
- [ ] Markers appear for properties
- [ ] Changing filter updates markers
- [ ] Clicking marker logs to console
- [ ] No performance issues with markers

---

# Phase 5: Detail Panel
**Time: 30 min**

Add:
- Property detail sidebar
- Shows all property info
- Sales history
- Links to ACRIS

---

# Phase 6: Pagination
**Time: 30 min**

Add:
- Show 50 at a time in list
- Next/Prev buttons
- "Showing 1-50 of 3,539"

---

# Phase 7: Polish
**Time: 1-2 hours**

- CSS styling to match original
- Loading states
- Error handling
- Search input
- Export CSV

---

## Total Estimated Time: 5-6 hours

## Rules for AI Assistant

1. **Complete one phase fully before starting next**
2. **Run verification checklist before proceeding**
3. **If verification fails, fix before continuing**
4. **Do not write more than 100 lines at a time**
5. **Test in browser after each change**
6. **Keep console open, fix any errors immediately**
7. **Do not add features not in current phase**
