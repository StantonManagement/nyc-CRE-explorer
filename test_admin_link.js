
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testAdminLink() {
  console.log('Testing Admin Generate Link...');
  const email = 'aks@stanlencap.com'; 

  try {
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: 'http://localhost:3000/auth/callback'
      }
    });

    if (error) {
      console.error('❌ Admin Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Admin Success! Link:', data.properties?.action_link);
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testAdminLink();
