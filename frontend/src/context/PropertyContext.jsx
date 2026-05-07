import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const PropertyContext = createContext()

export const useProperty = () => {
  const ctx = useContext(PropertyContext)
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider')
  return ctx
}

export const PropertyProvider = ({ children }) => {
  const { isAdmin, getAllowedPropertyIds } = useAuth()
  const [allProperties, setAllProperties] = useState([])
  const [selectedId, setSelectedId] = useState(() => {
    return localStorage.getItem('selectedPropertyId') || 'ALL'
  })

  useEffect(() => {
    api.get('/boarding-houses')
      .then(r => setAllProperties(r.data || []))
      .catch(() => {})
  }, [])

  // Properties this user is allowed to see — based on any permission that has property scope
  // If admin or any unscoped permission exists → all properties
  const allowedProperties = (() => {
    if (isAdmin()) return allProperties

    // Collect all allowed property IDs across all permissions
    // getAllowedPropertyIds returns null = all, [] = none, [ids] = specific
    // We use MANAGE_ROOMS as the "base" permission for property visibility
    // but actually we check all permissions — if ANY permission grants access to a property, show it
    const permissionBases = [
      'MANAGE_ROOMS', 'MANAGE_TENANTS', 'MANAGE_CONTRACTS',
      'MANAGE_FINANCE', 'MANAGE_INVENTORY', 'MANAGE_SETTINGS',
      'VIEW_REPORTS', 'MANAGE_STAFF'
    ]

    let allowedIds = new Set()
    let hasUnscoped = false

    for (const perm of permissionBases) {
      const ids = getAllowedPropertyIds(perm)
      if (ids === null) { hasUnscoped = true; break }
      if (ids && ids.length > 0) ids.forEach(id => allowedIds.add(id))
    }

    if (hasUnscoped) return allProperties
    if (allowedIds.size === 0) return [] // no permissions at all → no access
    return allProperties.filter(p => allowedIds.has(String(p.id)))
  })()

  // Auto-correct selectedId if it's not in allowed list
  useEffect(() => {
    if (allowedProperties.length === 0) return
    if (selectedId === 'ALL') return
    const stillAllowed = allowedProperties.some(p => String(p.id) === selectedId)
    if (!stillAllowed) {
      const newId = allowedProperties.length === 1 ? String(allowedProperties[0].id) : 'ALL'
      setSelectedId(newId)
      localStorage.setItem('selectedPropertyId', newId)
    }
  }, [allowedProperties, selectedId])

  // If staff only has access to 1 property, auto-select it
  // Also auto-select for admin if only 1 property exists
  useEffect(() => {
    if (allowedProperties.length === 1 && selectedId === 'ALL') {
      const id = String(allowedProperties[0].id)
      setSelectedId(id)
      localStorage.setItem('selectedPropertyId', id)
    }
  }, [allowedProperties])

  const select = (id) => {
    setSelectedId(id)
    localStorage.setItem('selectedPropertyId', id)
  }

  const selectedProperty = allProperties.find(p => String(p.id) === selectedId) || null

  return (
    <PropertyContext.Provider value={{
      properties: allowedProperties,
      allProperties,
      selectedId,
      selectedProperty,
      select
    }}>
      {children}
    </PropertyContext.Provider>
  )
}
