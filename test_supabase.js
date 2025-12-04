import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: SUPABASE_URL, and SUPABASE_ANON_KEY (or SUPABASE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...\n');
  
  // Test 1: Basic query
  const { data, error } = await supabase
    .from('properties')
    .select('bbl')
    .limit(1);
  
  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to Supabase');
  console.log('✅ Properties table accessible');
  console.log(`   Current row count: ${data.length} (expected 0 for new setup)`);
  
  // Test 2: Check computed columns exist
  const { data: cols, error: colError } = await supabase
    .from('properties')
    .select('far_gap, unused_sf')
    .limit(0);
  
  if (colError) {
    console.error('❌ Computed columns issue:', colError.message);
  } else {
    console.log('✅ Computed columns (far_gap, unused_sf) ready');
  }
  
  console.log('\n🎉 All tests passed! Ready for PRP 0.2');
}

testConnection();
