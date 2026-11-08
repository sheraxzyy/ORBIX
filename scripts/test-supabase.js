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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection with URL:', supabaseUrl);
console.log('Key prefix:', supabaseKey ? supabaseKey.substring(0, 15) + '...' : 'none');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const tables = ['profiles', 'conversations', 'conversation_members', 'messages', 'user_settings', 'contacts'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}': ERROR:`, error.message, error.code);
      } else {
        console.log(`Table '${table}': OK, rows found:`, data.length);
      }
    } catch (err) {
      console.log(`Table '${table}': EXCEPTION:`, err.message);
    }
  }
}

test();
