import { useEffect, useState, useMemo, useRef } from 'react'
import api from '../../services/api'
import { useProperty } from '../../context/PropertyContext'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X, Users, Loader2 } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const toISO = (d) => d.toISOString().split('T')[0]
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
const isSameDay = (a, b) => toISO(new Date(a)) === toISO(new Date(b))
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6

const DAYS = 14
const DAY_W = 110 // px per day column

const RoomMatrix = () => {
  const { selectedId: propertyId } = useProperty()
  const [rooms, setRooms] = useState([])
  const [dayData, setDayData] = useState({}) // { 'YYYY-MM-DD': { checkIns, checkOuts, staying } }
  const [startDate, setStartDate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [selectedGuest, setSelectedGuest] = useState(null)
  const scrollRef = useRef(null)

  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(startDate, i)), [startDate])
  const today = toISO(new Date())

  // Fetch rooms
  useEffect(() => {
    const params = propertyId !== 'ALL' ? { boardingHouseId: propertyId } : {}
    api.get('/rooms', { params }).then(r => setRooms(r.data || [])).catch(console.error)
  }, [propertyId])

  // Fetch day data for all 14 days in parallel
  useEffect(() => {
    setLoading(true)
    const bhParam = propertyId !== 'ALL' ? `&boardingHouseId=${propertyId}` : ''
    Promise.all(
      dates.map(d => api.get(`/dashboard/day?date=${toISO(d)}${bhParam}`).then(r => ({ date: toISO(d), data: r.data })).catch(() => ({ date: toISO(d), data: null })))
    ).then(results => {
      const map = {}
      results.forEach(r => { if (r.data) map[r.date] = r.data })
      setDayData(map)
    }).finally(() => setLoading(false))
  }, [startDate, propertyId, dates])

  // Build booking map: roomCode → [{ guest, startCol, span }]
  const bookingMap = useMemo(() => {
    const map = {} // roomCode → Map<contractId, { guest, startIdx, endIdx }>
    rooms.forEach(r => { map[r.code] = new Map() })

    dates.forEach((date, colIdx) => {
      const dd = dayData[toISO(date)]
      if (!dd) return
      const allGuests = [...(dd.checkIns || []), ...(dd.checkOuts || []), ...(dd.staying || [])]
      allGuests.forEach(g => {
        if (!map[g.roomCode]) return
        const existing = map[g.roomCode].get(g.contractId)
        if (existing) {
          existing.endIdx = Math.max(existing.endIdx, colIdx)
          // Update activity type
          if (dd.checkIns?.some(ci => ci.contractId === g.contractId)) existing.hasCheckIn = true
          if (dd.checkOuts?.some(co => co.contractId === g.contractId)) existing.hasCheckOut = true
        } else {
          map[g.roomCode].set(g.contractId, {
            guest: g, startIdx: colIdx, endIdx: colIdx,
            hasCheckIn: dd.checkIns?.some(ci => ci.contractId === g.contractId) || false,
            hasCheckOut: dd.checkOuts?.some(co => co.contractId === g.contractId) || false,
          })
        }
      })
    })

    // Convert to array
    const result = {}
    Object.entries(map).forEach(([roomCode, contractMap]) => {
      result[roomCode] = Array.from(contractMap.values())
    })
    return result
  }, [rooms, dates, dayData])

  const getBarColor = (booking) => {
    if (booking.hasCheckIn && booking.hasCheckOut) return 'bg-gradient-to-r from-emerald-400 via-blue-400 to-orange-400'
    if (booking.hasCheckIn) return 'bg-gradient-to-r from-emerald-400 to-blue-400'
    if (booking.hasCheckOut) return 'bg-gradient-to-r from-blue-400 to-orange-400'
    return 'bg-blue-400'
  }

  const nav = (delta) => setStartDate(d => addDays(d, delta))
  const goToday = () => setStartDate(new Date())

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
        .shimmer{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:400px 100%;animation:shimmer 1.5s infinite}
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Room Matrix</h1>
            <p className="text-xs text-slate-400">Tổng quan phòng · Lịch đặt phòng · {rooms.length} phòng</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-7)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200">
            Hôm nay
          </button>
          <button onClick={() => nav(7)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto" ref={scrollRef}>
          <div style={{ minWidth: `${120 + DAYS * DAY_W}px` }}>
            {/* Date headers */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
              <div className="w-[120px] flex-shrink-0 px-3 py-2 border-r border-slate-200 bg-slate-100 sticky left-0 z-20">
                <p className="text-[10px] font-black text-slate-400 uppercase">Phòng</p>
              </div>
              {dates.map((d, i) => {
                const isToday = toISO(d) === today
                const we = isWeekend(d)
                return (
                  <div key={i} className={`flex-shrink-0 px-2 py-2 text-center border-r border-slate-100 ${isToday ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
                    style={{ width: DAY_W }}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${we ? 'text-rose-500' : 'text-slate-400'}`}>
                      {d.toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </p>
                    <p className={`text-sm font-black ${isToday ? 'text-indigo-600' : we ? 'text-rose-600' : 'text-slate-700'}`}>
                      {d.getDate()}/{d.getMonth()+1}
                    </p>
                    {isToday && <span className="text-[8px] font-black text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded-full">TODAY</span>}
                  </div>
                )
              })}
            </div>

            {/* Room rows */}
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex border-b border-slate-50">
                  <div className="w-[120px] flex-shrink-0 px-3 py-3 border-r border-slate-100">
                    <div className="h-4 w-16 shimmer rounded" />
                  </div>
                  {dates.map((_, j) => (
                    <div key={j} className="flex-shrink-0 px-1 py-3 border-r border-slate-50" style={{ width: DAY_W }}>
                      {j % 3 === 0 && <div className="h-6 shimmer rounded-lg" style={{ width: DAY_W * 2 }} />}
                    </div>
                  ))}
                </div>
              ))
            ) : rooms.length === 0 ? (
              <div className="py-16 text-center text-slate-300">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">Không có phòng nào</p>
              </div>
            ) : (
              rooms.map(room => {
                const bookings = bookingMap[room.code] || []
                return (
                  <div key={room.id} className="flex border-b border-slate-50 hover:bg-slate-50/30 transition-colors group relative" style={{ minHeight: 44 }}>
                    {/* Room code - sticky */}
                    <div className="w-[120px] flex-shrink-0 px-3 py-2 border-r border-slate-100 bg-white sticky left-0 z-10 flex items-center gap-2 group-hover:bg-slate-50">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${room.status === 'OCCUPIED' ? 'bg-blue-400' : room.status === 'MAINTENANCE' ? 'bg-slate-400' : 'bg-emerald-400'}`} />
                      <div>
                        <p className="text-xs font-black text-slate-800">{room.code}</p>
                        <p className="text-[9px] text-slate-400">{room.floor ? `T${room.floor}` : ''}</p>
                      </div>
                    </div>

                    {/* Day cells */}
                    <div className="flex relative" style={{ width: DAYS * DAY_W }}>
                      {/* Grid lines */}
                      {dates.map((d, i) => (
                        <div key={i}
                          className={`flex-shrink-0 border-r border-slate-50 ${toISO(d) === today ? 'border-l-4 border-l-indigo-200 bg-indigo-50/30' : ''} ${room.status === 'MAINTENANCE' ? 'bg-slate-100' : ''}`}
                          style={{ width: DAY_W, height: '100%', position: 'absolute', left: i * DAY_W }}
                        />
                      ))}

                      {/* Booking bars */}
                      {bookings.map((b, bi) => {
                        const left = b.startIdx * DAY_W + 4
                        const width = (b.endIdx - b.startIdx + 1) * DAY_W - 8
                        const debt = parseFloat(b.guest.totalDebt || 0)
                        return (
                          <div key={bi}
                            className={`absolute top-1.5 h-7 rounded-lg ${getBarColor(b)} cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] transition-all z-[5] flex items-center justify-center overflow-hidden`}
                            style={{ left, width: Math.max(width, 30) }}
                            onClick={() => setSelectedGuest(b.guest)}
                            onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, guest: b.guest })}
                            onMouseLeave={() => setTooltip(null)}>
                            <span className="text-[9px] font-black text-white truncate px-1.5 drop-shadow-sm">
                              {b.guest.tenantName?.split(' ').pop()}
                              {debt > 0 && <span className="ml-1 text-yellow-200">⚠</span>}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-[100] bg-slate-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <p className="font-black">{tooltip.guest.tenantName}</p>
          <p className="text-slate-300">{tooltip.guest.roomCode} · {tooltip.guest.tenantPhone}</p>
          <p className="text-slate-400">{tooltip.guest.checkInDate} → {tooltip.guest.checkOutDate}</p>
          {parseFloat(tooltip.guest.totalDebt || 0) > 0 && (
            <p className="text-rose-400 font-bold mt-0.5">Nợ: {fmt(tooltip.guest.totalDebt)}</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-[10px] font-bold text-slate-500">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400" /> Check-in</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-400" /> Đang ở</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-400" /> Check-out</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-slate-300" /> Bảo trì</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Trống</div>
      </div>
    </div>
  )
}

export default RoomMatrix
