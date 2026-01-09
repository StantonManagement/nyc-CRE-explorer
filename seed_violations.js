
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function seedViolations() {
  console.log('--- Seeding Mock Violations ---');
  
  // 0. Clear existing violations
  console.log('Clearing existing violations...');
  const { error: deleteError } = await supabase
    .from('violations')
    .delete()
    .neq('id', 0); // Delete all
    
  if (deleteError) console.error('Delete error:', deleteError);

  // 1. Get existing BBLs
  const { data: properties } = await supabase
    .from('properties')
    .select('bbl')
    .limit(1000); // Fetch more to ensure spread
    
  if (!properties || properties.length === 0) {
    console.log('No properties found to seed!');
    return;
  }
  
  // Shuffle array to randomize distribution
  const shuffled = properties.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 200); // Pick 200 random properties
  
  console.log(`Selected ${selected.length} random properties to seed.`);
  
  const violations = [];
  const types = ['HPD', 'DOB', 'ECB', 'FDNY'];
  
  // 2. Generate Violations
  selected.forEach(p => {
    // 80% chance of having violations (high for demo purposes)
    if (Math.random() > 0.2) {
      // Determine severity: Some properties should be VERY distressed
      const isSeverelyDistressed = Math.random() > 0.8;
      const count = isSeverelyDistressed 
        ? Math.floor(Math.random() * 15) + 5  // 5-20 violations
        : Math.floor(Math.random() * 3) + 1;  // 1-3 violations
      
      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        // 80% Open for severe cases, 50% otherwise
        const isOpen = isSeverelyDistressed ? (Math.random() > 0.2) : (Math.random() > 0.5);
        
        violations.push({
          bbl: p.bbl,
          violation_type: type,
          violation_id: `V-${p.bbl}-${i}-${Math.floor(Math.random()*10000)}`,
          description: `Mock violation for ${type} - Severity Level ${Math.floor(Math.random()*5)}`,
          status: isOpen ? 'Open' : 'Closed',
          issue_date: new Date(Date.now() - Math.floor(Math.random() * 31536000000)).toISOString() // Last year
        });
      }
    }
  });
  
  console.log(`Generated ${violations.length} violations.`);
  
  // 3. Insert in chunks
  const chunkSize = 100;
  for (let i = 0; i < violations.length; i += chunkSize) {
    const chunk = violations.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('violations')
      .upsert(chunk, { onConflict: 'bbl, violation_id' });
      
    if (error) console.error('Error seeding chunk:', error);
  }
    
  console.log('✅ Successfully seeded violations!');
}

seedViolations();
