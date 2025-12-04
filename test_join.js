import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testJoin() {
  console.log('Testing violations join...\n');
  
  // Test 1: Get properties with violations
  const { data, error } = await supabase
    .from('properties')
    .select('bbl, address, violations(violation_type, status)')
    .limit(1000);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Total properties fetched: ${data.length}`);
  
  const withViolations = data.filter(p => p.violations && p.violations.length > 0);
  console.log(`Properties with violations: ${withViolations.length}`);
  
  if (withViolations.length > 0) {
    console.log('\nSample properties with violations:');
    withViolations.slice(0, 5).forEach(p => {
      const openCount = p.violations.filter(v => v.status === 'Open').length;
      console.log(`  ${p.bbl} - ${p.address}: ${p.violations.length} total, ${openCount} open`);
    });
  }
}

testJoin();
