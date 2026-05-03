import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setUser(JSON.parse(userData))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password })
      const { token, ...userData } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(userData)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const isAdmin = () => {
    return user?.roles?.some(role => role.includes('ADMIN'))
  }

  const isStaff = () => {
    return user?.roles?.some(role => role.includes('STAFF'))
  }

  const isTenant = () => {
    return user?.roles?.some(role => role.includes('TENANT'))
  }

  const hasPermission = (permission) => {
    if (isAdmin()) return true
    // Support scoped permissions: "MANAGE_ROOMS:1,2" means only for property 1 and 2
    return user?.permissions?.some(p => {
      const base = p.split(':')[0]
      return base === permission
    })
  }

  /**
   * Returns the list of allowed property IDs for a given permission.
   * Returns null if ALL properties are allowed (admin or unscoped permission).
   * Returns [] if no access at all.
   */
  const getAllowedPropertyIds = (permission) => {
    if (isAdmin()) return null // null = all
    const match = user?.permissions?.find(p => p.split(':')[0] === permission)
    if (!match) return [] // no access
    const parts = match.split(':')
    if (parts.length === 1) return null // unscoped = all
    return parts[1].split(',').map(id => id.trim()).filter(Boolean)
  }

  /**
   * Check if user has access to a specific property for a given permission.
   * propertyId = 'ALL' means checking global access.
   */
  const hasPropertyAccess = (permission, propertyId) => {
    if (isAdmin()) return true
    const allowed = getAllowedPropertyIds(permission)
    if (allowed === null) return true // all properties
    if (allowed.length === 0) return false
    if (!propertyId || propertyId === 'ALL') return allowed.length > 0
    return allowed.includes(String(propertyId))
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isStaff, isTenant, hasPermission, getAllowedPropertyIds, hasPropertyAccess }}>
      {children}
    </AuthContext.Provider>
  )
}

