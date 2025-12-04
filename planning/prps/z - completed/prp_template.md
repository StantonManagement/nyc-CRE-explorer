# PRP: [Feature Name]

> **Confidence Score:** [1-10] - [Reason for score]

## Overview
**Goal:** [One sentence describing the end result]  
**Complexity:** [Low / Medium / High]  
**Files Modified:** [List files that will be changed]

---

## Prerequisites
- [ ] Server runs without errors: `node server.js`
- [ ] Data file exists: `data/combined_data.json`
- [ ] Can access: `http://localhost:3000`

---

## Implementation Plan

### Phase 1: Backend Changes
**File:** `server.js`

#### Step 1.1: [Description]
**Location:** After line [X] (after `/api/[existing-endpoint]`)

```javascript
// [Description of what this code does]
app.get('/api/[new-endpoint]', (req, res) => {
  // Implementation
});
```

**Validation:**
```bash
curl http://localhost:3000/api/[new-endpoint]
# Expected: { "count": X, "[data]": [...] }
```

#### Step 1.2: [Description] (if needed)
...

---

### Phase 2: Frontend Changes
**File:** `public/index.html`

#### Step 2.1: Add HTML Structure
**Location:** [Describe where - e.g., "Inside .sidebar, after .stats-bar"]

```html
<!-- [Description] -->
<div class="[new-element]">
  ...
</div>
```

#### Step 2.2: Add CSS Styles
**Location:** Inside `<style>` tag, after [existing selector]

```css
/* [Description] */
.[new-class] {
  ...
}
```

#### Step 2.3: Add JavaScript Logic
**Location:** Inside `<script>` tag, after [existing function]

```javascript
// [Description]
function [newFunction]() {
  ...
}
```

#### Step 2.4: Wire Up Event Listeners
**Location:** Inside `setupEventListeners()` function

```javascript
document.getElementById('[element]').addEventListener('click', () => {
  [newFunction]();
});
```

**Validation:**
1. Open http://localhost:3000 in browser
2. [Describe user action to test]
3. Expected result: [What should happen]

---

### Phase 3: Data Fetcher Changes (if needed)
**File:** `fetch_nyc_data.js`

#### Step 3.1: [Description]
**Location:** After [existing function]

```javascript
async function fetch[NewData]() {
  // Implementation
}
```

**Validation:**
```bash
node fetch_nyc_data.js
# Check: data/combined_data.json includes new data
```

---

## Success Criteria
- [ ] New API endpoint returns correct data
- [ ] UI element appears and functions correctly
- [ ] No console errors in browser
- [ ] No server errors in terminal
- [ ] Existing features still work (properties, sales, search, portfolio)

## Final Testing Checklist
```bash
# 1. Restart server
node server.js

# 2. Test new endpoint
curl http://localhost:3000/api/[new-endpoint]

# 3. Verify existing endpoints still work
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/properties
curl http://localhost:3000/api/sales?limit=5

# 4. Browser testing
# - Open http://localhost:3000
# - Test new feature
# - Test existing features (search, filter, property panel, portfolio)
```

---

## Rollback Plan
If implementation fails:

1. **Backend:** Remove new endpoint from `server.js`
2. **Frontend:** Remove new HTML/CSS/JS from `public/index.html`
3. **Data:** Re-run `node fetch_nyc_data.js` to restore original data
4. Restart server: `node server.js`

---

## Notes
- [Any gotchas, edge cases, or things to watch for]
- [Links to relevant documentation]
- [Dependencies on other features]
