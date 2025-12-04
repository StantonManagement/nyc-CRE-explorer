# NYC CRE Explorer - Upgrade Roadmap

**Created:** December 2, 2025  
**Target Users:** High-net-worth family office / sophisticated CRE investors  
**Reference:** Himmel + Meringoff style deal sourcing

---

## Vision

Transform from a demo tool into a production-grade deal sourcing platform for sophisticated CRE investors who need to identify undervalued, underperforming, or distressed properties in NYC.

---

## Phase Overview

| Phase | Name | Goal | PRPs |
|-------|------|------|------|
| 0 | Foundation | Migrate to Supabase, real data | 0.1 - 0.5 |
| 1 | Investment Analytics | FAR gap, opportunity scoring | 1.1 - 1.4 |
| 2 | Distress Signals | Violations, permits, flags | 2.1 - 2.4 |
| 3 | Ownership Intelligence | Owner search, portfolio tracking | 3.1 - 3.4 |
| 4 | Comp Analysis | Market context, trends | 4.1 - 4.3 |
| 5 | User Features | Auth, persistent portfolios | 5.1 - 5.4 |
| 6 | Alerts | Proactive notifications | 6.1 - 6.3 |

---

## Phase 0: Foundation (Supabase Migration)

### Why
- JSON file doesn't scale past ~1000 properties
- No multi-user support
- No real-time capabilities
- Can't do complex queries efficiently

### Steps

| PRP | Task | Est. Time | Status |
|-----|------|-----------|--------|
| 0.1 | Supabase project setup + schema | 20 min | ⬜ |
| 0.2 | Migrate data fetcher to Supabase | 45 min | ⬜ |
| 0.3 | Migrate server.js routes | 1 hr | ⬜ |
| 0.4 | Update frontend for new API | 30 min | ⬜ |
| 0.5 | Fetch full Midtown South dataset | 15 min | ⬜ |

### Milestone
App runs on Supabase with real neighborhood data (~500+ properties)

---

## Phase 1: Core Investment Analytics

### Why
Sophisticated investors need to quickly identify opportunity. FAR gap, sale-to-assessed delta, and ownership tenure are the key signals.

### Steps

| PRP | Task | Est. Time | Status |
|-----|------|-----------|--------|
| 1.1 | FAR Gap analysis (computed columns + UI) | 45 min | ⬜ |
| 1.2 | Sale vs Assessed Value delta | 30 min | ⬜ |
| 1.3 | Ownership tenure calculation | 30 min | ⬜ |
| 1.4 | "Opportunity Score" composite metric | 45 min | ⬜ |

### Milestone
Properties ranked by investment potential. Ready to demo to Andrea.

---

## Phase 2: Distress Signals

### Why
Motivated sellers often show up in DOB data before they list. Violations = deferred maintenance = potential motivation. Permits = repositioning or prep-to-sell.

### Steps

| PRP | Task | Est. Time | Status |
|-----|------|-----------|--------|
| 2.1 | Add violations table + fetcher | 1 hr | ⬜ |
| 2.2 | Add permits table + fetcher | 1 hr | ⬜ |
| 2.3 | Distress score calculation | 45 min | ⬜ |
| 2.4 | Distress indicators in UI | 30 min | ⬜ |

### Milestone
Distressed properties automatically flagged and ranked.

---

## Phase 3: Ownership Intelligence

### Why
Knowing who owns what helps identify consolidation plays, estate situations, and negotiation leverage.

### Steps

| PRP | Task | Est. Time | Status |
|-----|------|-----------|--------|
| 3.1 | Owner search + "show all by owner" | 45 min | ⬜ |
| 3.2 | Owner portfolio size indicator | 30 min | ⬜ |
| 3.3 | Entity type detection (LLC vs individual) | 30 min | ⬜ |
| 3.4 | Owner detail panel | 45 min | ⬜ |

### Milestone
Full ownership intelligence layer. Click owner → see everything they own.

---

## Phase 4: Comp Analysis

### Why
Context matters. Is $500/SF good or bad for this building class in this micro-neighborhood?

### Steps

| PRP | Task | Est. Time | Status |
|-----|------|-----------|--------|
| 4.1 | Avg $/SF by building class (map view) | 45 min | ⬜ |
| 4.2 | "Similar properties" panel | 45 min | ⬜ |
| 4.3 | Sales trend chart by submarket | 1 hr | ⬜ |

### Milestone
Market context for any property. Instant comp analysis.

---

## Phase 5: User Features

### Why
Multiple family members / partners need their own portfolios and saved searches.

### Steps

| PRP | Task | Est. Time | Status |
|-----|------|-----------|--------|
| 5.1 | Supabase auth (magic link email) | 45 min | ⬜ |
| 5.2 | Persistent portfolios (per user) | 45 min | ⬜ |
| 5.3 | Saved searches | 30 min | ⬜ |
| 5.4 | Notes on properties | 30 min | ⬜ |

### Milestone
Multi-user product with persistent data.

---

## Phase 6: Alerts (Future)

### Why
Best deals go fast. Get notified when something matches your criteria.

### Steps

| PRP | Task | Est. Time | Status |
|-----|------|-----------|--------|
| 6.1 | Alert configuration UI | 45 min | ⬜ |
| 6.2 | Supabase edge function for new filings | 1.5 hr | ⬜ |
| 6.3 | Email notifications (Resend/SendGrid) | 1 hr | ⬜ |

### Milestone
Proactive deal alerts via email.

---

## Recommended Stopping Points

| After Phase | What You Have | Demo Ready? |
|-------------|---------------|-------------|
| 0 | Working app on real database | ⬜ Dev only |
| 1 | Useful investment analytics | ✅ Show Andrea |
| 2 | Serious deal sourcing tool | ✅ Daily use |
| 3 | Full due diligence workflow | ✅ Professional |
| 5 | Multi-user product | ✅ Share with family |

---

## Technical Decisions

### Why Supabase?
- PostgreSQL = powerful queries, PostGIS for geo
- Built-in auth (magic link = no passwords)
- Real-time subscriptions for alerts
- Edge functions for background jobs
- Generous free tier (500MB, 50K requests/mo)
- Can self-host later if needed

### Why Keep Express Backend?
- Already works
- Keeps API logic in one place
- Frontend stays simple (no Supabase SDK in browser)
- Easier to add caching, rate limiting later

### Stack After Migration
```
Frontend:  Vanilla JS + MapLibre (unchanged)
Backend:   Express.js → Supabase (PostgreSQL)
Auth:      Supabase Auth
Hosting:   Render / Railway (same as before)
```

---

## Data Sources

| Data | Source | Update Frequency |
|------|--------|------------------|
| Properties (PLUTO) | NYC Open Data | Quarterly |
| Sales | NYC Open Data | Monthly |
| Violations | NYC DOB | Daily |
| Permits | NYC DOB | Daily |
| Ownership/Liens | ACRIS | Daily |

---

## File Structure After All Phases

```
nyc-cre-app/
├── .claude/commands/
├── PRPs/
│   ├── phase-0/
│   │   ├── PRP-0.1-supabase-setup.md
│   │   ├── PRP-0.2-migrate-fetcher.md
│   │   └── ...
│   ├── phase-1/
│   └── ...
├── supabase/
│   ├── schema.sql
│   ├── migrations/
│   └── functions/
├── public/
│   └── index.html
├── server.js
├── fetch_nyc_data.js
├── .env
├── ROADMAP.md          ← You are here
└── README.md
```

---

## Next Action

Execute **PRP 0.1: Supabase Project Setup + Schema**
