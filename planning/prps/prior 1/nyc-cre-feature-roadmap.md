# NYC CRE Explorer - Feature Roadmap (Phase 3+)

**Created:** December 3, 2025  
**Current State:** Phases 0-2 Complete  
**Target:** Production-ready deal sourcing platform

---

## Current State Summary

### What's Working
- **Backend:** Express.js + Supabase (PostgreSQL)
- **Frontend:** Vanilla JS single-file SPA (`public/index.html`)
- **Data:** 3,500+ properties, 800+ sales, violations loaded
- **Features:**
  - Property list with filtering (building class, FAR gap, distress)
  - Map with color-coded markers (Mapbox)
  - Property detail panel with investment analytics
  - Opportunity scoring (FAR gap, tenure, assessment ratio)
  - Distress signals (HPD/DOB violations)
  - Basic owner search (click owner → see portfolio)
  - Local storage portfolio (not persistent across devices)
  - ACRIS deep linking

### Schema Ready But Unused
```
portfolios (id, user_id, name, description, created_at, updated_at)
portfolio_properties (portfolio_id, bbl, notes, added_at)
saved_searches (id, user_id, name, filters, alert_enabled, alert_frequency, last_alert_at)
```

### Key Files
- `server.js` - Express API (~400 lines)
- `public/index.html` - Frontend SPA (~1200 lines)
- `fetch_nyc_data.js` - Data fetcher

---

## Priority 1: Quick Wins (Ship This Week)

### 1.1 Owner Intelligence Upgrade

**Current:** Click owner name → modal with property list  
**Target:** Full owner analysis view with portfolio metrics

**New Data Points:**
- Total portfolio value (sum of assesstot)
- Average holding period across portfolio
- Total open violations across all holdings
- Geographic concentration (are they focused on one block?)
- Entity type indicator (LLC vs individual vs trust)

**Backend Changes:**
```javascript
// Enhance GET /api/owners/:name response
{
  searchTerm: "...",
  owners: [{
    name: "ACME LLC",
    entityType: "LLC",           // NEW: detect from name pattern
    properties: [...],
    totalAssessed: 45000000,
    totalSF: 125000,
    avgHoldingPeriod: 8.3,       // NEW: years
    totalOpenViolations: 12,     // NEW: sum across portfolio
    concentrationScore: 0.7,    // NEW: how clustered (0-1)
    blocks: ["00801", "00802"]  // NEW: unique blocks owned
  }]
}
```

**Frontend Changes:**
- Replace cramped modal with full panel view (or dedicated tab)
- Show portfolio health indicators
- "View all on map" button to highlight owner's holdings

**Effort:** 2-3 hours

---

### 1.2 Comparable Sales Context

**Current:** Property panel shows sales history for that property only  
**Target:** Show similar nearby properties for market context

**New Endpoint:**
```javascript
GET /api/properties/:bbl/comps?radius=0.25&limit=5

// Returns properties with same building class prefix, similar size (±30%)
// within radius (miles), with their recent sales

Response:
{
  subject: { bbl, address, bldgarea, lastSale },
  comps: [
    {
      bbl, address, bldgarea,
      distance: 0.1,  // miles
      lastSalePrice: 5000000,
      lastSaleDate: "2024-03-15",
      pricePerSF: 450,
      assessedPerSF: 200
    }
  ],
  marketStats: {
    avgPricePerSF: 425,
    medianPricePerSF: 410,
    saleCount: 5
  }
}
```

**Frontend Changes:**
- New "Comps" section in property panel
- Mini table showing comparable sales
- Market context line: "This area averages $425/SF for similar buildings"

**Effort:** 2-3 hours

---

### 1.3 Supabase Auth + Persistent Portfolios

**Current:** Portfolio stored in localStorage (lost on new device/browser)  
**Target:** User accounts with persistent, shareable portfolios

**Auth Flow:**
1. Magic link email (no passwords)
2. User clicks link → signed in
3. Portfolio syncs to Supabase

**Backend Changes:**
```javascript
// New endpoints
POST /api/auth/login        // Send magic link
GET  /api/auth/callback     // Handle magic link redirect
GET  /api/auth/me           // Get current user
POST /api/auth/logout       // Clear session

// Portfolio endpoints (require auth)
GET    /api/portfolios              // List user's portfolios
POST   /api/portfolios              // Create portfolio
GET    /api/portfolios/:id          // Get portfolio with properties
POST   /api/portfolios/:id/properties  // Add property
DELETE /api/portfolios/:id/properties/:bbl  // Remove property
```

**Frontend Changes:**
- Login/logout button in header
- Portfolio tab shows persistent data when logged in
- "Save to Portfolio" prompts login if not authenticated
- Optional: Share portfolio via link

**Supabase Setup:**
- Enable Email auth provider
- Configure magic link template
- RLS policies already exist in schema

**Effort:** 3-4 hours (schema exists, just wiring)

---

## Priority 2: Differentiation Features

### 2.1 Dashboard View

**Purpose:** Landing page showing portfolio health and market activity

**Sections:**
1. **Portfolio Summary**
   - Total properties watched
   - Combined assessed value
   - New violations since last login (alert badges)

2. **Recent Activity**
   - New sales in your watched areas
   - Properties with changed distress scores
   - Permits filed on watched properties

3. **Market Pulse**
   - Sales volume trend (last 30/60/90 days)
   - Avg $/SF by building class
   - Top opportunity properties (auto-surfaced)

**Implementation:**
- New tab or separate route (`/dashboard`)
- Aggregation queries in backend
- Simple chart library (Chart.js already available)

**Effort:** 4-5 hours

---

### 2.2 Map Heatmap Layer

**Purpose:** Visualize opportunity density or market values spatially

**Modes:**
1. **Opportunity Density** - Where are the underbuilt properties clustered?
2. **Price Heatmap** - Recent sale $/SF by area
3. **Distress Concentration** - Where are violations clustered?

**Implementation:**
```javascript
// Backend: aggregate by grid cell
GET /api/heatmap?metric=opportunity&resolution=0.001

Response:
{
  cells: [
    { lat: 40.745, lng: -73.988, value: 45 },
    { lat: 40.746, lng: -73.988, value: 32 },
    ...
  ],
  min: 0,
  max: 100
}
```

**Frontend:**
- Mapbox heatmap layer (built-in)
- Toggle buttons for different metrics
- Legend showing value scale

**Effort:** 3-4 hours

---

### 2.3 Property Due Diligence Page

**Purpose:** Expand detail panel into full-page view with tabs

**Tabs:**
1. **Overview** - Current panel content, cleaned up
2. **Financials** - Assessment history, sale history, implied cap rate
3. **Zoning** - FAR analysis, buildable scenarios, air rights
4. **Distress** - Full violation history, permit timeline
5. **Documents** - ACRIS links organized by type (deeds, mortgages, liens)
6. **Notes** - User's private notes (requires auth)

**Implementation:**
- Route: `/property/:bbl`
- Tabbed interface within page
- Lazy load tab content
- Back button to return to list

**Effort:** 5-6 hours

---

## Priority 3: Power User Features

### 3.1 Saved Searches with Alerts

**Schema exists:** `saved_searches` table ready

**Flow:**
1. User sets filters (building class, FAR gap > 2, etc.)
2. Clicks "Save Search"
3. Names it, optionally enables alerts
4. Daily/weekly email when new matches appear

**Backend:**
- Supabase Edge Function for scheduled checks
- Email via Resend or SendGrid
- Track `last_alert_at` to avoid duplicates

**Effort:** 4-5 hours (edge function is the complex part)

---

### 3.2 Export & Reporting

**Purpose:** Get data out for external analysis or sharing

**Features:**
- Export property list to CSV
- Export portfolio to CSV
- Generate PDF report for single property (basic)

**Implementation:**
```javascript
GET /api/export/properties?format=csv&filters=...
GET /api/export/portfolio/:id?format=csv
GET /api/properties/:bbl/report?format=pdf
```

**Effort:** 2-3 hours (CSV easy, PDF harder)

---

### 3.3 Notes & Activity Log

**Purpose:** Track your research on each property

**Features:**
- Add notes to any property (private to user)
- See activity log: "You viewed this 3 times", "Added to portfolio on X"
- Optional: tag properties (Hot, Pass, In DD, etc.)

**Schema Addition:**
```sql
CREATE TABLE property_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  bbl text REFERENCES properties(bbl),
  content text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Effort:** 3-4 hours

---

## Implementation Order (Recommended)

```
Week 1: Foundation + Quick Wins
├── 1.3 Supabase Auth + Persistent Portfolios (FIRST - unblocks user features)
├── 1.1 Owner Intelligence Upgrade
└── 1.2 Comparable Sales Context

Week 2: Differentiation
├── 2.1 Dashboard View
├── 2.2 Map Heatmap Layer
└── 2.3 Property Due Diligence Page (if time)

Week 3: Power Features
├── 3.1 Saved Searches with Alerts
├── 3.2 Export & Reporting
└── 3.3 Notes & Activity Log
```

---

## Technical Notes

### On Alpine.js
**Recommendation:** Stay vanilla for now. The current codebase is manageable and Alpine would require refactoring the event handling. Consider adding Alpine only if you're building complex forms or real-time reactive UI.

### Deployment
**Target:** Railway  
**Considerations:**
- Set environment variables (SUPABASE_URL, SUPABASE_KEY, MAPBOX_ACCESS_TOKEN)
- Ensure `package.json` has correct start script
- No build step needed (vanilla JS)

### Performance
- Property list currently loads 200 items max
- Consider pagination or virtual scrolling if expanding
- Heatmap should aggregate server-side, not send raw points

---

## PRP Generation Guide

When creating PRPs from this document:

1. **One feature per PRP** - Don't combine 1.1 and 1.2
2. **Include current code context** - Reference actual file paths and function names
3. **Validation checklist** - Each PRP should have testable success criteria
4. **Rollback plan** - How to undo if something breaks

**PRP Naming Convention:**
```
PRP-3.1-owner-intelligence.md
PRP-3.2-comp-sales.md
PRP-3.3-supabase-auth.md
PRP-4.1-dashboard.md
...
```

---

## Questions to Resolve

1. **Multi-portfolio support?** - Schema allows it, but UI currently assumes one portfolio. Worth supporting?

2. **Sharing?** - Should users be able to share portfolios with others (read-only link)?

3. **Mobile?** - Current UI is desktop-focused. Worth making responsive now or later?

4. **Data freshness?** - How often to re-fetch from NYC Open Data? Manual trigger or scheduled?

---

*This document should be added to project knowledge and used as the basis for generating individual PRPs.*
