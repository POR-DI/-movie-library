'use client'
import Page from '../../screens/Library'
import SetupNotice from '../../components/SetupNotice'
import { supabaseConfigured } from '../../lib/supabase'
export default function RoutePage() {
  return supabaseConfigured ? <Page /> : <SetupNotice />
}
