import { useState, useEffect } from 'react'
import api from '../../services/api'
import { Plus, Shield, UserPlus, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

const PERMISSIONS = [
  { id: 'MANAGE_STAFF', label: 'Manage Staff', description: 'Can create and manage other staff members' },
  { id: 'MANAGE_ROOMS', label: 'Manage Rooms', description: 'Can add, edit and delete rooms' },
  { id: 'MANAGE_TENANTS', label: 'Manage Tenants', description: 'Can manage tenant information' },
  { id: 'MANAGE_CONTRACTS', label: 'Manage Contracts', description: 'Can create and sign contracts' },
  { id: 'MANAGE_FINANCE', label: 'Manage Finance', description: 'Can manage invoices, payments and charges' },
  { id: 'MANAGE_INVENTORY', label: 'Manage Inventory', description: 'Can track stock and transactions' },
  { id: 'MANAGE_SETTINGS', label: 'Manage Settings', description: 'Can edit service types and catalogs' },
  { id: 'VIEW_REPORTS', label: 'View Reports', description: 'Can access dashboards and reports' },
]

const StaffManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', email: '', phone: '' })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const r = await api.get('/users/admin/all')
      setUsers(r.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePermissions = async (user, roles, permissions) => {
    try {
      await api.put(`/users/admin/${user.id}/permissions`, { roles, permissions })
      setShowModal(false)
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

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
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
                <button
                  onClick={() => { setSelectedUser(u); setShowModal(true) }}
                  className="w-9 h-9 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                  title="Configure Permissions"
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setUserToDelete(u); setShowDeleteModal(true) }}
                  className="w-9 h-9 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                  title="Deactivate"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {u.roles.includes('ADMIN') ? (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl uppercase border border-emerald-100/50">Full System Access</span>
                ) : u.permissions.length > 0 ? (
                  u.permissions.map(p => (
                    <span key={p} className="px-2.5 py-1.5 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl border border-slate-100 uppercase tracking-tight">
                      {p.replace('MANAGE_', '').replace('_', ' ')}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-400 italic px-1 font-medium">No special permissions assigned</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 mb-safe" onClick={e => e.stopPropagation()}>
            <div className="p-8 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Configure Access</h2>
                  <p className="text-slate-500 mt-1">Setting permissions for <span className="font-semibold text-slate-900">{selectedUser.fullName}</span></p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 pt-4 overflow-y-auto max-h-[60vh]">
              <div className="grid gap-4 sm:grid-cols-2">
                {PERMISSIONS.map(p => {
                  const has = selectedUser.permissions.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        const newPerms = has
                          ? selectedUser.permissions.filter(id => id !== p.id)
                          : [...selectedUser.permissions, p.id]
                        setSelectedUser({ ...selectedUser, permissions: newPerms })
                      }}
                      className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                        has ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className={`mt-0.5 rounded-full p-1 ${has ? 'text-blue-600' : 'text-slate-300'}`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${has ? 'text-blue-900' : 'text-slate-700'}`}>{p.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{p.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-white transition-all">
                Cancel
              </button>
              <button
                onClick={() => handleUpdatePermissions(selectedUser, selectedUser.roles, selectedUser.permissions)}
                className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 mb-safe" onClick={e => e.stopPropagation()}>
            <div className="p-8" onClick={e => e.stopPropagation()}>
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    @{userToDelete.username}
                    <span className="mx-1.5">•</span>
                    <span className={`font-semibold ${userToDelete.roles.includes('ADMIN') ? 'text-emerald-600' : userToDelete.roles.includes('STAFF') ? 'text-blue-600' : 'text-slate-500'}`}>
                      {userToDelete.roles.join(', ')}
                    </span>
                  </p>
                  {userToDelete.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {userToDelete.permissions.map(p => (
                        <span key={p} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">
                          {p.replace('MANAGE_', '').replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to deactivate <span className="font-semibold text-slate-800">{userToDelete.fullName}</span>? They will no longer be able to log in.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setUserToDelete(null) }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(userToDelete.id)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                >
                  Yes, Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <form onSubmit={handleAddStaff} className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden mb-safe" onClick={e => e.stopPropagation()}>
            <div className="p-8" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Create New Staff</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                  <input
                    required
                    value={newUser.fullName}
                    onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="E.g. Nguyen Van A"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
                    <input
                      required
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                    <input
                      required
                      type="password"
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full mt-2 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-white transition-all">
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
              >
                Create Staff
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default StaffManagement
