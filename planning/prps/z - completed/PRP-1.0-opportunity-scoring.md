# PRP 1.0: Core Investment Analytics & Opportunity Scoring

## 1. Goal
Implement the "Core Investment Analytics" phase (Phase 1) by refining the Opportunity Score to include "Sale vs Assessed Value Delta" and "Ownership Tenure", and visualizing these metrics in the UI.

## 2. New Metrics

### 2.1 Sale vs Assessed Value Delta (`value_delta`)
- **Definition:** The difference between the most recent sale price and the current total assessed value (`assesstot`).
- **Logic:** 
  - `Delta = Last Sale Price - Assessed Total`
  - **Signal:** 
    - If `Assessed Total > Last Sale Price`, it might indicate the property is undervalued by the market or over-assessed (context dependent, but often a signal if the sale was recent).
    - More usefully, we might look at `Assessed Total * 2 (approx market value)` vs `Last Sale Price`.
    - *Refined Logic for Score:* We will use the ratio: `Ratio = Assessed Total / Last Sale Price`. Higher ratio = potentially better deal (buying below assessment-implied value).
    - *Note:* NYC Assessed Value is ~45% of market value for Class 4. So `Market Value ≈ Assessed / 0.45`.
    - Let's stick to a simpler raw metric for now: `Assessment Ratio = Assessed Total / Last Sale Price`.
    - If `Last Sale Price` is 0 or missing, this metric is null.

### 2.2 Ownership Tenure (`tenure`)
- **Definition:** Number of years the current owner has held the property.
- **Logic:** `Current Date - Last Sale Date`.
- **Signal:** Long tenure (> 10 years) often indicates a potential seller (capital recycling, end of fund life, generational shift).

### 2.3 Composite Opportunity Score (`opportunity_score`)
- **Current:** FAR Gap (40%) + Age (20%) + Size (20%) = 80 max.
- **New Algorithm (100 point scale):**
  1.  **FAR Gap (0-40 pts):** `min(far_gap * 5, 40)`
  2.  **Ownership Tenure (0-20 pts):** `min(years_held * 1, 20)` (Peak score at 20+ years)
  3.  **Assessment Value Ratio (0-20 pts):**
      - If `Assessed / Sale > 0.45` (Sale was low relative to assessment), score high.
      - Formula: `min((Assessed / Sale) * 20, 20)` (If Assessed is >= Sale, max points).
  4.  **Building Class / Size (0-20 pts):**
      - Multifamily (D) or Mixed (S) get bonus.
      - Corner lots (if data avail) or Large Lots.
      - Simplified: `min(lot_area / 2000, 10)` + `(is_multifam ? 10 : 0)`.

## 3. Implementation Plan

### 3.1 Backend (`server.js`)
- Update `/api/opportunities`:
  - Fetch most recent sale for each property in the list.
  - Calculate `tenure` (in years).
  - Calculate `value_delta` (Assessed - Sale) or `assessment_ratio`.
  - Implement new scoring algorithm.
  - Return these new fields.

### 3.2 Frontend (`index.html`)
- Update `getOpportunityBadge` to use the server-provided score if available, or update client logic.
- **Property Card:**
  - Display "Tenure: X yrs"
  - Display "Assessed Ratio: X.X" (maybe hide if null)
- **Property Panel:**
  - Add a "Investment Analytics" section.
  - Show the breakdown of the score.

## 4. Steps
1.  Modify `server.js` to join with `sales` table for the opportunity endpoint.
2.  Implement the scoring logic in JavaScript (easier than SQL for now).
3.  Verify endpoint returns new scores.
4.  Update `index.html` to render new data.
