
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkData() {
  console.log('Checking distress data...');

  // 1. Count total properties
  const { count: propCount, error: propError } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });
  
  if (propError) console.error('Prop Error:', propError);
  console.log('Total Properties:', propCount);

  // 2. Count total violations
  const { count: violCount, error: violError } = await supabase
    .from('violations')
    .select('*', { count: 'exact', head: true });
    
  if (violError) console.error('Viol Error:', violError);
  console.log('Total Violations:', violCount);

  // 3. Count OPEN violations
  const { count: openViolCount } = await supabase
    .from('violations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Open');
    
  console.log('Open Violations:', openViolCount);

  // 4. Check linkage - Do we have violations for our properties?
  // Fetch 5 violations and check their BBLs
  const { data: sampleViolations } = await supabase
    .from('violations')
    .select('bbl')
    .limit(5);
    
  if (sampleViolations && sampleViolations.length > 0) {
    console.log('Sample Violation BBLs:', sampleViolations.map(v => v.bbl));
    
    // Check if these BBLs exist in properties table
    const bbls = sampleViolations.map(v => v.bbl);
    const { data: props } = await supabase
      .from('properties')
      .select('bbl')
      .in('bbl', bbls);
      
    console.log(`Matched ${props.length} properties for 5 sample violations`);
  } else {
    console.log('No violations found to sample.');
  }
}

checkData();
