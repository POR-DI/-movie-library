import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LibraryProvider } from './context/LibraryContext'
import { supabaseConfigured } from './lib/supabase'
import SetupNotice from './components/SetupNotice'
import App from './App'
import './index.css'
function LibraryRoot() {
  const { user } = useAuth()
  // Keyed by account so switching users never shows the previous account's items.
  return (
    <LibraryProvider key={user?.id || 'guest'}>
      <App />
    </LibraryProvider>
  )
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {supabaseConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <LibraryRoot />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <SetupNotice />
    )}
  </React.StrictMode>,
)
