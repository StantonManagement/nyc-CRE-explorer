# PRP 2.3: Property Due Diligence Page

**Phase:** Priority 2 - Differentiation  
**Estimated Time:** 5-6 hours  
**Dependencies:** PRPs 1.1, 1.2 complete (owner intel, comps working)  
**Outputs:** Full-page property view with tabbed sections for deep research

> **Architectural Note:** This page aggregates data from multiple sources: unified `/api/data` for general property info, `/api/properties/:bbl/comps` for comparable sales, `/api/owners/:name` for owner details. All endpoints use `FILTER_CONFIG` (PRP-1.0) for consistent building class definitions.

---

## Goal

Expand the cramped detail panel into a full-page view where users can do real due diligence on a property.

**Current state:** Side panel with limited info, lots of scrolling  
**Target state:** Dedicated route `/property/:bbl` with organized tabs

---

## Page Structure

```
┌─────────────────────────────────────────────────────┐
│ ← Back to List          123 Main Street    [★ Save] │
│ Office (O4) · 50,000 SF · Built 1925 · Block 00801 │
├─────────────────────────────────────────────────────┤
│ [Overview] [Financials] [Zoning] [Distress] [Docs]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│                   Tab Content                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Tab 1: Overview

What's here:
- Key stats grid (assessed value, lot SF, building SF, floors, year built)
- Owner name (clickable → owner panel)
- Opportunity score with breakdown
- Mini map showing location
- Comparable sales summary (from PRP 1.2)

Data source: Existing `/api/properties/:bbl` + `/api/properties/:bbl/comps`

---

## Tab 2: Financials

What's here:
- Assessment history (if available, or just current)
- Sale history table (date, price, $/SF, buyer if known)
- Sale vs assessed value delta
- Implied cap rate (if enough data)
- Chart: price history over time

Data source: Sales from `/api/properties/:bbl` response

---

## Tab 3: Zoning

What's here:
- Current zoning district + description
- Built FAR vs allowed FAR (visual bar)
- Unused SF calculation
- Air rights potential (unused FAR × lot area)
- What could be built (reference zoning use groups)

Data source: Properties table fields (zonedist1, builtfar, commfar, residfar, lotarea)

Consider: Link to NYC Zoning Resolution or ZoLa for deep dive

---

## Tab 4: Distress

What's here:
- Open violations list (HPD, DOB)
- Violation history chart (count over time)
- Recent permits (last 2 years)
- Distress score with factors
- Red flags summary

Data source: Violations and permits from `/api/properties/:bbl` response

---

## Tab 5: Documents

What's here:
- ACRIS links organized by type:
  - Deeds
  - Mortgages  
  - Satisfactions
  - Liens/Judgments
- Direct links to NYC systems (DOB NOW, HPD Online, ZoLa)

Data source: Construct ACRIS URLs from BBL (no API needed)

ACRIS search URL pattern:
```
https://a836-acris.nyc.gov/DS/DocumentSearch/BBLResult?borough={boro}&block={block}&lot={lot}
```

---

## Routing

Add client-side route handling:

| URL | View |
|-----|------|
| `/` | Main app (list + map) |
| `/property/:bbl` | Due diligence page |

Use `history.pushState` for navigation without full reload.

Back button should return to previous list position.

---

## New Backend Needs

**None required** - all data available from existing endpoints:
- `/api/properties/:bbl` (already returns sales, violations, permits)
- `/api/properties/:bbl/comps` (from PRP 1.2)

Optional enhancement: Add assessment history if available from PLUTO historical data.

---

## Frontend Implementation

### Navigation
- Property cards/markers link to `/property/{bbl}` instead of opening panel
- Or: keep panel for quick view, add "Full Details →" button that navigates

### Page Layout
- Full viewport height
- Fixed header with property name + back button
- Tab bar below header
- Scrollable content area

### Tab Rendering
- Lazy load tab content on first click
- Cache loaded tabs during session
- Default to Overview tab

---

## Validation Checklist

- [ ] URL `/property/:bbl` loads due diligence page
- [ ] Back button returns to list
- [ ] All 5 tabs render without errors
- [ ] Tab switching is instant (no flash)
- [ ] Overview shows key stats + opportunity score
- [ ] Financials shows sale history
- [ ] Zoning shows FAR gap visualization
- [ ] Distress shows violations list
- [ ] Documents has working ACRIS links
- [ ] "Save to Portfolio" works from this page
- [ ] Page works on direct load (refresh `/property/xxx`)

---

## Edge Cases

| Case | Handling |
|------|----------|
| Invalid BBL | Show "Property not found" with back link |
| No sales history | Show "No recorded sales" in Financials tab |
| No violations | Show "No open violations" (good news!) |
| Missing zoning data | Show "Zoning data unavailable" |

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Add due diligence page template, tab logic, routing |
| `server.js` | Add route to serve index.html for `/property/*` paths |

---

## Design Notes

- Match existing dark theme
- Tabs should feel native, not like a separate app
- Print-friendly would be nice (future enhancement)
- Mobile: stack tabs vertically or use dropdown

---

## Next Steps

After this PRP:
- **PRP 3.1**: Saved Searches with Alerts
- **PRP 3.2**: Export & Reporting (PDF report from this page)
