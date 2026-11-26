import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const DEVICE_ID = (import.meta.env.VITE_WORKWELL_DEVICE_ID || 'device01').trim();

/** True when the public URL + anon key are present. REAL mode is disabled otherwise. */
// https required, except a local Supabase CLI stack (http://127.0.0.1:54321).
export const isSupabaseConfigured = Boolean(url && anonKey && /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$))/.test(url));

let client = null;
export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}
