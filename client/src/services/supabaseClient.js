import { createClient } from '@supabase/supabase-js';

// These are public (anon) keys — safe for client-side use.
// Supabase RLS policies control actual data access.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isMisconfigured = !SUPABASE_URL || !SUPABASE_ANON_KEY;

if (isMisconfigured) {
  console.error(
    '[Supabase] Missing credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
);

export default supabase;
