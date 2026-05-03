import { useState, useEffect } from 'react'
import api from '../../services/api'
import { Plus, Shield, UserPlus, Trash2, CheckCircle2, XCircle, AlertTriangle, Building2 } from 'lucide-react'

const PERMISSIONS = [
  { id: 'MANAGE_STAFF',     label: 'Manage Staff',     description: 'Create and manage other staff members', scopable: false },
  { id: 'MANAGE_ROOMS',     label: 'Manage Rooms',     description: 'Add, edit and delete rooms',            scopable: true  },
  { id: 'MANAGE_TENANTS',   label: 'Manage Tenants',   description: 'Manage tenant information',             scopable: true  },
  { id: 'MANAGE_CONTRACTS', label: 'Manage Contracts', description: 'Create and sign contracts',             scopable: true  },
  { id: 'MANAGE_FINANCE',   label: 'Manage Finance',   description: 'Manage invoices, payments and charges', scopable: true  },
  { id: 'MANAGE_INVENTORY', label: 'Manage Inventory', description: 'Track stock and transactions',          scopable: true  },
  { id: 'MANAGE_SETTINGS',  label: 'Manage Settings',  description: 'Edit service types and catalogs',       scopable: false },
  { id: 'VIEW_REPORTS',     label: 'View Reports',     description: 'Access dashboards and reports',         scopable: true  },
]

const parsePermission = (str) => {
  const [base, scope] = str.split(':')
  return { base, propertyIds: scope ? scope.split(',').map(s => s.trim()).filter(Boolean) : null }
}

const buildPermission = (base, propertyIds) => {
  if (!propertyIds || propertyIds.length === 0) return base
  return `${base}:${propertyIds.join(',')}`
}

// ─── Configure Access Modal ───────────────────────────────────────────────────
const ConfigureModal = ({ user, properties, onClose, onSave }) => {
  // Which permissions are enabled
  const [enabledPerms, setEnabledPerms] = useState(() => {
    const set = new Set()
    user.permissions.forEach(p => set.add(parsePermission(p).base))
    return set
  })

  // Global property scope: null = all, string[] = specific IDs
  // Derived from existing permissions on open
  const [propertyScope, setPropertyScope] = useState(() => {
    // Find the first scopable permission that has a scope
    for (const p of user.permissions) {
      const parsed = parsePermission(p)
      if (parsed.propertyIds) return parsed.propertyIds
    }
    return null // null = all properties
  })

  const togglePerm = (id) => {
    setEnabledPerms(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleProperty = (id) => {
    const sid = String(id)
    if (!propertyScope) {
      // Was "all" → switch to just this one
      setPropertyScope([sid])
    } else if (propertyScope.includes(sid)) {
      const next = propertyScope.filter(x => x !== sid)
      setPropertyScope(next.length === 0 ? null : next)
    } else {
      setPropertyScope([...propertyScope, sid])
    }
  }

  const handleSave = () => {
    const permissions = PERMISSIONS
      .filter(p => enabledPerms.has(p.id))
      .map(p => p.scopable ? buildPermission(p.id, propertyScope) : p.id)
    onSave(user, user.roles, permissions)
  }

  const scopeAll = !propertyScope || propertyScope.length === 0

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-end sm:items-center justify-center p-4 pb-24 sm:pb-4">
        <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="px-8 pt-7 pb-5 border-b border-slate-100 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Configure Access</h2>
              <p className="text-slate-500 mt-1 text-sm">
                Setting permissions for <span className="font-semibold text-slate-900">{user.fullName}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 mt-1">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[65vh]">

            {/* ── Step 1: Property Access ─────────────────────────────────── */}
            {properties.length > 1 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">1</div>
                  <p className="font-bold text-slate-800">Property Access</p>
                  <span className="text-xs text-slate-400 font-medium">— applies to all scopable permissions below</span>
                </div>

                <div className="grid gap-2">
                  {/* All properties */}
                  <button
                    type="button"
                    onClick={() => setPropertyScope(null)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                      scopeAll
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-sm">All Properties</p>
                      <p className={`text-xs mt-0.5 ${scopeAll ? 'text-blue-100' : 'text-slate-400'}`}>
                        Staff can access all {properties.length} properties
                      </p>
                    </div>
                    {scopeAll && (
                      <CheckCircle2 className="w-5 h-5 ml-auto flex-shrink-0" />
                    )}
                  </button>

                  {/* Individual properties */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {properties.map(p => {
                      const selected = !scopeAll && propertyScope?.includes(String(p.id))
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProperty(p.id)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
                            selected
                              ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200 text-blue-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            selected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                          }`}>
                            {selected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="font-semibold text-sm truncate">{p.name}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Summary */}
                  {!scopeAll && (
                    <p className="text-xs text-blue-600 font-semibold px-1">
                      ✓ {propertyScope.length} of {properties.length} properties selected
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 2: Permissions ─────────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                  {properties.length > 1 ? '2' : '1'}
                </div>
                <p className="font-bold text-slate-800">Permissions</p>
                <span className="text-xs text-slate-400 font-medium">— what this staff can do</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {PERMISSIONS.map(p => {
                  const enabled = enabledPerms.has(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePerm(p.id)}
                      className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                        enabled
                          ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`mt-0.5 rounded-full p-0.5 flex-shrink-0 transition-colors ${enabled ? 'text-blue-600' : 'text-slate-300'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${enabled ? 'text-blue-900' : 'text-slate-700'}`}>{p.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{p.description}</p>
                        {enabled && p.scopable && properties.length > 1 && (
                          <p className="text-[10px] font-bold mt-1.5 text-blue-500">
                            🏠 {scopeAll ? 'All properties' : `${propertyScope?.length} propert${propertyScope?.length === 1 ? 'y' : 'ies'}`}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-white transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const StaffManagement = () => {
  const [users, setUsers] = useState([])
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(false)
  const [configUser, setConfigUser] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', email: '', phone: '' })

  useEffect(() => {
    fetchUsers()
    api.get('/boarding-houses').then(r => setProperties(r.data || [])).catch(() => {})
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const r = await api.get('/users/admin/all')
      setUsers(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSavePermissions = async (user, roles, permissions) => {
    try {
      await api.put(`/users/admin/${user.id}/permissions`, { roles, permissions })
      setConfigUser(null)
      fetchUsers()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update permissions')
    }
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    try {
      await api.post('/users/admin/create-staff', newUser)
      setShowAddModal(false)
      setNewUser({ username: '', password: '', fullName: '', email: '', phone: '' })
      fetchUsers()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create staff')
    }
  }

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/admin/${id}`)
      setShowDeleteModal(false)
      setUserToDelete(null)
      fetchUsers()
    } catch (e) {
      alert('Failed to deactivate user')
    }
  }

  const renderPermBadges = (user) => {
    if (user.roles.includes('ADMIN')) {
      return <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl uppercase border border-emerald-100/50">Full System Access</span>
    }
    if (user.permissions.length === 0) {
      return <span className="text-[11px] text-slate-400 italic px-1 font-medium">No permissions assigned</span>
    }

    // Collect unique property scope across all permissions
    let scopeLabel = ''
    const scopes = user.permissions
      .map(p => parsePermission(p).propertyIds)
      .filter(ids => ids !== null)
    if (scopes.length > 0) {
      const allIds = [...new Set(scopes.flat())]
      const names = allIds.map(id => properties.find(p => String(p.id) === id)?.name || id)
      scopeLabel = ` · ${names.join(', ')}`
    }

    return (
      <div className="space-y-1.5 w-full">
        {scopes.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1">
            <Building2 className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{scopeLabel.replace(' · ', '')}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {user.permissions.map(p => {
            const parsed = parsePermission(p)
            const def = PERMISSIONS.find(x => x.id === parsed.base)
            const label = def ? def.label.replace('Manage ', '').replace('View ', '') : parsed.base
            return (
              <span key={p} className="px-2.5 py-1.5 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl border border-slate-100 uppercase tracking-tight">
                {label}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10 sm:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Staff & Access Control</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base font-medium">Manage team members and their granular permissions.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <UserPlus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-[2rem] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center text-slate-600 font-black text-lg border border-slate-200/50">
                    {u.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-tight">{u.fullName}</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">@{u.username} • {u.roles.join(', ')}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setConfigUser(u)}
                    className="w-9 h-9 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors" title="Configure Permissions">
                    <Shield className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setUserToDelete(u); setShowDeleteModal(true) }}
                    className="w-9 h-9 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors" title="Deactivate">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Permissions</p>
                {renderPermBadges(u)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Configure Access Modal */}
      {configUser && (
        <ConfigureModal
          user={configUser}
          properties={properties}
          onClose={() => setConfigUser(null)}
          onSave={handleSavePermissions}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Deactivate Account</h2>
                  <p className="text-sm text-slate-500 mt-0.5">This action will disable login access.</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 mb-6">
                <div className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 font-bold text-lg shadow-sm flex-shrink-0">
                  {userToDelete.fullName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{userToDelete.fullName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">@{userToDelete.username} • {userToDelete.roles.join(', ')}</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to deactivate <span className="font-semibold text-slate-800">{userToDelete.fullName}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setUserToDelete(null) }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                  Cancel
                </button>
                <button onClick={() => handleDeleteUser(userToDelete.id)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all">
                  Yes, Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm overflow-y-auto" onClick={() => setShowAddModal(false)}>
          <div className="flex min-h-full items-end sm:items-center justify-center p-4 pb-24 sm:pb-4">
            <form onSubmit={handleAddStaff} className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
              <div className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Create New Staff</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                    <input required value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="E.g. Nguyen Van A" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
                      <input required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                        className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                      <input required type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                    <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-white transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffManagement
