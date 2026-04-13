import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { DoorOpen, Users, DollarSign, AlertCircle, LogIn, LogOut, BedDouble } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '-'

const activityBadge = (type) => {
  if (type === 'CHECKIN') return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium"><LogIn className="w-3 h-3"/>Nhận phòng</span>
  if (type === 'CHECKOUT') return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-medium"><LogOut className="w-3 h-3"/>Trả phòng</span>
  return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium"><BedDouble className="w-3 h-3"/>Đang ở</span>
}

const GuestCard = ({ guest, navigate }) => {
  const debt = parseFloat(guest.totalDebt) || 0
  return (
    <div
      onClick={() => navigate(`/admin/tenants/${guest.tenantId}/detail`)}
      className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow cursor-pointer transition-all"
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          <p className="font-semibold text-sm text-gray-900">{guest.tenantName}</p>
          <p className="text-xs text-gray-400">{guest.tenantPhone}</p>
        </div>
        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-medium">{guest.roomCode}</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        {activityBadge(guest.activityType)}
        {debt > 0
          ? <span className="text-xs text-red-600 font-semibold flex items-center gap-0.5"><AlertCircle className="w-3 h-3"/>Nợ {fmt(debt)}</span>
          : <span className="text-xs text-green-600">✓ Đã TT</span>
        }
      </div>
      <div className="mt-1.5 text-xs text-gray-400">
        {fmtDate(guest.checkInDate)} → {fmtDate(guest.checkOutDate)}
        {guest.totalDays > 0 && <span className="ml-1">({guest.totalDays} ngày × {fmt(guest.dailyRate)})</span>}
      </div>
    </div>
  )
}

const DayColumn = ({ label, dateLabel, data, navigate, highlight }) => {
  const all = [...(data?.checkIns || []), ...(data?.checkOuts || []), ...(data?.staying || [])]
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="mb-3">
        <h3 className={`font-bold text-base ${highlight ? 'text-blue-700' : 'text-gray-700'}`}>{label}</h3>
        <p className="text-xs text-gray-400">{dateLabel}</p>
        <div className="flex gap-2 mt-2 text-xs">
          {data?.checkIns?.length > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{data.checkIns.length} nhận</span>}
          {data?.checkOuts?.length > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{data.checkOuts.length} trả</span>}
          {data?.staying?.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{data.staying.length} đang ở</span>}
          {all.length === 0 && <span className="text-gray-400">Không có khách</span>}
        </div>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data?.checkIns?.map(g => <GuestCard key={`ci-${g.contractId}`} guest={g} navigate={navigate} />)}
        {data?.checkOuts?.map(g => <GuestCard key={`co-${g.contractId}`} guest={g} navigate={navigate} />)}
        {data?.staying?.map(g => <GuestCard key={`st-${g.contractId}`} guest={g} navigate={navigate} />)}
        {all.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Không có hoạt động</p>}
      </div>
    </div>
  )
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = () => {
    api.get('/dashboard').then(r => setDashboard(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchDashboard() }, [])

  useEffect(() => {
    return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchDashboard)
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>

  const today = new Date()
  const fmtDay = (offset) => {
    const d = new Date(today); d.setDate(d.getDate() + offset)
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
  }

  const stats = [
    { label: 'Tổng phòng', value: dashboard?.totalRooms || 0, icon: DoorOpen, color: 'bg-blue-500' },
    { label: 'Đang có khách', value: dashboard?.occupiedRooms || 0, icon: Users, color: 'bg-green-500' },
    { label: 'Phòng trống', value: dashboard?.availableRooms || 0, icon: DoorOpen, color: 'bg-gray-400' },
    { label: 'Doanh thu tháng', value: fmt(dashboard?.monthlyRevenue), icon: DollarSign, color: 'bg-emerald-600' },
    { label: 'Chưa thanh toán', value: fmt(dashboard?.unpaidAmount), icon: DollarSign, color: 'bg-yellow-500' },
    { label: 'HĐ quá hạn', value: dashboard?.overdueInvoices || 0, icon: AlertCircle, color: 'bg-red-500' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className={`${s.color} w-8 h-8 rounded-full flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-gray-500 text-xs">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </div>
          )
        })}
      </div>

      <h2 className="text-lg font-semibold text-gray-700 mb-3">Lịch khách theo ngày</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DayColumn label="Hôm qua" dateLabel={fmtDay(-1)} data={dashboard?.yesterday} navigate={navigate} />
        <DayColumn label="Hôm nay" dateLabel={fmtDay(0)} data={dashboard?.today} navigate={navigate} highlight />
        <DayColumn label="Ngày mai" dateLabel={fmtDay(1)} data={dashboard?.tomorrow} navigate={navigate} />
      </div>
    </div>
  )
}

export default Dashboard
