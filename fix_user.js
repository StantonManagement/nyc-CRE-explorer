
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function inviteUser() {
  const email = 'aks@stanlencap.com';
  console.log(`Checking user: ${email}`);

  // Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('List users error:', listError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (user) {
    console.log('User already exists:', user.id);
  } else {
    console.log('User does not exist. Creating...');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true // Auto-confirm to allow login? Or false to require OTP?
    });
    
    if (error) {
      console.error('Create user error:', error);
    } else {
      console.log('User created:', data.user.id);
    }
  }
}

inviteUser();
