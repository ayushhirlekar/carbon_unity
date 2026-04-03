const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL in .env file!');
}
if (!process.env.SUPABASE_PUBLISHABLE_KEY && !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase anon/publishable key in .env file!');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

// Public client (respects RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: false }
});

// Admin client (bypasses RLS — for backend-only operations)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = { supabase, supabaseAdmin };