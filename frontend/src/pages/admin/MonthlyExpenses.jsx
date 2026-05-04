import { useEffect, useState, useMemo } from 'react'
import api from '../../services/api'
import { useProperty } from '../../context/PropertyContext'
import { Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Zap, Flame, Snowflake, Droplets, Wifi, Home, Users, MoreHorizontal, TrendingUp, Calendar } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

const CATEGORIES = [
  { key: 'ELECTRICITY', label: 'Điện', icon: Zap, emoji: '⚡', color: 'from-amber-400 to-yellow-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { key: 'GAS', label: 'Gas', icon: Flame, emoji: '🔥', color: 'from-orange-400 to-red-500', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { key: 'ICE', label: 'Đá lạnh', icon: Snowflake, emoji: '🧊', color: 'from-cyan-400 to-blue-500', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  { key: 'WATER_SUPPLY', label: 'Nước', icon: Droplets, emoji: '💧', color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { key: 'INTERNET', label: 'Internet', icon: Wifi, emoji: '📶', color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { key: 'RENT', label: 'Thuê mặt bằng', icon: Home, emoji: '🏠', color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { key: 'SALARY', label: 'Lương NV', icon: Users, emoji: '👥', color: 'from-pink-400 to-rose-500', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  { key: 'OTHER', label: 'Khác', icon: MoreHorizontal, emoji: '📋', color: 'from-slate-400 to-slate-500', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
]

const getCat = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1]
const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white'

const MonthlyExpenses = () => {
  const { selectedId: propertyId, properties } = useProperty()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const [viewMode, setViewMode] = useState('month') // 'month' | 'year'
  const [yearExpenses, setYearExpenses] = useState([])
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const [form, setForm] = useState({
    boardingHouseId: '', category: 'ELECTRICITY', description: '', amount: '', note: '', month: now.getMonth() + 1, year: now.getFullYear(),
  })

  useEffect(() => { fetchExpenses() }, [propertyId, month, year])
  useEffect(() => { if (viewMode === 'year' && propertyId !== 'ALL') fetchYearData() }, [viewMode, propertyId, year])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const params = { month, year }
      if (propertyId !== 'ALL') params.boardingHouseId = propertyId
      const r = await api.get('/monthly-expenses', { params })
      setExpenses(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchYearData = async () => {
    try {
      const r = await api.get('/monthly-expenses/year', { params: { boardingHouseId: propertyId, year } })
      setYearExpenses(r.data)
    } catch (e) { console.error(e) }
  }

  const total = useMemo(() => expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0), [expenses])
  const byCategory = useMemo(() => {
    const map = {}
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + parseFloat(e.amount || 0) })
    return map
  }, [expenses])

  // Year view: group by month
  const yearByMonth = useMemo(() => {
    const map = {}
    yearExpenses.forEach(e => {
      if (!map[e.month]) map[e.month] = { total: 0, items: [] }
      map[e.month].total += parseFloat(e.amount || 0)
      map[e.month].items.push(e)
    })
    return map
  }, [yearExpenses])

  const openAdd = () => {
    setEditing(null)
    setForm({
      boardingHouseId: propertyId !== 'ALL' ? propertyId : (properties[0]?.id?.toString() || ''),
      category: 'ELECTRICITY', description: '', amount: '', note: '', month, year,
    })
    setShowModal(true)
  }

  const openEdit = (e) => {
    setEditing(e)
    setForm({
      boardingHouseId: e.boardingHouseId?.toString() || '',
      category: e.category, description: e.description || '', amount: e.amount?.toString() || '',
      note: e.note || '', month: e.month, year: e.year,
    })
    setShowModal(true)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    try {
      const payload = { ...form, boardingHouseId: parseInt(form.boardingHouseId), amount: parseFloat(form.amount), month: parseInt(form.month), year: parseInt(form.year) }
      if (editing) await api.put(`/monthly-expenses/${editing.id}`, payload)
      else await api.post('/monthly-expenses', payload)
      setShowModal(false)
      showToast(editing ? 'Đã cập nhật!' : 'Đã thêm chi phí!')
      fetchExpenses()
      if (viewMode === 'year') fetchYearData()
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/monthly-expenses/${id}`)
      showToast('Đã xóa!')
      fetchExpenses()
    } catch (e) { showToast('Lỗi xóa', 'error') }
  }

  const navMonth = (delta) => {
    let m = month + delta, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalPop{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        .fade-in{animation:fadeIn 0.3s ease both}
      `}</style>

      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}
          style={{ animation: 'fadeIn 0.2s ease' }}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Chi phí hàng tháng</h1>
            <p className="text-xs text-slate-400">Điện · Gas · Đá lạnh · Nước · Internet · Khác</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-slate-100 rounded-xl p-0.5">
            {[['month', '📅 Tháng'], ['year', '📊 Năm']].map(([k, l]) => (
              <button key={k} onClick={() => setViewMode(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <Plus className="w-4 h-4" /> Thêm chi phí
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
        <button onClick={() => navMonth(-1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
        <div className="text-center">
          <p className="text-lg font-black text-slate-900">{MONTHS[month - 1]} {year}</p>
          <p className="text-xs text-slate-400">{expenses.length} khoản · Tổng: <strong className="text-rose-600">{fmt(total)}</strong></p>
        </div>
        <button onClick={() => navMonth(1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Category summary cards */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.filter(c => byCategory[c.key]).map((cat, i) => (
            <div key={cat.key} className={`${cat.bg} border ${cat.border} rounded-2xl p-3 fade-in`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{cat.emoji}</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${cat.text}`}>{cat.label}</span>
              </div>
              <p className={`text-lg font-black ${cat.text}`}>{fmt(byCategory[cat.key])}</p>
            </div>
          ))}
        </div>
      )}

      {/* Expense list - Month view */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center"><div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center text-slate-300">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">Chưa có chi phí nào cho {MONTHS[month - 1]}</p>
              <button onClick={openAdd} className="mt-3 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all">
                + Thêm chi phí đầu tiên
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {expenses.map((e, i) => {
                const cat = getCat(e.category)
                const CatIcon = cat.icon
                return (
                  <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors group fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <CatIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{e.description || cat.label}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.text} border ${cat.border}`}>{cat.label}</span>
                      </div>
                      {e.note && <p className="text-[10px] text-slate-400 truncate">{e.note}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-slate-900">{fmt(e.amount)}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEdit(e)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {/* Total row */}
              <div className="flex items-center justify-between px-5 py-3 bg-rose-50">
                <span className="text-sm font-black text-rose-700">TỔNG CHI PHÍ</span>
                <span className="text-lg font-black text-rose-700">{fmt(total)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Year view - bar chart style */}
      {viewMode === 'year' && propertyId !== 'ALL' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-black text-slate-700">Tổng quan năm {year}</p>
            <div className="flex gap-1">
              <button onClick={() => setYear(y => y - 1)} className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200">{year - 1}</button>
              <button onClick={() => setYear(now.getFullYear())} className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100">{now.getFullYear()}</button>
              <button onClick={() => setYear(y => y + 1)} className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200">{year + 1}</button>
            </div>
          </div>
          {(() => {
            const maxTotal = Math.max(...Object.values(yearByMonth).map(m => m.total), 1)
            return (
              <div className="space-y-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const data = yearByMonth[m]
                  const pct = data ? (data.total / maxTotal) * 100 : 0
                  const isCurrent = m === now.getMonth() + 1 && year === now.getFullYear()
                  return (
                    <button key={m} onClick={() => { setMonth(m); setViewMode('month') }}
                      className={`w-full flex items-center gap-3 py-2 px-3 rounded-xl transition-all hover:bg-slate-50 ${isCurrent ? 'bg-rose-50 border border-rose-200' : ''}`}>
                      <span className={`text-xs font-bold w-8 ${isCurrent ? 'text-rose-600' : 'text-slate-400'}`}>T{m}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs font-black w-24 text-right ${data ? 'text-slate-800' : 'text-slate-300'}`}>
                        {data ? fmt(data.total) : '—'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {viewMode === 'year' && propertyId === 'ALL' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-300">
          <p className="text-sm font-bold">Chọn nhà trọ cụ thể để xem tổng quan năm</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)} style={{ animation: 'fadeIn 0.15s ease' }}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()} style={{ animation: 'modalPop 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 px-6 py-5 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <h2 className="font-black text-white text-lg">{editing ? '✏️ Sửa chi phí' : '✨ Thêm chi phí'}</h2>
                <p className="text-white/60 text-xs mt-0.5">{MONTHS[form.month - 1]} {form.year}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="relative w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all hover:rotate-90 duration-200">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Loại chi phí *</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat.key} type="button" onClick={() => setForm({ ...form, category: cat.key, description: form.description || cat.label })}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all duration-200 ${form.category === cat.key
                        ? `bg-gradient-to-br ${cat.color} text-white border-transparent shadow-md`
                        : `${cat.bg} ${cat.border} ${cat.text} hover:shadow-sm`}`}>
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-[8px] font-black">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Boarding house + Month */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nhà trọ *</label>
                  <select required value={form.boardingHouseId} onChange={e => setForm({ ...form, boardingHouseId: e.target.value })} className={inputCls}>
                    <option value="">— Chọn —</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tháng/Năm</label>
                  <div className="flex gap-1.5">
                    <select value={form.month} onChange={e => setForm({ ...form, month: parseInt(e.target.value) })} className={inputCls + ' flex-1'}>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <input type="number" value={form.year} onChange={e => setForm({ ...form, year: parseInt(e.target.value) })}
                      className={inputCls + ' w-20'} />
                  </div>
                </div>
              </div>

              {/* Description + Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mô tả</label>
                  <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder={getCat(form.category).label} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Số tiền *</label>
                  <input required type="number" min="0" step="1" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0" className={inputCls + ' text-lg font-black'} />
                  {form.amount > 0 && <p className="text-[10px] text-rose-600 font-bold mt-1 ml-1">{fmt(form.amount)}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ghi chú</label>
                <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="Số hóa đơn, nhà cung cấp..." className={inputCls} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Hủy</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]">
                  {editing ? '💾 Lưu' : '✨ Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MonthlyExpenses
