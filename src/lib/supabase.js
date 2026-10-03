import { createClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabaseConfig.js'
const config = readSupabaseConfig(import.meta.env)
export const supabaseConfigured = Boolean(config)
export const supabase = config ? createClient(config.url, config.anonKey) : null
