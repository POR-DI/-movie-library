import { createClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabaseConfig.js'
// Spelled out: Next only inlines literal process.env.NEXT_PUBLIC_* reads into the browser bundle.
const config = readSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})
export const supabaseConfigured = Boolean(config)
export const supabase = config ? createClient(config.url, config.anonKey) : null
