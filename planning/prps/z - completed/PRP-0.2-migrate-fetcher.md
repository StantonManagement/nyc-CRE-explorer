# PRP 0.2: Migrate Data Fetcher to Supabase

**Phase:** 0 - Foundation  
**Estimated Time:** 45 minutes  
**Dependencies:** PRP 0.1 complete (Supabase setup)  
**Outputs:** `fetch_nyc_data.js` writes to Supabase instead of JSON

---

## Goal

Update the data fetcher script to:
- Pull data from NYC Open Data APIs (same as before)
- Write to Supabase instead of `data/combined_data.json`
- Use upsert to handle updates cleanly
- Keep JSON backup as fallback

---

## Prerequisites

- PRP 0.1 complete (Supabase connected, tables exist)
- `test-supabase.js` passes
- NYC Open Data accessible (no API key needed)

---

## Step 1: Backup Existing Fetcher

```bash
cp fetch_nyc_data.js fetch_nyc_data.backup.js
```

---

## Step 2: Create New Fetcher

Replace `fetch_nyc_data.js` with:

```javascript
/**
 * NYC CRE Data Fetcher
 * Pulls from NYC Open Data → Writes to Supabase
 * 
 * Usage: node fetch_nyc_data.js [--json-backup]
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// =============================================
// CONFIGURATION
// =============================================

const CONFIG = {
  // Midtown South bounding box (roughly 14th to 34th, 5th to 8th Ave)
  bbox: {
    minLat: 40.735,
    maxLat: 40.755,
    minLng: -73.995,
    maxLng: -73.980
  },
  // NYC Open Data endpoints
  apis: {
    pluto: 'https://data.cityofnewyork.us/resource/64uk-42ks.json',
    sales: 'https://data.cityofnewyork.us/resource/usep-8jbt.json'
  },
  // Building classes we care about
  targetClasses: ['O', 'K', 'D', 'E', 'R'], // Office, Retail, Elevator Apt, Warehouse, Condo
  // Batch size for Supabase upserts
  batchSize: 100
};

// Supabase client (using service key for writes)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =============================================
// FETCH FUNCTIONS
// =============================================

async function fetchPLUTO() {
  console.log('📥 Fetching PLUTO data...');
  
  const { minLat, maxLat, minLng, maxLng } = CONFIG.bbox;
  
  // SoQL query for Midtown South
  const query = new URLSearchParams({
    $where: `latitude between ${minLat} and ${maxLat} and longitude between ${minLng} and ${maxLng}`,
    $limit: 5000
  });
  
  const url = `${CONFIG.apis.pluto}?${query}`;
  console.log(`   URL: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PLUTO fetch failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`   Raw records: ${data.length}`);
  
  // Filter to target building classes
  const filtered = data.filter(p => {
    const classPrefix = (p.bldgclass || '').charAt(0).toUpperCase();
    return CONFIG.targetClasses.includes(classPrefix);
  });
  
  console.log(`   After class filter: ${filtered.length}`);
  return filtered;
}

async function fetchSales() {
  console.log('📥 Fetching sales data...');
  
  const { minLat, maxLat, minLng, maxLng } = CONFIG.bbox;
  
  // Get sales from last 3 years
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const dateStr = threeYearsAgo.toISOString().split('T')[0];
  
  const query = new URLSearchParams({
    $where: `sale_date > '${dateStr}' and sale_price > 100000`,
    $limit: 5000,
    $order: 'sale_date DESC'
  });
  
  const url = `${CONFIG.apis.sales}?${query}`;
  console.log(`   URL: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Sales fetch failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`   Records: ${data.length}`);
  return data;
}

// =============================================
// TRANSFORM FUNCTIONS
// =============================================

function transformProperty(raw) {
  // Build BBL from components if not present
  const bbl = raw.bbl || `${raw.borough}${String(raw.block).padStart(5, '0')}${String(raw.lot).padStart(4, '0')}`;
  
  return {
    bbl,
    address: raw.address || null,
    borough: parseInt(raw.borough) || null,
    block: parseInt(raw.block) || null,
    lot: parseInt(raw.lot) || null,
    zipcode: raw.zipcode || null,
    bldgclass: raw.bldgclass || null,
    bldgclass_desc: getBldgClassDesc(raw.bldgclass),
    ownername: raw.ownername || null,
    lotarea: parseInt(raw.lotarea) || null,
    bldgarea: parseInt(raw.bldgarea) || null,
    numfloors: parseFloat(raw.numfloors) || null,
    yearbuilt: parseInt(raw.yearbuilt) || null,
    zonedist1: raw.zonedist1 || null,
    builtfar: parseFloat(raw.builtfar) || null,
    commfar: parseFloat(raw.commfar) || null,
    residfar: parseFloat(raw.residfar) || null,
    assesstot: parseInt(raw.assesstot) || null,
    lat: parseFloat(raw.latitude) || null,
    lng: parseFloat(raw.longitude) || null
    // Note: far_gap and unused_sf are computed by PostgreSQL
  };
}

function transformSale(raw) {
  // Build BBL
  const bbl = raw.bbl || `${raw.borough}${String(raw.block).padStart(5, '0')}${String(raw.lot).padStart(4, '0')}`;
  
  const salePrice = parseInt(raw.sale_price) || null;
  const grossSf = parseInt(raw.gross_square_feet) || null;
  
  return {
    bbl,
    sale_price: salePrice,
    sale_date: raw.sale_date ? raw.sale_date.split('T')[0] : null,
    gross_sf: grossSf,
    price_per_sf: (salePrice && grossSf && grossSf > 0) ? Math.round(salePrice / grossSf) : null,
    building_class: raw.building_class_category || null,
    buyer: null, // Not in basic sales data
    seller: null
  };
}

function getBldgClassDesc(code) {
  if (!code) return null;
  const prefix = code.charAt(0).toUpperCase();
  const descs = {
    'O': 'Office',
    'K': 'Retail/Store',
    'D': 'Elevator Apartment',
    'E': 'Warehouse',
    'R': 'Condo'
  };
  return descs[prefix] || 'Other';
}

// =============================================
// SUPABASE WRITE FUNCTIONS
// =============================================

async function upsertProperties(properties) {
  console.log(`📤 Upserting ${properties.length} properties to Supabase...`);
  
  let success = 0;
  let errors = 0;
  
  // Batch upserts
  for (let i = 0; i < properties.length; i += CONFIG.batchSize) {
    const batch = properties.slice(i, i + CONFIG.batchSize);
    
    const { error } = await supabase
      .from('properties')
      .upsert(batch, { 
        onConflict: 'bbl',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`   Batch ${i}-${i + batch.length} failed:`, error.message);
      errors += batch.length;
    } else {
      success += batch.length;
      process.stdout.write(`   Progress: ${success}/${properties.length}\r`);
    }
  }
  
  console.log(`\n   ✅ Upserted: ${success}, ❌ Errors: ${errors}`);
  return { success, errors };
}

async function upsertSales(sales) {
  console.log(`📤 Upserting ${sales.length} sales to Supabase...`);
  
  // Filter to only sales with matching properties
  const { data: existingBbls } = await supabase
    .from('properties')
    .select('bbl');
  
  const bblSet = new Set(existingBbls?.map(p => p.bbl) || []);
  const validSales = sales.filter(s => bblSet.has(s.bbl));
  
  console.log(`   Sales matching properties: ${validSales.length}/${sales.length}`);
  
  if (validSales.length === 0) {
    console.log('   ⚠️ No matching sales to insert');
    return { success: 0, errors: 0 };
  }
  
  let success = 0;
  let errors = 0;
  
  for (let i = 0; i < validSales.length; i += CONFIG.batchSize) {
    const batch = validSales.slice(i, i + CONFIG.batchSize);
    
    const { error } = await supabase
      .from('sales')
      .insert(batch);
    
    if (error) {
      // Likely duplicates, try individual inserts
      for (const sale of batch) {
        const { error: singleError } = await supabase
          .from('sales')
          .insert(sale);
        if (!singleError) success++;
        else errors++;
      }
    } else {
      success += batch.length;
    }
    
    process.stdout.write(`   Progress: ${success}/${validSales.length}\r`);
  }
  
  console.log(`\n   ✅ Inserted: ${success}, ❌ Errors: ${errors}`);
  return { success, errors };
}

// =============================================
// MAIN
// =============================================

async function main() {
  const startTime = Date.now();
  const saveJson = process.argv.includes('--json-backup');
  
  console.log('═══════════════════════════════════════════');
  console.log('  NYC CRE Data Fetcher → Supabase');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    // 1. Fetch from NYC Open Data
    const rawProperties = await fetchPLUTO();
    const rawSales = await fetchSales();
    
    // 2. Transform
    console.log('\n🔄 Transforming data...');
    const properties = rawProperties.map(transformProperty);
    const sales = rawSales.map(transformSale);
    console.log(`   Properties: ${properties.length}`);
    console.log(`   Sales: ${sales.length}`);
    
    // 3. Write to Supabase
    console.log('\n');
    const propResult = await upsertProperties(properties);
    const salesResult = await upsertSales(sales);
    
    // 4. Optional JSON backup
    if (saveJson) {
      console.log('\n💾 Saving JSON backup...');
      await fs.mkdir('data', { recursive: true });
      await fs.writeFile(
        'data/combined_data.json',
        JSON.stringify({ properties, sales }, null, 2)
      );
      console.log('   Saved to data/combined_data.json');
    }
    
    // 5. Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n═══════════════════════════════════════════');
    console.log('  COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`  Properties: ${propResult.success} upserted`);
    console.log(`  Sales: ${salesResult.success} inserted`);
    console.log(`  Time: ${elapsed}s`);
    console.log('═══════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
```

---

## Step 3: Update package.json

Make sure you have ES modules enabled. In `package.json`:

```json
{
  "name": "nyc-cre-app",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "fetch": "node fetch_nyc_data.js",
    "fetch:backup": "node fetch_nyc_data.js --json-backup",
    "test:db": "node test-supabase.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "dotenv": "^16.x",
    "express": "^5.x"
  }
}
```

---

## Step 4: Run the Fetcher

```bash
# Just to Supabase
npm run fetch

# With JSON backup (recommended first time)
npm run fetch:backup
```

Expected output:
```
═══════════════════════════════════════════
  NYC CRE Data Fetcher → Supabase
═══════════════════════════════════════════

📥 Fetching PLUTO data...
   URL: https://data.cityofnewyork.us/resource/64uk-42ks.json?...
   Raw records: 1247
   After class filter: 523

📥 Fetching sales data...
   URL: https://data.cityofnewyork.us/resource/usep-8jbt.json?...
   Records: 312

🔄 Transforming data...
   Properties: 523
   Sales: 312

📤 Upserting 523 properties to Supabase...
   Progress: 523/523
   ✅ Upserted: 523, ❌ Errors: 0

📤 Upserting 312 sales to Supabase...
   Sales matching properties: 89/312
   Progress: 89/89
   ✅ Inserted: 89, ❌ Errors: 0

═══════════════════════════════════════════
  COMPLETE
═══════════════════════════════════════════
  Properties: 523 upserted
  Sales: 89 inserted
  Time: 4.2s
═══════════════════════════════════════════
```

---

## Step 5: Verify in Supabase

1. Go to **Table Editor** → **properties**
2. You should see rows with data
3. Check that `far_gap` and `unused_sf` columns have values (computed automatically!)
4. Go to **sales** table, verify sales linked to properties

---

## Validation Checklist

- [ ] `fetch_nyc_data.js` runs without errors
- [ ] Properties appear in Supabase table
- [ ] `far_gap` computed column has values
- [ ] `unused_sf` computed column has values
- [ ] Sales appear in Supabase table
- [ ] JSON backup created (if using `--json-backup`)

---

## Troubleshooting

### "Invalid API key" or "JWT" errors
You need to use `SUPABASE_SERVICE_KEY` (not anon key) for writes that bypass RLS.

### "violates foreign key constraint" on sales
Sales reference properties by BBL. The fetcher filters to only insert sales with matching properties.

### No data returned from NYC Open Data
- Check your internet connection
- NYC Open Data may be temporarily down
- Try the URL directly in browser to test

### "duplicate key" errors
That's fine - upsert handles this. If you're seeing many, the data is already loaded.

---

## Next Step

Proceed to **PRP 0.3: Migrate Server Routes to Supabase**

---

## Files Created/Modified

| File | Action |
|------|--------|
| `fetch_nyc_data.js` | Replaced |
| `fetch_nyc_data.backup.js` | Created (backup) |
| `package.json` | Modified (scripts, type) |
| `data/combined_data.json` | Created (if --json-backup) |

---

## Rollback

```bash
# Restore original fetcher
mv fetch_nyc_data.backup.js fetch_nyc_data.js

# Clear Supabase tables if needed (in SQL Editor)
truncate properties cascade;
truncate sales cascade;
```
