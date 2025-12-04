# PRP 3.2: Export & Reporting

**Phase:** Priority 3 - Power User Features  
**Estimated Time:** 2-3 hours  
**Dependencies:** PRP 2.3 helpful (due diligence page) but not required  
**Outputs:** CSV exports for lists, PDF report for single property

> **Architectural Note:** Export functionality should fetch data from the unified `/api/data` endpoint (PRP-1.0) with active filters applied. This ensures exports reflect the same filtered view users see in the UI. For server-side exports, add `?format=csv` query parameter to `/api/data` to return CSV instead of JSON.

---

## Goal

Let users get data out of the app for external analysis, sharing with partners, or offline review.

**Current state:** Data trapped in UI  
**Target state:** Export buttons for CSV, basic PDF property report

---

## Export Types

| Export | Trigger | Format | Content |
|--------|---------|--------|---------|
| Property List | Button on list view | CSV | Current filtered results |
| Portfolio | Button on portfolio tab | CSV | All portfolio properties |
| Search Results | Button after running saved search | CSV | Search matches |
| Property Report | Button on property detail | PDF | Single property summary |

---

## CSV Exports

### Columns for Property Export

```
BBL, Address, Building Class, Owner, Lot SF, Building SF, 
Floors, Year Built, Zoning, Built FAR, Max FAR, FAR Gap, 
Unused SF, Assessed Value, Last Sale Price, Last Sale Date, 
Price/SF, Open Violations, Opportunity Score
```

### Implementation

**Option A: Client-side (simple)**

Generate CSV in browser, trigger download:
1. Collect data already loaded in UI
2. Convert to CSV string
3. Create Blob, trigger download

Pros: No backend changes, instant
Cons: Limited to data already fetched

**Option B: Server-side (complete)**

New endpoints that return CSV:
```
GET /api/export/properties?format=csv&[filters]
GET /api/export/portfolio/:id?format=csv
```

Set response headers:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="properties.csv"
```

Pros: Can include all data, proper formatting
Cons: More work

**Recommendation:** Start with client-side for speed, add server-side later if needed.

---

## PDF Property Report

### Content Sections

**Page 1: Summary**
- Property photo (if available, or map screenshot)
- Address, BBL, building class
- Key metrics table (SF, floors, year, zoning)
- Opportunity score with breakdown
- Owner info

**Page 2: Financials**
- Assessment value
- Sale history table
- Comparable sales summary
- Market context (avg $/SF for area)

**Page 3: Analysis**
- FAR gap visualization
- Zoning summary
- Distress indicators
- Open violations list

### Implementation Options

**Option A: Client-side with jsPDF**

Use jsPDF library to generate PDF in browser:
- Pros: No backend, works offline
- Cons: Limited styling, no images easily

**Option B: Server-side with Puppeteer**

Render HTML template, convert to PDF:
- Pros: Full styling control, can include maps/charts
- Cons: Requires Puppeteer install, heavier

**Option C: Third-party service**

Use PDF generation API (PDFShift, DocRaptor):
- Pros: Clean output, no server setup
- Cons: Cost, external dependency

**Recommendation:** Start with jsPDF for MVP. Upgrade to Puppeteer if quality matters for investor presentations.

---

## UI Placement

### List View
```
[Filters] [Apply] [Save Search] [↓ Export CSV]
```

### Portfolio Tab
```
My Portfolio (12 properties)    [↓ Export]
```

### Property Detail / Due Diligence Page
```
123 Main Street    [★ Save] [↓ PDF Report]
```

### After Running Saved Search
```
Showing: "Office opportunities" (15 matches)  [↓ Export]
```

---

## CSV Generation (Client-side)

```javascript
function exportToCSV(data, filename) {
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => escapeCSV(row[h])).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  
  downloadFile(csv, filename, 'text/csv');
}

function escapeCSV(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## PDF Generation (jsPDF approach)

```javascript
async function generatePropertyPDF(bbl) {
  const property = await fetchPropertyDetail(bbl);
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(property.address, 20, 20);
  
  // Key stats
  doc.setFontSize(12);
  doc.text(`BBL: ${property.bbl}`, 20, 35);
  doc.text(`Class: ${property.bldgclass}`, 20, 42);
  // ... more fields
  
  // Tables for sales, violations
  // Use jspdf-autotable plugin for nice tables
  
  doc.save(`${property.address.replace(/\s/g, '_')}_report.pdf`);
}
```

For better PDFs, use `jspdf-autotable` plugin for tables.

---

## Validation Checklist

- [ ] Export CSV button appears on property list
- [ ] CSV downloads with correct filename
- [ ] CSV opens correctly in Excel/Sheets
- [ ] All expected columns present
- [ ] Special characters escaped properly
- [ ] Portfolio export works
- [ ] PDF report generates without error
- [ ] PDF contains key property info
- [ ] PDF is readable/formatted reasonably

---

## Edge Cases

| Case | Handling |
|------|----------|
| Empty list | Disable export button or show "Nothing to export" |
| Very large export (1000+) | Warn user, consider pagination or server-side |
| Missing data fields | Show empty cell, don't break CSV |
| PDF generation fails | Show error toast, log for debugging |

---

## Dependencies to Add

```bash
# For PDF generation (client-side)
# Add via CDN or npm:
# - jspdf
# - jspdf-autotable (optional, for tables)
```

CDN approach (add to index.html):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Add export buttons, CSV/PDF generation functions |
| `server.js` | (Optional) Add `/api/export/*` endpoints for server-side |

---

## Future Enhancements

- Branded PDF with logo
- Map screenshot in PDF
- Excel format (.xlsx) with multiple sheets
- Scheduled report emails
- Custom column selection for CSV

---

## Next Steps

After this PRP:
- **PRP 3.3**: Notes & Activity Log
