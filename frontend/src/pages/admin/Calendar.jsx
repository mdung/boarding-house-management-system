import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { useProperty } from '../../context/PropertyContext'
import {
  ChevronLeft, ChevronRight, LogIn, LogOut, Receipt, AlertTriangle,
  CreditCard, Calendar as CalIcon, X, ExternalLink,
  Building2, DollarSign, Users, TrendingUp, RefreshCw, ArrowRight
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '-'

const TYPE_CFG = {
  CHECKIN:     { icon: LogIn,         color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', label: 'Check-in',    textColor: 'text-emerald-600' },
  CHECKOUT:    { icon: LogOut,        color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-400',   label: 'Check-out',   textColor: 'text-amber-600'   },
  INVOICE_DUE: { icon: Receipt,       color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-400',    label: 'Due',         textColor: 'text-blue-600'    },
  PAYMENT:     { icon: CreditCard,    color: 'bg-violet-500',  light: 'bg-violet-50 text-violet-700 border-violet-200',    dot: 'bg-violet-400',  label: 'Paid',        textColor: 'text-violet-600'  },
  OVERDUE:     { icon: AlertTriangle, color: 'bg-rose-500',    light: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-400',    label: 'Overdue',     textColor: 'text-rose-600'    },
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Group events by contractId for a given day, merging PAYMENT into CHECKIN/CHECKOUT card
function groupByContract(events) {
  const map = {}
  events.forEach(ev => {
    const key = ev.contractId || `${ev.type}-${ev.tenantId}`
    if (!map[key]) map[key] = { contractId: ev.contractId, tenantId: ev.tenantId, tenantName: ev.tenantName, roomCode: ev.roomCode, boardingHouseName: ev.boardingHouseName, checkInDate: ev.checkInDate, checkOutDate: ev.checkOutDate, types: [], payment: null, debt: ev.totalDebt, invoiceId: ev.invoiceId }
    if (ev.type === 'PAYMENT') {
      map[key].payment = ev.amount
    } else {
      if (!map[key].types.includes(ev.type)) map[key].types.push(ev.type)
    }
    // carry over invoice info
    if (ev.invoiceId && !map[key].invoiceId) map[key].invoiceId = ev.invoiceId
    if (ev.remainingAmount > 0) map[key].remaining = ev.remainingAmount
    if (ev.totalDebt > 0) map[key].debt = ev.totalDebt
  })
  return Object.values(map)
}

const SuperCalendar = () => {
  const navigate = useNavigate()
  const { selectedId: propertyId, selectedProperty, properties } = useProperty()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  const [selectedDay, setSelectedDay] = useState(null)
  const [filterType, setFilterType] = useState('ALL')
  const [filterHouse, setFilterHouse] = useState('ALL')

  // Sync filterHouse with global property selector
  useEffect(() => {
    setFilterHouse(propertyId)
  }, [propertyId])

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

  const dateKey = (d) => {
    const dd = new Date(d)
    return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`
  }

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

  const houses = useMemo(() => [...new Set(events.map(e => e.boardingHouseName).filter(Boolean))].sort(), [events])

  const filtered = useMemo(() => events.filter(e => {
    if (filterType !== 'ALL' && e.type !== filterType) return false
    if (filterHouse !== 'ALL' && String(e.boardingHouseId) !== String(filterHouse)) return false
    return true
  }), [events, filterType, filterHouse])

  const eventsByDate = useMemo(() => {
    const map = {}
    filtered.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [filtered])

  const summary = useMemo(() => ({
    checkins:   filtered.filter(e => e.type === 'CHECKIN').length,
    checkouts:  filtered.filter(e => e.type === 'CHECKOUT').length,
    overdue:    filtered.filter(e => e.type === 'OVERDUE').length,
    invoiceDue: filtered.filter(e => e.type === 'INVOICE_DUE').length,
    unpaid:     filtered.filter(e => e.type === 'INVOICE_DUE' || e.type === 'OVERDUE').reduce((s, e) => s + (parseFloat(e.remainingAmount) || 0), 0),
    collected:  filtered.filter(e => e.type === 'PAYMENT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
  }), [filtered])

  const nav = (dir) => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir); else d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  const todayKey = dateKey(new Date())
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekLabel = days.length ? `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[days.length-1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''

  // ── Stat pill ──────────────────────────────────────────────────────────────
  const StatPill = ({ icon: Icon, label, value, dot, active, onClick, money }) => (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-left transition-all duration-150 hover:shadow-sm
        ${active ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-700 hover:border-slate-300'}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className={`text-xs font-bold ${active ? 'text-white/70' : 'text-slate-400'}`}>{label}</span>
      <span className={`text-sm font-black ml-auto pl-2 ${money ? 'text-[11px]' : ''} ${active ? 'text-white' : 'text-slate-800'}`}>{value}</span>
    </button>
  )

  // ── Contract card in side panel ────────────────────────────────────────────
  const ContractCard = ({ group }) => {
    const primaryType = group.types[0] || 'CHECKIN'
    const cfg = TYPE_CFG[primaryType] || TYPE_CFG.CHECKIN
    const Icon = cfg.icon
    const debt = parseFloat(group.debt) || 0
    const paid = parseFloat(group.payment) || 0
    const isPaid = debt === 0 && paid > 0
    const hasDebt = debt > 0

    return (
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group">
        {/* Top bar */}
        <div className={`h-1 w-full ${cfg.color}`} />
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <Icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm leading-tight">{group.tenantName}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{group.roomCode} · {group.boardingHouseName}</p>
              </div>
            </div>
            {/* Status badge */}
            {isPaid && (
              <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl border border-emerald-100 flex-shrink-0">
                ✓ Paid
              </span>
            )}
            {hasDebt && (
              <span className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-black rounded-xl border border-rose-100 flex-shrink-0">
                <AlertTriangle className="w-2.5 h-2.5" /> {fmt(debt)}
              </span>
            )}
            {!isPaid && !hasDebt && (
              <span className={`px-2 py-1 text-[10px] font-black rounded-xl border flex-shrink-0 ${cfg.light}`}>
                {group.types.map(t => TYPE_CFG[t]?.label).join(' + ')}
              </span>
            )}
          </div>

          {/* Contract dates */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-3">
            <span>{fmtDate(group.checkInDate)}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{fmtDate(group.checkOutDate)}</span>
          </div>

          {/* Event type chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {group.types.map(t => {
              const c = TYPE_CFG[t]
              const TIcon = c.icon
              return (
                <span key={t} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${c.light}`}>
                  <TIcon className="w-2.5 h-2.5" /> {c.label}
                </span>
              )
            })}
            {paid > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-violet-50 text-violet-700 border-violet-200">
                <CreditCard className="w-2.5 h-2.5" /> +{fmt(paid)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-50">
            {group.tenantId && (
              <button onClick={() => { setSelectedDay(null); navigate(`/admin/tenants/${group.tenantId}/detail`) }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                <Users className="w-3 h-3" /> Tenant
              </button>
            )}
            {group.contractId && (
              <button onClick={() => { setSelectedDay(null); navigate(`/admin/contracts/${group.contractId}/detail`) }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors">
                <ExternalLink className="w-3 h-3" /> Contract
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Day side panel ─────────────────────────────────────────────────────────
  const DayPanel = () => {
    if (!selectedDay) return null
    const dayEvts = eventsByDate[selectedDay] || []
    const groups = groupByContract(dayEvts)
    const dayDate = new Date(selectedDay + 'T00:00:00')
    const isToday = selectedDay === todayKey

    // count by type (raw events)
    const typeCounts = {}
    dayEvts.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1 })

    return (
      <div className="fixed inset-0 z-[60] flex justify-end" onClick={() => setSelectedDay(null)}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
        <div className="relative bg-white w-full max-w-[360px] h-full shadow-2xl flex flex-col"
          style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)' }}
          onClick={e => e.stopPropagation()}>

          {/* Panel header */}
          <div className="px-5 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-slate-900">
                    {dayDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </p>
                  {isToday && (
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded-full uppercase tracking-widest">Today</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {dayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors mt-0.5">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Type summary chips */}
            {dayEvts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(typeCounts).map(([type, count]) => {
                  const c = TYPE_CFG[type]
                  if (!c) return null
                  return (
                    <span key={type} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${c.light}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {c.label} · {count}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-200">
                <CalIcon className="w-14 h-14 mb-3" />
                <p className="text-sm font-bold text-slate-300">No events</p>
              </div>
            ) : groups.map((g, i) => (
              <ContractCard key={`${g.contractId}-${i}`} group={g} />
            ))}
          </div>

          {/* Footer count */}
          {groups.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-50 text-center">
              <p className="text-[11px] text-slate-400 font-medium">{groups.length} guest{groups.length !== 1 ? 's' : ''} · {dayEvts.length} event{dayEvts.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Month cell ─────────────────────────────────────────────────────────────
  const MonthCell = ({ day, i }) => {
    const key = dateKey(day)
    const isToday = key === todayKey
    const isCurrentMonth = day.getMonth() === month
    const dayEvts = eventsByDate[key] || []
    const hasEvents = dayEvts.length > 0

    // unique types for dots
    const uniqueTypes = [...new Set(dayEvts.map(e => e.type === 'PAYMENT' ? null : e.type).filter(Boolean))]
    const hasPaid = dayEvts.some(e => e.type === 'PAYMENT')
    const hasDebt = dayEvts.some(e => parseFloat(e.totalDebt) > 0)

    // group for compact preview
    const groups = groupByContract(dayEvts)
    const showGroups = groups.slice(0, 2)
    const overflow = groups.length - 2

    return (
      <div key={key} onClick={() => hasEvents && setSelectedDay(key)}
        className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 transition-all duration-150 select-none
          ${isCurrentMonth ? 'bg-white' : 'bg-slate-50/30'}
          ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}
          ${hasEvents ? 'cursor-pointer hover:bg-slate-50/80' : ''}
          ${i % 7 === 0 ? 'border-l border-slate-100' : ''}`}>

        {/* Date number + dots */}
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className={`text-[13px] font-black leading-none flex items-center justify-center transition-all
            ${isToday ? 'w-6 h-6 bg-blue-500 text-white rounded-full text-[11px]' : isCurrentMonth ? 'text-slate-800' : 'text-slate-300'}`}>
            {day.getDate()}
          </span>
          {hasEvents && (
            <div className="flex items-center gap-0.5">
              {uniqueTypes.slice(0, 3).map(t => (
                <div key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_CFG[t]?.dot || 'bg-slate-300'}`} />
              ))}
              {hasPaid && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
            </div>
          )}
        </div>

        {/* Compact guest rows */}
        <div className="space-y-0.5">
          {showGroups.map((g, j) => {
            const primaryType = g.types[0] || 'CHECKIN'
            const cfg = TYPE_CFG[primaryType] || TYPE_CFG.CHECKIN
            const GIcon = cfg.icon
            const gDebt = parseFloat(g.debt) || 0
            return (
              <div key={j} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.light} truncate`}>
                <GIcon className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{g.tenantName?.split(' ').pop()}</span>
                {gDebt > 0 && <div className="w-1 h-1 rounded-full bg-rose-400 flex-shrink-0 ml-auto" />}
                {g.payment > 0 && gDebt === 0 && <div className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0 ml-auto" />}
              </div>
            )
          })}
          {overflow > 0 && (
            <div className="text-center text-[9px] font-black text-slate-400 py-0.5 hover:text-blue-500 transition-colors">
              +{overflow} more
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Week cell ──────────────────────────────────────────────────────────────
  const WeekCell = ({ day }) => {
    const key = dateKey(day)
    const isToday = key === todayKey
    const dayEvts = eventsByDate[key] || []
    const groups = groupByContract(dayEvts)

    return (
      <div className={`flex flex-col min-h-[380px] ${isToday ? 'bg-blue-50/20' : ''}`}>
        <div className={`p-3 text-center border-b border-slate-100 ${isToday ? 'bg-blue-50' : 'bg-slate-50/40'}`}>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {day.toLocaleDateString('en-US', { weekday: 'short' })}
          </p>
          <div className={`text-base font-black mt-1 mx-auto w-8 h-8 flex items-center justify-center rounded-full
            ${isToday ? 'bg-blue-500 text-white' : 'text-slate-800'}`}>
            {day.getDate()}
          </div>
          {dayEvts.length > 0 && (
            <div className="flex justify-center gap-0.5 mt-1.5">
              {[...new Set(dayEvts.map(e => e.type))].slice(0, 4).map(t => (
                <div key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_CFG[t]?.dot || 'bg-slate-300'}`} />
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          {groups.map((g, j) => {
            const primaryType = g.types[0] || 'CHECKIN'
            const cfg = TYPE_CFG[primaryType] || TYPE_CFG.CHECKIN
            const GIcon = cfg.icon
            const debt = parseFloat(g.debt) || 0
            const paid = parseFloat(g.payment) || 0
            return (
              <div key={j}
                onClick={() => { setSelectedDay(key) }}
                className={`p-2.5 rounded-xl border ${cfg.light} cursor-pointer hover:shadow-sm transition-all`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <GIcon className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] font-black truncate">{g.tenantName}</span>
                </div>
                <p className="text-[10px] font-bold opacity-60 truncate">{g.roomCode}</p>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {g.types.map(t => (
                    <span key={t} className="text-[9px] font-black px-1.5 py-0.5 bg-white/60 rounded-md">{TYPE_CFG[t]?.label}</span>
                  ))}
                  {paid > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 bg-white/60 rounded-md text-violet-700">+{fmt(paid)}</span>}
                  {debt > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-100 rounded-md text-rose-700">⚠ {fmt(debt)}</span>}
                </div>
              </div>
            )
          })}
          {groups.length === 0 && <p className="text-[10px] text-slate-200 text-center pt-10 font-bold">—</p>}
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <CalIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Calendar</h1>
            <p className="text-xs text-slate-400 font-medium">Check-ins · Check-outs · Payments</p>
          </div>
        </div>
        <button onClick={() => fetchEvents(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatPill icon={LogIn}         label="Check-in"  value={summary.checkins}      dot="bg-emerald-400" active={filterType==='CHECKIN'}     onClick={() => setFilterType(f => f==='CHECKIN' ? 'ALL' : 'CHECKIN')} />
        <StatPill icon={LogOut}        label="Check-out" value={summary.checkouts}     dot="bg-amber-400"   active={filterType==='CHECKOUT'}    onClick={() => setFilterType(f => f==='CHECKOUT' ? 'ALL' : 'CHECKOUT')} />
        <StatPill icon={Receipt}       label="Due"       value={summary.invoiceDue}    dot="bg-blue-400"    active={filterType==='INVOICE_DUE'} onClick={() => setFilterType(f => f==='INVOICE_DUE' ? 'ALL' : 'INVOICE_DUE')} />
        <StatPill icon={AlertTriangle} label="Overdue"   value={summary.overdue}       dot="bg-rose-400"    active={filterType==='OVERDUE'}     onClick={() => setFilterType(f => f==='OVERDUE' ? 'ALL' : 'OVERDUE')} />
        <StatPill icon={DollarSign}    label="Unpaid"    value={fmt(summary.unpaid)}   dot="bg-rose-300"    active={false} onClick={() => {}} money />
        <StatPill icon={TrendingUp}    label="Collected" value={fmt(summary.collected)} dot="bg-violet-400" active={filterType==='PAYMENT'}     onClick={() => setFilterType(f => f==='PAYMENT' ? 'ALL' : 'PAYMENT')} money />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => nav(-1)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 text-[11px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors uppercase tracking-wider">
            Today
          </button>
          <button onClick={() => nav(1)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <h2 className="text-sm font-black text-slate-900 ml-1 capitalize">{viewMode === 'month' ? monthLabel : weekLabel}</h2>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          {filterType !== 'ALL' && (
            <button onClick={() => setFilterType('ALL')}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-colors">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {properties.length > 1 && (
            <div className="relative">
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <select value={filterHouse} onChange={e => setFilterHouse(e.target.value)}
                className="pl-6 pr-2 py-1 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                <option value="ALL">All properties</option>
                {properties.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {['month', 'week'].map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg capitalize transition-all ${viewMode === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-20 flex flex-col items-center gap-3 text-slate-300">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold">Loading...</p>
        </div>
      ) : viewMode === 'month' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => <MonthCell key={dateKey(day)} day={day} i={i} />)}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-slate-100">
            {days.map(day => <WeekCell key={dateKey(day)} day={day} />)}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-1">
        {Object.entries(TYPE_CFG).map(([k, v]) => (
          <button key={k} onClick={() => setFilterType(f => f === k ? 'ALL' : k)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border
              ${filterType === k ? `${v.light} shadow-sm` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
            {v.label}
          </button>
        ))}
      </div>

      <DayPanel />
    </div>
  )
}

export default SuperCalendar
