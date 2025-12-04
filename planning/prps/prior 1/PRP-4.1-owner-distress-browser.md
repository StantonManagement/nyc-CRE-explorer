# PRP 4.1: Owner Distress Browser

**Phase:** Priority 4 - Deal Sourcing  
**Estimated Time:** 3-4 hours  
**Dependencies:** Phase 0-2 complete (violations loaded, owner endpoint working)  
**Outputs:** Ranked list of owners showing distress signals across their portfolios

> **Architectural Note:** Create a specialized `/api/owners/distress` endpoint that aggregates portfolio-level metrics. This is separate from the unified `/api/data` endpoint (PRP-1.0) because it returns owner-level aggregations, not individual properties. However, it should respect `FILTER_CONFIG` if filtering by building class (e.g., "distressed office owners").

---

## Goal

Surface owners who may be motivated to sell based on portfolio-level distress signals.

**Current state:** Can see distress per property, but no way to find troubled owners  
**Target state:** Browse owners ranked by distress score, see portfolio health at a glance

---

## Why This Matters

Sophisticated investors don't just look for distressed buildings - they look for distressed *owners*. Signs:

- Multiple buildings with open violations = overwhelmed
- Old violations never cured = cash-strapped or disengaged
- Long hold period + violations = tired landlord or estate
- Large portfolio with concentrated problems = potential bulk deal

---

## Distress Signals

| Signal | Weight | Source |
|--------|--------|--------|
| Open violations per property | High | violations table |
| Avg age of open violations | High | violations.issue_date |
| % of portfolio with violations | Medium | calculated |
| Holding period > 15 years | Medium | sales table |
| No recent permits (deferred maintenance) | Low | permits table |
| Single-asset owner with issues | Low | property count |

---

## Owner Distress Score

Calculate 0-100 score per owner:

```
Base score = 0

+ (open_violations_count × 3)           cap at 30
+ (avg_violation_age_months × 0.5)      cap at 20  
+ (pct_portfolio_with_violations × 30)  cap at 30
+ (avg_holding_years > 15 ? 10 : 0)     flat 10
+ (no_permits_2_years ? 5 : 0)          flat 5
+ (single_property_owner ? 5 : 0)       flat 5

Cap total at 100
```

Higher = more distressed = more likely motivated seller

---

## New Endpoint

### GET /api/owners/distressed

Query params:
- `limit` - number of owners (default 50)
- `minScore` - minimum distress score (default 20)
- `minProperties` - minimum portfolio size (default 1)
- `maxProperties` - maximum portfolio size (optional)

Response:
```json
{
  "owners": [
    {
      "name": "123 MAIN LLC",
      "entityType": "LLC",
      "distressScore": 78,
      "propertyCount": 3,
      "totalAssessed": 12500000,
      "openViolations": 24,
      "avgViolationAgeDays": 180,
      "pctPropertiesWithViolations": 100,
      "avgHoldingYears": 18.5,
      "topIssues": ["HPD violations", "Long hold", "No recent permits"],
      "properties": [
        { "bbl": "...", "address": "...", "openViolations": 12 }
      ]
    }
  ],
  "count": 50
}
```

### Backend Logic

1. Aggregate violations by owner name (via property join)
2. Calculate metrics per owner
3. Compute distress score
4. Sort by score descending
5. Return top N

SQL approach (pseudocode):
```sql
WITH owner_stats AS (
  SELECT 
    p.ownername,
    COUNT(DISTINCT p.bbl) as property_count,
    SUM(p.assesstot) as total_assessed,
    COUNT(v.id) FILTER (WHERE v.status = 'OPEN') as open_violations,
    AVG(EXTRACT(days FROM now() - v.issue_date)) as avg_violation_age
  FROM properties p
  LEFT JOIN violations v ON p.bbl = v.bbl
  GROUP BY p.ownername
  HAVING COUNT(DISTINCT p.bbl) >= 1
)
SELECT *, 
  -- calculate score here or in JS
FROM owner_stats
ORDER BY open_violations DESC
LIMIT 50
```

---

## Frontend: Distressed Owners View

### New Tab or Section

```
[Properties] [Sales] [Owners] [Distressed] [Portfolio]
```

Or as filter within Owners tab:
```
Owners    [All ▼]  →  [All | Distressed | Large Portfolios]
```

### List View

```
┌────────────────────────────────────────────────────────┐
│ Distressed Owners                    Showing 50 of 234 │
├────────────────────────────────────────────────────────┤
│ 🔴 85  ACME HOLDINGS LLC                               │
│        3 properties · $12.5M · 24 open violations      │
│        Issues: HPD violations, 18yr hold, no permits   │
│                                            [View →]    │
├────────────────────────────────────────────────────────┤
│ 🟠 72  SMITH FAMILY TRUST                              │
│        1 property · $4.2M · 8 open violations          │
│        Issues: DOB violations, single asset            │
│                                            [View →]    │
├────────────────────────────────────────────────────────┤
│ 🟡 58  456 OAK STREET CORP                             │
│        2 properties · $8.1M · 6 open violations        │
│        Issues: Long hold, concentrated violations      │
│                                            [View →]    │
└────────────────────────────────────────────────────────┘
```

### Score Badge Colors

| Score | Color | Label |
|-------|-------|-------|
| 70+ | Red 🔴 | High distress |
| 50-69 | Orange 🟠 | Moderate distress |
| 30-49 | Yellow 🟡 | Some signals |
| < 30 | Gray | Low distress |

### Click → Owner Panel

Opens owner intelligence panel (from PRP 1.1) with distress details highlighted.

---

## Filters

| Filter | Options |
|--------|---------|
| Min Score | Slider 0-100 or presets (30+, 50+, 70+) |
| Portfolio Size | Any, 1 only, 2-5, 6+ |
| Entity Type | All, LLC, Individual, Trust |
| Violation Type | Any, HPD, DOB |

---

## Validation Checklist

- [ ] Distressed owners endpoint returns ranked list
- [ ] Distress score calculation matches spec
- [ ] Score badge colors correct
- [ ] Clicking owner opens detail panel
- [ ] Filters work (min score, portfolio size)
- [ ] Empty state if no distressed owners found
- [ ] Performance acceptable (< 2 sec load)

---

## Edge Cases

| Case | Handling |
|------|----------|
| Owner with no violations | Score near 0, exclude from distressed view |
| Missing violation dates | Use created_at or exclude from age calc |
| Very large portfolios | May dominate list - consider per-property normalization |
| Same owner, different spellings | Won't match (known limitation) |

---

## Future Enhancements

- Owner name normalization (match "SMITH LLC" with "SMITH L.L.C.")
- Trend indicators (getting worse vs improving)
- "Reach out" tracking (contacted, responded, etc.)
- Integration with skip tracing for contact info
- Alert when owner distress score increases

---

## Files Modified

| File | Changes |
|------|---------|
| `server.js` | Add `/api/owners/distressed` endpoint |
| `public/index.html` | Add distressed owners view/tab, filters, list rendering |

---

## Deal Sourcing Angle

This is the feature that turns the tool from "interesting data browser" into "deal sourcing machine."

Pitch to Andrea: *"Instead of waiting for listings, we proactively identify owners who are likely motivated to sell based on portfolio stress signals. These are the off-market opportunities."*
