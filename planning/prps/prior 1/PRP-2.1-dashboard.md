# PRP 2.1: Dashboard View

**Phase:** Priority 2 - Differentiation  
**Estimated Time:** 4-5 hours  
**Dependencies:** PRP 1.3 complete (auth working)  
**Outputs:** New dashboard tab/route showing portfolio health and market activity

> **Architectural Note:** Dashboard data should be fetched via the unified `/api/data` endpoint (PRP-1.0) with appropriate filters. If creating a dedicated `/api/dashboard` endpoint for aggregated metrics, ensure it uses the same `FILTER_CONFIG` definitions for consistency. Dashboard-specific aggregations (e.g., market trends, activity summaries) can be added as separate computed fields in the response.

---

## Goal

Create a landing view that shows portfolio health, recent market activity, and auto-surfaced opportunities - so users see actionable intel immediately on load.

**Current state:** App opens to property list  
**Target state:** App opens to dashboard with portfolio summary, alerts, and market pulse

---

## What to Build

### Section 1: Portfolio Summary (Top)

A row of 3-4 stat cards showing:

| Stat | Source | Display |
|------|--------|---------|
| Properties Watched | Count of portfolio_properties | "12 Properties" |
| Total Assessed Value | Sum of assesstot for portfolio BBLs | "$45.2M" |
| New Violations | Count where issue_date > last_login | "3 New" (red badge if > 0) |
| Avg Opportunity Score | Computed from portfolio properties | "72/100" |

**Backend:** New endpoint `GET /api/dashboard/portfolio-summary` (requires auth)
- Query portfolio_properties for user
- Join to properties for assesstot, far_gap
- Join to violations for new issues
- Return aggregated stats

**Frontend:** Stat card row at top of dashboard, similar styling to owner panel stats.

---

### Section 2: Recent Activity Feed (Left Column)

A scrollable list showing what changed recently:

| Activity Type | Trigger | Display |
|---------------|---------|---------|
| New Sale | Sale recorded for watched property | "123 Main St sold for $5.2M" |
| New Violation | Violation filed on watched property | "456 Oak Ave: new HPD violation" |
| Permit Filed | Permit on watched property | "789 Elm St: Alt-1 permit filed" |
| Price Change | Assessment changed significantly | "123 Main St assessment up 15%" |

**Backend:** New endpoint `GET /api/dashboard/activity?days=30`
- Query sales, violations, permits for portfolio BBLs
- Filter to last N days
- Sort by date descending
- Return unified activity feed

**Frontend:** Simple list with icon per activity type, timestamp, click to view property.

---

### Section 3: Market Pulse (Right Column)

Quick market stats for the coverage area:

| Metric | Calculation |
|--------|-------------|
| Sales This Month | Count of sales in last 30 days |
| Avg $/SF by Class | Grouped average for O, K, D, E |
| Volume Trend | Compare this month vs last month |
| Hot Blocks | Blocks with most sales activity |

**Backend:** New endpoint `GET /api/dashboard/market-pulse`
- Aggregate from sales table
- Group by building class
- Calculate month-over-month change
- No auth required (public market data)

**Frontend:** Small stat cards + optional mini bar chart (Chart.js) for class breakdown.

---

### Section 4: Top Opportunities (Bottom)

Auto-surfaced properties user should look at:

| Criteria | Why |
|----------|-----|
| Highest FAR gap not in portfolio | Biggest upside they haven't saved |
| Recent sales below market | Potential value plays |
| New violations on large properties | Distress signals |

**Backend:** Enhance existing `/api/opportunities` or create `/api/dashboard/opportunities`
- Exclude properties already in user's portfolio
- Limit to top 5
- Include reason tag ("High FAR Gap", "Below Market", etc.)

**Frontend:** Compact property cards with "Add to Portfolio" quick action.

---

## New Routes Summary

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/dashboard/portfolio-summary` | Yes | Portfolio stats |
| `GET /api/dashboard/activity` | Yes | Recent changes on watched properties |
| `GET /api/dashboard/market-pulse` | No | Area-wide market stats |
| `GET /api/dashboard/opportunities` | Optional | Auto-surfaced opportunities |

---

## Frontend Structure

```
Dashboard Tab
├── Portfolio Summary Row (4 stat cards)
├── Two-Column Layout
│   ├── Left: Activity Feed (scrollable list)
│   └── Right: Market Pulse (stat cards + chart)
└── Top Opportunities Row (5 property cards)
```

**Layout approach:** CSS Grid, 2 columns for middle section, full-width rows for top/bottom.

**State:** Load all 4 endpoints on dashboard mount, show loading skeletons.

---

## Implementation Notes

### Portfolio Summary Endpoint

```javascript
// Pseudocode - adapt to your patterns
app.get('/api/dashboard/portfolio-summary', requireAuth, async (req, res) => {
  // 1. Get user's portfolio BBLs
  // 2. Query properties for those BBLs (assesstot, far_gap)
  // 3. Query violations where issue_date > 7 days ago
  // 4. Aggregate and return
});
```

Key fields to return:
- `propertyCount`
- `totalAssessed`
- `newViolations` (count)
- `avgFarGap`
- `avgOpportunityScore`

### Activity Feed Endpoint

Query pattern:
1. Get portfolio BBLs
2. Union query across sales, violations, permits for those BBLs
3. Filter by date range
4. Sort by date
5. Limit to 20 most recent

Return format:
```json
{
  "activities": [
    {
      "type": "sale",
      "bbl": "1008010001",
      "address": "123 Main St",
      "description": "Sold for $5.2M",
      "date": "2025-12-01",
      "meta": { "price": 5200000 }
    }
  ]
}
```

### Market Pulse Endpoint

Aggregation queries:
- `SELECT COUNT(*) FROM sales WHERE sale_date > now() - interval '30 days'`
- `SELECT bldgclass, AVG(price_per_sf) FROM sales GROUP BY bldgclass`
- Compare current month count vs previous month

### Dashboard Frontend

Add new tab "Dashboard" as first tab (or make it the default view).

On mount:
```javascript
async function loadDashboard() {
  const [summary, activity, market, opportunities] = await Promise.all([
    auth.fetch('/api/dashboard/portfolio-summary').then(r => r.json()),
    auth.fetch('/api/dashboard/activity').then(r => r.json()),
    fetch('/api/dashboard/market-pulse').then(r => r.json()),
    fetch('/api/dashboard/opportunities').then(r => r.json())
  ]);
  
  renderDashboard({ summary, activity, market, opportunities });
}
```

---

## Validation Checklist

- [ ] Dashboard tab appears (or is default view)
- [ ] Portfolio summary shows correct counts
- [ ] New violations badge shows when applicable
- [ ] Activity feed populates with recent changes
- [ ] Market pulse shows current month stats
- [ ] Opportunities excludes properties already in portfolio
- [ ] Clicking activity item opens property detail
- [ ] Clicking opportunity card opens property detail
- [ ] Dashboard loads in < 2 seconds
- [ ] Works when not logged in (shows "Sign in" for portfolio section)

---

## Edge Cases

| Case | Handling |
|------|----------|
| Empty portfolio | Show "Add properties to see portfolio stats" |
| No recent activity | Show "No recent activity on watched properties" |
| Not logged in | Show portfolio section with sign-in prompt, still show market pulse |
| API error | Show error state per section, don't break whole dashboard |

---

## Files Modified

| File | Changes |
|------|---------|
| `server.js` | Add 4 new dashboard endpoints |
| `public/index.html` | Add dashboard tab, layout, and render functions |

---

## Next Steps

After this PRP:
- **PRP 2.2**: Map Heatmap Layer (opportunity density, price heatmap)
- **PRP 2.3**: Property Due Diligence Page (full-page tabbed view)
