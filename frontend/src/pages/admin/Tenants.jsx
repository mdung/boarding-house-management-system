import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import BulkActionBar from '../../components/BulkActionBar'
import { Plus, Edit, Trash2, Eye, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Search, Users, X, Phone, Mail, MapPin, CreditCard, DoorOpen, Calendar, ChevronDown, Building2 } from 'lucide-react'

const fmt = (n) => n != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n) : '-'
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '-'

const getStatus = (t) => {
  if (!t.checkOutDate) return { label: 'Staying', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  const today = new Date(); today.setHours(0,0,0,0)
  const out = new Date(t.checkOutDate + 'T00:00:00')
  const diff = Math.round((out - today) / 86400000)
  if (diff < 0)  return { label: 'Checked out', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
  if (diff === 0) return { label: 'Checkout today', cls: 'bg-orange-50 text-orange-700 border-orange-200' }
  if (diff === 1) return { label: 'Tomorrow', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Staying', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
}

const CheckoutBadge = ({ checkOut }) => {
  if (!checkOut) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const diff = Math.round((new Date(checkOut + 'T00:00:00') - today) / 86400000)
  if (diff < 0)  return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-600 rounded-lg">Overdue</span>
  if (diff === 0) return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-600 rounded-lg">Today</span>
  if (diff === 1) return <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-600 rounded-lg">Tomorrow</span>
  return null
}

const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all'
const Field = ({ label, icon: Icon, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
      {Icon && <Icon className="w-3 h-3" />}{label}
    </label>
    {children}
  </div>
)

const SortTh = ({ field, current, dir, onSort, children }) => (
  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-slate-700 transition-colors group">
      {children}
      <span className="text-slate-300 group-hover:text-slate-500">
        {current === field ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
      </span>
    </button>
  </th>
)

const Tenants = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tenants, setTenants] = useState([])
  const [availableRooms, setAvailableRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('fullName')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const perPage = 10
  const [roomSearch, setRoomSearch] = useState('')
  const [showRoomPicker, setShowRoomPicker] = useState(false)

  const emptyForm = { fullName: '', phone: '', email: '', identityNumber: '', dateOfBirth: '', permanentAddress: '', status: 'ACTIVE', roomId: '', checkInDate: new Date().toISOString().split('T')[0], checkOutDate: '', monthlyRent: '', deposit: '' }
  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => { fetchData() }, [])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchData) }, [])

  const sorted = useMemo(() => {
    let f = tenants.filter(t =>
      [t.fullName, t.phone, t.activeRoomCode, t.email].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    f.sort((a, b) => {
      let av = sortField === 'checkInDate' || sortField === 'checkOutDate'
        ? (a[sortField] ? new Date(a[sortField]) : new Date(sortField === 'checkOutDate' ? '9999' : 0))
        : sortField === 'totalDebt' ? (a.totalDebt || 0)
        : (a[sortField] || '').toString().toLowerCase()
      let bv = sortField === 'checkInDate' || sortField === 'checkOutDate'
        ? (b[sortField] ? new Date(b[sortField]) : new Date(sortField === 'checkOutDate' ? '9999' : 0))
        : sortField === 'totalDebt' ? (b.totalDebt || 0)
        : (b[sortField] || '').toString().toLowerCase()
      return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0)
    })
    return f
  }, [tenants, searchTerm, sortField, sortDir])

  const totalPages = Math.ceil(sorted.length / perPage)
  const paginated = sorted.slice((page - 1) * perPage, page * perPage)
  const totalDebt = sorted.reduce((s, t) => s + (t.totalDebt > 0 ? t.totalDebt : 0), 0)
  const debtCount = sorted.filter(t => t.totalDebt > 0).length

  const fetchData = async () => {
    try { const r = await api.get('/rooms'); setAvailableRooms(r.data.filter(r => r.status === 'AVAILABLE')) } catch {}
    try { const r = await api.get('/tenants'); setTenants(r.data) } catch {}
    setLoading(false)
  }

  const openAdd = () => { setEditing(null); setFormData(emptyForm); setShowModal(true) }
  const openEdit = (t) => { setEditing(t); setFormData({ fullName: t.fullName, phone: t.phone||'', email: t.email||'', identityNumber: t.identityNumber||'', dateOfBirth: t.dateOfBirth||'', permanentAddress: t.permanentAddress||'', status: t.status, roomId: '', checkInDate: '', checkOutDate: '', monthlyRent: '', deposit: '' }); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setRoomSearch(''); setShowRoomPicker(false) }
  const set = (k) => (e) => setFormData(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      let tenantId
      if (editing) { await api.put(`/tenants/${editing.id}`, formData); tenantId = editing.id }
      else {
        const res = await api.post('/tenants', formData); tenantId = res.data.id
        if (formData.roomId && formData.checkInDate && formData.checkOutDate) {
          if (formData.checkOutDate <= formData.checkInDate) { showToast('Check-out must be after check-in', 'error'); return }
          await api.post('/contracts', { code: `CT-${Date.now()}`, roomId: parseInt(formData.roomId), mainTenantId: tenantId, startDate: formData.checkInDate, endDate: formData.checkOutDate, dailyRate: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null, monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) * 30 : null, deposit: formData.deposit ? parseFloat(formData.deposit) : 0, status: 'ACTIVE', billingCycle: 'MONTHLY' })
        }
      }
      closeModal(); fetchData(); showToast(editing ? 'Updated successfully' : 'Guest added', 'success')
    } catch (err) { showToast(err.response?.data?.message || 'Error saving', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/tenants/${id}`); fetchData(); showToast('Guest deleted', 'success') }
    catch (err) { showToast(err.response?.data?.message || 'Cannot delete', 'error') }
  }

  const toggleSelect = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(selected.size === sorted.length ? new Set() : new Set(sorted.map(t => t.id)))
  const onSort = (f) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc') }; setPage(1) }

  const handleBulkDelete = async () => {
    let ok = 0, fail = 0
    for (const id of selected) { try { await api.delete(`/tenants/${id}`); ok++ } catch { fail++ } }
    setSelected(new Set()); fetchData()
    showToast(`Deleted ${ok}${fail > 0 ? `, ${fail} failed` : ''}`, fail > 0 ? 'warning' : 'success')
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-10 w-32 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Tenants</h1>
          <p className="text-slate-500 mt-1 text-sm">{sorted.length} of {tenants.length} guests</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5">
          <Plus className="w-4 h-4" /> Add New Guest
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
            placeholder="Search by name, phone, room, or email..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0} onChange={toggleAll}
                    className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <SortTh field="fullName" current={sortField} dir={sortDir} onSort={onSort}>Guest Name</SortTh>
                <SortTh field="phone" current={sortField} dir={sortDir} onSort={onSort}>Phone</SortTh>
                <SortTh field="activeRoomCode" current={sortField} dir={sortDir} onSort={onSort}>Room</SortTh>
                <SortTh field="checkInDate" current={sortField} dir={sortDir} onSort={onSort}>Check-in</SortTh>
                <SortTh field="checkOutDate" current={sortField} dir={sortDir} onSort={onSort}>Check-out</SortTh>
                <SortTh field="totalDebt" current={sortField} dir={sortDir} onSort={onSort}>Outstanding</SortTh>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-4 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No tenants found</p>
                </td></tr>
              ) : paginated.map(t => {
                const st = getStatus(t)
                return (
                  <tr key={t.id} className={`hover:bg-slate-50/60 transition-colors group ${selected.has(t.id) ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)}
                        className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => navigate(`/admin/tenants/${t.id}/detail`)}
                        className="font-bold text-blue-600 hover:text-blue-800 text-sm transition-colors">{t.fullName}</button>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">{t.phone}</td>
                    <td className="px-4 py-3.5">
                      {t.activeRoomCode
                        ? <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black">{t.activeRoomCode}</span>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{fmtDate(t.checkInDate)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {t.checkOutDate ? <span className="flex items-center">{fmtDate(t.checkOutDate)}<CheckoutBadge checkOut={t.checkOutDate} /></span> : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {t.totalDebt > 0
                        ? <span className="flex items-center gap-1 font-bold text-rose-600"><AlertCircle className="w-3.5 h-3.5" />{fmt(t.totalDebt)}</span>
                        : t.totalDebt === 0 ? <span className="text-emerald-600 text-xs font-bold">Paid</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl border ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/admin/tenants/${t.id}/detail`)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(t)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDelete(t.id)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {debtCount > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-rose-50/40">
                  <td colSpan={6} className="px-4 py-3 text-sm font-bold text-slate-600">
                    Total Outstanding · <span className="text-rose-600">{debtCount} guests with debt</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-rose-600">{fmt(totalDebt)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400">
              {(page-1)*perPage+1}–{Math.min(page*perPage, sorted.length)} of {sorted.length}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all">
                <ArrowUp className="w-3.5 h-3.5 -rotate-90" />
              </button>
              {Array.from({length: Math.min(5, totalPages)}, (_,i) => {
                const p = Math.max(0, Math.min(page-3, totalPages-5)) + i + 1
                return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-xl text-sm font-bold transition-all ${p===page ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
              })}
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all">
                <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-8 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{editing ? 'Edit Guest' : 'Add New Guest'}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{editing ? `Editing ${editing.fullName}` : 'Register a new tenant'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <Field label="Full Name" icon={Users}>
                  <input required value={formData.fullName} onChange={set('fullName')} placeholder="e.g. Nguyễn Văn A" className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone" icon={Phone}>
                    <input required value={formData.phone} onChange={set('phone')} placeholder="09xxxxxxxx" className={inputCls} />
                  </Field>
                  <Field label="ID Number" icon={CreditCard}>
                    <input value={formData.identityNumber} onChange={set('identityNumber')} placeholder="CCCD/CMND" className={inputCls} />
                  </Field>
                </div>
                <Field label="Email" icon={Mail}>
                  <input type="email" value={formData.email} onChange={set('email')} placeholder="email@example.com" className={inputCls} />
                </Field>
                <Field label="Permanent Address" icon={MapPin}>
                  <input value={formData.permanentAddress} onChange={set('permanentAddress')} placeholder="Địa chỉ thường trú" className={inputCls} />
                </Field>

                {!editing && (
                  <>
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Assignment (optional)</span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    <Field label="Select Room" icon={DoorOpen}>
                      {/* Custom room picker */}
                      <div className="space-y-2">
                        {/* Search input */}
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            value={roomSearch}
                            onChange={e => { setRoomSearch(e.target.value); setShowRoomPicker(true) }}
                            onFocus={() => setShowRoomPicker(true)}
                            placeholder="Search available rooms..."
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                        </div>

                        {/* Selected room display */}
                        {formData.roomId && !showRoomPicker && (() => {
                          const room = availableRooms.find(r => r.id === parseInt(formData.roomId))
                          if (!room) return null
                          return (
                            <div className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <DoorOpen className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-black text-blue-900 text-sm">{room.code}</p>
                                  <p className="text-xs text-blue-600 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />{room.boardingHouseName}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-blue-800">{fmt(room.baseRent)}</p>
                                <p className="text-[10px] text-blue-500 font-bold">/tháng</p>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Room list */}
                        {showRoomPicker && (
                          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-lg bg-white max-h-52 overflow-y-auto">
                            {/* No room option */}
                            <button type="button"
                              onClick={() => { setFormData(f => ({ ...f, roomId: '', monthlyRent: '' })); setShowRoomPicker(false); setRoomSearch('') }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 ${!formData.roomId ? 'bg-slate-50' : ''}`}>
                              <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <X className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                              <span className="text-sm font-semibold text-slate-500">No room selected</span>
                            </button>
                            {availableRooms
                              .filter(r => !roomSearch || r.code.toLowerCase().includes(roomSearch.toLowerCase()) || r.boardingHouseName.toLowerCase().includes(roomSearch.toLowerCase()))
                              .map(r => (
                                <button type="button" key={r.id}
                                  onClick={() => {
                                    const daily = r.baseRent ? Math.round(r.baseRent / 30) : ''
                                    setFormData(f => ({ ...f, roomId: r.id.toString(), monthlyRent: daily }))
                                    setShowRoomPicker(false); setRoomSearch('')
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0
                                    ${formData.roomId === r.id.toString() ? 'bg-blue-50' : ''}`}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${formData.roomId === r.id.toString() ? 'bg-blue-600' : 'bg-slate-100'}`}>
                                      <DoorOpen className={`w-3.5 h-3.5 ${formData.roomId === r.id.toString() ? 'text-white' : 'text-slate-500'}`} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-slate-800">{r.code}</p>
                                      <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />{r.boardingHouseName}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-slate-700">{fmt(r.baseRent)}</p>
                                    <p className="text-[10px] text-slate-400">/tháng</p>
                                  </div>
                                </button>
                              ))}
                            {availableRooms.filter(r => !roomSearch || r.code.toLowerCase().includes(roomSearch.toLowerCase()) || r.boardingHouseName.toLowerCase().includes(roomSearch.toLowerCase())).length === 0 && (
                              <div className="px-4 py-6 text-center text-slate-400 text-sm">No rooms found</div>
                            )}
                          </div>
                        )}
                      </div>
                    </Field>
                    {formData.roomId && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Check-in Date" icon={Calendar}>
                            <input required type="date" value={formData.checkInDate} onChange={set('checkInDate')} className={inputCls} />
                          </Field>
                          <Field label="Check-out Date" icon={Calendar}>
                            <input required type="date" value={formData.checkOutDate} onChange={set('checkOutDate')} className={inputCls} />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Daily Rate (VND)">
                            <input type="number" value={formData.monthlyRent} onChange={set('monthlyRent')} placeholder="0" className={inputCls} />
                          </Field>
                          <Field label="Deposit (VND)">
                            <input type="number" value={formData.deposit} onChange={set('deposit')} placeholder="0" className={inputCls} />
                          </Field>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-8 py-2.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!confirmDelete} title="Delete Guest" message="Are you sure you want to delete this guest?" confirmText="Delete" cancelText="Cancel" danger
        onConfirm={() => { handleDelete(confirmDelete); setConfirmDelete(null) }} onCancel={() => setConfirmDelete(null)} />
      <ConfirmDialog isOpen={confirmBulkDelete} title={`Delete ${selected.size} guests`} message={`Delete ${selected.size} selected guests? Guests with active contracts cannot be deleted.`} confirmText="Delete All" cancelText="Cancel" danger
        onConfirm={() => { handleBulkDelete(); setConfirmBulkDelete(false) }} onCancel={() => setConfirmBulkDelete(false)} />
      <BulkActionBar selectedCount={selected.size} onDelete={() => setConfirmBulkDelete(true)} onClear={() => setSelected(new Set())} />
    </div>
  )
}

export default Tenants
