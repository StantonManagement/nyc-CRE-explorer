
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkCounts() {
  console.log('--- Data Health Check ---');
  
  const { count: props } = await supabase.from('properties').select('*', { count: 'exact', head: true });
  console.log(`Properties: ${props}`);
  
  const { count: sales } = await supabase.from('sales').select('*', { count: 'exact', head: true });
  console.log(`Sales:      ${sales}`);
  
  const { count: viols } = await supabase.from('violations').select('*', { count: 'exact', head: true });
  console.log(`Violations: ${viols}`);
  
  // Check if we have any open violations (which drive the score)
  const { count: openViols } = await supabase
    .from('violations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Open');
  console.log(`Open Viols: ${openViols}`);
}

checkCounts();
