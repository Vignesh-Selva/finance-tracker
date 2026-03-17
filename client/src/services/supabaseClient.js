import { createClient } from '@supabase/supabase-js';

// These are public (anon) keys — safe for client-side use.
// Supabase RLS policies control actual data access.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isMisconfigured = !SUPABASE_URL || !SUPABASE_ANON_KEY;

if (isMisconfigured) {
  console.error(
    '[Supabase] Missing credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
);

export async function checkConnection() {
  if (isMisconfigured) return { ok: false, reason: 'Missing credentials' };
  try {
    const { error } = await supabase.from('portfolios').select('id').limit(1);
    return error ? { ok: false, reason: error.message } : { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

export default supabase;
