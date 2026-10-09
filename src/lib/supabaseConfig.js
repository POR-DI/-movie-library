const httpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

// Returns null instead of letting createClient throw at import time (blank page) on a bad URL.
export function readSupabaseConfig(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  return url && anonKey && httpUrl(url) ? { url, anonKey } : null
}
