'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const REQUIRED_TABLES = [
  'user_profiles',
  'study_plans',
  'chat_sessions',
  'flashcards',
  'audit_logs',
];

function parseEnvFile(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, 'utf8');

  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');
    env[key] = value;
  });

  return env;
}

async function main() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing server/.env. Add Supabase credentials before verifying schema.');
  }

  const env = parseEnvFile(envPath);
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY is missing in server/.env.');
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let hasFailure = false;

  for (const table of REQUIRED_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (error) {
      hasFailure = true;
      console.error(`${table}: ERROR - ${error.message}`);
      continue;
    }

    console.log(`${table}: OK${typeof count === 'number' ? ` (${count} rows)` : ''}`);
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Supabase schema verification failed: ${error.message}`);
  process.exit(1);
});
