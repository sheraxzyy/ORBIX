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

async function inspectTables() {
  const checks = [
    { table: 'conversations', cols: 'id, type, name, description, avatar_url, direct_key, created_by, last_message_id, last_message_at, created_at, updated_at' },
    { table: 'conversation_members', cols: 'id, conversation_id, user_id, role, last_read_message_id, last_read_seq, is_pinned, is_archived, is_muted, muted_until, joined_at' },
    { table: 'messages', cols: 'id, conversation_id, sender_id, client_id, body, reply_to_id, forwarded_from_id, seq, edited_at, deleted_at, created_at' },
    { table: 'message_reactions', cols: 'id, message_id, user_id, emoji, created_at' },
  ];

  for (const c of checks) {
    const { data, error } = await supabase.from(c.table).select(c.cols).limit(1);
    console.log(`Table ${c.table}:`, error ? `ERROR: ${error.message} (${error.code})` : 'OK');
  }
}

inspectTables();

