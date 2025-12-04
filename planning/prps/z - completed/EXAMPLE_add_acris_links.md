# PRP: Add ACRIS Document Links

> **Confidence Score:** 9/10 - Well-defined scope, public API available, follows existing patterns

## Overview
**Goal:** Add links to ACRIS (deed, mortgage, lien documents) in the property detail panel  
**Complexity:** Low  
**Files Modified:** `server.js`, `public/index.html`

---

## Prerequisites
- [x] Server runs without errors: `node server.js`
- [x] Data file exists: `data/combined_data.json`
- [x] Can access: `http://localhost:3000`

---

## Implementation Plan

### Phase 1: Backend Changes
**File:** `server.js`

#### Step 1.1: Add ACRIS Links Endpoint
**Location:** After line 85 (after `/api/properties/:bbl` endpoint)

```javascript
// Get ACRIS document links for a property
app.get('/api/acris/:bbl', (req, res) => {
  const { bbl } = req.params;
  
  // Parse BBL into components
  const borough = bbl.substring(0, 1);
  const block = bbl.substring(1, 6);
  const lot = bbl.substring(6, 10);
  
  // Build ACRIS URLs
  const acrisBase = 'https://a836-acris.nyc.gov/DS/DocumentSearch';
  
  const links = {
    bbl,
    borough,
    block,
    lot,
    urls: {
      allDocuments: `${acrisBase}/BBL?borough=${borough}&block=${block}&lot=${lot}`,
      deeds: `${acrisBase}/DocumentType?borough=${borough}&block=${block}&lot=${lot}&doc_type=DEED`,
      mortgages: `${acrisBase}/DocumentType?borough=${borough}&block=${block}&lot=${lot}&doc_type=MTGE`,
      liens: `${acrisBase}/DocumentType?borough=${borough}&block=${block}&lot=${lot}&doc_type=LIEN`
    }
  };
  
  res.json(links);
});
```

**Validation:**
```bash
curl http://localhost:3000/api/acris/1008010001
# Expected: { "bbl": "1008010001", "urls": { "allDocuments": "...", ... } }
```

---

### Phase 2: Frontend Changes
**File:** `public/index.html`

#### Step 2.1: Add ACRIS Section to Panel HTML
**Location:** Inside `.panel-content`, after the "Permits & Violations" section (around line 320)

```html
<div class="panel-section">
  <h3>Public Records (ACRIS)</h3>
  <div class="acris-links" id="panelAcrisLinks">
    <a href="#" class="acris-link" id="acrisAll" target="_blank">All Documents</a>
    <a href="#" class="acris-link" id="acrisDeeds" target="_blank">Deeds</a>
    <a href="#" class="acris-link" id="acrisMortgages" target="_blank">Mortgages</a>
    <a href="#" class="acris-link" id="acrisLiens" target="_blank">Liens</a>
  </div>
</div>
```

#### Step 2.2: Add CSS Styles
**Location:** Inside `<style>` tag, after `.sales-row-price` styles (around line 180)

```css
/* ACRIS Links */
.acris-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.acris-link {
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--primary);
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.acris-link:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
```

#### Step 2.3: Update selectProperty Function
**Location:** Inside `selectProperty()` function, after the "View on ACRIS" button update (around line 480)

```javascript
// Fetch and set ACRIS links
try {
  const acrisRes = await fetch(`/api/acris/${bbl}`);
  const acrisData = await acrisRes.json();
  
  document.getElementById('acrisAll').href = acrisData.urls.allDocuments;
  document.getElementById('acrisDeeds').href = acrisData.urls.deeds;
  document.getElementById('acrisMortgages').href = acrisData.urls.mortgages;
  document.getElementById('acrisLiens').href = acrisData.urls.liens;
} catch (err) {
  console.error('Error fetching ACRIS links:', err);
}
```

#### Step 2.4: Remove Redundant Button (Optional)
**Location:** Inside `.panel-actions` div (around line 330)

Since we now have dedicated ACRIS links, we can simplify the "View on ACRIS" button or keep it as a quick access option. If keeping, no changes needed.

**Validation:**
1. Open http://localhost:3000 in browser
2. Click on any property in the list
3. Scroll down in property panel to "Public Records (ACRIS)" section
4. Expected: Four clickable links that open ACRIS in new tabs
5. Click "Deeds" link
6. Expected: ACRIS website opens showing deed documents for that property

---

## Success Criteria
- [x] `/api/acris/:bbl` endpoint returns correct URLs
- [x] ACRIS section appears in property panel
- [x] All four links are clickable and open correct ACRIS pages
- [x] No console errors in browser
- [x] No server errors in terminal
- [x] Existing features still work

## Final Testing Checklist
```bash
# 1. Restart server
node server.js

# 2. Test new endpoint
curl http://localhost:3000/api/acris/1008010001

# 3. Verify existing endpoints still work
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/properties/1008010001

# 4. Browser testing
# - Open http://localhost:3000
# - Click "1 PENN PLAZA" in property list
# - Verify ACRIS section appears with 4 links
# - Click each link, verify ACRIS opens correctly
# - Test search, filters, portfolio still work
```

---

## Rollback Plan
If implementation fails:

1. **Backend:** Remove `/api/acris/:bbl` route from `server.js`
2. **Frontend:** Remove `.panel-section` for ACRIS and CSS from `public/index.html`
3. **Frontend:** Remove ACRIS fetch code from `selectProperty()` function
4. Restart server: `node server.js`

---

## Notes
- ACRIS is NYC's public records system - no API key needed
- Links work for Manhattan (borough=1) properties only in current dataset
- ACRIS site may be slow to load; consider adding loading state in future
- Could enhance by fetching actual document count from ACRIS API in future iteration
