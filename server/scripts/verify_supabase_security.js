'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const TABLES = [
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

function loadServerEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing server/.env. Add Supabase credentials before verifying security.');
  }
  return parseEnvFile(envPath);
}

function loadFrontendEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('Missing .env.local. Add the publishable Supabase key before verifying security.');
  }
  return parseEnvFile(envPath);
}

async function verifyServiceRole(serverEnv) {
  const supabase = createClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true }).limit(1);
    if (error) {
      throw new Error(`service role could not reach ${table}: ${error.message}`);
    }
    console.log(`service role: ${table} OK`);
  }
}

async function verifyPublishableAccess(frontendEnv) {
  const url = frontendEnv.REACT_APP_SUPABASE_URL || frontendEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    frontendEnv.REACT_APP_SUPABASE_PUBLISHABLE_KEY
    || frontendEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Frontend Supabase publishable env is missing.');
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let hasFailure = false;

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      hasFailure = true;
      console.error(`publishable key: ${table} is unexpectedly accessible`);
      continue;
    }

    console.log(`publishable key: ${table} blocked (${error.message})`);
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

async function main() {
  const serverEnv = loadServerEnv();
  const frontendEnv = loadFrontendEnv();

  if (!serverEnv.SUPABASE_URL || !serverEnv.SUPABASE_SECRET_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY is missing in server/.env.');
  }

  await verifyServiceRole(serverEnv);
  await verifyPublishableAccess(frontendEnv);
}

main().catch((error) => {
  console.error(`Supabase security verification failed: ${error.message}`);
  process.exit(1);
});
