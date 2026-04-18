import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { useToast } from '../../context/ToastContext'
import { Plus, Eye, Calculator, DollarSign, Trash2, ChevronUp, ChevronDown, X, AlertTriangle, Search, Receipt, FileText } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

const STATUS_CFG = {
  PAID:           { label: 'Paid',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIALLY_PAID: { label: 'Partial',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  OVERDUE:        { label: 'Overdue',      cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  UNPAID:         { label: 'Unpaid',       cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all'
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
    {children}
  </div>
)
const SortTh = ({ field, current, dir, onSort, children }) => (
  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
    <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-slate-700 transition-colors group">
      {children}
      <span className="text-slate-300 group-hover:text-slate-500">
        {current === field ? (dir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />) : <ChevronUp className="w-3 h-3" />}
      </span>
    </button>
  </th>
)

const Invoices = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [invoices, setInvoices] = useState([])
  const [filteredInvoices, setFilteredInvoices] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showReadingsModal, setShowReadingsModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [roomServices, setRoomServices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL')
  const [selected, setSelected] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [sortField, setSortField] = useState('code')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const [formData, setFormData] = useState({ contractId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })
  const [readingsData, setReadingsData] = useState({ contractId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), readings: [] })

  useEffect(() => { fetchData() }, [])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchData) }, [])

  useEffect(() => {
    let f = [...invoices]
    if (searchTerm) { const t = searchTerm.toLowerCase(); f = f.filter(i => [i.code, i.roomCode, i.tenantName].some(v => v?.toLowerCase().includes(t))) }
    if (statusFilter === 'NOT_PAID') f = f.filter(i => (parseFloat(i.remainingAmount)||0) > 0)
    else if (statusFilter === 'PAST_DUE') { const today = new Date().toISOString().split('T')[0]; f = f.filter(i => (parseFloat(i.remainingAmount)||0) > 0 && i.dueDate && i.dueDate < today) }
    else if (statusFilter !== 'ALL') f = f.filter(i => i.status === statusFilter)
    f.sort((a, b) => {
      let va = sortField === 'totalAmount' || sortField === 'paidAmount' || sortField === 'remainingAmount' ? (parseFloat(a[sortField])||0) : sortField === 'period' ? `${a.periodYear}-${String(a.periodMonth).padStart(2,'0')}` : (a[sortField]||'')
      let vb = sortField === 'totalAmount' || sortField === 'paidAmount' || sortField === 'remainingAmount' ? (parseFloat(b[sortField])||0) : sortField === 'period' ? `${b.periodYear}-${String(b.periodMonth).padStart(2,'0')}` : (b[sortField]||'')
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
    })
    setFilteredInvoices(f); setPage(1); setSelected(new Set())
  }, [invoices, searchTerm, statusFilter, sortField, sortDir])

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE)
  const paged = filteredInvoices.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)
  const onSort = (f) => { if (sortField===f) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortField(f); setSortDir('asc') } }
  const toggleSelect = (id) => setSelected(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () => setSelected(selected.size === paged.length ? new Set() : new Set(paged.map(i => i.id)))

  const fetchData = async () => {
    try {
      const [ir, cr] = await Promise.all([api.get('/invoices'), api.get('/contracts')])
      setInvoices(ir.data); setContracts(cr.data.filter(c => c.status === 'ACTIVE'))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/invoices/generate', { contractId: parseInt(formData.contractId), month: parseInt(formData.month), year: parseInt(formData.year) })
      setShowModal(false); setFormData({ contractId: '', month: new Date().getMonth()+1, year: new Date().getFullYear() })
      showToast('Invoice generated', 'success'); fetchData()
    } catch (err) { showToast(err.response?.data?.message || 'Failed to generate', 'error') }
  }

  const handlePreview = async () => {
    if (!readingsData.contractId || !readingsData.readings.length) { showToast('Fill in all fields', 'warning'); return }
    for (const r of readingsData.readings) {
      if (!r.oldIndex && r.oldIndex !== 0 || !r.newIndex && r.newIndex !== 0) { showToast('Fill in all readings', 'warning'); return }
      if (parseFloat(r.newIndex) < parseFloat(r.oldIndex)) { showToast('New index must be ≥ old index', 'error'); return }
    }
    try { const r = await api.post('/invoices/preview-with-readings', readingsData); setPreviewInvoice(r.data); setShowPreview(true) }
    catch (err) { showToast(err.response?.data?.message || 'Preview failed', 'error') }
  }

  const handleGenerateWithReadings = async (e) => {
    e.preventDefault()
    try {
      await api.post('/invoices/generate-with-readings', readingsData)
      setShowReadingsModal(false); setReadingsData({ contractId: '', month: new Date().getMonth()+1, year: new Date().getFullYear(), readings: [] }); setRoomServices([]); setShowPreview(false); setPreviewInvoice(null)
      showToast('Invoice generated', 'success'); fetchData()
    } catch (err) { showToast(err.response?.data?.message || 'Failed to generate', 'error') }
  }

  const handleDelete = async (invoice) => {
    setDeleting(true)
    try { await api.delete(`/invoices/${invoice.id}`); showToast('Deleted', 'success'); setShowDeleteConfirm(null); fetchData() }
    catch (e) { showToast(e.response?.data?.message || 'Cannot delete', 'error') }
    finally { setDeleting(false) }
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    try { const r = await api.post('/invoices/bulk-delete', { ids: [...selected] }); showToast(`Deleted ${r.data.deleted}`, 'success'); setShowDeleteConfirm(null); setSelected(new Set()); fetchData() }
    catch (e) { showToast(e.response?.data?.message || 'Bulk delete failed', 'error') }
    finally { setDeleting(false) }
  }

  const totalTotal = filteredInvoices.reduce((s,i) => s+(parseFloat(i.totalAmount)||0), 0)
  const totalPaid  = filteredInvoices.reduce((s,i) => s+(parseFloat(i.paidAmount)||0), 0)
  const totalRem   = filteredInvoices.reduce((s,i) => s+(parseFloat(i.remainingAmount)||0), 0)

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-10 w-40 bg-slate-100 rounded-2xl" /><div className="h-96 bg-slate-100 rounded-3xl" /></div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1 text-sm">{filteredInvoices.length} of {invoices.length} invoices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> Generate Invoice
          </button>
          <button onClick={() => setShowReadingsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> Generate with Readings
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by code, room, or guest..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
          <option value="ALL">All Status</option>
          <option value="NOT_PAID">Not Paid</option>
          <option value="PAST_DUE">Past Due</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        {selected.size > 0 && (
          <button onClick={() => setShowDeleteConfirm('bulk')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-sm font-bold transition-all">
            <Trash2 className="w-4 h-4" /> Delete {selected.size}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" checked={paged.length > 0 && selected.size === paged.length} onChange={toggleAll}
                    className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                <SortTh field="code" current={sortField} dir={sortDir} onSort={onSort}>Code</SortTh>
                <SortTh field="tenantName" current={sortField} dir={sortDir} onSort={onSort}>Guest</SortTh>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Room</th>
                <SortTh field="period" current={sortField} dir={sortDir} onSort={onSort}>Period</SortTh>
                <SortTh field="totalAmount" current={sortField} dir={sortDir} onSort={onSort}>Total</SortTh>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid</th>
                <SortTh field="remainingAmount" current={sortField} dir={sortDir} onSort={onSort}>Remaining</SortTh>
                <SortTh field="status" current={sortField} dir={sortDir} onSort={onSort}>Status</SortTh>
                <th className="px-4 py-4 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-16 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No invoices found</p>
                </td></tr>
              ) : paged.map(inv => {
                const st = STATUS_CFG[inv.status] || STATUS_CFG.UNPAID
                return (
                  <tr key={inv.id} className={`hover:bg-slate-50/60 transition-colors group ${selected.has(inv.id) ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                        className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => navigate(`/admin/invoices/${inv.id}/detail`)}
                        className="font-bold text-blue-600 hover:text-blue-800 text-sm transition-colors">{inv.code}</button>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-700">{inv.tenantName || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-black">{inv.roomCode}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{inv.periodMonth}/{inv.periodYear}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-slate-700">{fmt(inv.totalAmount)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-emerald-600">{fmt(inv.paidAmount)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-rose-600">{fmt(inv.remainingAmount)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl border ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/admin/invoices/${inv.id}/detail`)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        {inv.status !== 'PAID' && <button onClick={() => navigate(`/admin/payments?invoiceId=${inv.id}`)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 rounded-xl transition-colors"><DollarSign className="w-3.5 h-3.5" /></button>}
                        {(parseFloat(inv.paidAmount)||0) === 0 && <button onClick={() => setShowDeleteConfirm(inv)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {filteredInvoices.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                  <td colSpan={5} className="px-4 py-3 text-sm font-bold text-slate-600">Total · {filteredInvoices.length} invoices</td>
                  <td className="px-4 py-3 text-sm font-black text-slate-800">{fmt(totalTotal)}</td>
                  <td className="px-4 py-3 text-sm font-black text-emerald-600">{fmt(totalPaid)}</td>
                  <td className="px-4 py-3 text-sm font-black text-rose-600">{fmt(totalRem)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}</p>
            <div className="flex items-center gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"><ChevronUp className="w-4 h-4 rotate-90" /></button>
              {Array.from({length: Math.min(5, totalPages)}, (_,i) => {
                const p = Math.max(0, Math.min(page-3, totalPages-5)) + i + 1
                return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-xl text-sm font-bold transition-all ${p===page ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
              })}
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"><ChevronDown className="w-4 h-4 rotate-90" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => !deleting && setShowDeleteConfirm(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-5 text-center">
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">{showDeleteConfirm === 'bulk' ? `Delete ${selected.size} Invoices?` : 'Delete Invoice?'}</h3>
              <p className="text-sm text-slate-500 mt-1">{showDeleteConfirm === 'bulk' ? 'Only invoices with no payments will be deleted.' : `${showDeleteConfirm.code} · ${showDeleteConfirm.tenantName}`}</p>
            </div>
            <div className="px-7 pb-6 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} disabled={deleting} className="flex-1 py-2.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => showDeleteConfirm === 'bulk' ? handleBulkDelete() : handleDelete(showDeleteConfirm)} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-lg shadow-rose-500/20 transition-all">
                <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center"><Receipt className="w-5 h-5 text-blue-600" /></div>
                <div><h2 className="text-xl font-black text-slate-900">Generate Invoice</h2><p className="text-xs text-slate-400 mt-0.5">Create invoice for a contract</p></div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <form onSubmit={handleGenerate}>
              <div className="px-8 py-6 space-y-4">
                <Field label="Contract">
                  <select required value={formData.contractId} onChange={e => setFormData(f => ({...f, contractId: e.target.value}))} className={inputCls + ' appearance-none'}>
                    <option value="">Select contract...</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.code} · {c.roomCode} · {c.mainTenantName}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Month"><input type="number" min="1" max="12" required value={formData.month} onChange={e => setFormData(f => ({...f, month: e.target.value}))} className={inputCls} /></Field>
                  <Field label="Year"><input type="number" required value={formData.year} onChange={e => setFormData(f => ({...f, year: e.target.value}))} className={inputCls} /></Field>
                </div>
              </div>
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-2.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate with Readings Modal */}
      {showReadingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => { setShowReadingsModal(false); setReadingsData({ contractId: '', month: new Date().getMonth()+1, year: new Date().getFullYear(), readings: [] }); setRoomServices([]); setShowPreview(false); setPreviewInvoice(null) }}>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center"><Calculator className="w-5 h-5 text-emerald-600" /></div>
                <div><h2 className="text-xl font-black text-slate-900">Generate with Readings</h2><p className="text-xs text-slate-400 mt-0.5">Include utility meter readings</p></div>
              </div>
              <button onClick={() => setShowReadingsModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <form onSubmit={handleGenerateWithReadings}>
              <div className="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <Field label="Contract">
                  <select required value={readingsData.contractId}
                    onChange={async e => {
                      const contractId = e.target.value
                      setReadingsData(d => ({ ...d, contractId }))
                      if (contractId) {
                        try {
                          const contract = contracts.find(c => c.id.toString() === contractId)
                          if (contract) {
                            const sr = await api.get(`/rooms/${contract.roomId}/services`)
                            const services = sr.data.filter(s => s.serviceCategory !== 'FIXED')
                            setRoomServices(services)
                            setReadingsData(d => ({ ...d, contractId, readings: services.map(s => ({ serviceTypeId: s.serviceTypeId, oldIndex: '', newIndex: '' })) }))
                          }
                        } catch (err) { console.error(err) }
                      }
                    }}
                    className={inputCls + ' appearance-none'}>
                    <option value="">Select contract...</option>
                    {contracts.map(c => <option key={c.id} value={c.id}>{c.code} · {c.roomCode} · {c.mainTenantName}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Month"><input type="number" min="1" max="12" required value={readingsData.month} onChange={e => setReadingsData(d => ({...d, month: parseInt(e.target.value)}))} className={inputCls} /></Field>
                  <Field label="Year"><input type="number" required value={readingsData.year} onChange={e => setReadingsData(d => ({...d, year: parseInt(e.target.value)}))} className={inputCls} /></Field>
                </div>
                {readingsData.readings.map((reading, idx) => {
                  const service = roomServices.find(s => s.serviceTypeId === reading.serviceTypeId)
                  const consumption = (parseFloat(reading.newIndex)||0) - (parseFloat(reading.oldIndex)||0)
                  return (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <p className="text-sm font-black text-slate-700">{service?.serviceTypeName}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label="Old Index">
                          <input type="number" step="0.01" required value={reading.oldIndex||''} onChange={e => { const r = [...readingsData.readings]; r[idx].oldIndex = parseFloat(e.target.value)||0; setReadingsData(d => ({...d, readings: r})) }} className={inputCls} />
                        </Field>
                        <Field label="New Index">
                          <input type="number" step="0.01" required value={reading.newIndex||''} onChange={e => { const r = [...readingsData.readings]; r[idx].newIndex = parseFloat(e.target.value)||0; setReadingsData(d => ({...d, readings: r})) }} className={inputCls} />
                        </Field>
                        <Field label="Consumption">
                          <div className={`px-4 py-3 rounded-2xl text-sm font-black border ${consumption > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{consumption.toFixed(2)}</div>
                        </Field>
                      </div>
                    </div>
                  )
                })}

                {/* Preview */}
                {showPreview && previewInvoice && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <p className="text-xs font-black text-emerald-700 uppercase tracking-wider mb-3">Preview · {previewInvoice.periodMonth}/{previewInvoice.periodYear}</p>
                    <div className="space-y-1.5">
                      {previewInvoice.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-600">{item.description}</span>
                          <span className="font-bold text-slate-800">{fmt(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm border-t border-emerald-200 pt-2 mt-2">
                        <span className="font-black text-slate-800">Total</span>
                        <span className="font-black text-emerald-700">{fmt(previewInvoice.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowReadingsModal(false)} className="px-6 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="button" onClick={handlePreview} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all">
                  <Calculator className="w-4 h-4" /> Preview
                </button>
                <button type="submit" className="px-8 py-2.5 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">Generate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Invoices
