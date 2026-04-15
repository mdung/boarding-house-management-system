import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Plus, Edit, Trash2, Eye, AlertCircle, Clock } from 'lucide-react'
import BulkActionBar from '../../components/BulkActionBar'

const fmt = (n) => n != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : '-'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '-'

const debtColor = (debt, checkOut) => {
  if (!debt || debt <= 0) return 'text-green-600'
  const today = new Date(); today.setHours(0,0,0,0)
  const out = checkOut ? new Date(checkOut) : null
  if (out && out < today) return 'text-red-700 font-bold'   // quá hạn
  if (out && (out - today) / 86400000 <= 1) return 'text-red-600 font-semibold' // checkout hôm nay/ngày mai
  return 'text-orange-500'
}

const checkoutBadge = (checkOut) => {
  if (!checkOut) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const out = new Date(checkOut)
  const diff = Math.round((out - today) / 86400000)
  if (diff < 0) return <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">Quá hạn</span>
  if (diff === 0) return <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">Hôm nay</span>
  if (diff === 1) return <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Ngày mai</span>
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
            showToast('Ngày trả phòng phải sau ngày nhận phòng', 'error')
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
      showToast(editing ? 'Cập nhật thành công' : 'Thêm khách thành công', 'success')
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi khi lưu', 'error')
    }
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/tenants/${id}`); fetchData(); showToast('Đã xóa khách', 'success') }
    catch (e) { showToast(e.response?.data?.message || 'Không thể xóa', 'error') }
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
    showToast(`Đã xóa ${ok} khách${fail > 0 ? `, ${fail} không thể xóa (có hợp đồng active)` : ''}`, fail > 0 ? 'warning' : 'success')
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Khách thuê</h1>
        <button onClick={openAdd} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Thêm khách mới
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên khách</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SĐT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phòng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Còn nợ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
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
                    <span className="text-green-600 text-xs">Đã thanh toán</span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${t.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {t.status === 'ACTIVE' ? 'Đang ở' : 'Không hoạt động'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => navigate(`/admin/tenants/${t.id}/detail`)} className="text-blue-500 hover:text-blue-700 mr-3"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => openEdit(t)} className="text-gray-500 hover:text-gray-700 mr-3"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmDelete(t.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Sửa thông tin khách' : 'Thêm khách mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Họ tên *</label>
                <input required type="text" value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số điện thoại *</label>
                  <input required type="text" value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CCCD/CMND</label>
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
                <label className="block text-sm font-medium text-gray-700">Địa chỉ thường trú</label>
                <input type="text" value={formData.permanentAddress}
                  onChange={e => setFormData({...formData, permanentAddress: e.target.value})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>

              {!editing && (
                <>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Thông tin phòng (tùy chọn)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chọn phòng</label>
                    <select value={formData.roomId}
                      onChange={e => {
                        const room = availableRooms.find(r => r.id === parseInt(e.target.value))
                        const daily = room?.baseRent ? Math.round(room.baseRent / 30) : ''
                        setFormData({...formData, roomId: e.target.value, monthlyRent: daily})
                      }}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option value="">-- Chưa chọn phòng --</option>
                      {availableRooms.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.code} — {r.boardingHouseName} — {fmt(r.baseRent)}/tháng
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.roomId && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Ngày nhận phòng *</label>
                          <input required type="date" value={formData.checkInDate}
                            onChange={e => setFormData({...formData, checkInDate: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Ngày trả phòng *</label>
                          <input required type="date" value={formData.checkOutDate}
                            onChange={e => setFormData({...formData, checkOutDate: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Giá thuê/ngày (VND)</label>
                          <input type="number" value={formData.monthlyRent}
                            onChange={e => setFormData({...formData, monthlyRent: e.target.value})}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Tiền cọc</label>
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
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Xóa khách"
        message="Bạn có chắc muốn xóa khách này?"
        confirmText="Xóa"
        cancelText="Hủy"
        danger
        onConfirm={() => { handleDelete(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        isOpen={confirmBulkDelete}
        title={`Xóa ${selected.size} khách`}
        message={`Xóa ${selected.size} khách đã chọn? Khách có hợp đồng active sẽ không thể xóa.`}
        confirmText="Xóa" cancelText="Hủy" danger
        onConfirm={() => { handleBulkDelete(); setConfirmBulkDelete(false) }}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      <BulkActionBar selectedCount={selected.size} onDelete={() => setConfirmBulkDelete(true)} onClear={() => setSelected(new Set())} />
    </div>
  )
}

export default Tenants
