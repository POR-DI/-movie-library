'use client'

import { AuthProvider, useAuth } from '../context/AuthContext'
import { LibraryProvider } from '../context/LibraryContext'
import { supabaseConfigured } from '../lib/supabase'
import SetupNotice from '../components/SetupNotice'
import SiteShell from '../components/SiteShell'
function LibraryRoot({ children }) {
  const { user } = useAuth()
  // Keyed by account so switching users never shows the previous account's items.
  return (
    <LibraryProvider key={user?.id || 'guest'}>
      <SiteShell>{children}</SiteShell>
    </LibraryProvider>
  )
}
export default function Providers({ children }) {
  if (!supabaseConfigured) return <SetupNotice />
  return (
    <AuthProvider>
      <LibraryRoot>{children}</LibraryRoot>
    </AuthProvider>
  )
}
