import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

const CATEGORIES = { FOOD_DRINK: '🍺 Food & Drink', SERVICE: '🛵 Service' }

const GuestCharges = () => {
  const [searchParams] = useSearchParams()
  const [contracts, setContracts] = useState([])
  const [catalog, setCatalog] = useState([])
  const [selectedContractId, setSelectedContractId] = useState('')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [expandedDates, setExpandedDates] = useState({})
  const [formData, setFormData] = useState({
    chargeDate: new Date().toISOString().split('T')[0],
    catalogId: '',
    description: '',
    quantity: '1',
    unitPrice: '',
    note: '',
  })

  useEffect(() => {
    api.get('/contracts').then(r => setContracts(r.data)).catch(console.error)
    api.get('/service-catalog').then(r => setCatalog(r.data)).catch(console.error)
  }, [])

  // Auto-select contract from URL param (e.g. from dashboard modal)
  useEffect(() => {
    const cid = searchParams.get('contractId')
    if (cid) setSelectedContractId(cid)
  }, [searchParams])

  useEffect(() => {
    if (selectedContractId) fetchSummary()
  }, [selectedContractId])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/guest-charges/contract/${selectedContractId}/summary`)
      setSummary(r.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/guest-charges', {
        contractId: parseInt(selectedContractId),
        chargeDate: formData.chargeDate,
        description: formData.description,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        note: formData.note,
      })
      setShowModal(false)
      setFormData({ chargeDate: new Date().toISOString().split('T')[0], catalogId: '', description: '', quantity: '1', unitPrice: '', note: '' })
      fetchSummary()
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to save charge')
    }
  }

  const handleCatalogSelect = (catalogId) => {
    const item = catalog.find(c => c.id === parseInt(catalogId))
    if (item) {
      setFormData(prev => ({
        ...prev,
        catalogId,
        description: item.name,
        unitPrice: item.defaultPrice.toString(),
      }))
    } else {
      setFormData(prev => ({ ...prev, catalogId, description: '', unitPrice: '' }))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xóa khoản phí này?')) return
    await api.delete(`/guest-charges/${id}`)
    fetchSummary()
  }

  const toggleDate = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))

  // Group charges by date
  const chargesByDate = summary?.charges?.reduce((acc, c) => {
    const d = c.chargeDate
    if (!acc[d]) acc[d] = []
    acc[d].push(c)
    return acc
  }, {}) || {}

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Guest Service Charges</h1>
        {selectedContractId && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Thêm dịch vụ
          </button>
        )}
      </div>

      {/* Contract selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Chọn hợp đồng / phòng</label>
        <select
          value={selectedContractId}
          onChange={e => setSelectedContractId(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">-- Chọn hợp đồng --</option>
          {contracts.filter(c => c.status === 'ACTIVE').map(c => (
            <option key={c.id} value={c.id}>
              {c.code} — Phòng {c.roomCode} — {c.mainTenantName}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="text-center py-8 text-gray-500">Đang tải...</div>}

      {summary && !loading && (
        <>
          {/* Contract info bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Khách:</span>
              <span className="font-semibold ml-1">{summary.tenantName}</span>
            </div>
            <div>
              <span className="text-gray-500">Phòng:</span>
              <span className="font-semibold ml-1">{summary.roomCode}</span>
            </div>
            <div>
              <span className="text-gray-500">Check-in:</span>
              <span className="font-semibold ml-1">{summary.checkInDate ? new Date(summary.checkInDate + 'T00:00:00').toLocaleDateString('vi-VN') : '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">Check-out:</span>
              <span className="font-semibold ml-1">{summary.checkOutDate ? new Date(summary.checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN') : '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">Số đêm:</span>
              <span className="font-bold text-blue-600 ml-1">{summary.totalNights} đêm</span>
            </div>
            <div>
              <span className="text-gray-500">Đơn giá:</span>
              <span className="font-semibold ml-1">{fmt(summary.dailyRate)}/đêm</span>
            </div>
            {summary.deposit > 0 && (
              <div>
                <span className="text-gray-500">Tiền cọc:</span>
                <span className="font-semibold text-blue-600 ml-1">{fmt(summary.deposit)}</span>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Tiền phòng</p>
              <p className="text-lg font-bold text-gray-700">{fmt(summary.totalRent)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{summary.totalNights} đêm × {fmt(summary.dailyRate)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Tổng dịch vụ</p>
              <p className="text-lg font-bold text-blue-600">{fmt(summary.totalCharges)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Đã thanh toán</p>
              <p className="text-lg font-bold text-green-600">{fmt(summary.totalPaid)}</p>
            </div>
            <div className={`rounded-lg shadow p-4 ${summary.remainingAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-xs text-gray-500">Còn lại</p>
              <p className={`text-lg font-bold ${summary.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(summary.remainingAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Tổng: {fmt(summary.totalAmount)}</p>
            </div>
          </div>

          {/* Charges grouped by date */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-700">Chi tiết dịch vụ theo ngày</h2>
            </div>
            {Object.keys(chargesByDate).length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400">Chưa có dịch vụ nào</div>
            ) : (
              Object.entries(chargesByDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => {
                const dayTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0)
                const expanded = expandedDates[date] !== false // default expanded
                return (
                  <div key={date} className="border-b last:border-0">
                    <button
                      onClick={() => toggleDate(date)}
                      className="w-full flex justify-between items-center px-6 py-3 hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-800">
                        📅 {new Date(date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-blue-600">{fmt(dayTotal)}</span>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {expanded && (
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-2 text-left text-xs text-gray-500 uppercase">Mô tả</th>
                            <th className="px-6 py-2 text-right text-xs text-gray-500 uppercase">SL</th>
                            <th className="px-6 py-2 text-right text-xs text-gray-500 uppercase">Đơn giá</th>
                            <th className="px-6 py-2 text-right text-xs text-gray-500 uppercase">Thành tiền</th>
                            <th className="px-6 py-2 text-xs text-gray-500 uppercase">Ghi chú</th>
                            <th className="px-6 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-2 text-sm text-gray-900">{item.description}</td>
                              <td className="px-6 py-2 text-sm text-right text-gray-600">{item.quantity}</td>
                              <td className="px-6 py-2 text-sm text-right text-gray-600">{fmt(item.unitPrice)}</td>
                              <td className="px-6 py-2 text-sm text-right font-medium text-gray-900">{fmt(item.amount)}</td>
                              <td className="px-6 py-2 text-sm text-gray-500">{item.note || '-'}</td>
                              <td className="px-6 py-2 text-right">
                                <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Add charge modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Thêm dịch vụ</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ngày</label>
                <input type="date" required value={formData.chargeDate}
                  onChange={e => setFormData({ ...formData, chargeDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>

              {/* Catalog grouped by category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn dịch vụ</label>
                {Object.entries(CATEGORIES).map(([catKey, catLabel]) => {
                  const catItems = catalog.filter(c => c.category === catKey)
                  if (catItems.length === 0) return null
                  return (
                    <div key={catKey} className="mb-2">
                      <p className="text-xs text-gray-500 font-medium mb-1">{catLabel}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {catItems.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleCatalogSelect(item.id.toString())}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                              formData.catalogId === item.id.toString()
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {formData.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                  <input type="text" value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số lượng</label>
                  <input type="number" step="0.01" min="0.01" required value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Đơn giá (VND)</label>
                  <input type="number" step="1000" min="0" required value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              {formData.quantity && formData.unitPrice && (
                <div className="bg-blue-50 px-3 py-2 rounded text-sm">
                  Thành tiền: <strong>{fmt(parseFloat(formData.quantity) * parseFloat(formData.unitPrice))}</strong>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
                <input type="text" value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md">Hủy</button>
                <button type="submit" disabled={!formData.description || !formData.unitPrice}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GuestCharges
