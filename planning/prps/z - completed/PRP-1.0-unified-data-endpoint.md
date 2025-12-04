# PRP 1.0: Unified Data Endpoint & Architecture

**Phase:** 1 - Core Stabilization  
**Status:** ✅ Implemented (Dec 3, 2025)  
**Supersedes:** PRP 0.1 - 0.5 (Foundation Phase)  

---

## 1. Problem Statement
The initial prototype suffered from "incrementalism":
*   Filtering logic was split between frontend and backend, leading to inconsistencies (e.g., "Multifamily" meant different things in different places).
*   Legacy artifacts (`combined_data.json`) created confusion about the source of truth.
*   Routing conflicts (`/:bbl` vs `/:bbl/comps`) caused API errors (`Unexpected token <`).
*   Frontend state management for "Recent Sales" vs "Property List" was disjointed.

## 2. The Unified Architecture

We have transitioned to a **Unified Data Endpoint** architecture where the backend is the single source of truth for data shape and filtering logic.

### A. Single Source of Truth (Supabase)
*   **Action:** Deleted `data/combined_data.json`.
*   **Result:** All data (Properties, Sales, Violations) is pulled live from PostgreSQL/Supabase.

### B. Semantic Filtering (Centralized Logic)
*   **Problem:** Frontend filtered by `prefix`, Backend filtered by `ilike`. Mismatches caused data loss.
*   **Solution:** Frontend sends **Semantic Keys** (`office`, `retail`, `multifam`, `industrial`). Backend maps these to **SQL Groups**.
    *   `multifam` → `C`, `D`, `S`, `R` (Walk-up, Elevator, Mixed, Condo)
    *   `industrial` → `E`, `F`, `G`, `L` (Warehouse, Factory, Garage, Loft)
*   **Benefit:** Changing the definition of "Industrial" only requires a change in `server.js`.

### C. Robust Routing
*   **Action:** Reordered Express routes in `server.js` to ensure specific paths (`/api/properties/:bbl/comps`) are matched before generic paths (`/api/properties/:bbl`).
*   **Benefit:** Eliminates 404/500 fallbacks to HTML.

### D. Frontend Unification
*   **Action:** Updated `renderList` (Sales) and `loadProperties` (Map) to use the same semantic filter keys.
*   **Result:** Clicking "Office" consistently filters both the Map and the Sales List.

---

## 3. Implementation Details

### Server (`server.js`)
- **Endpoint:** `/api/properties`
- **Logic:** Accepts `bldgclass` (semantic key). Constructs complex `OR` queries for groups.
- **Endpoint:** `/api/properties/:bbl/comps`
- **Logic:** Uses granular class matching (Small Homes vs Apts) + size range (±150%) + radius (0.5mi).

### Frontend (`index.html`)
- **Filters:** Buttons pass semantic keys.
- **Sales List:** Filters strictly based on semantic keys.
- **Context:** Displays specific error messages for API failures.

---

## 4. Verification Status

| Component | Status | Verification Method |
|-----------|--------|---------------------|
| **Data Source** | ✅ Unified | Deleted local JSON; App works on DB only. |
| **Map Filtering** | ✅ Verified | "Multifam" shows Walk-ups & Condos. |
| **Sales Filtering** | ✅ Verified | "Office" hides Residential Co-ops. |
| **Comps** | ✅ Verified | Loading reliably; Matches property type. |
| **Routing** | ✅ Verified | No more "Unexpected token <" errors. |

---

## 5. Next Steps (Phase 2)

Now that the data foundation is stable and unified:
1.  **Distress Signals:** Deepen the distress scoring (Phase 2).
2.  **Portfolio Mgmt:** Enhance the "Add to Portfolio" feature.
3.  **UI Polish:** Improve mobile responsiveness.
