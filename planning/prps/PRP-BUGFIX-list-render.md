# PRP: Fix Property List Not Rendering

## Problem Summary
- API returns 500 properties correctly (verified via Network tab)
- Map displays all properties correctly
- Property list panel shows ZERO items
- "Properties: 500" counter displays correct count
- Console shows 4 errors

## Root Cause (Likely)
The `renderList()` function either:
1. Is not being called after data fetch
2. Is targeting a DOM element that doesn't exist
3. Has a JS error that silently fails

## Files to Check
- `public/index.html` - lines around `renderList`, `fetchData`, and the list container

## Debugging Steps

### Step 1: Find and log the render function
Search for `renderList` or `renderProperties` function. Add console.log at start:
```javascript
function renderList(properties) {
  console.log('renderList called with', properties?.length, 'properties');
  // ... existing code
}
```

### Step 2: Verify it's being called
In `fetchData()`, after the API response is processed, verify renderList is called:
```javascript
const data = await response.json();
console.log('Data received:', data.properties?.length);
renderList(data.properties); // Make sure this line exists
```

### Step 3: Check DOM selector
Find what element the list renders into. It should be something like:
```javascript
const container = document.getElementById('propertyList'); 
// or document.querySelector('.property-list')
```
Verify this element exists in the HTML.

### Step 4: Check for errors in render loop
The renderList function probably has a loop like:
```javascript
properties.forEach(p => {
  // If any property access fails here, whole render breaks
  container.innerHTML += `<div>${p.address}</div>`;
});
```
Add try/catch to find which property causes issues.

## Fix Requirements

### Must Fix
1. Property list must display all returned properties
2. Each property card must show: address, building class, FAR gap, owner
3. Clicking a property must select it (highlight on map, show detail panel)

### Should Add
4. Pagination or virtual scrolling (500 items is too many to render at once)
   - Add "Load more" button, OR
   - Limit initial render to 50, add pagination controls

### Validation
After fix, these must all work:
- [ ] Change building class filter → list updates with matching properties
- [ ] List count matches "Properties: X" counter
- [ ] Click property in list → highlights on map
- [ ] Scroll through list → no performance issues
- [ ] Console shows no errors

## Technical Hints

The map works, so look at how map markers get the data:
```javascript
// Find this pattern - map is getting properties somehow
markers = properties.map(p => new mapboxgl.Marker()...);
```

The list should use the same data source. If map uses `state.properties` and list uses something else, that's the bug.

## Do Not
- Do not refactor into multiple files
- Do not add new dependencies  
- Do not change the API endpoints
- Do not modify working features (map, filters, API)

## Quick Win
If you can't find the bug, the nuclear option:
```javascript
// In fetchData(), after getting response:
const listContainer = document.getElementById('propertyList'); // find correct ID
listContainer.innerHTML = data.properties.slice(0, 50).map(p => `
  <div class="property-card" data-bbl="${p.bbl}">
    <strong>${p.address || 'No address'}</strong>
    <span>${p.bldgclass}</span>
  </div>
`).join('');
```

This bypasses whatever renderList bug exists and proves the container works.
