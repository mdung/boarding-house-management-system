import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import {
  ChevronLeft, ChevronRight, LogIn, LogOut, Receipt, AlertTriangle,
  Eye, CreditCard, Calendar as CalIcon, X, ExternalLink, Filter,
  Building2, DollarSign, Users, Clock, RefreshCw, TrendingUp
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '-'

const EVENT_CONFIG = {
  CHECKIN:     { icon: LogIn,        color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-800',   label: 'Check-in',    dot: 'bg-emerald-500',  ring: 'ring-emerald-200' },
  CHECKOUT:    { icon: LogOut,       color: 'bg-amber-500',   light: 'bg-amber-50 border-amber-200 text-amber-800',         label: 'Check-out',   dot: 'bg-amber-500',    ring: 'ring-amber-200'   },
  INVOICE_DUE: { icon: Receipt,      color: 'bg-blue-500',    light: 'bg-blue-50 border-blue-200 text-blue-800',            label: 'Payment Due', dot: 'bg-blue-500',     ring: 'ring-blue-200'    },
  PAYMENT:     { icon: CreditCard,   color: 'bg-violet-500',  light: 'bg-violet-50 border-violet-200 text-violet-800',      label: 'Paid',        dot: 'bg-violet-500',   ring: 'ring-violet-200'  },
  OVERDUE:     { icon: AlertTriangle,color: 'bg-rose-500',    light: 'bg-rose-50 border-rose-200 text-rose-800',            label: 'Overdue',     dot: 'bg-rose-500',     ring: 'ring-rose-200'    },
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SummaryCard = ({ label, value, color, gradient, icon: Icon, small, active, onClick }) => (
  <button onClick={onClick}
    className={`relative overflow-hidden rounded-2xl p-4 border text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
      ${active ? `${gradient} border-transparent shadow-lg` : 'bg-white border-slate-100 hover:border-slate-200'}`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-white/20' : gradient}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
    <p className={`${small ? 'text-base' : 'text-2xl'} font-black ${active ? 'text-white' : color} leading-none`}>{value}</p>
    <p className={`text-xs font-medium mt-1 ${active ? 'text-white/80' : 'text-slate-500'}`}>{label}</p>
  </button>
)

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-3.5 h-3.5 text-slate-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value || '—'}</p>
    </div>
  </div>
)

const SuperCalendar = () => {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [filterType, setFilterType] = useState('ALL')
  const [filterHouse, setFilterHouse] = useState('ALL')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const { from, to, days } = useMemo(() => {
    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startPad = (firstDay.getDay() + 6) % 7
      const f = new Date(firstDay); f.setDate(f.getDate() - startPad)
      const endPad = (7 - lastDay.getDay()) % 7
      const t = new Date(lastDay); t.setDate(t.getDate() + endPad)
      const days = []; const d = new Date(f)
      while (d <= t) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
      return { from: f, to: t, days }
    } else {
      const d = new Date(currentDate)
      const diff = (d.getDay() + 6) % 7
      const monday = new Date(d); monday.setDate(d.getDate() - diff)
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
      const days = []; const cur = new Date(monday)
      while (cur <= sunday) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
      return { from: monday, to: sunday, days }
    }
  }, [year, month, viewMode, currentDate])

  const dateKey = (d) => d.toISOString().split('T')[0]

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true)
    try {
      const r = await api.get('/calendar/events', { params: { from: dateKey(from), to: dateKey(to) } })
      setEvents(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [from, to])

  useEffect(() => { fetchEvents() }, [fetchEvents])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, () => fetchEvents(true)) }, [fetchEvents])

  const houses = useMemo(() => {
    const set = new Set(events.map(e => e.boardingHouseName).filter(Boolean))
    return [...set].sort()
  }, [events])

  const filtered = useMemo(() => events.filter(e => {
    if (filterType !== 'ALL' && e.type !== filterType) return false
    if (filterHouse !== 'ALL' && e.boardingHouseName !== filterHouse) return false
    return true
  }), [events, filterType, filterHouse])

  const eventsByDate = useMemo(() => {
    const map = {}
    filtered.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [filtered])

  const summary = useMemo(() => ({
    checkins:    filtered.filter(e => e.type === 'CHECKIN').length,
    checkouts:   filtered.filter(e => e.type === 'CHECKOUT').length,
    overdue:     filtered.filter(e => e.type === 'OVERDUE').length,
    invoiceDue:  filtered.filter(e => e.type === 'INVOICE_DUE').length,
    unpaidTotal: filtered.filter(e => e.type === 'INVOICE_DUE' || e.type === 'OVERDUE').reduce((s, e) => s + (parseFloat(e.remainingAmount) || 0), 0),
    paidTotal:   filtered.filter(e => e.type === 'PAYMENT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
  }), [filtered])

  const nav = (dir) => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir); else d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  const todayKey = dateKey(new Date())
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekLabel = days.length ? `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[days.length-1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''

  const toggleFilter = (type) => setFilterType(f => f === type ? 'ALL' : type)

  // Event pill for calendar cells
  const EventPill = ({ event, compact }) => {
    const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.INVOICE_DUE
    const Icon = cfg.icon
    if (compact) return (
      <button onClick={e => { e.stopPropagation(); setSelectedEvent(event) }}
        className={`w-full text-left px-1.5 py-0.5 rounded-md text-[11px] font-semibold truncate border ${cfg.light} hover:opacity-90 transition-all hover:shadow-sm`}>
        <span className="flex items-center gap-1">
          <Icon className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{event.roomCode} {event.tenantName?.split(' ').pop()}</span>
        </span>
      </button>
    )
    return (
      <button onClick={() => setSelectedEvent(event)}
        className={`w-full text-left p-3 rounded-xl border ${cfg.light} hover:shadow-md transition-all hover:-translate-y-0.5 duration-150`}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-6 h-6 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm">{cfg.label}</span>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-white/70 rounded-full">{event.roomCode}</span>
        </div>
        <p className="text-sm font-medium truncate">{event.tenantName}</p>
        {(event.amount || event.remainingAmount) && (
          <p className="text-xs mt-1 opacity-75 font-medium">
            {event.type === 'PAYMENT' ? `+${fmt(event.amount)}` :
             event.remainingAmount > 0 ? `Còn ${fmt(event.remainingAmount)}` :
             event.invoiceStatus === 'PAID' ? '✓ Đã thanh toán' : fmt(event.amount)}
          </p>
        )}
      </button>
    )
  }

  // Event detail modal
  const EventModal = () => {
    if (!selectedEvent) return null
    const ev = selectedEvent
    const cfg = EVENT_CONFIG[ev.type] || EVENT_CONFIG.INVOICE_DUE
    const Icon = cfg.icon
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className={`${cfg.color} px-6 py-5 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-black text-white text-lg">{cfg.label}</h3>
                <p className="text-white/80 text-sm">{fmtDate(ev.date)}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEvent(null)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="p-6">
            <div className="space-y-0.5 mb-5">
              <InfoRow icon={Users}    label="Tenant"   value={ev.tenantName} />
              <InfoRow icon={Building2} label="Room"    value={`${ev.roomCode} — ${ev.boardingHouseName}`} />
              <InfoRow icon={Clock}    label="Contract" value={`${fmtDate(ev.checkInDate)} → ${fmtDate(ev.checkOutDate)}`} />
            </div>
            {(ev.type === 'INVOICE_DUE' || ev.type === 'OVERDUE' || ev.type === 'PAYMENT') && (
              <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-2">
                {ev.invoiceCode && <div className="flex justify-between text-sm"><span className="text-slate-500">Invoice</span><span className="font-bold text-slate-800">{ev.invoiceCode}</span></div>}
                {ev.amount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Total</span><span className="font-bold">{fmt(ev.amount)}</span></div>}
                {ev.paidAmount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Paid</span><span className="font-bold text-emerald-600">{fmt(ev.paidAmount)}</span></div>}
                {ev.remainingAmount > 0 && <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2"><span className="font-bold text-slate-700">Remaining</span><span className="font-black text-rose-600">{fmt(ev.remainingAmount)}</span></div>}
              </div>
            )}
            {(ev.type === 'CHECKIN' || ev.type === 'CHECKOUT') && ev.totalDebt > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <div><p className="text-xs text-rose-500 font-bold uppercase tracking-wider">Outstanding Debt</p><p className="text-rose-700 font-black">{fmt(ev.totalDebt)}</p></div>
              </div>
            )}
            <div className="flex gap-2">
              {ev.tenantId && <button onClick={() => { setSelectedEvent(null); navigate(`/admin/tenants/${ev.tenantId}/detail`) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors">
                <Eye className="w-4 h-4" /> Tenant
              </button>}
              {ev.contractId && <button onClick={() => { setSelectedEvent(null); navigate(`/admin/contracts/${ev.contractId}/detail`) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors">
                <ExternalLink className="w-4 h-4" /> Contract
              </button>}
              {ev.invoiceId && <button onClick={() => { setSelectedEvent(null); navigate(`/admin/invoices/${ev.invoiceId}/detail`) }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors">
                <Receipt className="w-4 h-4" /> Invoice
              </button>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Day detail side panel
  const DayPanel = () => {
    if (!selectedDay) return null
    const dayEvts = eventsByDate[selectedDay] || []
    const dayDate = new Date(selectedDay + 'T00:00:00')
    const isToday = selectedDay === todayKey
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
        <div className="bg-white w-full max-w-sm h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-lg">
                  {dayDate.toLocaleDateString('en-US', { weekday: 'long' })}
                </h3>
                {isToday && <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider">Today</span>}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {dayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}<span className="font-semibold text-slate-700">{dayEvts.length} event{dayEvts.length !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <button onClick={() => setSelectedDay(null)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          {/* Type breakdown */}
          {dayEvts.length > 0 && (
            <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-slate-50">
              {Object.entries(EVENT_CONFIG).map(([type, cfg]) => {
                const count = dayEvts.filter(e => e.type === type).length
                if (!count) return null
                return (
                  <span key={type} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.light}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label} · {count}
                  </span>
                )
              })}
            </div>
          )}
          <div className="flex-1 p-4 space-y-3">
            {dayEvts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <CalIcon className="w-12 h-12 mb-3 opacity-40" />
                <p className="font-semibold">No events this day</p>
              </div>
            ) : dayEvts.map((ev, i) => (
              <EventPill key={`${ev.type}-${ev.contractId}-${ev.invoiceId}-${i}`} event={ev} compact={false} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- MAIN RENDER ---
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <CalIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Management Calendar</h1>
            <p className="text-sm text-slate-500">Track check-ins, check-outs, payments</p>
          </div>
        </div>
        <button onClick={() => fetchEvents(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary cards — clickable filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Check-in"    value={summary.checkins}          color="text-emerald-600" gradient="bg-gradient-to-br from-emerald-500 to-teal-600"    icon={LogIn}        active={filterType==='CHECKIN'}     onClick={() => toggleFilter('CHECKIN')} />
        <SummaryCard label="Check-out"   value={summary.checkouts}         color="text-amber-600"   gradient="bg-gradient-to-br from-amber-500 to-orange-500"     icon={LogOut}       active={filterType==='CHECKOUT'}    onClick={() => toggleFilter('CHECKOUT')} />
        <SummaryCard label="Payment Due" value={summary.invoiceDue}        color="text-blue-600"    gradient="bg-gradient-to-br from-blue-500 to-indigo-600"      icon={Receipt}      active={filterType==='INVOICE_DUE'} onClick={() => toggleFilter('INVOICE_DUE')} />
        <SummaryCard label="Overdue"     value={summary.overdue}           color="text-rose-600"    gradient="bg-gradient-to-br from-rose-500 to-red-600"         icon={AlertTriangle} active={filterType==='OVERDUE'}    onClick={() => toggleFilter('OVERDUE')} />
        <SummaryCard label="Unpaid"      value={fmt(summary.unpaidTotal)}  color="text-rose-600"    gradient="bg-gradient-to-br from-rose-500 to-pink-600"        icon={DollarSign}   small active={false} onClick={() => {}} />
        <SummaryCard label="Collected"   value={fmt(summary.paidTotal)}    color="text-violet-600"  gradient="bg-gradient-to-br from-violet-500 to-purple-600"    icon={TrendingUp}   small active={filterType==='PAYMENT'} onClick={() => toggleFilter('PAYMENT')} />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors uppercase tracking-wider">
            Today
          </button>
          <button onClick={() => nav(1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="text-base font-black text-slate-900 ml-1 capitalize">
            {viewMode === 'month' ? monthLabel : weekLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          {filterType !== 'ALL' && (
            <button onClick={() => setFilterType('ALL')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors">
              <X className="w-3 h-3" /> Clear filter
            </button>
          )}
          {houses.length > 1 && (
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <select value={filterHouse} onChange={e => setFilterHouse(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                <option value="ALL">All properties</option>
                {houses.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          )}
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {['month', 'week'].map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${viewMode === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 flex flex-col items-center gap-4 text-slate-400">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading calendar...</p>
        </div>
      ) : viewMode === 'month' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const key = dateKey(day)
              const isToday = key === todayKey
              const isCurrentMonth = day.getMonth() === month
              const dayEvts = eventsByDate[key] || []
              const maxShow = 3
              const overflow = dayEvts.length - maxShow
              const types = [...new Set(dayEvts.map(e => e.type))]

              return (
                <div key={key} onClick={() => dayEvts.length > 0 && setSelectedDay(key)}
                  className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 transition-all duration-150
                    ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/40'}
                    ${isToday ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/20' : ''}
                    ${dayEvts.length > 0 ? 'cursor-pointer hover:bg-slate-50' : ''}
                    ${i % 7 === 0 ? 'border-l border-slate-100' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold leading-none flex items-center justify-center
                      ${isToday ? 'w-7 h-7 bg-blue-500 text-white rounded-full' : isCurrentMonth ? 'text-slate-800' : 'text-slate-300'}`}>
                      {day.getDate()}
                    </span>
                    {dayEvts.length > 0 && !isToday && (
                      <div className="flex gap-0.5">
                        {types.slice(0, 3).map(t => (
                          <div key={t} className={`w-1.5 h-1.5 rounded-full ${EVENT_CONFIG[t]?.dot || 'bg-slate-400'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvts.slice(0, maxShow).map((ev, j) => (
                      <EventPill key={`${ev.type}-${ev.contractId}-${j}`} event={ev} compact />
                    ))}
                    {overflow > 0 && (
                      <button onClick={e => { e.stopPropagation(); setSelectedDay(key) }}
                        className="w-full text-center text-[10px] font-bold text-blue-500 hover:text-blue-700 py-0.5 hover:bg-blue-50 rounded transition-colors">
                        +{overflow} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-slate-100">
            {days.map(day => {
              const key = dateKey(day)
              const isToday = key === todayKey
              const dayEvts = eventsByDate[key] || []
              return (
                <div key={key} className={`min-h-[420px] flex flex-col ${isToday ? 'bg-blue-50/30' : ''}`}>
                  <div className={`p-3 border-b border-slate-100 text-center ${isToday ? 'bg-blue-50' : 'bg-slate-50/60'}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <div className={`text-lg font-black mt-1 mx-auto w-9 h-9 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-blue-500 text-white' : 'text-slate-800'}`}>
                      {day.getDate()}
                    </div>
                    {dayEvts.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">{dayEvts.length} events</p>
                    )}
                  </div>
                  <div className="flex-1 p-2 space-y-1.5">
                    {dayEvts.map((ev, j) => <EventPill key={`${ev.type}-${ev.contractId}-${j}`} event={ev} compact={false} />)}
                    {dayEvts.length === 0 && <p className="text-xs text-slate-200 text-center pt-8 font-medium">—</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1">
        {Object.entries(EVENT_CONFIG).map(([k, v]) => (
          <button key={k} onClick={() => toggleFilter(k)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border
              ${filterType === k ? `${v.light} shadow-sm` : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>
            <div className={`w-2 h-2 rounded-full ${v.dot}`} />
            {v.label}
          </button>
        ))}
      </div>

      <EventModal />
      <DayPanel />
    </div>
  )
}

export default SuperCalendar
