import { supabase } from './supabase'
import { toThaiMessage } from './supabaseErrors'
import { itemToMovie } from './library'
import { normalizeUsername } from '../schemas/auth'

const fail = (error) => {
  throw new Error(toThaiMessage(error))
}

export async function usernameAvailable(name) {
  const { data, error } = await supabase.rpc('username_available', { name })
  if (error) fail(error)
  return data
}

// Returns null for both "no such user" and "private" so the page cannot tell them apart.
export async function fetchProfile(username) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_public')
    .eq('username', normalizeUsername(username))
    .maybeSingle()
  if (error) fail(error)
  if (!profile) return null
  const { data: items, error: itemsError } = await supabase
    .from('library_items')
    .select('tmdb_movie_id, title, poster_path, created_at')
    .eq('user_id', profile.id)
    .eq('kind', 'liked')
    .order('created_at', { ascending: false })
  if (itemsError) fail(itemsError)
  return { profile, movies: items.map(itemToMovie) }
}
