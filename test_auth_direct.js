
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testAuth() {
  console.log('Testing Supabase Auth (OTP)...');
  const email = 'aks@stanlencap.com'; // Using the REAL email

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback'
      }
    });

    if (error) {
      console.error('❌ Auth Error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Auth Success:', data);
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testAuth();
