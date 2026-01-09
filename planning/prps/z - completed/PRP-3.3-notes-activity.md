# PRP 3.3: Notes & Activity Log

**Phase:** Priority 3 - Power User Features  
**Estimated Time:** 3-4 hours  
**Dependencies:** PRP 1.3 complete (auth working)  
**Outputs:** Private notes on properties, activity tracking, optional tags

> **Architectural Note:** Notes and activity are user-specific features requiring authentication (PRP-1.3). Create dedicated endpoints `/api/notes` and `/api/activity` protected by auth middleware. These are separate from the unified `/api/data` endpoint (PRP-1.0) as they store user-generated content, not property data.

---

## Goal

Let users track their research and see their interaction history with properties.

**Current state:** No way to annotate properties or see past activity  
**Target state:** Add notes to any property, see "you viewed this 5 times", tag properties

---

## Features

### 1. Property Notes

- Add/edit private notes on any property
- Notes visible in property detail and portfolio view
- Markdown support optional (or just plain text)

### 2. Activity Log

Track user interactions:
- Property viewed
- Added to portfolio
- Removed from portfolio
- Note added/edited
- Report exported

### 3. Tags (Optional)

Quick status labels:
- 🔥 Hot
- 👀 Watching
- 📞 Contacted
- ❌ Pass
- 📋 In DD

---

## Data Model

### New Table: property_notes

```sql
CREATE TABLE property_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  bbl text REFERENCES properties(bbl) ON DELETE CASCADE,
  content text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, bbl)
);

-- RLS
ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON property_notes
  FOR ALL USING (auth.uid() = user_id);
```

### New Table: activity_log

```sql
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  bbl text,
  action text,  -- 'view', 'portfolio_add', 'portfolio_remove', 'note', 'export'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_user_bbl ON activity_log(user_id, bbl);
CREATE INDEX idx_activity_user_date ON activity_log(user_id, created_at DESC);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## New Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/notes/:bbl` | GET | Get note for property |
| `/api/notes/:bbl` | PUT | Create/update note |
| `/api/notes/:bbl` | DELETE | Delete note |
| `/api/notes` | GET | List all user's notes |
| `/api/activity` | GET | Get user's activity log |
| `/api/activity` | POST | Log an activity |
| `/api/properties/:bbl/activity` | GET | Activity for specific property |

### GET /api/activity

Query params:
- `limit` - number of items (default 50)
- `bbl` - filter to specific property
- `action` - filter by action type

Response:
```json
{
  "activities": [
    {
      "id": "...",
      "bbl": "1008010001",
      "action": "view",
      "metadata": {},
      "created_at": "2025-12-03T10:30:00Z",
      "property": {
        "address": "123 Main St"
      }
    }
  ]
}
```

---

## Frontend Changes

### Notes UI

In property detail, add notes section:

```
┌─────────────────────────────────┐
│ 📝 Notes                  [Edit]│
├─────────────────────────────────┤
│ Called owner 12/1 - not        │
│ interested in selling yet.      │
│ Follow up Q2 2026.              │
│                                 │
│ Updated: Dec 1, 2025            │
└─────────────────────────────────┘
```

Edit mode: textarea + save/cancel buttons

### Tags UI

Below notes or in property card:

```
Tags: [🔥 Hot] [📋 In DD] [+ Add]
```

Clicking tag toggles it. Clicking "+ Add" shows tag picker.

### Activity in Property Detail

Small section showing:

```
Your Activity
• Viewed 5 times (last: 2 days ago)
• Added to portfolio: Nov 28
• Note updated: Dec 1
```

### Activity Log Page/Tab

Optional dedicated view showing all activity:

```
Recent Activity
─────────────────────────────
Today
  10:30  Viewed 123 Main St
  10:25  Added note to 456 Oak Ave
  
Yesterday
  14:00  Added 789 Elm St to portfolio
  11:30  Viewed 789 Elm St
```

---

## Logging Activity

Call activity endpoint on key actions:

| Action | When to Log |
|--------|-------------|
| `view` | Property detail opened |
| `portfolio_add` | Added to portfolio |
| `portfolio_remove` | Removed from portfolio |
| `note` | Note saved |
| `export` | PDF/CSV exported |
| `search_run` | Saved search executed |

Frontend logs via:
```javascript
function logActivity(bbl, action, metadata = {}) {
  if (!auth.isLoggedIn()) return;
  auth.fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bbl, action, metadata })
  });
}
```

Fire and forget - don't await, don't block UI.

---

## Validation Checklist

- [ ] Can add note to property
- [ ] Note persists across sessions
- [ ] Note shows in property detail
- [ ] Can edit existing note
- [ ] Can delete note
- [ ] Tags can be added/removed
- [ ] Activity logs on property view
- [ ] Activity logs on portfolio add/remove
- [ ] Can view activity log
- [ ] Activity shows property address (joined)
- [ ] Notes visible in portfolio list

---

## Edge Cases

| Case | Handling |
|------|----------|
| Very long note | Allow, but maybe warn at 5000+ chars |
| Rapid views | Debounce - don't log view if < 30 seconds since last |
| Deleted property | Keep notes/activity, show "Property no longer in database" |
| No activity yet | Show "No activity yet" |

---

## Privacy

- Notes are private to user (RLS enforced)
- Activity log is private to user
- No way for other users to see your notes/activity
- Consider: ability to share notes with specific users (future)

---

## Files Modified

| File | Changes |
|------|---------|
| Supabase SQL | Create property_notes and activity_log tables |
| `server.js` | Add notes and activity endpoints |
| `public/index.html` | Add notes UI, activity display, logging calls |

---

## Future Enhancements

- Search within notes
- Filter properties by tag
- Activity heatmap (calendar view)
- Team notes (shared with collaborators)
- Note templates ("Standard DD checklist")

---

## That's All the PRPs!

You now have a complete roadmap:

**Priority 1 (Quick Wins)**
- 1.1 Owner Intelligence ✓
- 1.2 Comparable Sales ✓
- 1.3 Supabase Auth ✓

**Priority 2 (Differentiation)**
- 2.1 Dashboard ✓
- 2.2 Map Heatmap ✓
- 2.3 Due Diligence Page ✓

**Priority 3 (Power Users)**
- 3.1 Saved Searches ✓
- 3.2 Export & Reporting ✓
- 3.3 Notes & Activity Log ✓

Ship in order, validate each, iterate.
