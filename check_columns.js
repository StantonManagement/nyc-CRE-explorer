
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('properties')
    .select('last_sale_date, last_sale_price')
    .limit(1);

  if (error) {
    console.log('❌ Columns likely do not exist:', error.message);
  } else {
    console.log('✅ Columns exist!');
  }
}

checkColumns();
