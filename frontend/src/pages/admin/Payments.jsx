import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { Plus, DollarSign, Trash2, AlertTriangle, X, ChevronUp, ChevronDown, Search, CreditCard, Banknote, Smartphone, Receipt, Users, Calendar } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
const methodLabel = { CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', MOMO: 'MoMo', OTHER: 'Other' }
const methodIcon = { CASH: Banknote, BANK_TRANSFER: CreditCard, MOMO: Smartphone, OTHER: DollarSign }

const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all'
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
    {children}
  </div>
)

const Payments = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [allInvoices, setAllInvoices] = useState([])
  const [tenantsWithDebt, setTenantsWithDebt] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [paying, setPaying] = useState(false)
  const [formData, setFormData] = useState({ invoiceId: '', paidAmount: '', paymentDate: new Date().toISOString().split('T')[0], method: 'CASH', note: '', transactionCode: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [paySearch, setPaySearch] = useState('')
  const [paySort, setPaySort] = useState('paymentDate')
  const [paySortDir, setPaySortDir] = useState('desc')
  const [payPage, setPayPage] = useState(1)
  const PAGE_SIZE = 15

  useEffect(() => { fetchData() }, [])
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId')
    if (invoiceId && invoices.length > 0) {
      const inv = invoices.find(i => i.id.toString() === invoiceId)
      if (inv) { openPaymentModal(inv); setSearchParams({}, { replace: true }) }
    }
  }, [invoices, searchParams])

  const fetchData = async () => {
    try {
      const [pr, ir, tr] = await Promise.all([api.get('/payments'), api.get('/invoices'), api.get('/tenants')])
      setPayments(pr.data); setAllInvoices(ir.data)
      setTenantsWithDebt(tr.data.filter(t => parseFloat(t.totalDebt) > 0))
      setInvoices(ir.data.filter(i => (parseFloat(i.remainingAmount) || 0) > 0))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice)
    setFormData({ invoiceId: invoice.id.toString(), paidAmount: invoice.remainingAmount?.toString() || '', paymentDate: new Date().toISOString().split('T')[0], method: 'CASH', note: '', transactionCode: '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setPaying(true)
    try {
      if (formData._contractId && !formData.invoiceId) {
        await api.post(`/payments/contract/${formData._contractId}`, { paidAmount: parseFloat(formData.paidAmount), method: formData.method, note: formData.note, transactionCode: formData.transactionCode, paymentDate: formData.paymentDate ? formData.paymentDate + 'T00:00:00' : new Date().toISOString() })
      } else {
        await api.post('/payments', { invoiceId: parseInt(formData.invoiceId), paidAmount: parseFloat(formData.paidAmount), method: formData.method, note: formData.note, transactionCode: formData.transactionCode, paymentDate: formData.paymentDate ? formData.paymentDate + 'T00:00:00' : new Date().toISOString() })
      }
      setShowModal(false); setSelectedInvoice(null)
      setFormData({ invoiceId: '', paidAmount: '', method: 'CASH', note: '', transactionCode: '', paymentDate: new Date().toISOString().split('T')[0] })
      fetchData(); eventBus.emit(EVENTS.PAYMENT_CHANGED)
    } catch (err) { alert(err.response?.data?.message || 'Payment error') }
    finally { setPaying(false) }
  }

  const handleDeletePayment = async () => {
    if (!deleteConfirm) return; setDeleting(true)
    try { await api.delete(`/payments/${deleteConfirm.id}`); setDeleteConfirm(null); fetchData(); eventBus.emit(EVENTS.PAYMENT_CHANGED) }
    catch (e) { alert(e.response?.data?.message || 'Delete failed') }
    finally { setDeleting(false) }
  }

  const getInvoiceInfo = (invoiceId) => allInvoices.find(i => i.id === invoiceId)
  const set = (k) => (e) => setFormData(f => ({ ...f, [k]: e.target.value }))

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-40 bg-slate-100 rounded-2xl" />
      <div className="h-48 bg-slate-100 rounded-3xl" />
      <div className="h-64 bg-slate-100 rounded-3xl" />
    </div>
  )

  // Filter + sort payments
  let filtered = payments.map(p => ({ ...p, _inv: getInvoiceInfo(p.invoiceId) }))
  if (paySearch) {
    const q = paySearch.toLowerCase()
    filtered = filtered.filter(p => [p.invoiceCode, p._inv?.tenantName, p._inv?.roomCode, p.note].some(v => v?.toLowerCase().includes(q)))
  }
  filtered.sort((a, b) => {
    let va = paySort === 'paidAmount' ? (parseFloat(a.paidAmount)||0) : paySort === 'tenantName' ? (a._inv?.tenantName||'') : (a[paySort]||'')
    let vb = paySort === 'paidAmount' ? (parseFloat(b.paidAmount)||0) : paySort === 'tenantName' ? (b._inv?.tenantName||'') : (b[paySort]||'')
    return paySortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0)
  })
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((payPage-1)*PAGE_SIZE, payPage*PAGE_SIZE)
  const toggleSort = (f) => { if (paySort===f) setPaySortDir(d=>d==='asc'?'desc':'asc'); else { setPaySort(f); setPaySortDir('desc') }; setPayPage(1) }
  const SortIcon = ({f}) => paySort!==f ? <ChevronUp className="w-3 h-3 text-slate-300"/> : paySortDir==='asc' ? <ChevronUp className="w-3 h-3 text-blue-500"/> : <ChevronDown className="w-3 h-3 text-blue-500"/>
  const totalPaid = filtered.reduce((s,p) => s+(parseFloat(p.paidAmount)||0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Payments</h1>
          <p className="text-slate-500 mt-1 text-sm">{payments.length} total payments</p>
        </div>
        <button onClick={() => { setSelectedInvoice(null); setFormData({ invoiceId: '', paidAmount: '', paymentDate: new Date().toISOString().split('T')[0], method: 'CASH', note: '', transactionCode: '' }); setShowModal(true) }}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5">
          <Plus className="w-4 h-4" /> Add Payment
        </button>
      </div>

      {/* Outstanding debts */}
      {tenantsWithDebt.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Outstanding Debts · <span className="text-rose-600">{tenantsWithDebt.length} guests</span>
              <span className="ml-2 text-rose-600">{fmt(tenantsWithDebt.reduce((s,t) => s+(parseFloat(t.totalDebt)||0), 0))}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tenantsWithDebt.map(t => (
              <div key={t.id} className="bg-white border border-rose-100 rounded-3xl p-5 hover:border-rose-300 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-700 font-black text-base flex-shrink-0">
                      {t.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{t.fullName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Room {t.activeRoomCode || '—'}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black rounded-xl">Debt</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</p>
                    <p className="text-xl font-black text-rose-600 mt-0.5">{fmt(t.totalDebt)}</p>
                  </div>
                  {t.activeContractId && (
                    <button onClick={() => {
                      const sumInv = allInvoices.find(i => i.contractId === t.activeContractId && (parseFloat(i.remainingAmount)||0) > 0)
                      if (sumInv) { openPaymentModal(sumInv) }
                      else { setSelectedInvoice(null); setFormData({ invoiceId: '', paidAmount: parseFloat(t.totalDebt).toFixed(0), paymentDate: new Date().toISOString().split('T')[0], method: 'CASH', note: '', transactionCode: '', _contractId: t.activeContractId, _tenantName: t.fullName, _roomCode: t.activeRoomCode, _totalDebt: t.totalDebt }); setShowModal(true) }
                    }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                      <DollarSign className="w-3.5 h-3.5" /> Pay
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider">Payment History ({filtered.length})</h2>
            {filtered.length > 0 && <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{fmt(totalPaid)}</span>}
          </div>
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={paySearch} onChange={e => { setPaySearch(e.target.value); setPayPage(1) }} placeholder="Search payments..."
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all w-full sm:w-64" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {[['invoiceCode','Invoice'],['tenantName','Guest / Room'],['paidAmount','Amount'],['paymentDate','Date'],['method','Method'],['note','Note']].map(([f,l]) => (
                    <th key={f} className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <button onClick={() => toggleSort(f)} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        {l} <SortIcon f={f} />
                      </button>
                    </th>
                  ))}
                  <th className="px-5 py-4 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paged.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No payments found</p>
                  </td></tr>
                ) : paged.map(p => {
                  const MIcon = methodIcon[p.method] || DollarSign
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-700">{p.invoiceCode}</td>
                      <td className="px-5 py-3.5 text-sm">
                        {p._inv ? <><span className="font-bold text-slate-800">{p._inv.tenantName}</span><span className="text-slate-400 ml-1.5 text-xs">· {p._inv.roomCode}</span></> : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-black text-emerald-600 text-sm">{fmt(p.paidAmount)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{fmtDate(p.paymentDate)}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                          <MIcon className="w-3.5 h-3.5 text-slate-400" />
                          {methodLabel[p.method] || p.method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400 max-w-[150px] truncate">{p.note || '—'}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setDeleteConfirm(p)}
                          className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-xl transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-emerald-50/40">
                    <td colSpan={2} className="px-5 py-3 text-sm font-bold text-slate-600">Total · {filtered.length} payments</td>
                    <td className="px-5 py-3 text-sm font-black text-emerald-600">{fmt(totalPaid)}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
             {paged.length === 0 ? (
               <div className="py-20 text-center text-slate-400">
                 <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                 <p className="font-semibold">No payments found</p>
               </div>
             ) : paged.map(p => {
               const MIcon = methodIcon[p.method] || DollarSign
               return (
                 <div key={p.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-blue-600 mb-0.5">{p.invoiceCode}</p>
                        <p className="text-sm font-bold text-slate-900">{p._inv?.tenantName || 'Unknown Guest'}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tight">Room {p._inv?.roomCode || '—'}</p>
                      </div>
                      <span className="font-black text-emerald-600 text-sm">{fmt(p.paidAmount)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                           <Calendar className="w-3 h-3" />
                           {fmtDate(p.paymentDate)}
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                           <MIcon className="w-3 h-3" />
                           {methodLabel[p.method] || p.method}
                         </div>
                      </div>
                      <button onClick={() => setDeleteConfirm(p)} className="p-2 text-rose-500 bg-rose-50 rounded-xl border border-rose-100 transition-colors">
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {p.note && <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg italic border border-slate-100">"{p.note}"</p>}
                 </div>
               )
             })}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-bold text-slate-400 order-2 sm:order-1">{(payPage-1)*PAGE_SIZE+1}–{Math.min(payPage*PAGE_SIZE, filtered.length)} of {filtered.length}</p>
              <div className="flex items-center gap-1 order-1 sm:order-2">
                <button disabled={payPage===1} onClick={() => setPayPage(p=>p-1)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"><ChevronUp className="w-4 h-4 rotate-90" /></button>
                {Array.from({length: Math.min(3, totalPages)}, (_,i) => {
                  let p = payPage
                  if (payPage === 1) p = 1 + i
                  else if (payPage === totalPages) p = totalPages - 2 + i
                  else p = payPage - 1 + i
                  if (p < 1 || p > totalPages) return null
                  return <button key={p} onClick={() => setPayPage(p)} className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${p===payPage ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
                })}
                <button disabled={payPage===totalPages} onClick={() => setPayPage(p=>p+1)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"><ChevronDown className="w-4 h-4 rotate-90" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => { setShowModal(false); setSelectedInvoice(null) }}>
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Collect Payment</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedInvoice ? `${selectedInvoice.tenantName} · Room ${selectedInvoice.roomCode}` : formData._tenantName ? `${formData._tenantName} · Room ${formData._roomCode}` : 'New payment'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setSelectedInvoice(null) }} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Info banner */}
            {(selectedInvoice || formData._contractId) && (
              <div className={`mx-7 mt-5 rounded-2xl p-4 ${selectedInvoice ? 'bg-blue-50 border border-blue-100' : 'bg-rose-50 border border-rose-100'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedInvoice ? 'Invoice' : 'Contract Debt'}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedInvoice?.code || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining</p>
                    <p className="text-lg font-black text-rose-600 mt-0.5">{fmt(selectedInvoice?.remainingAmount || formData._totalDebt)}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="px-7 py-5 space-y-4">
                {!selectedInvoice && !formData._contractId && (
                  <Field label="Select Invoice">
                    <select required value={formData.invoiceId}
                      onChange={e => {
                        const inv = invoices.find(i => i.id.toString() === e.target.value)
                        setSelectedInvoice(inv || null)
                        setFormData(f => ({ ...f, invoiceId: e.target.value, paidAmount: inv?.remainingAmount?.toString() || '' }))
                      }}
                      className={inputCls + ' appearance-none'}>
                      <option value="">Select invoice...</option>
                      {invoices.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.tenantName} · {inv.roomCode} · {inv.code} · {fmt(inv.remainingAmount)}</option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Payment Amount (VND)">
                  <input required type="number" step="1000" min="1000" value={formData.paidAmount} onChange={set('paidAmount')}
                    placeholder="0" className={inputCls + ' text-lg font-black'} />
                  {selectedInvoice && formData.paidAmount && (
                    <p className={`text-xs mt-1 ml-1 font-bold ${parseFloat(formData.paidAmount) >= selectedInvoice.remainingAmount ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {parseFloat(formData.paidAmount) >= selectedInvoice.remainingAmount ? '✓ Full payment' : `Still owed ${fmt(selectedInvoice.remainingAmount - parseFloat(formData.paidAmount))}`}
                    </p>
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <input type="date" value={formData.paymentDate} onChange={set('paymentDate')} className={inputCls} />
                  </Field>
                  <Field label="Method">
                    <select value={formData.method} onChange={set('method')} className={inputCls + ' appearance-none'}>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="MOMO">MoMo</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </Field>
                </div>

                <Field label="Transaction Code">
                  <input type="text" value={formData.transactionCode} onChange={set('transactionCode')} placeholder="Optional..." className={inputCls} />
                </Field>
                <Field label="Note">
                  <textarea value={formData.note} onChange={set('note')} placeholder="Optional..." rows={2} className={inputCls + ' resize-none'} />
                </Field>
              </div>

              <div className="px-7 py-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); setSelectedInvoice(null) }}
                  className="flex-1 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={paying}
                  className="flex-1 py-2.5 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                  {paying ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => !deleting && setDeleteConfirm(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-5 text-center">
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Delete Payment?</h3>
              <p className="text-sm text-slate-500 mt-1">This will reverse the payment and update the invoice balance.</p>
            </div>
            <div className="px-7 pb-5">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-sm mb-5">
                {[['Invoice', deleteConfirm.invoiceCode], ['Amount', fmt(deleteConfirm.paidAmount)], ['Date', fmtDate(deleteConfirm.paymentDate)], ['Method', methodLabel[deleteConfirm.method] || deleteConfirm.method]].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-slate-500">{l}</span>
                    <span className={`font-bold ${l === 'Amount' ? 'text-emerald-600' : 'text-slate-800'}`}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className="flex-1 py-2.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleDeletePayment} disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 shadow-lg shadow-rose-500/20 transition-all">
                  <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Payments
