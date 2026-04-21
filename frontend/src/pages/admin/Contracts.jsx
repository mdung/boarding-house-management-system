import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import BulkActionBar from '../../components/BulkActionBar'
import { Plus, Edit, X, Eye, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, FileText, DoorOpen, Users, Calendar } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '—'

const STATUS_CFG = {
  ACTIVE:     { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DRAFT:      { label: 'Draft',       cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPIRED:    { label: 'Expired',     cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  TERMINATED: { label: 'Terminated',  cls: 'bg-rose-50 text-rose-600 border-rose-200' },
}

const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all'
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
    {children}
  </div>
)
const SortTh = ({ field, current, dir, onSort, children, className = '' }) => (
  <th className={`px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${className}`}>
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-slate-700 transition-colors group">
      {children}
      <span className="text-slate-300 group-hover:text-slate-500">
        {current === field ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
      </span>
    </button>
  </th>
)

const Contracts = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [contracts, setContracts] = useState([])
  const [rooms, setRooms] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('code')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const empty = { code: '', roomId: '', mainTenantId: '', startDate: '', endDate: '', deposit: '', monthlyRent: '', dailyRate: '', status: 'DRAFT', billingCycle: 'MONTHLY' }
  const [formData, setFormData] = useState(empty)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [cr, rr, tr] = await Promise.all([api.get('/contracts'), api.get('/rooms'), api.get('/tenants')])
      setContracts(cr.data || []); setRooms(rr.data || []); setTenants(tr.data || [])
    } catch (e) { showToast('Failed to fetch data', 'error'); setContracts([]); setRooms([]); setTenants([]) }
    finally { setLoading(false) }
  }

  const visible = useMemo(() => {
    let f = (contracts || []).filter(c => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (searchTerm) {
        const t = searchTerm.toLowerCase()
        return [c.code, c.roomCode, c.mainTenantName, c.status].some(v => v?.toLowerCase().includes(t))
      }
      return true
    })
    f.sort((a, b) => {
      let av = sortField.includes('Date') ? (a[sortField] ? new Date(a[sortField]) : new Date(0))
        : ['monthlyRent','deposit','dailyRate'].includes(sortField) ? (parseFloat(a[sortField]) || 0)
        : (a[sortField] || '').toString().toLowerCase()
      let bv = sortField.includes('Date') ? (b[sortField] ? new Date(b[sortField]) : new Date(0))
        : ['monthlyRent','deposit','dailyRate'].includes(sortField) ? (parseFloat(b[sortField]) || 0)
        : (b[sortField] || '').toString().toLowerCase()
      return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0)
    })
    return f
  }, [contracts, statusFilter, searchTerm, sortField, sortDir])

  const totalPages = Math.ceil(visible.length / perPage)
  const start = (page - 1) * perPage
  const paginated = visible.slice(start, start + perPage)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) { showToast('End date must be after start date', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...formData, roomId: parseInt(formData.roomId), mainTenantId: parseInt(formData.mainTenantId), deposit: formData.deposit ? parseFloat(formData.deposit) : null, monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null, dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null }
      editing ? await api.put(`/contracts/${editing.id}`, payload) : await api.post('/contracts', payload)
      setShowModal(false); setEditing(null); setFormData(empty); setPage(1); fetchData()
      showToast(editing ? 'Contract updated' : 'Contract created', 'success')
    } catch (err) { showToast(err.response?.data?.message || 'Error saving contract', 'error') }
    finally { setSaving(false) }
  }

  const openEdit = (c) => { setEditing(c); setFormData({ code: c.code, roomId: c.roomId?.toString()||'', mainTenantId: c.mainTenantId?.toString()||'', startDate: c.startDate||'', endDate: c.endDate||'', deposit: c.deposit?.toString()||'', monthlyRent: c.monthlyRent?.toString()||'', dailyRate: c.dailyRate?.toString()||'', status: c.status||'DRAFT', billingCycle: c.billingCycle||'MONTHLY' }); setShowModal(true) }
  const openAdd = () => { setEditing(null); setFormData(empty); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }
  const set = (k) => (e) => setFormData(f => ({ ...f, [k]: e.target.value }))
  const onSort = (f) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc') }; setPage(1) }

  const handleDelete = async (id) => {
    try { await api.delete(`/contracts/${id}`); fetchData(); showToast('Contract deleted', 'success') }
    catch (err) { showToast(err.response?.data?.message || 'Cannot delete', 'error') }
  }

  const toggleSelect = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(c => c.id)))

  const handleBulkDelete = async () => {
    let ok = 0, fail = 0
    for (const id of selected) { try { await api.delete(`/contracts/${id}`); ok++ } catch { fail++ } }
    setSelected(new Set()); setPage(1); fetchData()
    showToast(`Deleted ${ok}${fail > 0 ? `, ${fail} failed` : ''}`, fail > 0 ? 'warning' : 'success')
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-40 bg-slate-100 rounded-2xl" />
      <div className="h-96 bg-slate-100 rounded-3xl" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Contracts</h1>
          <p className="text-slate-500 mt-1 text-sm">{visible.length} of {contracts.length} contracts</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5">
          <Plus className="w-4 h-4" /> Add Contract
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1) }} placeholder="Search contracts..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
          <option value="ALL">All statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={perPage} onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1) }}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
          {[5,10,25,50].map(n => <option key={n} value={n}>{n} per page</option>)}
        </select>
      </div>

      {/* Table / Grid View */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll}
                    className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <SortTh field="code" current={sortField} dir={sortDir} onSort={onSort}>Code</SortTh>
                <SortTh field="roomCode" current={sortField} dir={sortDir} onSort={onSort}>Room</SortTh>
                <SortTh field="mainTenantName" current={sortField} dir={sortDir} onSort={onSort}>Tenant</SortTh>
                <SortTh field="startDate" current={sortField} dir={sortDir} onSort={onSort}>Start</SortTh>
                <SortTh field="endDate" current={sortField} dir={sortDir} onSort={onSort}>End</SortTh>
                <SortTh field="monthlyRent" current={sortField} dir={sortDir} onSort={onSort}>Monthly Rent</SortTh>
                <SortTh field="status" current={sortField} dir={sortDir} onSort={onSort}>Status</SortTh>
                <th className="px-4 py-4 w-24 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">{searchTerm || statusFilter !== 'ALL' ? 'No contracts match your filters' : 'No contracts yet'}</p>
                </td></tr>
              ) : paginated.map(c => {
                const st = STATUS_CFG[c.status] || STATUS_CFG.EXPIRED
                return (
                  <tr key={c.id} className={`hover:bg-slate-50/60 transition-colors group ${selected.has(c.id) ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => navigate(`/admin/contracts/${c.id}/detail`)}
                        className="font-black text-blue-600 hover:text-blue-800 text-sm transition-colors">{c.code}</button>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-black">{c.roomCode}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => navigate(`/admin/tenants/${c.mainTenantId}/detail`)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">{c.mainTenantName}</button>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{fmtDate(c.startDate)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{fmtDate(c.endDate)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-slate-700">{fmt(c.monthlyRent)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl border ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right pr-6">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => navigate(`/admin/contracts/${c.id}/detail`)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(c)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(c.id)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginated.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
               <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
               <p className="font-semibold">No contracts found</p>
            </div>
          ) : paginated.map(c => {
            const st = STATUS_CFG[c.status] || STATUS_CFG.EXPIRED
            return (
              <div key={c.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <button onClick={() => navigate(`/admin/contracts/${c.id}/detail`)} className="text-sm font-black text-blue-600 mb-0.5">{c.code}</button>
                    <p className="text-xs font-bold text-slate-900">{c.mainTenantName}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg border border-slate-200 uppercase tracking-widest">{c.roomCode}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[9px] font-black rounded-xl border uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/50">
                     <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Duration</p>
                     <p className="text-[10px] font-black text-slate-700">{fmtDate(c.startDate)} - {fmtDate(c.endDate)}</p>
                   </div>
                   <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100/50">
                     <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Users className="w-2.5 h-2.5" /> Rent</p>
                     <p className="text-xs font-black text-slate-800">{fmt(c.monthlyRent)}</p>
                   </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                   <button onClick={() => navigate(`/admin/contracts/${c.id}/detail`)} className="p-2 text-slate-400 hover:text-blue-600 bg-white rounded-xl border border-slate-200 shadow-sm transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                   <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-blue-600 bg-white rounded-xl border border-slate-200 shadow-sm transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                   <button onClick={() => handleDelete(c.id)} className="p-2 text-rose-500 bg-rose-50 rounded-xl border border-rose-100 shadow-sm transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-bold text-slate-400 order-2 sm:order-1">{start+1}–{Math.min(start+perPage, visible.length)} of {visible.length}</p>
            <div className="flex items-center gap-1 order-1 sm:order-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({length: Math.min(3, totalPages)}, (_,i) => {
                let p = page
                if (page === 1) p = 1 + i
                else if (page === totalPages) p = totalPages - 2 + i
                else p = page - 1 + i
                if (p < 1 || p > totalPages) return null
                return <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${p===page ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
              })}
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 mb-safe" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-8 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{editing ? 'Edit' : 'Add'} Contract</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{editing ? `Editing ${editing.code}` : 'Create a new rental contract'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <Field label="Contract Code">
                  <input required value={formData.code} onChange={set('code')} placeholder="e.g. CT-2026-001" className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Room">
                    <select required value={formData.roomId} onChange={set('roomId')} className={inputCls + ' appearance-none'}>
                      <option value="">Select room...</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.code} — {r.boardingHouseName}</option>)}
                    </select>
                  </Field>
                  <Field label="Main Tenant">
                    <select required value={formData.mainTenantId} onChange={set('mainTenantId')} className={inputCls + ' appearance-none'}>
                      <option value="">Select tenant...</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date">
                    <input required type="date" value={formData.startDate} onChange={set('startDate')} className={inputCls} />
                  </Field>
                  <Field label="End Date">
                    <input required type="date" value={formData.endDate} onChange={set('endDate')} className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Deposit (VND)">
                    <input type="number" min="0" value={formData.deposit} onChange={set('deposit')} placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Daily Rate">
                    <input type="number" min="0" value={formData.dailyRate} onChange={set('dailyRate')} placeholder="0" className={inputCls} />
                  </Field>
                  <Field label="Monthly Rate">
                    <input type="number" min="0" value={formData.monthlyRent} onChange={set('monthlyRent')} placeholder="0" className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status">
                    <select value={formData.status} onChange={set('status')} className={inputCls + ' appearance-none'}>
                      {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Billing Cycle">
                    <select value={formData.billingCycle} onChange={set('billingCycle')} className={inputCls + ' appearance-none'}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </Field>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-8 py-2.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                    {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Contract'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={confirmBulkDelete} title={`Delete ${selected.size} contracts`}
        message={`Delete ${selected.size} selected contracts? Contracts with invoices cannot be deleted.`}
        confirmText="Delete All" cancelText="Cancel" danger
        onConfirm={() => { handleBulkDelete(); setConfirmBulkDelete(false) }}
        onCancel={() => setConfirmBulkDelete(false)} />
      <BulkActionBar selectedCount={selected.size} onDelete={() => setConfirmBulkDelete(true)} onClear={() => setSelected(new Set())} />
    </div>
  )
}

export default Contracts
