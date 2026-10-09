'use client'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { LibraryProvider } from '../context/LibraryContext'
import { PreviewProvider } from '../context/PreviewContext'
import Layout from '../components/Layout'
function LibraryRoot({ children }) {
  const { user } = useAuth()
  return (
    <LibraryProvider key={user?.id || 'guest'}>
      <PreviewProvider>
        <Layout>{children}</Layout>
      </PreviewProvider>
    </LibraryProvider>
  )
}
export default function Providers({ children }) {
  return (
    <AuthProvider>
      <LibraryRoot>{children}</LibraryRoot>
    </AuthProvider>
  )
}
