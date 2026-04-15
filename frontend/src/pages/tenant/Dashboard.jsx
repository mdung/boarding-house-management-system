import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { BedDouble, FileText, CreditCard, AlertCircle } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '-'

const TenantDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      // Get tenant by user id
      const tenantRes = await api.get(`/tenants/user/${user.id}`)
      const tenant = tenantRes.data
      // Get tenant detail (contracts + invoices)
      const detailRes = await api.get(`/tenants/${tenant.id}/detail`)
      setData(detailRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>

  const activeContract = data?.contracts?.find(c => c.status === 'ACTIVE')
  const unpaidInvoices = data?.invoices?.filter(i => i.status !== 'PAID') || []
  const totalDebt = data?.invoices?.reduce((s, i) => s + (i.remainingAmount || 0), 0) || 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Xin chào, {user?.fullName} 👋</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full"><BedDouble className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Phòng đang ở</p>
              <p className="text-lg font-bold">{activeContract?.roomCode || '-'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-full"><FileText className="w-5 h-5 text-yellow-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Hóa đơn chưa trả</p>
              <p className="text-lg font-bold text-yellow-600">{unpaidInvoices.length}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-lg shadow p-4 ${totalDebt > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${totalDebt > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <AlertCircle className={`w-5 h-5 ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tổng còn nợ</p>
              <p className={`text-lg font-bold ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(totalDebt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active contract info */}
      {activeContract && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Thông tin hợp đồng hiện tại</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Mã HĐ:</span> <span className="font-medium ml-1">{activeContract.code}</span></div>
            <div><span className="text-gray-500">Phòng:</span> <span className="font-medium ml-1">{activeContract.roomCode}</span></div>
            <div><span className="text-gray-500">Nhận phòng:</span> <span className="font-medium ml-1">{fmtDate(activeContract.startDate)}</span></div>
            <div><span className="text-gray-500">Trả phòng:</span> <span className="font-medium ml-1">{fmtDate(activeContract.endDate)}</span></div>
            <div><span className="text-gray-500">Giá thuê:</span> <span className="font-medium ml-1">
              {activeContract.dailyRate ? `${fmt(activeContract.dailyRate)}/ngày` : `${fmt(activeContract.monthlyRent)}/tháng`}
            </span></div>
          </div>
        </div>
      )}

      {/* Recent unpaid invoices */}
      {unpaidInvoices.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-700">Hóa đơn chưa thanh toán</h2>
            <button onClick={() => navigate('/tenant/invoices')} className="text-sm text-blue-600 hover:underline">Xem tất cả</button>
          </div>
          <div className="space-y-2">
            {unpaidInvoices.slice(0, 3).map(inv => (
              <div key={inv.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{inv.code}</p>
                  <p className="text-xs text-gray-500">Kỳ {inv.periodMonth}/{inv.periodYear}</p>
                </div>
                <span className="text-sm font-bold text-red-600">{fmt(inv.remainingAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!activeContract && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Bạn chưa có hợp đồng thuê phòng nào đang hoạt động.</p>
        </div>
      )}
    </div>
  )
}

export default TenantDashboard
