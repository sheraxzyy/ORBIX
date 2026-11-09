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

async function inspect() {
  console.log('--- Inspecting Tables ---');
  const tables = [
    'profiles',
    'user_roles',
    'conversations',
    'conversation_members',
    'messages',
    'message_receipts',
    'message_reactions',
    'user_settings',
    'user_blocks',
    'contacts',
    'attachments',
    'notifications',
    'platform_settings',
    'registration_counters',
    'invitations',
    'moderation_reports',
    'audit_logs'
  ];

  for (const t of tables) {
    const { data, error, count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table [${t}]: ERROR: ${error.code} - ${error.message}`);
    } else {
      console.log(`Table [${t}]: EXISTS (count: ${count})`);
    }
  }

  console.log('\n--- Inspecting RPCs ---');
  const rpcs = [
    { name: 'check_username_available', args: { check_username: 'testuser' } },
    { name: 'get_or_create_direct_conversation', args: { target_user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'is_admin', args: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'is_super_admin', args: { p_user_id: '00000000-0000-0000-0000-000000000000' } }
  ];

  for (const r of rpcs) {
    const { data, error } = await supabase.rpc(r.name, r.args);
    if (error) {
      console.log(`RPC [${r.name}]: ${error.code} - ${error.message}`);
    } else {
      console.log(`RPC [${r.name}]: OK (result: ${JSON.stringify(data)})`);
    }
  }
}

inspect();

