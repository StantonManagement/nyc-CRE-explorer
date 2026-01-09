# Project Status: NYC CRE Explorer

**Last Updated:** December 3, 2025
**Current Version:** 1.0.2

## 🟢 System Status
- **Backend Server:** Active (Port 3000) - Supabase Connected
- **Frontend:** Active (Single Page App - Vanilla JS)
- **Data Source:** Supabase (PostgreSQL) - 3500+ properties / 800+ sales loaded.
- **External APIs:**
  - Mapbox GL JS (Active with Satellite/Street toggle)
  - NYC Open Data (Fetcher script ready)
  - ACRIS (Deep linking active)

## ✅ Recent Accomplishments
10. **Map Experience Overhaul (v1.0.2)**
    - **Satellite View:** Added toggle to switch between Street and Satellite imagery.
    - **Marker Upgrade:** Increased marker size, added hover effects, and implemented distinct "selected" state with halo effect.
    - **Fixes:** Resolved missing pins issue (lat/lng coordinate mapping) and fixed Mapbox token authentication errors.
    - **Performance:** Disabled Mapbox telemetry to clear console errors.
11. **UI/UX Refinements**
    - **Navigation:** Fixed "Back to Property" button in Owner Panel using robust view template restoration.
    - **Stability:** Verified project dependencies (Vanilla JS + Express) for clean maintenance.
12. **Saved Searches (PRP 3.1)**
    - Implemented "Save Search" modal and functionality.
    - Added "Saved Searches" list to sidebar.
    - Wired up search restoration logic.
    - Note: Alerts are placeholder for now (Phase 6).
13. **Export & Reporting (PRP 3.2)**
    - **CSV Export:** Added "Export to CSV" button to sidebar to download current filtered property list.
    - **PDF Reports:** Added "PDF Report" button to property detail panel for professional tear-sheets.
    - **Tech:** Integrated `jspdf` and `jspdf-autotable` for client-side generation.
14. **Notes & Activity Log (PRP 3.3)**
    - **Notes:** Added private notes and tagging system to property detail panel.
    - **Activity Log:** Implemented backend logging for key actions (View, Note, Portfolio, Export).
    - **Dashboard:** Updated "Recent Activity" feed to show real user history.
    - **Schema:** Added `property_notes` and `activity_log` tables.
15. **Distressed Owners Browser (PRP 4.1)**
    - **New View:** Added "Distressed Owners" browser with scoring and filtering.
    - **Algorithm:** Implemented `distressScore` calculation based on violations, portfolio contamination, and chronic issues.
    - **Integration:** Connected to Owner Portfolio view for deep dive.

1.  **Fetch Full Data (PRP 0.5)**
    - Expanded dataset to 3,500+ properties in Midtown South.
    - Cleaned BBL data to match 450+ sales to specific properties.
    - Configured fetcher for deep sales history lookup using block filtering.
2.  **Frontend Update (PRP 0.4)**
    - Implemented server-side filtering and pagination support.
    - Added "Opportunities" tab with deal scoring badges (HOT, OPP, UPSIDE).
    - Added clickable owner names to view full portfolios.
    - Improved FAR Gap filtering with dropdown control.
3.  **Server Migration to Supabase (PRP 0.3)**
    - Replaced local JSON queries with real-time Supabase calls.
    - Added new filtering (FAR gap, owner) and sorting capabilities.
    - Implemented stats and opportunity score endpoints.
4.  **FAR Gap Feature (Deal Sourcing)**
    - Implemented backend calculation for Unused FAR and FAR Utilization.
    - Added "Underbuilt (> 2.0 FAR Gap)" filter to the UI.
    - Updated property panel to highlight deal opportunities with visual cues.
5.  **Project Reorganization**
    - Consolidated file structure according to `CLAUDE.md`.
    - Moved commands to `.claude/commands`.
    - Cleaned up duplicate files (`server1.js`, `fetch_data.js`).
6.  **Distress Signals (Phase 2)**
    - Implemented `violations` and `permits` tables in Supabase.
    - Added fetchers for HPD Violations from NYC Open Data.
    - Created `distress_score` algorithm to flag properties with open violations.
    - Updated UI with "Distress Signal" filter and detailed violation history in property panel.
7.  **Map Implementation Fix**
    - Replaced Mapbox GL JS (which required a paid/invalid token) with **MapLibre GL JS**.
    - Switched to **CartoDB Positron** tiles (free, high-quality, no API key needed).
    - Map now renders correctly with building class color-coded markers.
8.  **ACRIS Integration Fix**
    - Fixed "View on ACRIS" deep link.
    - Implemented zero-padding for Block (5 digits) and Lot (4 digits).
    - Updated endpoint to `BBLResult` for direct access to document results.
9.  **Core Investment Analytics (Phase 1)**
    - Implemented refined "Opportunity Score" algorithm (0-100 scale).
    - Added "Ownership Tenure" calculation (based on last sale date).
    - Added "Assessment Ratio" (Assessed Value vs Sale Price).
    - Updated UI property panel with "Investment Analytics" section.
    - Updated backend `/api/opportunities` to fetch real-time sales data for scoring.

## 🏗 Features Implemented
- **Deal Sourcing:** Identify underbuilt properties with unused air rights.
- **Distress Analysis:** Flag properties with open HPD violations.
- **Investment Scoring:** Composite score based on FAR gap, tenure, and value.
- **Interactive Map:** Zoom/pan with property markers.
- **Property List:** Sidebar with filtering by building class, distress level, and FAR gap.
- **Detail View:** Slide-out panel with zoning, ownership, tax, sales, and violations history.
- **Portfolio Management:** Add/remove properties to a local storage portfolio.
- **Search:** Real-time search by address, owner, or BBL.
- **Sales Data:** Recent sales tab with sorting.
- **Owner Intelligence:** Click owner names to see their full portfolio.

## 📋 Current File Structure
```text
nyc-cre-app/
├── .claude/commands/      # AI instructions/prompts
├── planning/              # Project planning & context
│   ├── prps/              # Product Requirement Proposals
│   ├── thoughts/          # Claude conversation logs & brainstorming
│   └── research/          # Data sources & research docs
├── public/
│   └── index.html         # Main frontend application
├── data/
│   └── combined_data.json # Data cache
├── server.js              # Express API server
├── fetch_nyc_data.js      # Data fetching script
├── package.json           # Dependencies
└── README.md              # Documentation
```

## 🚀 Full Upgrade Roadmap

**Vision:** Transform from a demo tool into a production-grade deal sourcing platform for sophisticated CRE investors.

### Phase 0: Foundation (Supabase Migration)
| Step | Task | Dependencies | Est. Time |
|------|------|--------------|-----------|
| 0.1 | ✅ Supabase project setup + schema | None | 20 min |
| 0.2 | ✅ Migrate data fetcher to Supabase | 0.1 | 45 min |
| 0.3 | ✅ Migrate server.js routes to Supabase | 0.2 | 1 hr |
| 0.4 | ✅ Update frontend to work with new API | 0.3 | 30 min |
| 0.5 | ✅ Fetch full Midtown South dataset | 0.2 | 15 min |
**Milestone:** App runs on Supabase with real data

### Phase 1: Core Investment Analytics
| Step | Task | Dependencies | Est. Time |
|------|------|--------------|-----------|
| 1.1 | ✅ FAR Gap analysis (computed columns + UI) | Phase 0 | 45 min |
| 1.2 | ✅ Sale vs Assessed Value delta | Phase 0 | 30 min |
| 1.3 | ✅ Ownership tenure calculation | Phase 0 | 30 min |
| 1.4 | ✅ "Opportunity Score" composite metric | 1.1, 1.2, 1.3 | 45 min |
**Milestone:** Properties ranked by investment potential

### Phase 2: Distress Signals
| Step | Task | Dependencies | Est. Time |
|------|------|--------------|-----------|
| 2.1 | ✅ Add violations table + fetcher | Phase 0 | 1 hr |
| 2.2 | ✅ Add permits table + fetcher | Phase 0 | 1 hr |
| 2.3 | ✅ Distress score calculation | 2.1, 2.2 | 45 min |
| 2.4 | ✅ Distress indicators in UI | 2.3 | 30 min |
**Milestone:** Distressed properties flagged automatically

### Phase 3: Ownership Intelligence
| Step | Task | Dependencies | Est. Time |
|------|------|--------------|-----------|
| 3.1 | Owner search + "show all by owner" | Phase 0 | 45 min |
| 3.2 | Owner portfolio size indicator | 3.1 | 30 min |
| 3.3 | Entity type detection (LLC vs individual) | 3.1 | 30 min |
| 3.4 | Owner detail panel | 3.1, 3.2, 3.3 | 45 min |
| 4.1 | ✅ Distressed Owners Browser | Phase 2 | 45 min |
**Milestone:** Full ownership intelligence layer

### Phase 4: Comp Analysis
| Step | Task | Dependencies | Est. Time |
|------|------|--------------|-----------|
| 4.1 | Avg $/SF by building class (map view) | Phase 0 | 45 min |
| 4.2 | "Similar properties" panel | 4.1 | 45 min |
| 4.3 | Sales trend chart by submarket | 4.1 | 1 hr |
**Milestone:** Market context for any property

### Phase 5: User Features
| Step | Task | Dependencies | Est. Time |
|------|------|--------------|-----------|
| 5.1 | Supabase auth (magic link) | Phase 0 | 45 min |
| 5.2 | Persistent portfolios (per user) | 5.1 | 45 min |
| 5.3 | ✅ Saved searches | 5.1 | 30 min |
| 5.4 | ✅ Notes on properties | 5.1 | 30 min |
**Milestone:** Multi-user with persistent data

### Phase 6: Alerts (Future)
| Step | Task | Dependencies | Est. Time |
|------|------|--------------|-----------|
| 6.1 | Alert configuration UI | 5.1 | 45 min |
| 6.2 | Supabase edge function for new filings | 6.1 | 1.5 hr |
| 6.3 | Email notifications | 6.2 | 1 hr |
**Milestone:** Proactive deal alerts

### Visual Roadmap
```text
PHASE 0 ─────────────────────────────────────────────────────►
  [0.1 Setup] → [0.2 Fetcher] → [0.3 Server] → [0.4 Frontend] → [0.5 Data]
                                                                    │
PHASE 1 ◄───────────────────────────────────────────────────────────┘
  [1.1 FAR Gap] → [1.2 Sale Delta] → [1.3 Tenure] → [1.4 Opp Score]
                                                          │
PHASE 2 ◄─────────────────────────────────────────────────┘
  [2.1 Violations] → [2.2 Permits] → [2.3 Distress Score] → [2.4 UI]
                                                                 │
PHASE 3 ◄────────────────────────────────────────────────────────┘
  [3.1 Owner Search] → [3.2 Portfolio Size] → [3.3 Entity Type] → [3.4 Panel]
                                                                       │
PHASE 4 ◄──────────────────────────────────────────────────────────────┘
  [4.1 Avg $/SF] → [4.2 Similar Props] → [4.3 Trend Chart]
                                                │
PHASE 5 ◄───────────────────────────────────────┘
  [5.1 Auth] → [5.2 Portfolios] → [5.3 Searches] → [5.4 Notes]
                                                        │
PHASE 6 ◄───────────────────────────────────────────────┘
  [6.1 Alert UI] → [6.2 Edge Function] → [6.3 Email]
```

### Recommended Stopping Points
- **After Phase 0:** Working app on real database
- **After Phase 1:** Useful investment tool - can demo to Andrea
- **After Phase 2:** Serious deal sourcing capability
- **After Phase 3:** Full due diligence workflow
- **After Phase 5:** Multi-user product

## 🐛 Known Issues
- *None currently reported.*

---
*This file tracks the high-level status of the project and should be updated after major changes.*
