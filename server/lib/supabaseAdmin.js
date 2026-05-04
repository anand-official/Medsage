'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let client = null;

function isSupabaseConfigured() {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_SECRET_KEY);
}

function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }

  if (!client) {
    client = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}

module.exports = {
  getSupabaseAdmin,
  isSupabaseConfigured,
};
