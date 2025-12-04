# Filtering Logic & System Architecture

**Date:** December 3, 2025
**Status:** ✅ Unified & Consistent

This document outlines the filtering logic used across the application. Following the "System-Wide Fix" implemented on Dec 3, 2025, all components now use semantic filter names and consistent building class groupings.

---

## 1. Filter Definitions

The application uses **Semantic Filter Keys** instead of raw single-letter prefixes. This allows for complex groupings (e.g., "Multifamily" covering multiple building classes).

| Filter Key | Display Label | NYC Building Classes Included | Description |
|------------|---------------|-------------------------------|-------------|
| `office` | **Office** | `O` | Office buildings (O1-O9) |
| `retail` | **Retail** | `K` | Store buildings (K1-K9) |
| `multifam` | **Multifam** | `C`, `D`, `S`, `R` | Walk-up Apts (C), Elevator Apts (D), Mixed-Use (S), Condos (R) |
| `industrial`| **Industrial** | `E`, `F`, `G`, `L` | Warehouses (E), Factories (F), Garages (G), Lofts (L) |

---

## 2. Component Implementation

### A. Frontend Buttons (`index.html`)
Buttons now pass the semantic key:
```html
<button data-filter="office">Office</button>
<button data-filter="multifam">Multifam</button>
<!-- etc -->
```

### B. Map & Property List (Server-Side)
*   **Endpoint:** `/api/properties`
*   **Logic:** The server receives the semantic key (e.g., `?bldgclass=multifam`) and translates it into a robust SQL query.
*   **Implementation:**
    *   `office` → `WHERE bldgclass ILIKE 'O%'`
    *   `multifam` → `WHERE bldgclass ILIKE ANY(ARRAY['C%', 'D%', 'S%', 'R%'])`
    *   `industrial` → `WHERE bldgclass ILIKE ANY(ARRAY['E%', 'F%', 'G%', 'L%'])`

### C. Recent Sales List (Client-Side)
*   **Endpoint:** `/api/sales` (Fetches all recent sales)
*   **Logic:** The frontend filtering function (`renderList`) mirrors the server's grouping logic.
*   **Implementation:**
    ```javascript
    if (filter === 'multifam') return ['C','D','S','R'].includes(prefix);
    if (filter === 'industrial') return ['E','F','G','L'].includes(prefix);
    ```

### D. Comparable Sales ("Comps")
*   **Endpoint:** `/api/properties/:bbl/comps`
*   **Logic:** Automatically detects the subject property's class and searches for peers within its broad category.
    *   **Residential Group:** A, B, C, D, R, S
    *   **Commercial Group:** O, K, L, C (Commercial Walk-ups)
    *   **Industrial Group:** E, F, G
*   **Matching:** ±150% Size, 0.5 mile radius.

---

## 3. Verification Checklist

| Feature | Check |
|---------|-------|
| **Multifamily Map** | Selecting "Multifam" shows Walk-ups (C) and Condos (R), not just Elevator Apts. |
| **Office Sales** | Selecting "Office" in Recent Sales hides Residential Co-ops. |
| **Comps** | A Co-op (D4) shows other Apartments as comps, not Houses or Offices. |
