import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '-'

const TenantDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingCheckout, setEditingCheckout] = useState(null) // contractId being edited
  const [newCheckoutDate, setNewCheckoutDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTenant() }, [id])

  const fetchTenant = async () => {
    try {
      const r = await api.get(`/tenants/${id}/detail`)
      setTenant(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const startEditCheckout = (contract) => {
    setEditingCheckout(contract.id)
    setNewCheckoutDate(contract.endDate)
  }

  const saveCheckout = async (contractId) => {
    setSaving(true)
    try {
      await api.patch(`/contracts/${contractId}/checkout-date`, { endDate: newCheckoutDate })
      setEditingCheckout(null)
      fetchTenant()
    } catch (e) {
      alert(e.response?.data?.message || 'Lỗi khi cập nhật')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải...</div>
  if (!tenant) return <div className="p-8 text-center text-red-500">Không tìm thấy khách</div>

  // Find active contract
  const activeContract = tenant.contracts?.find(c => c.status === 'ACTIVE')

  // Calculate debt summary from active contract
  const activeInvoices = tenant.invoices?.filter(inv => {
    return activeContract && tenant.contracts?.some(c => c.id === activeContract.id)
  }) || []

  const totalInvoiceAmount = tenant.invoices?.reduce((s, i) => s + (i.totalAmount || 0), 0) || 0
  const totalPaid = tenant.invoices?.reduce((s, i) => s + (i.paidAmount || 0), 0) || 0
  const totalRemaining = tenant.invoices?.reduce((s, i) => s + (i.remainingAmount || 0), 0) || 0

  const today = new Date(); today.setHours(0,0,0,0)
  const checkoutDate = activeContract ? new Date(activeContract.endDate) : null
  const daysUntilCheckout = checkoutDate ? Math.round((checkoutDate - today) / 86400000) : null

  return (
    <div>
      <button onClick={() => navigate('/admin/tenants')} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
      </button>

      {/* Header + debt summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">{tenant.fullName}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">SĐT:</span> <span className="font-medium ml-1">{tenant.phone}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium ml-1">{tenant.email || '-'}</span></div>
            <div><span className="text-gray-500">CCCD:</span> <span className="font-medium ml-1">{tenant.identityNumber || '-'}</span></div>
            <div><span className="text-gray-500">Ngày sinh:</span> <span className="font-medium ml-1">{fmtDate(tenant.dateOfBirth)}</span></div>
            <div className="col-span-2"><span className="text-gray-500">Địa chỉ:</span> <span className="font-medium ml-1">{tenant.permanentAddress || '-'}</span></div>
          </div>
        </div>

        {/* Debt summary card */}
        <div className={`rounded-lg shadow p-6 ${totalRemaining > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <h3 className="font-semibold text-gray-700 mb-3">Tổng kết thanh toán</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tổng hóa đơn:</span>
              <span className="font-medium">{fmt(totalInvoiceAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Đã thanh toán:</span>
              <span className="font-medium text-green-600">{fmt(totalPaid)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Còn lại:</span>
              <span className={`font-bold text-lg ${totalRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(totalRemaining)}
              </span>
            </div>
          </div>
          {activeContract && daysUntilCheckout !== null && (
            <div className={`mt-3 pt-3 border-t text-xs text-center font-medium ${
              daysUntilCheckout < 0 ? 'text-red-600' :
              daysUntilCheckout === 0 ? 'text-orange-600' :
              daysUntilCheckout <= 2 ? 'text-yellow-600' : 'text-gray-500'
            }`}>
              {daysUntilCheckout < 0 ? `⚠️ Quá hạn ${Math.abs(daysUntilCheckout)} ngày` :
               daysUntilCheckout === 0 ? '🔔 Trả phòng hôm nay' :
               daysUntilCheckout === 1 ? '🔔 Trả phòng ngày mai' :
               `📅 Còn ${daysUntilCheckout} ngày đến checkout`}
            </div>
          )}
        </div>
      </div>

      {/* Contracts */}
      {tenant.contracts?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Hợp đồng thuê phòng</h2>
          <div className="space-y-3">
            {tenant.contracts.map(c => (
              <div key={c.id} className={`border rounded-lg p-4 ${c.status === 'ACTIVE' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-blue-700">{c.code}</span>
                    <span className="ml-2 text-sm text-gray-600">— Phòng {c.roomCode}</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      c.status === 'TERMINATED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{c.status}</span>
                  </div>
                  <span className="text-sm font-medium">{fmt(c.monthlyRent)}/tháng</span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                  <span>Check-in: <strong>{fmtDate(c.startDate)}</strong></span>
                  <span className="flex items-center gap-1">
                    Check-out:
                    {editingCheckout === c.id ? (
                      <span className="flex items-center gap-1 ml-1">
                        <input type="date" value={newCheckoutDate}
                          onChange={e => setNewCheckoutDate(e.target.value)}
                          className="px-2 py-0.5 border border-blue-300 rounded text-sm" />
                        <button onClick={() => saveCheckout(c.id)} disabled={saving}
                          className="p-1 text-green-600 hover:text-green-800"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingCheckout(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 ml-1">
                        <strong>{fmtDate(c.endDate)}</strong>
                        {c.status === 'ACTIVE' && (
                          <button onClick={() => startEditCheckout(c)} className="text-blue-400 hover:text-blue-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      {tenant.invoices?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            Hóa đơn ({tenant.totalInvoices}) — Chưa thanh toán: <span className="text-red-600">{tenant.unpaidInvoices}</span>
          </h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Mã HĐ</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Kỳ</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Tổng tiền</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Đã trả</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Còn lại</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenant.invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{inv.code}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{inv.periodMonth}/{inv.periodYear}</td>
                  <td className="px-4 py-2 text-sm text-right">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-600">{fmt(inv.paidAmount)}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium text-red-600">{fmt(inv.remainingAmount)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      inv.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                      inv.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TenantDetail
