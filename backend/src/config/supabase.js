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

// Both spellings are accepted because the repo uses both:
// backend/.env.example says SUPABASE_SERVICE_ROLE_KEY, while
// database/.env.example says SUPABASE_SERVICE_KEY.
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Previously this fell back to the anon key when the service key was
// missing. That failed silently: supabaseAdmin looked like an admin
// client but was still subject to RLS, so every policy appeared to
// work until a tightened policy made the backend fail in ways that
// pointed nowhere near the real cause. Fail at boot instead.
if (!SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing service role key. Set SUPABASE_SERVICE_ROLE_KEY (or ' +
    'SUPABASE_SERVICE_KEY) in backend/.env. Without it the admin ' +
    'client would silently run as the anon role and RLS-protected ' +
    'writes would fail.'
  );
}

if (SUPABASE_SERVICE_KEY === SUPABASE_ANON_KEY) {
  throw new Error(
    'Service role key is identical to the anon key. supabaseAdmin ' +
    'would not bypass RLS. Copy the service_role key from Supabase ' +
    'Settings > API.'
  );
}

// Public client (respects RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: false }
});

// Admin client (bypasses RLS — for backend-only operations)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = { supabase, supabaseAdmin };
