'use client'
import Page from '../../../screens/Profile'
import SetupNotice from '../../../components/SetupNotice'
import { supabaseConfigured } from '../../../lib/supabase'
export default function RoutePage() {
  return supabaseConfigured ? <Page /> : <SetupNotice />
}
