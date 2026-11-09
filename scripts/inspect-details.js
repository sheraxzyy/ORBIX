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

async function checkDetails() {
  const tables = [
    'message_receipts',
    'platform_settings',
    'registration_counters',
    'invitations',
    'moderation_reports',
    'audit_logs'
  ];

  for (const t of tables) {
    const res = await supabase.from(t).select('*').limit(1);
    console.log(`Table [${t}]:`, res.error ? `ERROR: ${res.error.message} (${res.error.code})` : `OK (rows: ${res.data.length})`);
  }
}

checkDetails();

