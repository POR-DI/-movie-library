import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LibraryProvider } from './context/LibraryContext'
import App from './App'
import './index.css'
function LibraryRoot() {
  const { user } = useAuth()
  return (
    <LibraryProvider key={user?.id || 'guest'}>
      <App />
    </LibraryProvider>
  )
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LibraryRoot />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
