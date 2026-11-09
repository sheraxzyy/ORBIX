import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const rawLine of envContent.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  console.log('Testing SignUp / Login...');
  const ts = Date.now().toString().slice(-6);
  const testEmail1 = `tester1_${ts}@gmail.com`;
  const testEmail2 = `tester2_${ts}@gmail.com`;
  const testPass = 'Password123!@#';

  const { data: authData1, error: authErr1 } = await supabase.auth.signUp({
    email: testEmail1,
    password: testPass,
    options: {
      data: {
        username: 'tester1_' + ts.slice(-4),
        display_name: 'Tester One'
      }
    }
  });

  if (authErr1) {
    console.error('Sign up user 1 error:', authErr1);
    return;
  }
  console.log('User 1 signed up:', authData1.user?.id, 'Session:', !!authData1.session);

  const { data: authData2, error: authErr2 } = await supabase.auth.signUp({
    email: testEmail2,
    password: testPass,
    options: {
      data: {
        username: 'tester2_' + ts.slice(-4),
        display_name: 'Tester Two'
      }
    }
  });

  if (authErr2) {
    console.error('Sign up user 2 error:', authErr2);
    return;
  }
  console.log('User 2 signed up:', authData2.user?.id, 'Session:', !!authData2.session);

  // If session is null (email confirmation required)
  if (!authData1.session) {
    console.log('NOTICE: Supabase requires email confirmation before session is granted!');
    return;
  }

  const client1 = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
  await client1.auth.setSession(authData1.session);

  // Check user1 profile
  const { data: prof1, error: profErr1 } = await client1.from('profiles').select('*').eq('id', authData1.user.id).single();
  console.log('User 1 profile:', prof1, profErr1?.message);

  // User 1 tries get_or_create_direct_conversation with user 2
  console.log('\nTrying get_or_create_direct_conversation from user 1 to user 2...');
  const { data: convId, error: convErr } = await client1.rpc('get_or_create_direct_conversation', {
    target_user_id: authData2.user.id
  });
  console.log('Direct conversation result:', convId, convErr);

  if (convId) {
    console.log('\nTrying to send message in convId:', convId);
    const clientId = crypto.randomUUID();
    const { data: msgData, error: msgErr } = await client1.from('messages').insert({
      conversation_id: convId,
      sender_id: authData1.user.id,
      client_id: clientId,
      body: 'Hello from tester 1!',
      seq: 0
    }).select().single();
    console.log('Message insert result:', msgData, msgErr);
  }
}

run();
