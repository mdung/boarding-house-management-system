import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Plus, Edit, Trash2, Eye, AlertCircle, Clock } from 'lucide-react'
import BulkActionBar from '../../components/BulkActionBar'

const fmt = (n) => n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n) : '-'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US') : '-'

const getGuestStatus = (t) => {
  if (!t.checkOutDate) return { label: 'Staying', cls: 'bg-green-100 text-green-800' }
  const today = new Date(); today.setHours(0,0,0,0)
  const out = new Date(t.checkOutDate + 'T00:00:00')
  const diff = Math.round((out - today) / 86400000)
  if (diff < 0)  return { label: 'Checked out', cls: 'bg-gray-100 text-gray-600' }
  if (diff === 0) return { label: 'Checking out today', cls: 'bg-orange-100 text-orange-700' }
  if (diff === 1) return { label: 'Checking out tomorrow', cls: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Staying', cls: 'bg-green-100 text-green-800' }
}

const debtColor = (debt, checkOut) => {
  const today = new Date(); today.setHours(0,0,0,0)
  const out = checkOut ? new Date(checkOut) : null
  if (out && out < today) return 'text-red-700 font-bold'   // overdue
  if (out && (out - today) / 86400000 <= 1) return 'text-red-600 font-semibold' // checkout today/tomorrow
  return 'text-orange-500'
}

const checkoutBadge = (checkOut) => {
  if (!checkOut) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const out = new Date(checkOut)
  const diff = Math.round((out - today) / 86400000)
  if (diff < 0) return <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">Overdue</span>
  if (diff === 0) return <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">Today</span>
  if (diff === 1) return <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Tomorrow</span>
  return null
}

const Tenants = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tenants, setTenants] = useState([])
  const [availableRooms, setAvailableRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '', phone: '', email: '', identityNumber: '',
    dateOfBirth: '', permanentAddress: '', status: 'ACTIVE',
    // checkin fields
    roomId: '', checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: '', monthlyRent: '', deposit: '',
  })

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchData)
  }, [])

  const fetchData = async () => {
    try {
      const roomsRes = await api.get('/rooms')
      setAvailableRooms(roomsRes.data.filter(r => r.status === 'AVAILABLE'))
    } catch (e) { console.error('rooms error', e) }

    try {
      const tenantsRes = await api.get('/tenants')
      setTenants(tenantsRes.data)
    } catch (e) { console.error('tenants error', e) }

    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setFormData({ fullName: '', phone: '', email: '', identityNumber: '', dateOfBirth: '', permanentAddress: '', status: 'ACTIVE', roomId: '', checkInDate: new Date().toISOString().split('T')[0], checkOutDate: '', monthlyRent: '', deposit: '' })
    setShowModal(true)
  }

  const openEdit = (t) => {
    setEditing(t)
    setFormData({ fullName: t.fullName, phone: t.phone || '', email: t.email || '', identityNumber: t.identityNumber || '', dateOfBirth: t.dateOfBirth || '', permanentAddress: t.permanentAddress || '', status: t.status, roomId: '', checkInDate: '', checkOutDate: '', monthlyRent: '', deposit: '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      let tenantId
      if (editing) {
        await api.put(`/tenants/${editing.id}`, formData)
        tenantId = editing.id
      } else {
        const res = await api.post('/tenants', formData)
        tenantId = res.data.id
        // Create contract if room selected
        if (formData.roomId && formData.checkInDate && formData.checkOutDate) {
          if (formData.checkOutDate <= formData.checkInDate) {
            showToast('Check-out date must be after check-in date', 'error')
            return
          }
          const room = availableRooms.find(r => r.id === parseInt(formData.roomId))
          await api.post('/contracts', {
            code: `CT-${Date.now()}`,
            roomId: parseInt(formData.roomId),
            mainTenantId: tenantId,
            startDate: formData.checkInDate,
            endDate: formData.checkOutDate,
            dailyRate: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null,
            monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) * 30 : null,
            deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
            status: 'ACTIVE',
            billingCycle: 'MONTHLY',
          })
        }
      }
      setShowModal(false)
      fetchData()
      showToast(editing ? 'Updated successfully' : 'Guest added successfully', 'success')
    } catch (e) {
      showToast(e.response?.data?.message || 'Error saving', 'error')
    }
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/tenants/${id}`); fetchData(); showToast('Guest deleted', 'success') }
    catch (e) { showToast(e.response?.data?.message || 'Cannot delete', 'error') }
  }

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const toggleSelectAll = () => {
    if (selected.size === tenants.length) setSelected(new Set())
    else setSelected(new Set(tenants.map(t => t.id)))
  }

  const handleBulkDelete = async () => {
    let ok = 0, fail = 0
    for (const id of selected) {
      try { await api.delete(`/tenants/${id}`); ok++ }
      catch { fail++ }
    }
    setSelected(new Set())
    fetchData()
    showToast(`Deleted ${ok} guests${fail > 0 ? `, ${fail} could not be deleted (have active contracts)` : ''}`, fail > 0 ? 'warning' : 'success')
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tenants</h1>
        <button onClick={openAdd} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add New Guest
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={selected.size === tenants.length && tenants.length > 0}
                  onChange={toggleSelectAll} className="rounded" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding Debt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map((t) => (
              <tr key={t.id} className={`hover:bg-gray-50 ${selected.has(t.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(t.id)}
                    onChange={() => toggleSelect(t.id)} className="rounded" />
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  <button onClick={() => navigate(`/admin/tenants/${t.id}/detail`)} className="text-blue-600 hover:underline">
                    {t.fullName}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{t.phone}</td>
                <td className="px-4 py-3 text-sm">
                  {t.activeRoomCode
                    ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{t.activeRoomCode}</span>
                    : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(t.checkInDate)}</td>
                <td className="px-4 py-3 text-sm">
                  {t.checkOutDate ? (
                    <span className="flex items-center gap-1">
                      {fmtDate(t.checkOutDate)}
                      {checkoutBadge(t.checkOutDate)}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {t.totalDebt != null && t.totalDebt > 0 ? (
                    <span className={`flex items-center gap-1 ${debtColor(t.totalDebt, t.checkOutDate)}`}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      {fmt(t.totalDebt)}
                    </span>
                  ) : t.totalDebt === 0 ? (
                    <span className="text-green-600 text-xs">Paid</span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const s = getGuestStatus(t)
                    return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.cls}`}>{s.label}</span>
                  })()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => navigate(`/admin/tenants/${t.id}/detail`)} className="text-blue-500 hover:text-blue-700 mr-3"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(t)} className="text-gray-500 hover:text-gray-700 mr-3"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmDelete(t.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
          {tenants.length > 0 && tenants.some(t => t.totalDebt > 0) && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan="6" className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Total Outstanding ({tenants.filter(t => t.totalDebt > 0).length} guests with debt)
                </td>
                <td className="px-4 py-3 text-sm font-bold text-red-600">
                  {fmt(tenants.reduce((s, t) => s + (parseFloat(t.totalDebt) > 0 ? parseFloat(t.totalDebt) : 0), 0))}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Guest Info' : 'Add New Guest'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input required type="text" value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                  <input required type="text" value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Number</label>
                  <input type="text" value={formData.identityNumber}
                    onChange={e => setFormData({...formData, identityNumber: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
                <input type="text" value={formData.permanentAddress}
                  onChange={e => setFormData({...formData, permanentAddress: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>

              {!editing && (
                <>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Room Information (optional)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Select Room</label>
                    <select value={formData.roomId}
                      onChange={e => {
                        const room = availableRooms.find(r => r.id === parseInt(e.target.value))
                        const daily = room?.baseRent ? Math.round(room.baseRent / 30) : ''
                        setFormData({...formData, roomId: e.target.value, monthlyRent: daily})
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="">-- No room selected --</option>
                      {availableRooms.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.code} — {r.boardingHouseName} — {fmt(r.baseRent)}/month
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.roomId && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Check-in Date *</label>
                          <input required type="date" value={formData.checkInDate}
                            onChange={e => setFormData({...formData, checkInDate: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Check-out Date *</label>
                          <input required type="date" value={formData.checkOutDate}
                            onChange={e => setFormData({...formData, checkOutDate: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Daily Rate (VND)</label>
                          <input type="number" value={formData.monthlyRent}
                            onChange={e => setFormData({...formData, monthlyRent: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Deposit</label>
                          <input type="number" value={formData.deposit}
                            onChange={e => setFormData({...formData, deposit: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Guest"
        message="Are you sure you want to delete this guest?"
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={() => { handleDelete(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        isOpen={confirmBulkDelete}
        title={`Delete ${selected.size} guests`}
        message={`Delete ${selected.size} selected guests? Guests with active contracts cannot be deleted.`}
        confirmText="Delete" cancelText="Cancel" danger
        onConfirm={() => { handleBulkDelete(); setConfirmBulkDelete(false) }}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      <BulkActionBar selectedCount={selected.size} onDelete={() => setConfirmBulkDelete(true)} onClear={() => setSelected(new Set())} />
    </div>
  )
}

export default Tenants
