import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import {
  ChevronLeft, ChevronRight, LogIn, LogOut, Receipt, AlertTriangle,
  Eye, CreditCard, Calendar as CalIcon, X, ExternalLink, Filter,
  Building2, DollarSign, Users, Clock
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US') : '-'

const EVENT_CONFIG = {
  CHECKIN:      { icon: LogIn, color: 'bg-green-500', light: 'bg-green-50 border-green-200 text-green-800', label: 'Check-in', dot: 'bg-green-500' },
  CHECKOUT:     { icon: LogOut, color: 'bg-orange-500', light: 'bg-orange-50 border-orange-200 text-orange-800', label: 'Check-out', dot: 'bg-orange-500' },
  INVOICE_DUE:  { icon: Receipt, color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200 text-blue-800', label: 'Payment Due', dot: 'bg-blue-500' },
  PAYMENT:      { icon: CreditCard, color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-800', label: 'Paid', dot: 'bg-emerald-500' },
  OVERDUE:      { icon: AlertTriangle, color: 'bg-red-500', light: 'bg-red-50 border-red-200 text-red-800', label: 'Overdue', dot: 'bg-red-500' },
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SuperCalendar = () => {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
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
      const days = []
      const d = new Date(f)
      while (d <= t) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
      return { from: f, to: t, days }
    } else {
      const d = new Date(currentDate)
      const diff = (d.getDay() + 6) % 7
      const monday = new Date(d); monday.setDate(d.getDate() - diff)
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
      const days = []
      const cur = new Date(monday)
      while (cur <= sunday) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
      return { from: monday, to: sunday, days }
    }
  }, [year, month, viewMode, currentDate])

  const dateKey = (d) => d.toISOString().split('T')[0]

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/calendar/events', { params: { from: dateKey(from), to: dateKey(to) } })
      setEvents(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [from, to])

  useEffect(() => { fetchEvents() }, [fetchEvents])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchEvents) }, [fetchEvents])

  // Unique boarding houses for filter
  const houses = useMemo(() => {
    const set = new Set(events.map(e => e.boardingHouseName).filter(Boolean))
    return [...set].sort()
  }, [events])

  // Filtered events
  const filtered = useMemo(() => {
    return events.filter(e => {
      if (filterType !== 'ALL' && e.type !== filterType) return false
      if (filterHouse !== 'ALL' && e.boardingHouseName !== filterHouse) return false
      return true
    })
  }, [events, filterType, filterHouse])

  // Group by date
  const eventsByDate = useMemo(() => {
    const map = {}
    filtered.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [filtered])

  // Summary
  const summary = useMemo(() => {
    const checkins = filtered.filter(e => e.type === 'CHECKIN').length
    const checkouts = filtered.filter(e => e.type === 'CHECKOUT').length
    const overdue = filtered.filter(e => e.type === 'OVERDUE').length
    const invoiceDue = filtered.filter(e => e.type === 'INVOICE_DUE').length
    const unpaidTotal = filtered.filter(e => e.type === 'INVOICE_DUE' || e.type === 'OVERDUE')
      .reduce((s, e) => s + (parseFloat(e.remainingAmount) || 0), 0)
    const paidTotal = filtered.filter(e => e.type === 'PAYMENT')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    return { checkins, checkouts, overdue, invoiceDue, unpaidTotal, paidTotal }
  }, [filtered])

  const nav = (dir) => {
    const d = new Date(currentDate)
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())
  const todayKey = dateKey(new Date())
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekLabel = days.length ? `${fmtDate(dateKey(days[0]))} — ${fmtDate(dateKey(days[days.length - 1]))}` : ''

  // --- Sub-components ---

  const EventPill = ({ event, compact }) => {
    const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.INVOICE_DUE
    const Icon = cfg.icon
    if (compact) {
      return (
        <button onClick={(e) => { e.stopPropagation(); setSelectedEvent(event) }}
          className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate border ${cfg.light} hover:opacity-80 transition-opacity`}>
          <span className="flex items-center gap-1">
            <Icon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.roomCode} {event.tenantName?.split(' ').pop()}</span>
          </span>
        </button>
      )
    }
    return (
      <button onClick={() => setSelectedEvent(event)}
        className={`w-full text-left p-2 rounded-lg border ${cfg.light} hover:shadow transition-shadow`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium text-sm">{cfg.label}</span>
          <span className="ml-auto text-xs px-1.5 py-0.5 bg-white/60 rounded">{event.roomCode}</span>
        </div>
        <p className="text-sm truncate">{event.tenantName}</p>
        {(event.amount || event.remainingAmount) ? (
          <p className="text-xs mt-0.5 opacity-75">
            {event.type === 'PAYMENT' ? `+${fmt(event.amount)}` :
             event.remainingAmount > 0 ? `Remaining ${fmt(event.remainingAmount)}` :
             event.invoiceStatus === 'PAID' ? '✓ Paid' : fmt(event.amount)}
          </p>
        ) : null}
      </button>
    )
  }

  // Event Detail Modal
  const EventModal = () => {
    if (!selectedEvent) return null
    const ev = selectedEvent
    const cfg = EVENT_CONFIG[ev.type] || EVENT_CONFIG.INVOICE_DUE
    const Icon = cfg.icon
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedEvent(null)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className={`${cfg.color} text-white px-6 py-4 rounded-t-2xl flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <Icon className="w-6 h-6" />
              <div>
                <h3 className="font-bold text-lg">{cfg.label}</h3>
                <p className="text-sm opacity-90">{fmtDate(ev.date)}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InfoItem icon={Users} label="Tenant" value={ev.tenantName} />
              <InfoItem icon={Building2} label="Room" value={ev.roomCode} />
              <InfoItem icon={Building2} label="Property" value={ev.boardingHouseName} />
              <InfoItem icon={Clock} label="Contract" value={`${fmtDate(ev.checkInDate)} → ${fmtDate(ev.checkOutDate)}`} />
            </div>
            {(ev.type === 'INVOICE_DUE' || ev.type === 'OVERDUE' || ev.type === 'PAYMENT') && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Invoice Info</p>
                {ev.invoiceCode && <p className="text-sm text-gray-600">Code: {ev.invoiceCode}</p>}
                {ev.amount > 0 && <p className="text-sm text-gray-600">Total: {fmt(ev.amount)}</p>}
                {ev.paidAmount > 0 && <p className="text-sm text-green-600">Paid: {fmt(ev.paidAmount)}</p>}
                {ev.remainingAmount > 0 && <p className="text-sm text-red-600 font-medium">Remaining: {fmt(ev.remainingAmount)}</p>}
              </div>
            )}
            {(ev.type === 'CHECKIN' || ev.type === 'CHECKOUT') && ev.totalDebt > 0 && (
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-sm text-red-700 font-medium">Total Debt: {fmt(ev.totalDebt)}</p>
              </div>
            )}
            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              {ev.tenantId && (
                <button onClick={() => { setSelectedEvent(null); navigate(`/admin/tenants/${ev.tenantId}/detail`) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                  <Eye className="w-4 h-4" /> View Tenant
                </button>
              )}
              {ev.contractId && (
                <button onClick={() => { setSelectedEvent(null); navigate(`/admin/contracts/${ev.contractId}/detail`) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Contract
                </button>
              )}
              {ev.invoiceId && (
                <button onClick={() => { setSelectedEvent(null); navigate(`/admin/invoices/${ev.invoiceId}/detail`) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors">
                  <Receipt className="w-4 h-4" /> Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  )

  // Day Detail Sidebar
  const DayPanel = () => {
    if (!selectedDay) return null
    const dayEvents = eventsByDate[selectedDay] || []
    const dayDate = new Date(selectedDay + 'T00:00:00')
    const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelectedDay(null)}>
        <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h3 className="font-bold text-lg text-gray-900">{dayLabel}</h3>
              <p className="text-sm text-gray-500">{dayEvents.length} events</p>
            </div>
            <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {dayEvents.length === 0 && (
              <p className="text-center text-gray-400 py-12">No events</p>
            )}
            {dayEvents.map((ev, i) => (
              <EventPill key={`${ev.type}-${ev.contractId}-${ev.invoiceId}-${i}`} event={ev} compact={false} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // --- MAIN RENDER ---
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <CalIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Management Calendar</h1>
            <p className="text-sm text-gray-500">Track check-ins, check-outs, payments</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Check-in" value={summary.checkins} color="text-green-600" bg="bg-green-50" icon={LogIn} />
        <SummaryCard label="Check-out" value={summary.checkouts} color="text-orange-600" bg="bg-orange-50" icon={LogOut} />
        <SummaryCard label="Payment Due" value={summary.invoiceDue} color="text-blue-600" bg="bg-blue-50" icon={Receipt} />
        <SummaryCard label="Overdue" value={summary.overdue} color="text-red-600" bg="bg-red-50" icon={AlertTriangle} />
        <SummaryCard label="Unpaid" value={fmt(summary.unpaidTotal)} color="text-red-600" bg="bg-red-50" icon={DollarSign} small />
        <SummaryCard label="Collected" value={fmt(summary.paidTotal)} color="text-emerald-600" bg="bg-emerald-50" icon={CreditCard} small />
      </div>

      {/* Controls bar */}
      <div className="bg-white rounded-xl border shadow-sm p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
            Today
          </button>
          <button onClick={() => nav(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-800 ml-2 capitalize">
            {viewMode === 'month' ? monthLabel : weekLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          {/* Filters */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="text-sm border rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="ALL">All</option>
              {Object.entries(EVENT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {houses.length > 1 && (
              <select value={filterHouse} onChange={e => setFilterHouse(e.target.value)}
                className="text-sm border rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="ALL">All properties</option>
                {houses.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            )}
          </div>
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Month
            </button>
            <button onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading calendar...
        </div>
      ) : viewMode === 'month' ? (
        /* MONTH VIEW */
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const key = dateKey(day)
              const isToday = key === todayKey
              const isCurrentMonth = day.getMonth() === month
              const dayEvts = eventsByDate[key] || []
              const maxShow = 3
              const overflow = dayEvts.length - maxShow

              return (
                <div key={key}
                  onClick={() => dayEvts.length > 0 && setSelectedDay(key)}
                  className={`min-h-[100px] lg:min-h-[120px] border-b border-r p-1.5 transition-colors
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/50'}
                    ${isToday ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/30' : ''}
                    ${dayEvts.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}
                    ${i % 7 === 0 ? 'border-l' : ''}`}>
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium leading-none
                      ${isToday ? 'w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full' : ''}
                      ${!isToday && isCurrentMonth ? 'text-gray-800' : ''}
                      ${!isToday && !isCurrentMonth ? 'text-gray-300' : ''}`}>
                      {day.getDate()}
                    </span>
                    {/* Dot indicators */}
                    {dayEvts.length > 0 && !isToday && (
                      <div className="flex gap-0.5">
                        {[...new Set(dayEvts.map(e => e.type))].slice(0, 4).map(t => (
                          <div key={t} className={`w-1.5 h-1.5 rounded-full ${EVENT_CONFIG[t]?.dot || 'bg-gray-400'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Event pills */}
                  <div className="space-y-0.5">
                    {dayEvts.slice(0, maxShow).map((ev, j) => (
                      <EventPill key={`${ev.type}-${ev.contractId}-${j}`} event={ev} compact />
                    ))}
                    {overflow > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedDay(key) }}
                        className="w-full text-center text-xs text-blue-600 font-medium hover:text-blue-800 py-0.5">
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
        /* WEEK VIEW */
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 divide-x">
            {days.map(day => {
              const key = dateKey(day)
              const isToday = key === todayKey
              const dayEvts = eventsByDate[key] || []
              const dayName = day.toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={key} className={`min-h-[400px] ${isToday ? 'bg-blue-50/30' : ''}`}>
                  {/* Day header */}
                  <div className={`sticky top-0 z-10 p-3 border-b text-center ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500 uppercase font-medium">{dayName}</p>
                    <p className={`text-lg font-bold mt-0.5 ${isToday ? 'w-9 h-9 mx-auto flex items-center justify-center bg-blue-500 text-white rounded-full' : 'text-gray-800'}`}>
                      {day.getDate()}
                    </p>
                    {dayEvts.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{dayEvts.length} events</p>
                    )}
                  </div>
                  {/* Events */}
                  <div className="p-2 space-y-2">
                    {dayEvts.map((ev, j) => (
                      <EventPill key={`${ev.type}-${ev.contractId}-${j}`} event={ev} compact={false} />
                    ))}
                    {dayEvts.length === 0 && (
                      <p className="text-xs text-gray-300 text-center py-8">—</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-1">
        {Object.entries(EVENT_CONFIG).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className={`w-2.5 h-2.5 rounded-full ${v.dot}`} />
            {v.label}
          </div>
        ))}
      </div>

      {/* Modals */}
      <EventModal />
      <DayPanel />
    </div>
  )
}

const SummaryCard = ({ label, value, color, bg, icon: Icon, small }) => (
  <div className={`${bg} rounded-xl p-3 border`}>
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <p className={`${small ? 'text-sm' : 'text-xl'} font-bold ${color}`}>{value}</p>
  </div>
)

export default SuperCalendar
