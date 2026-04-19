import { useEffect, useState, useMemo } from 'react'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import {
  TrendingUp, Building2, Users, AlertTriangle, ShoppingBag,
  ChevronLeft, ChevronRight, Calendar, RefreshCw, ArrowUpRight,
  ArrowDownRight, DollarSign, Receipt, Clock, CheckCircle2, X
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtShort = (n) => {
  const v = parseFloat(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return v.toString()
}
const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const firstOfYear = () => `${new Date().getFullYear()}-01-01`

const TABS = [
  { id: 'revenue-month',  label: 'Revenue',       icon: TrendingUp,   sub: 'By Month' },
  { id: 'revenue-house',  label: 'By Property',   icon: Building2,    sub: 'Boarding House' },
  { id: 'services',       label: 'Services',      icon: ShoppingBag,  sub: 'Item Breakdown' },
  { id: 'tenants',        label: 'Tenants',       icon: Users,        sub: 'Currently Staying' },
  { id: 'debts',          label: 'Debts',         icon: AlertTriangle,sub: 'Outstanding' },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Animated bar component
const Bar = ({ pct, color, delay = 0, value }) => {
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 80 + delay); return () => clearTimeout(t) }, [pct, delay])
  return (
    <div className="relative h-8 bg-slate-100 rounded-xl overflow-hidden">
      <div className={`h-full rounded-xl ${color} transition-all duration-700 ease-out flex items-center justify-end pr-3`}
        style={{ width: `${width}%` }}>
        {width > 20 && <span className="text-white text-xs font-black">{fmtShort(value)}</span>}
      </div>
      {width <= 20 && value > 0 && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">{fmtShort(value)}</span>
      )}
    </div>
  )
}

// Dual bar: earned (bg) + collected (fg overlay)
const EarnedBar = ({ pct, delay, value }) => {
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 60 + delay); return () => clearTimeout(t) }, [pct, delay])
  return (
    <div className="absolute inset-0 bg-violet-100 rounded-xl transition-all duration-700 ease-out"
      style={{ width: `${width}%` }} />
  )
}
const CollectedBar = ({ pct, delay, value }) => {
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 60 + delay); return () => clearTimeout(t) }, [pct, delay])
  return (
    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl transition-all duration-700 ease-out flex items-center justify-end pr-2"
      style={{ width: `${width}%` }}>
      {width > 15 && <span className="text-white text-[10px] font-black">{fmtShort(value)}</span>}
    </div>
  )
}

// Stat card
const StatCard = ({ label, value, sub, icon: Icon, color, trend }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-xl font-black text-slate-900 leading-none">{value}</p>
    <p className="text-xs text-slate-400 font-medium mt-1">{label}</p>
    {sub && <p className="text-[10px] text-slate-300 mt-0.5">{sub}</p>}
  </div>
)

const Reports = () => {
  const [tab, setTab] = useState('revenue-month')
  const [revenueByMonth, setRevenueByMonth] = useState([])
  const [revenueByHouse, setRevenueByHouse] = useState([])
  const [serviceRevenue, setServiceRevenue] = useState([])
  const [tenants, setTenants] = useState([])
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [startDate, setStartDate] = useState(firstOfYear())
  const [endDate, setEndDate] = useState(todayLocal())
  const [selectedService, setSelectedService] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [monthDetailLoading, setMonthDetailLoading] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [propertyDetailLoading, setPropertyDetailLoading] = useState(false)

  const fetch = async (t = tab) => {
    setLoading(true)
    try {
      if (t === 'revenue-month') {
        const r = await api.get(`/reports/revenue-by-month?year=${year}`)
        setRevenueByMonth(r.data)
      } else if (t === 'revenue-house') {
        const r = await api.get(`/reports/revenue-by-boarding-house?startDate=${startDate}&endDate=${endDate}`)
        setRevenueByHouse(r.data)
      } else if (t === 'services') {
        const r = await api.get(`/reports/service-revenue?startDate=${startDate}&endDate=${endDate}`)
        setServiceRevenue(r.data)
      } else if (t === 'tenants') {
        const r = await api.get('/reports/tenants-currently-renting')
        setTenants(r.data)
      } else if (t === 'debts') {
        const r = await api.get('/reports/outstanding-debts')
        setDebts(r.data)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch(tab) }, [tab, year, startDate, endDate])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, () => fetch(tab)) }, [tab, year, startDate, endDate])

  // Summary stats for revenue-month
  const monthStats = useMemo(() => {
    const total = revenueByMonth.reduce((s, m) => s + parseFloat(m.totalRevenue || 0), 0)
    const best = revenueByMonth.reduce((b, m) => parseFloat(m.totalRevenue || 0) > parseFloat(b.totalRevenue || 0) ? m : b, revenueByMonth[0] || {})
    const totalInv = revenueByMonth.reduce((s, m) => s + (m.invoiceCount || 0), 0)
    const paidInv = revenueByMonth.reduce((s, m) => s + (m.paidInvoiceCount || 0), 0)
    return { total, best, totalInv, paidInv }
  }, [revenueByMonth])

  const debtStats = useMemo(() => ({
    total: debts.reduce((s, d) => s + parseFloat(d.remainingAmount || 0), 0),
    overdue: debts.filter(d => d.daysOverdue > 0).length,
    count: debts.length,
  }), [debts])

  const maxRevMonth = useMemo(() => Math.max(...revenueByMonth.map(m => parseFloat(m.totalRevenue || 0)), 1), [revenueByMonth])
  const maxRevHouse = useMemo(() => Math.max(...revenueByHouse.map(h => parseFloat(h.totalRevenue || 0)), 1), [revenueByHouse])
  const maxService = useMemo(() => Math.max(...serviceRevenue.map(s => parseFloat(s.totalAmount || 0)), 1), [serviceRevenue])

  const DateRangeBar = () => (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="text-xs font-semibold text-slate-700 outline-none bg-transparent" />
        <span className="text-slate-300 text-xs">→</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="text-xs font-semibold text-slate-700 outline-none bg-transparent" />
      </div>
      {/* Quick presets */}
      {[
        { label: 'This month', s: () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }, e: todayLocal },
        { label: 'This year',  s: firstOfYear, e: todayLocal },
        { label: 'Last 30d',   s: () => { const d=new Date(); d.setDate(d.getDate()-30); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }, e: todayLocal },
      ].map(p => (
        <button key={p.label} onClick={() => { setStartDate(p.s()); setEndDate(p.e()) }}
          className="px-3 py-2 text-[11px] font-bold bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
          {p.label}
        </button>
      ))}
    </div>
  )

  const openPropertyDetail = async (item) => {
    setPropertyDetailLoading(true)
    setSelectedProperty({ id: item.boardingHouseId, name: item.boardingHouseName, data: null })
    try {
      const r = await api.get(`/reports/revenue-by-boarding-house-detail?boardingHouseId=${item.boardingHouseId}&startDate=${startDate}&endDate=${endDate}`)
      setSelectedProperty({ id: item.boardingHouseId, name: item.boardingHouseName, data: r.data })
    } catch (e) { console.error(e) }
    finally { setPropertyDetailLoading(false) }
  }

  const openMonthDetail = async (item) => {
    setMonthDetailLoading(true)
    setSelectedMonth({ year: item.year, month: item.month, data: null })
    try {
      const r = await api.get(`/reports/revenue-by-month-detail?year=${item.year}&month=${item.month}`)
      setSelectedMonth({ year: item.year, month: item.month, data: r.data })
    } catch (e) { console.error(e) }
    finally { setMonthDetailLoading(false) }
  }

  return (
    <div className="space-y-5">
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } } .fade-up { animation: fadeUp 0.35s ease both } @keyframes slideInRight { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Reports & Analytics</h1>
            <p className="text-xs text-slate-400 font-medium">Revenue · Services · Tenants · Debts</p>
          </div>
        </div>
        <button onClick={() => fetch(tab)} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0
                ${active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white border border-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-700 shadow-sm'}`}>
              <Icon className="w-4 h-4" />
              {t.label}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{t.sub}</span>
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center gap-3 text-slate-300 shadow-sm">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold">Loading...</p>
        </div>
      )}

      {/* ── Revenue by Month ── */}
      {tab === 'revenue-month' && !loading && (
        <div className="space-y-4 fade-up">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y-1)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 shadow-sm transition-all">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-base font-black text-slate-900 w-12 text-center">{year}</span>
            <button onClick={() => setYear(y => y+1)} className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 shadow-sm transition-all">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Earned Revenue" value={fmtShort(revenueByMonth.reduce((s,m)=>s+parseFloat(m.earnedRevenue||0),0))} sub={`= Dashboard số`} icon={DollarSign} color="bg-gradient-to-br from-violet-500 to-purple-600" />
            <StatCard label="Collected Cash" value={fmtShort(revenueByMonth.reduce((s,m)=>s+parseFloat(m.totalRevenue||0),0))} sub="Tiền thực thu" icon={TrendingUp} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
            <StatCard label="Uncollected" value={fmtShort(revenueByMonth.reduce((s,m)=>s+parseFloat(m.uncollectedRevenue||0),0))} sub="Chưa thu được" icon={AlertTriangle} color="bg-gradient-to-br from-amber-500 to-orange-500" />
            <StatCard label="Paid Invoices" value={`${revenueByMonth.reduce((s,m)=>s+(m.paidInvoiceCount||0),0)}/${revenueByMonth.reduce((s,m)=>s+(m.invoiceCount||0),0)}`} sub={`${revenueByMonth.reduce((s,m)=>s+(m.invoiceCount||0),0) > 0 ? Math.round(revenueByMonth.reduce((s,m)=>s+(m.paidInvoiceCount||0),0)/revenueByMonth.reduce((s,m)=>s+(m.invoiceCount||0),0)*100) : 0}% rate`} icon={CheckCircle2} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
          </div>

          {/* Legend explanation */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500 flex-shrink-0" />
              <span className="text-slate-600"><span className="font-black text-slate-800">Earned</span> = tổng invoice phát sinh trong tháng (accrual)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-slate-600"><span className="font-black text-slate-800">Collected</span> = tiền thực nhận trong tháng (cash basis)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-slate-600"><span className="font-black text-slate-800">Uncollected</span> = Earned − Collected (còn nợ chưa thu)</span>
            </div>
            <div className="w-full text-slate-400 text-[10px]">
              💡 Collected có thể &gt; Earned nếu khách trả tiền tháng trước trong tháng này (ví dụ: nợ tháng 2 trả vào tháng 4)
            </div>
          </div>

          {/* Chart */}
          {revenueByMonth.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-300 shadow-sm">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">No revenue data for {year}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Monthly Revenue — {year}</p>
              <div className="space-y-4">
                {revenueByMonth.map((item, i) => {
                  const earned = parseFloat(item.earnedRevenue || 0)
                  const collected = parseFloat(item.totalRevenue || 0)
                  const uncollected = parseFloat(item.uncollectedRevenue || 0)
                  const maxVal = Math.max(...revenueByMonth.map(m => parseFloat(m.earnedRevenue || 0)), 1)
                  return (
                    <div key={item.month}>
                      <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3 mb-1">
                        <span className="text-xs font-bold text-slate-500 text-right">{MONTHS[(item.month||1)-1]}</span>
                        <div className="relative h-8 bg-slate-100 rounded-xl overflow-hidden">
                          {/* Earned bar (background) */}
                          <EarnedBar pct={(earned/maxVal)*100} delay={i*40} value={earned} />
                          {/* Collected bar (overlay) */}
                          <CollectedBar pct={(collected/maxVal)*100} delay={i*40+100} value={collected} />
                        </div>
                        <div className="text-right min-w-[70px]">
                          <p className="text-[10px] font-black text-violet-600">{fmtShort(earned)}</p>
                          <p className="text-[10px] font-bold text-emerald-600">{fmtShort(collected)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Chart legend */}
              <div className="flex gap-4 mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-200" /><span className="text-[10px] font-bold text-slate-500">Earned (phát sinh)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-[10px] font-bold text-slate-500">Collected (thực thu)</span></div>
              </div>
            </div>
          )}

          {/* Table */}
          {revenueByMonth.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Month</th>
                    <th className="px-5 py-3 text-right text-[10px] font-black text-violet-400 uppercase tracking-widest">
                      <span className="group relative cursor-help inline-flex items-center gap-1">
                        Earned ≈ Dashboard
                        <span className="text-violet-300">ⓘ</span>
                        <span className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[10px] font-normal rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed shadow-xl">
                          <span className="font-black block mb-1">Earned (Doanh thu phát sinh)</span>
                          = Tổng invoice.totalAmount theo tháng billing<br/>
                          = Room charge + Service charges<br/><br/>
                          <span className="text-slate-400">Đây là con số giống Dashboard "Room Revenue This Month". Chưa tính đến việc đã thu tiền chưa.</span>
                        </span>
                      </span>
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      <span className="group relative cursor-help inline-flex items-center gap-1">
                        Collected
                        <span className="text-emerald-300">ⓘ</span>
                        <span className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[10px] font-normal rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed shadow-xl">
                          <span className="font-black block mb-1">Collected (Tiền thực thu)</span>
                          = Tổng payments.paidAmount theo ngày nhận tiền<br/><br/>
                          <span className="text-slate-400">Có thể &gt; Earned nếu khách trả nợ tháng trước trong tháng này. Có thể &lt; Earned nếu còn nợ chưa thu.</span>
                        </span>
                      </span>
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-black text-amber-500 uppercase tracking-widest">
                      <span className="group relative cursor-help inline-flex items-center gap-1">
                        Uncollected
                        <span className="text-amber-300">ⓘ</span>
                        <span className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[10px] font-normal rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed shadow-xl">
                          <span className="font-black block mb-1">Uncollected (Còn nợ)</span>
                          = Earned − Collected (nếu &gt; 0)<br/><br/>
                          <span className="text-slate-400">Số tiền đã phát sinh invoice nhưng chưa thu được. Xem chi tiết ở tab "Debts".</span>
                        </span>
                      </span>
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</th>
                    <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {revenueByMonth.map(item => (
                    <tr key={item.month} onClick={() => openMonthDetail(item)}
                      className="hover:bg-violet-50/40 cursor-pointer transition-colors group">
                      <td className="px-5 py-3 text-sm font-bold text-slate-800 flex items-center gap-2">
                        {MONTH_FULL[(item.month||1)-1]} {item.year}
                        <span className="text-[10px] font-bold text-slate-300 group-hover:text-violet-400 transition-colors">Details →</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-black text-violet-600">{fmt(item.earnedRevenue)}</span>
                        <p className="text-[10px] text-slate-400">{fmt(item.earnedRoomRevenue)} room + {fmt(item.earnedServiceRevenue)} svc</p>
                      </td>
                      <td className="px-5 py-3 text-sm font-black text-emerald-600 text-right">{fmt(item.totalRevenue)}</td>
                      <td className="px-5 py-3 text-right">
                        {parseFloat(item.uncollectedRevenue||0) > 0
                          ? <span className="text-sm font-black text-amber-600">{fmt(item.uncollectedRevenue)}</span>
                          : <span className="text-sm text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500 text-right">{item.paidInvoiceCount}/{item.invoiceCount}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${item.invoiceCount > 0 && item.paidInvoiceCount === item.invoiceCount ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {item.invoiceCount > 0 ? Math.round((item.paidInvoiceCount/item.invoiceCount)*100) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Revenue by Property ── */}
      {tab === 'revenue-house' && !loading && (
        <div className="space-y-4 fade-up">
          <DateRangeBar />
          {revenueByHouse.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-300 shadow-sm">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">No data for selected period</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Total Revenue" value={fmtShort(revenueByHouse.reduce((s,h)=>s+parseFloat(h.totalRevenue||0),0))} sub={fmt(revenueByHouse.reduce((s,h)=>s+parseFloat(h.totalRevenue||0),0))} icon={DollarSign} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
                <StatCard label="Properties" value={revenueByHouse.length} icon={Building2} color="bg-gradient-to-br from-amber-500 to-orange-500" />
                <StatCard label="Total Invoices" value={revenueByHouse.reduce((s,h)=>s+(h.invoiceCount||0),0)} icon={Receipt} color="bg-gradient-to-br from-violet-500 to-purple-600" />
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Revenue by Property</p>
                <div className="space-y-3">
                  {revenueByHouse.map((item, i) => (
                    <button key={item.boardingHouseId} onClick={() => openPropertyDetail(item)}
                      className="w-full grid grid-cols-[140px_1fr_auto] items-center gap-3 hover:opacity-80 transition-opacity text-left">
                      <span className="text-xs font-bold text-slate-600 truncate text-right">{item.boardingHouseName}</span>
                      <Bar pct={(parseFloat(item.totalRevenue||0)/maxRevHouse)*100} color="bg-gradient-to-r from-blue-500 to-indigo-500" delay={i*50} value={item.totalRevenue} />
                      <span className="text-[10px] font-bold text-slate-400 min-w-[50px] text-right">{item.paidInvoiceCount}/{item.invoiceCount}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Property</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {revenueByHouse.map(item => (
                      <tr key={item.boardingHouseId} onClick={() => openPropertyDetail(item)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                        <td className="px-5 py-3 text-sm font-bold text-slate-800 flex items-center gap-2">
                          {item.boardingHouseName}
                          <span className="text-[10px] font-bold text-slate-300 group-hover:text-blue-400 transition-colors">Details →</span>
                        </td>
                        <td className="px-5 py-3 text-sm font-black text-blue-600 text-right">{fmt(item.totalRevenue)}</td>
                        <td className="px-5 py-3 text-sm text-slate-500 text-right">{item.invoiceCount}</td>
                        <td className="px-5 py-3 text-sm text-emerald-600 font-bold text-right">{item.paidInvoiceCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Service Revenue ── */}
      {tab === 'services' && !loading && (
        <div className="space-y-4 fade-up">
          <DateRangeBar />
          {serviceRevenue.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-300 shadow-sm">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">No service charges for selected period</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard label="Service Revenue" value={fmtShort(serviceRevenue.reduce((s,x)=>s+parseFloat(x.totalAmount||0),0))} sub={fmt(serviceRevenue.reduce((s,x)=>s+parseFloat(x.totalAmount||0),0))} icon={DollarSign} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
                <StatCard label="Unique Services" value={serviceRevenue.length} icon={ShoppingBag} color="bg-gradient-to-br from-amber-500 to-orange-500" />
                <StatCard label="Total Orders" value={serviceRevenue.reduce((s,x)=>s+(x.count||0),0)} icon={Receipt} color="bg-gradient-to-br from-violet-500 to-purple-600" />
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Top Services by Revenue</p>
                <div className="space-y-3">
                  {serviceRevenue.slice(0, 15).map((item, i) => (
                    <button key={i} onClick={() => setSelectedService(item)}
                      className="w-full grid grid-cols-[140px_1fr_auto] items-center gap-3 hover:opacity-80 transition-opacity text-left">
                      <span className="text-xs font-bold text-slate-600 truncate text-right">{item.description}</span>
                      <Bar pct={(parseFloat(item.totalAmount||0)/maxService)*100} color="bg-gradient-to-r from-emerald-500 to-teal-500" delay={i*30} value={item.totalAmount} />
                      <span className="text-[10px] font-bold text-slate-400 min-w-[40px] text-right">×{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Orders</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg/Order</th>
                      <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {serviceRevenue.map((item, i) => (
                      <tr key={i} onClick={() => setSelectedService(item)}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors group">
                        <td className="px-5 py-3 text-sm font-bold text-slate-800 flex items-center gap-2">
                          {item.description}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500 text-right">{item.count}</td>
                        <td className="px-5 py-3 text-sm font-black text-emerald-600 text-right">{fmt(item.totalAmount)}</td>
                        <td className="px-5 py-3 text-sm text-slate-400 text-right">{fmt(parseFloat(item.totalAmount||0)/Math.max(item.count,1))}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-[10px] font-bold text-slate-300 group-hover:text-emerald-500 transition-colors">Details →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Service Drill-down Panel ── */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedService(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative bg-white w-full max-w-[420px] h-full shadow-2xl flex flex-col"
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-black text-white text-base leading-tight">{selectedService.description}</h2>
                    <p className="text-white/70 text-xs mt-0.5">{selectedService.count} orders · {fmt(selectedService.totalAmount)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedService(null)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: 'Total', value: fmt(selectedService.totalAmount) },
                  { label: 'Orders', value: selectedService.count },
                  { label: 'Avg', value: fmt(parseFloat(selectedService.totalAmount||0)/Math.max(selectedService.count,1)) },
                ].map(s => (
                  <div key={s.label} className="bg-white/15 rounded-xl px-3 py-2 text-center">
                    <p className="text-white font-black text-sm">{s.value}</p>
                    <p className="text-white/60 text-[10px] font-bold">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-3">All Charges</p>
              {(selectedService.items || []).map((item, i) => (
                <div key={i} className="bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl p-3.5 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 leading-tight">{item.tenantName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{item.roomCode} · {item.boardingHouseName}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-600 flex-shrink-0">{fmt(item.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pl-9">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.chargeDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                    </span>
                    <span>{item.quantity} × {fmt(item.unitPrice)}</span>
                    {item.note && <span className="text-slate-300 truncate max-w-[80px]">{item.note}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-medium">{selectedService.count} charges · Total {fmt(selectedService.totalAmount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Current Tenants ── */}
      {tab === 'tenants' && !loading && (
        <div className="space-y-4 fade-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard label="Currently Staying" value={tenants.length} sub="Active contracts" icon={Users} color="bg-gradient-to-br from-blue-500 to-indigo-600" />
          </div>
          {tenants.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-300 shadow-sm">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">No active tenants</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                    <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                            {t.fullName?.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-800">{t.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">{t.phone || '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{t.email || '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-500 font-mono">{t.identityNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Outstanding Debts ── */}
      {tab === 'debts' && !loading && (
        <div className="space-y-4 fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Outstanding" value={fmtShort(debtStats.total)} sub={fmt(debtStats.total)} icon={DollarSign} color="bg-gradient-to-br from-rose-500 to-red-600" />
            <StatCard label="Overdue" value={debtStats.overdue} sub="Past due date" icon={Clock} color="bg-gradient-to-br from-amber-500 to-orange-500" />
            <StatCard label="Unpaid Invoices" value={debtStats.count} icon={Receipt} color="bg-gradient-to-br from-slate-600 to-slate-700" />
          </div>
          {debts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
              <p className="text-sm font-bold text-slate-400">All clear — no outstanding debts</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenant</th>
                    <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Room</th>
                    <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                    <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid</th>
                    <th className="px-5 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Remaining</th>
                    <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Due</th>
                    <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {debts.map(d => (
                    <tr key={d.invoiceId} className={`hover:bg-slate-50/50 transition-colors ${d.daysOverdue > 0 ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-bold text-slate-800">{d.tenantName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{d.invoiceCode}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">{d.roomCode}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 text-right">{fmt(d.totalAmount)}</td>
                      <td className="px-5 py-3 text-sm text-emerald-600 font-bold text-right">{fmt(d.paidAmount)}</td>
                      <td className="px-5 py-3 text-sm font-black text-rose-600 text-right">{fmt(d.remainingAmount)}</td>
                      <td className="px-5 py-3 text-center">
                        {d.daysOverdue > 0 ? (
                          <span className="flex items-center justify-center gap-1 text-[11px] font-black text-rose-600">
                            <Clock className="w-3 h-3" />{d.daysOverdue}d
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">{d.dueDate || '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg border ${
                          d.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          d.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {d.status === 'PARTIALLY_PAID' ? 'Partial' : d.status === 'OVERDUE' ? 'Overdue' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Property Detail Panel ── */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedProperty(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative bg-white w-full max-w-[480px] h-full shadow-2xl flex flex-col"
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-black text-white text-base">{selectedProperty.name}</h2>
                    {selectedProperty.data && <p className="text-white/70 text-xs mt-0.5">{fmt(selectedProperty.data.totalRevenue)} total</p>}
                  </div>
                </div>
                <button onClick={() => setSelectedProperty(null)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              {selectedProperty.data && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: 'Total', value: fmt(selectedProperty.data.totalRevenue) },
                    { label: 'Room', value: fmt(selectedProperty.data.totalRoom) },
                    { label: 'Services', value: fmt(selectedProperty.data.totalService) },
                  ].map(s => (
                    <div key={s.label} className="bg-white/15 rounded-xl px-3 py-2 text-center">
                      <p className="text-white font-black text-xs">{s.value}</p>
                      <p className="text-white/60 text-[10px] font-bold">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {propertyDetailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedProperty.data ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {selectedProperty.data.invoices?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Room Invoices ({selectedProperty.data.invoices.length})</p>
                    <div className="space-y-2">
                      {selectedProperty.data.invoices.map((inv, i) => (
                        <div key={i} className="bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl p-3.5 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{inv.tenantName}</p>
                                <p className="text-[10px] text-slate-400">{inv.roomCode} · {MONTHS[(inv.periodMonth||1)-1]} {inv.periodYear}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-black text-blue-600">{fmt(inv.totalAmount)}</p>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${inv.status==='PAID'?'bg-emerald-100 text-emerald-700':inv.status==='PARTIALLY_PAID'?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700'}`}>
                                {inv.status==='PAID'?'Paid':inv.status==='PARTIALLY_PAID'?'Partial':'Unpaid'}
                              </span>
                            </div>
                          </div>
                          {parseFloat(inv.paidAmount)>0 && (
                            <div className="flex justify-between text-[10px] text-slate-400 mt-2 pl-9">
                              <span>Paid: <span className="text-emerald-600 font-bold">{fmt(inv.paidAmount)}</span></span>
                              {parseFloat(inv.remainingAmount)>0 && <span>Remaining: <span className="text-rose-500 font-bold">{fmt(inv.remainingAmount)}</span></span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedProperty.data.serviceCharges?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Service Charges ({selectedProperty.data.serviceCharges.length})</p>
                    <div className="space-y-2">
                      {selectedProperty.data.serviceCharges.map((gc, i) => (
                        <div key={i} className="bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl p-3.5 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{gc.description}</p>
                                <p className="text-[10px] text-slate-400">{gc.tenantName} · {gc.roomCode}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-black text-emerald-600">{fmt(gc.amount)}</p>
                              <p className="text-[10px] text-slate-400">{new Date(gc.chargeDate+'T00:00:00').toLocaleDateString('vi-VN')}</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 pl-9">{gc.quantity} × {fmt(gc.unitPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Month Detail Panel ── */}
      {selectedMonth && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedMonth(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative bg-white w-full max-w-[480px] h-full shadow-2xl flex flex-col"
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-black text-white text-lg">{MONTH_FULL[(selectedMonth.month||1)-1]} {selectedMonth.year}</h2>
                  {selectedMonth.data && (
                    <p className="text-white/70 text-xs mt-1">
                      Earned {fmt(selectedMonth.data.totalEarned)} · Collected {fmt(selectedMonth.data.totalCollected)}
                    </p>
                  )}
                </div>
                <button onClick={() => setSelectedMonth(null)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              {selectedMonth.data && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
                    <p className="text-white font-black text-sm">{fmt(selectedMonth.data.totalEarned)}</p>
                    <p className="text-white/60 text-[10px] font-bold">Earned</p>
                  </div>
                  <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
                    <p className="text-white font-black text-sm">{fmt(selectedMonth.data.totalCollected)}</p>
                    <p className="text-white/60 text-[10px] font-bold">Collected</p>
                  </div>
                </div>
              )}
            </div>

            {monthDetailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedMonth.data ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Invoices */}
                {selectedMonth.data.invoices?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                      Room Invoices ({selectedMonth.data.invoices.length})
                    </p>
                    <div className="space-y-2">
                      {selectedMonth.data.invoices.map((inv, i) => (
                        <div key={i} className="bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl p-3.5 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                                <Receipt className="w-3.5 h-3.5 text-violet-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{inv.tenantName}</p>
                                <p className="text-[10px] text-slate-400">{inv.roomCode} · {inv.boardingHouseName}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-black text-violet-600">{fmt(inv.totalAmount)}</p>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                inv.status === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>{inv.status === 'PAID' ? 'Paid' : inv.status === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}</span>
                            </div>
                          </div>
                          {parseFloat(inv.paidAmount) > 0 && (
                            <div className="flex justify-between text-[10px] text-slate-400 mt-2 pl-9">
                              <span>Paid: <span className="text-emerald-600 font-bold">{fmt(inv.paidAmount)}</span></span>
                              {parseFloat(inv.remainingAmount) > 0 && <span>Remaining: <span className="text-rose-500 font-bold">{fmt(inv.remainingAmount)}</span></span>}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-300 mt-1 pl-9 font-mono">{inv.invoiceCode}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service charges */}
                {selectedMonth.data.serviceCharges?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                      Service Charges ({selectedMonth.data.serviceCharges.length})
                    </p>
                    <div className="space-y-2">
                      {selectedMonth.data.serviceCharges.map((gc, i) => (
                        <div key={i} className="bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl p-3.5 transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{gc.description}</p>
                                <p className="text-[10px] text-slate-400">{gc.tenantName} · {gc.roomCode}</p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-black text-emerald-600">{fmt(gc.amount)}</p>
                              <p className="text-[10px] text-slate-400">{new Date(gc.chargeDate+'T00:00:00').toLocaleDateString('vi-VN')}</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 pl-9">{gc.quantity} × {fmt(gc.unitPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
