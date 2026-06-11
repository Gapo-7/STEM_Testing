import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('refresh_token')
    try { await api.post('/auth/logout', { refresh_token: refresh }) } catch {}
    localStorage.clear()
    setUser(null)
  }, [])

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    return data
  }, [])

  // Вспомогательные проверки ролей
  const isDirector = user?.role === 'director'
  const isManaging = user?.role === 'managing_director'
  const isDeptHead = user?.role === 'department_head'
  const canSeeAll = isDirector || isManaging
  const isEmployee = user?.role === 'employee'

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isDirector, isManaging, isDeptHead, isEmployee, canSeeAll }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
