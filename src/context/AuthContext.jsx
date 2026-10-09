import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { signUpAccount } from '../lib/auth'
import { toThaiMessage } from '../lib/supabaseErrors'
const AuthContext = createContext(null)
const columns = 'id, username, display_name, avatar_url, is_public'
const fail = (error) => {
  throw new Error(toThaiMessage(error))
}
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabase)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const user = session?.user
    ? { id: session.user.id, email: session.user.email }
    : null
  useEffect(() => {
    if (!supabase) return
    // INITIAL_SESSION fires first, so this one listener also covers the initial load.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    let active = true
    // Supabase calls must not run inside onAuthStateChange, so the profile loads here.
    supabase
      .from('profiles')
      .select(columns)
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(new Error(toThaiMessage(error)))
        else {
          setProfile(data)
          setError(null)
        }
      })
    return () => {
      active = false
    }
  }, [user?.id])
  async function signUp({ email, password, username, displayName }) {
    return signUpAccount(
      supabase,
      { email, password, username, displayName },
      window.location.origin + '/login',
    )
  }

  async function signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) fail(error)
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) fail(error)
  }
  async function updateProfile(patch) {
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
      .select(columns)
      .single()
    if (error) fail(error)
    setProfile(data)
    return data
  }
  const loading = !ready || Boolean(user && !profile && !error)
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider')
  return value
}
