// two separate ways of talking to the same Supabase Postgres database,
// on purpose - see the comment in routes/bookings.js for why.

const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set - the api will start ' +
    'but every database call will fail. Copy .env.example to .env and fill ' +
    'these in from your Supabase project settings.'
  );
}

// normal path: the supabase-js client, talks to Supabase's REST layer
// (PostgREST). every query it builds is parameterized - there's no way
// to string-concatenate your way into a SQL injection through this client.
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// second path: a direct postgres connection, using the connection string
// from Supabase's "Connection string" settings page (not the REST API).
// only the search route uses this - see routes/bookings.js.
const pgPool = process.env.SUPABASE_DB_URL
  ? new Pool({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
  : null;

module.exports = { supabase, pgPool };
