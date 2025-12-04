# PRP 2.0: Distress Signals

> **Confidence Score:** 9/10 - Standard API integration and scoring logic.

## Overview
**Goal:** Identify distressed properties by integrating violation and permit data, calculating a "Distress Score", and surfacing these signals in the UI.
**Complexity:** Medium
**Files Modified:**
- `fetch_nyc_data.js` (Fetch violations/permits, compute score)
- `server.js` (Serve distress data)
- `public/index.html` (UI for distress signals)
- `SUPABASE_SCHEMA.sql` (New tables)

---

## Prerequisites
- [ ] Supabase project active
- [ ] `properties` table populated with BBLs

---

## Implementation Plan

### Phase 1: Database & Data Fetching
**File:** `SUPABASE_SCHEMA.sql` (New file for tracking schema changes)

#### Step 1.1: Create Tables
Create tables for `violations` and `permits` linked to `properties` by BBL.

```sql
-- Violations Table
CREATE TABLE IF NOT EXISTS violations (
    id SERIAL PRIMARY KEY,
    bbl TEXT REFERENCES properties(bbl),
    type TEXT, -- 'HPD', 'DOB'
    violation_id TEXT,
    description TEXT,
    status TEXT, -- 'Open', 'Closed'
    issue_date DATE,
    UNIQUE(bbl, violation_id)
);

-- Permits Table (to detect stalled construction)
CREATE TABLE IF NOT EXISTS permits (
    id SERIAL PRIMARY KEY,
    bbl TEXT REFERENCES properties(bbl),
    job_number TEXT,
    type TEXT, -- 'NB' (New Building), 'A1', etc.
    status TEXT,
    issue_date DATE,
    expiration_date DATE,
    UNIQUE(bbl, job_number)
);

-- Add Distress Score to Properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS distress_score INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_distress_update TIMESTAMP;
```

**File:** `fetch_nyc_data.js`

#### Step 1.2: Fetch HPD Violations
**Source:** NYC Open Data (HPD Violations: `wvxf-dwi5`)
**Logic:**
- Query for open violations (`violationstatus = 'Open'`)
- Filter by BBLs in our database (chunked).
- Upsert into `violations` table.

#### Step 1.3: Fetch DOB Violations
**Source:** NYC Open Data (DOB Violations: `3h2n-5cm9`)
**Logic:**
- Query for active violations.
- Upsert into `violations` table.

#### Step 1.4: Compute Distress Score
**Logic:**
- Run a SQL function or JS logic to update `distress_score` for each property.
- **Scoring Model (Draft):**
    - Open HPD Violation: +1 point each (capped at 20)
    - Open DOB Violation: +5 points each (capped at 30)
    - Tax Lien (Future): +50 points
    - Lis Pendens (Future): +40 points
- Update `properties.distress_score`.

---

### Phase 2: Backend API
**File:** `server.js`

#### Step 2.1: Expose Distress Data
Update `/api/properties/:bbl` (or create `/api/properties/:bbl/distress`) to return:
- Distress Score
- List of open violations (limit 5, sorted by date)
- List of recent permits

```javascript
// Example response extension
{
  ...propertyData,
  distress_score: 45,
  violations: [
    { type: 'HPD', description: 'NO HEAT', date: '2024-01-15' }
  ]
}
```

---

### Phase 3: Frontend UI
**File:** `public/index.html`

#### Step 3.1: Distress Badge
- Add a "DISTRESS" badge to property cards if `distress_score > 20`.
- Color code: Yellow (Low), Orange (Medium), Red (High).

#### Step 3.2: Distress Filter
- Add dropdown filter: "Distressed Only", "High Distress (>50)", "Clean".

#### Step 3.3: Property Detail Panel
- Add "Distress Signals" section.
- Display Score.
- List top violations.
- Link to full HPD/DOB records.

---

## Success Criteria
- [ ] `violations` table populated with real data for Midtown South properties.
- [ ] Properties have a computed `distress_score`.
- [ ] UI shows distress badges for properties with open violations.
- [ ] Can filter map to show only distressed properties.

## Rollback Plan
- Drop `violations` and `permits` tables.
- Remove `distress_score` column.
- Revert `fetch_nyc_data.js` and `server.js`.
