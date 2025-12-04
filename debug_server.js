import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSalesJoin() {
  console.log('\n--- Testing Sales Join ---');
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        properties (
          address
        )
      `)
      .limit(1);

    if (error) {
      console.error('Sales Join Error:', JSON.stringify(error, null, 2));
      if (error.code === 'PGRST200') {
        console.error('Hint: The "properties" relationship might not exist or is named differently.');
      }
    } else {
      console.log('Sales Join Success:', data.length > 0 ? 'Found data' : 'No data');
      if (data.length > 0) console.log('Sample:', JSON.stringify(data[0], null, 2));
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

async function testCompsJoin() {
  console.log('\n--- Testing Comps Logic (Inner Join) ---');
  try {
    // This mirrors the query in the comps endpoint
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        properties!inner (
          address, bldgclass, bldgarea, lat, lng
        )
      `)
      .limit(1);

    if (error) {
      console.error('Comps Join Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('Comps Join Success:', data.length > 0 ? 'Found data' : 'No data');
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

async function traceBBL(bbl) {
  console.log(`\n--- Tracing BBL: ${bbl} ---`);
  
  // 1. Fetch Property Details
  const { data: prop, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('bbl', bbl)
    .single();
    
  if (propError) {
    console.error('Property Fetch Error:', propError);
    return;
  }
  console.log('Property Found:', prop.address);
  console.log('Coordinates:', prop.lat, prop.lng, '(lat/lng)');
  console.log('Coordinates (alt):', prop.latitude, prop.longitude, '(latitude/longitude)' );

  // 2. Fetch Sales for this BBL
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*')
    .eq('bbl', bbl);
    
  console.log('Direct Sales Fetch:', sales ? sales.length : 'Error', salesError || '');

  // 3. Test Comps Logic
  console.log('Testing Comps Query...');
  const radius = 0.5;
  const latBuffer = parseFloat(radius) / 69;
  const minLat = prop.lat - latBuffer;
  const maxLat = prop.lat + latBuffer;
  
  const { data: comps, error: compsError } = await supabase
    .from('sales')
    .select(` 
      *,
      properties!inner (
        address, bldgclass, bldgarea, lat, lng
      )
    `)
    .neq('bbl', bbl)
    .limit(5);
    
  if (compsError) {
    console.error('Comps Query Error:', JSON.stringify(compsError, null, 2));
  } else {
    console.log('Comps Query Success. Raw rows:', comps.length);
    if (comps.length > 0) {
      console.log('Sample Comp Prop:', JSON.stringify(comps[0].properties, null, 2));
    }
  }
}

async function testPropertiesQuery() {
  console.log('\n--- 1. Connectivity Check (Fetch One) ---');
  try {
     const { data: single, error: singleError } = await supabase
      .from('properties')
      .select('bbl')
      .limit(1);
      
     console.log('Single fetch:', single ? 'OK' : 'Failed', singleError || '');
  } catch (e) {
     console.log('Single fetch exception:', e);
  }

  console.log('\n--- 2. Testing Properties List Query (WITH JOIN) ---');
  try {
    const limit = 10;
    const offset = 0;
    
    const { data, error } = await supabase
      .from('properties')
      .select('*, violations(violation_type, status)') // WITH violations join
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('Properties Query Error:', JSON.stringify(error, null, 2));
    } else {
      console.log(`Properties Query Success. Fetched ${data.length} rows.`);
    }
  } catch (e) {
    console.error('Exception:', e);
  }
}

async function run() {
  await testPropertiesQuery();
}

run();
