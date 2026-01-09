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
  // Expanded bounding box: Flatiron to Hudson Yards (approx 10th St to 42nd St, 10th Ave to Park Ave)
  bbox: {
    minLat: 40.730,
    maxLat: 40.760,
    minLng: -74.005,
    maxLng: -73.975
  },
  // NYC Open Data endpoints
  apis: {
    pluto: 'https://data.cityofnewyork.us/resource/64uk-42ks.json',
    sales: 'https://data.cityofnewyork.us/resource/usep-8jbt.json',
    hpd_violations: 'https://data.cityofnewyork.us/resource/wvxf-dwi5.json',
    dob_violations: 'https://data.cityofnewyork.us/resource/3h2n-5cm9.json',
    dob_permits: 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json'
  },
  // Building classes we care about (Commercial + Mixed Use + Major Residential)
  targetClasses: ['O', 'K', 'E', 'D', 'R'], // Office, Retail, Warehouse, Elevator Apt, Condo
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
    $limit: 20000
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

async function fetchSales(targetBlocks = []) {
  console.log('📥 Fetching sales data...');
  
  // Get sales from last 3 years
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const dateStr = threeYearsAgo.toISOString().split('T')[0];
  
  let whereClause = `sale_date > '${dateStr}' and sale_price > 100000 and borough = '1'`;
  
  // Filter by blocks if provided to find relevant sales
  if (targetBlocks.length > 0) {
    // Chunk blocks to avoid URL length limits (approx 100 blocks per chunk)
    // But for simplicity, let's try one batch first or just use the first 200 blocks
    // A better approach: fetch all recent sales in borough if blocks list is too long?
    // No, fetching specific blocks is better.
    // Let's just use the blocks filter. If it fails, we catch it.
    console.log(`   Filtering for ${targetBlocks.length} specific blocks`);
    const blockList = targetBlocks.map(b => `'${b}'`).join(',');
    whereClause += ` and block in (${blockList})`;
  }

  const query = new URLSearchParams({
    $where: whereClause,
    $limit: 20000,
    $order: 'sale_date DESC'
  });
  
  const url = `${CONFIG.apis.sales}?${query}`;
  // console.log(`   URL: ${url}`); // URL might be huge
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Sales fetch failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`   Records: ${data.length}`);
  return data;
}

async function fetchHPDViolations(targetBlocks = []) {
  console.log('📥 Fetching HPD violations...');
  
  if (targetBlocks.length === 0) return [];

  const CHUNK_SIZE = 50;
  let allData = [];

  for (let i = 0; i < targetBlocks.length; i += CHUNK_SIZE) {
    const chunk = targetBlocks.slice(i, i + CHUNK_SIZE);
    
    let whereClause = "violationstatus = 'Open'";
    const blockList = chunk.map(b => `'${b}'`).join(',');
    whereClause += ` and block in (${blockList})`;

    const query = new URLSearchParams({
      $where: whereClause,
      $limit: 50000, // Higher limit per batch
      $order: 'approveddate DESC'
    });
    
    const url = `${CONFIG.apis.hpd_violations}?${query}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`   ⚠️ HPD Batch ${i} failed: ${response.status}`);
      continue;
    }
    
    const data = await response.json();
    allData = allData.concat(data);
    process.stdout.write(`   Fetched ${allData.length} HPD records...\r`);
  }
  
  console.log(`\n   Total HPD Records: ${allData.length}`);
  return allData;
}

async function fetchDOBViolations(targetBlocks = []) {
  console.log('📥 Fetching DOB violations...');
  
  if (targetBlocks.length === 0) return [];

  const CHUNK_SIZE = 50;
  let allData = [];

  for (let i = 0; i < targetBlocks.length; i += CHUNK_SIZE) {
    const chunk = targetBlocks.slice(i, i + CHUNK_SIZE);
    
    // violation_active doesn't exist in this dataset.
    // DEBUG: Remove status filter to check if block matching works
    let whereClause = "disposition_date IS NULL";
    // Restore quotes for DOB block numbers (Dataset uses Text for block)
    // AND PAD THEM to 5 digits (e.g. '00847' instead of '847')
    const blockList = chunk.map(b => `'${String(b).padStart(5, '0')}'`).join(',');
    whereClause += ` and block in (${blockList})`;

    const query = new URLSearchParams({
      $where: whereClause,
      $limit: 50000,
      $order: 'issue_date DESC'
    });
    
    const url = `${CONFIG.apis.dob_violations}?${query}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errText = await response.text();
      console.warn(`   ⚠️ DOB Batch ${i} failed: ${response.status} - ${errText.substring(0, 200)}`);
      continue;
    }
    
    const data = await response.json();
    allData = allData.concat(data);
    process.stdout.write(`   Fetched ${allData.length} DOB records...\r`);
  }
  
  console.log(`\n   Total DOB Records: ${allData.length}`);
  return allData;
}

// =============================================
// TRANSFORM FUNCTIONS
// =============================================

function transformProperty(raw) {
  // Build BBL from components if not present
  let bbl = raw.bbl || `${raw.borough}${String(raw.block).padStart(5, '0')}${String(raw.lot).padStart(4, '0')}`;
  
  // Clean BBL: remove decimal suffix if present (e.g. "1006980037.00000000")
  if (bbl && typeof bbl === 'string' && bbl.includes('.')) {
    bbl = bbl.split('.')[0];
  }
  
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
    lng: parseFloat(raw.longitude) || null,
    last_sale_date: raw.lastsaledate ? raw.lastsaledate.split('T')[0] : null,
    last_sale_price: parseInt(raw.lastsaleprice) || null,
    year_altered: parseInt(raw.yearaltered1) || null,
    landmark: raw.landmark || null,
    lot_front: parseFloat(raw.lotfront) || null,
    lot_depth: parseFloat(raw.lotdepth) || null,
    extension: raw.extension || null
    // Note: far_gap and unused_sf are computed by PostgreSQL
  };
}

function transformSale(raw) {
  // Build BBL
  let bbl = raw.bbl || `${raw.borough}${String(raw.block).padStart(5, '0')}${String(raw.lot).padStart(4, '0')}`;
  
  // Clean BBL
  if (bbl && typeof bbl === 'string' && bbl.includes('.')) {
    bbl = bbl.split('.')[0];
  }
  
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

function transformHPDViolation(raw) {
  // Parse int to handle "00123" strings, then pad strictly
  const block = String(parseInt(raw.block)).padStart(5, '0');
  const lot = String(parseInt(raw.lot)).padStart(4, '0');
  const bbl = `${raw.boroid || raw.borough}${block}${lot}`;
  
  return {
    bbl,
    violation_type: 'HPD',
    violation_id: raw.violationid,
    description: raw.novdescription,
    status: raw.violationstatus,
    issue_date: raw.approveddate ? raw.approveddate.split('T')[0] : null
  };
}

function transformDOBViolation(raw) {
  // Parse int to handle "00123" strings, then pad strictly
  const block = String(parseInt(raw.block)).padStart(5, '0');
  const lot = String(parseInt(raw.lot)).padStart(4, '0');
  const bbl = `${raw.borocode || raw.boro || raw.borough}${block}${lot}`;

  return {
    bbl,
    violation_type: 'DOB',
    violation_id: raw.isn_dob_bis_viol,
    description: raw.description,
    status: raw.disposition_date ? 'Closed' : 'Open',
    issue_date: raw.issue_date ? String(raw.issue_date).substring(0, 10) : null
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

async function upsertViolations(violations) {
  console.log(`📤 Upserting ${violations.length} violations...`);
  
  if (violations.length === 0) return { success: 0, errors: 0 };

  // Filter to only violations with matching properties in our DB
  const { data: existingBbls } = await supabase
    .from('properties')
    .select('bbl');

  const bblSet = new Set(existingBbls?.map(p => p.bbl) || []);
  const validViolations = violations.filter(v => bblSet.has(v.bbl));

  console.log(`   Violations matching properties: ${validViolations.length}/${violations.length}`);

  if (validViolations.length === 0) {
    console.log('   ⚠️ No matching violations to insert');
    return { success: 0, errors: 0 };
  }

  let success = 0;
  let errors = 0;

  for (let i = 0; i < validViolations.length; i += CONFIG.batchSize) {
    const batch = validViolations.slice(i, i + CONFIG.batchSize);
    const { error } = await supabase.from('violations').upsert(batch, { onConflict: 'bbl,violation_id', ignoreDuplicates: true });
    
    if (error) {
      console.error(`   Batch failed: ${error.message}`);
      errors += batch.length;
    } else {
      success += batch.length;
    }
    process.stdout.write(`   Progress: ${success}/${validViolations.length}\r`);
  }
  console.log(`\n   ✅ Upserted: ${success}, ❌ Errors: ${errors}`);
  return { success, errors };
}

async function updateDistressScores() {
  console.log('🧮 Updating distress scores...');
  const { error } = await supabase.rpc('calculate_distress_scores');
  if (error) console.error('   ❌ Score update failed:', error.message);
  else console.log('   ✅ Scores updated');
}

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
    
    // Extract unique blocks from properties to target sales search
    const uniqueBlocks = [...new Set(rawProperties.map(p => p.block))].filter(b => b);
    console.log(`   Identified ${uniqueBlocks.length} unique blocks for fetch filtering`);
    
    const rawSales = await fetchSales(uniqueBlocks);
    const rawHPD = await fetchHPDViolations(uniqueBlocks);
    const rawDOB = await fetchDOBViolations(uniqueBlocks);
    
    // 2. Transform
    console.log('\n🔄 Transforming data...');
    const properties = rawProperties.map(transformProperty);
    const sales = rawSales.map(transformSale);
    const violations = [
      ...rawHPD.map(transformHPDViolation),
      ...rawDOB.map(transformDOBViolation)
    ];
    
    console.log(`   Properties: ${properties.length}`);
    console.log(`   Sales: ${sales.length}`);
    console.log(`   Violations: ${violations.length}`);
    
    // 3. Write to Supabase
    console.log('\n');
    const propResult = await upsertProperties(properties);
    const salesResult = await upsertSales(sales);
    const violationsResult = await upsertViolations(violations);
    await updateDistressScores();
    
    // 4. Optional JSON backup
    if (saveJson) {
      console.log('\n💾 Saving JSON backup...');
      await fs.mkdir('data', { recursive: true });
      await fs.writeFile(
        'data/combined_data.json',
        JSON.stringify({ properties, sales, violations }, null, 2)
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
    console.log(`  Violations: ${violationsResult.success} upserted`);
    console.log(`  Time: ${elapsed}s`);
    console.log('═══════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
