import { createContext, useContext } from 'react'
import useFetch from '../hooks/useFetch'
import { api } from '../lib/api'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const { data, loading, error, retry, setData } = useFetch('/api/auth/me')
  async function authenticate(type, values) {
    setData(
      await api('/api/auth/' + type, {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    )
  }
  async function logout() {
    setData(await api('/api/auth/logout', { method: 'POST' }))
  }
  async function share(enabled) {
    setData(
      await api('/api/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    )
  }
  return (
    <AuthContext.Provider
      value={{
        user: data?.user,
        loading,
        error,
        retry,
        authenticate,
        logout,
        share,
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
