# PRP 3.1: Saved Searches with Alerts

**Phase:** Priority 3 - Power User Features  
**Estimated Time:** 4-5 hours  
**Dependencies:** PRP 1.3 complete (auth working)  
**Outputs:** Save filter combos, optional email alerts when new matches appear

> **Architectural Note:** Saved searches store filter state as JSONB and execute via the unified `/api/data` endpoint (PRP-1.0). Filter keys must use semantic names (`office`, `multifam`, etc.) that map to `FILTER_CONFIG` building class groups. This ensures saved searches remain valid as filter definitions evolve.

---

## Goal

Let users save their filter combinations and optionally get notified when new properties match.

**Current state:** Filters reset on page reload  
**Target state:** "Save Search" button, list of saved searches, email alerts for new matches

---

## User Flow

1. User sets filters (building class = O, FAR gap > 2, etc.)
2. Clicks "Save Search"
3. Names it ("Office opportunities in Midtown")
4. Optionally enables alerts (daily/weekly)
5. Search appears in saved searches list
6. Running saved search applies those filters
7. If alerts on, user gets email when new properties match

---

## Data Model

Schema already exists from PRP 0.1:

```
saved_searches
├── id (uuid)
├── user_id (references auth.users)
├── name (text)
├── filters (jsonb)
├── alert_enabled (boolean)
├── alert_frequency (text: 'daily', 'weekly', 'instant')
├── last_alert_at (timestamp)
├── created_at
└── updated_at
```

Filters JSONB example:
```json
{
  "bldgclass": "office",
  "minFarGap": 2,
  "minYear": 1950,
  "maxYear": 2000,
  "zipcode": "10001"
}
```

**Note:** Use semantic filter keys (`office`, `retail`, `multifam`, `industrial`) instead of building class prefixes. These map to `FILTER_CONFIG` groups on the server.

---

## New Endpoints

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/searches` | GET | Yes | List user's saved searches |
| `/api/searches` | POST | Yes | Create saved search |
| `/api/searches/:id` | PUT | Yes | Update search (name, filters, alert settings) |
| `/api/searches/:id` | DELETE | Yes | Delete saved search |
| `/api/searches/:id/run` | GET | Yes | Execute search, return matching properties |

### POST /api/searches

Request:
```json
{
  "name": "Office opportunities",
  "filters": { "bldgclass": "office", "minFarGap": 2 },
  "alert_enabled": true,
  "alert_frequency": "daily"
}
```

### GET /api/searches/:id/run

Applies saved filters to `/api/data` query (unified endpoint from PRP-1.0), returns matches.

Also updates `last_run_at` timestamp (optional field to add).

---

## Frontend Changes

### Save Search Button

Add next to filter controls:

```
[Filter controls...] [Apply] [Save Search]
```

Clicking "Save Search" opens modal:
- Name input
- Toggle: "Email me when new properties match"
- Frequency dropdown (if alerts on): Daily / Weekly
- Save button

### Saved Searches List

Add to sidebar or as dropdown:

```
Saved Searches
├── Office opportunities (12 matches) [Run] [Edit] [×]
├── Distressed retail (3 matches) [Run] [Edit] [×]
└── + Save Current Search
```

Clicking "Run" applies filters and refreshes list.

### Visual Indicator

When running a saved search, show which search is active:

```
Showing: "Office opportunities" [Clear]
```

---

## Alert System

### Option A: Supabase Edge Function (Recommended)

Create scheduled function that runs daily/weekly:

1. Query `saved_searches` where `alert_enabled = true`
2. For each search, run filters against properties
3. Compare to previous run (store last result count or BBL list)
4. If new matches, send email via Resend/SendGrid
5. Update `last_alert_at`

### Option B: External Cron

If Edge Functions too complex:
- Create `/api/alerts/process` endpoint (admin only)
- Call via external cron service (cron-job.org, GitHub Actions)
- Same logic as above

### Email Content

Subject: "NYC CRE: 3 new properties match 'Office opportunities'"

Body:
- Search name
- New match count
- Top 3 new properties (address, class, FAR gap)
- Link to run search in app

---

## Implementation Notes

### Storing Filter State

Capture current filters as object:
```javascript
function getCurrentFilters() {
  return {
    bldgclass: document.getElementById('class-filter')?.value || null,
    minFarGap: document.getElementById('far-filter')?.value || null,
    // ... other active filters
  };
}
```

### Running Saved Search

```javascript
async function runSavedSearch(searchId) {
  const response = await auth.fetch(`/api/searches/${searchId}/run`);
  const data = await response.json();
  
  // Apply to UI
  renderPropertyList(data.properties);
  setActiveSearch(searchId);
}
```

### Detecting New Matches

For alerts, need to track what user has already seen. Options:

1. **Count-based:** Alert if count increased since last alert
2. **BBL-based:** Store list of BBLs, alert on new BBLs not in list
3. **Date-based:** Alert on properties added to DB since last alert

BBL-based is most accurate but requires storing more data.

---

## Validation Checklist

- [ ] "Save Search" button appears near filters
- [ ] Modal captures name and alert preference
- [ ] Saved search appears in list
- [ ] Running saved search applies correct filters
- [ ] "Clear" removes active search state
- [ ] Edit modal allows changing name/alerts
- [ ] Delete removes search
- [ ] Alerts toggle on/off correctly
- [ ] (If implementing alerts) Test email sends

---

## Edge Cases

| Case | Handling |
|------|----------|
| No filters set | Disable save, or save as "All properties" |
| Duplicate name | Allow (or warn) |
| Search returns 0 | Still save, show "0 matches" |
| Max searches | Consider limit (10-20 per user) |
| Alert with 0 new | Don't send email |

---

## Files Modified

| File | Changes |
|------|---------|
| `server.js` | Add 5 search endpoints |
| `public/index.html` | Add save modal, searches list, active search indicator |
| `supabase/functions/` | (Optional) Alert processing edge function |

---

## Future Enhancements

- Share saved search with others (read-only link)
- Duplicate/clone search
- Search result count badge updates live
- Instant alerts (webhook when new property added)

---

## Next Steps

After this PRP:
- **PRP 3.2**: Export & Reporting
- **PRP 3.3**: Notes & Activity Log
