import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function updateSalesPricePerSF() {
  console.log('🔄 Updating sales price_per_sf from properties.bldgarea...\n');
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('./UPDATE_SALES_PRICE_PER_SF.sql', 'utf8');
    
    // Split into individual statements
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    
    // Execute update statement
    console.log('Executing UPDATE statement...');
    const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
      sql_query: statements[0]
    });
    
    if (updateError) {
      // Try direct update via Supabase client instead
      console.log('RPC failed, trying direct update...');
      
      // Get all sales with properties
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, bbl, sale_price')
        .gt('sale_price', 0);
      
      if (salesError) throw salesError;
      
      console.log(`Found ${sales.length} sales to update`);
      
      // Get all properties
      const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('bbl, bldgarea')
        .gt('bldgarea', 0);
      
      if (propsError) throw propsError;
      
      // Create lookup map
      const propMap = {};
      properties.forEach(p => {
        propMap[p.bbl] = p.bldgarea;
      });
      
      // Update sales in batches
      let updated = 0;
      const batchSize = 100;
      
      for (let i = 0; i < sales.length; i += batchSize) {
        const batch = sales.slice(i, i + batchSize);
        const updates = batch
          .filter(s => propMap[s.bbl])
          .map(s => ({
            id: s.id,
            gross_sf: propMap[s.bbl],
            price_per_sf: Math.round(s.sale_price / propMap[s.bbl])
          }));
        
        if (updates.length > 0) {
          const { error: batchError } = await supabase
            .from('sales')
            .upsert(updates, { onConflict: 'id' });
          
          if (batchError) {
            console.error(`Batch ${i / batchSize + 1} error:`, batchError);
          } else {
            updated += updates.length;
            console.log(`✓ Updated batch ${i / batchSize + 1}: ${updates.length} sales`);
          }
        }
      }
      
      console.log(`\n✅ Updated ${updated} sales with price_per_sf`);
    } else {
      console.log('✅ Update completed via RPC');
    }
    
    // Verify results
    console.log('\n📊 Verification:');
    const { data: stats, error: statsError } = await supabase
      .from('sales')
      .select('price_per_sf, sale_price')
      .gt('sale_price', 0);
    
    if (statsError) throw statsError;
    
    const withPSF = stats.filter(s => s.price_per_sf).length;
    const avgPSF = stats
      .filter(s => s.price_per_sf)
      .reduce((sum, s) => sum + s.price_per_sf, 0) / withPSF;
    
    console.log(`Total sales: ${stats.length}`);
    console.log(`Sales with price_per_sf: ${withPSF}`);
    console.log(`Average price_per_sf: $${Math.round(avgPSF).toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateSalesPricePerSF();
