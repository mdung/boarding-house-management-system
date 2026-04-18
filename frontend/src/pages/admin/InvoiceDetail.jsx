import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { ArrowLeft, Printer, DollarSign, Receipt, FileText, DoorOpen, Calendar, User, Phone, CreditCard, Banknote, Smartphone } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

const STATUS_CFG = {
  PAID:           { label: 'Paid',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  PARTIALLY_PAID: { label: 'Partial',      cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500'   },
  OVERDUE:        { label: 'Overdue',      cls: 'bg-rose-50 text-rose-600 border-rose-200',           dot: 'bg-rose-500'    },
  UNPAID:         { label: 'Unpaid',       cls: 'bg-slate-100 text-slate-500 border-slate-200',       dot: 'bg-slate-400'   },
}

const TYPE_CFG = {
  RENT:    { cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  UTILITY: { cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  SERVICE: { cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  OTHER:   { cls: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const METHOD_ICON = { CASH: Banknote, BANK_TRANSFER: CreditCard, MOMO: Smartphone }

const InfoTile = ({ icon: Icon, label, value, color = 'text-slate-800' }) => (
  <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl">
    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${color}`}>{value || '—'}</p>
    </div>
  </div>
)

const InvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchInvoice() }, [id])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchInvoice) }, [id])

  const fetchInvoice = async () => {
    try { const r = await api.get(`/invoices/${id}/detail`); setInvoice(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-slate-100 rounded-2xl" />
      <div className="h-64 bg-slate-100 rounded-3xl" />
    </div>
  )
  if (!invoice) return <div className="p-8 text-center text-rose-500 font-semibold">Invoice not found</div>

  const st = STATUS_CFG[invoice.status] || STATUS_CFG.UNPAID
  const remaining = parseFloat(invoice.remainingAmount) || 0

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate('/admin/invoices')}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Invoices
      </button>

      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{invoice.code}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black ${st.cls}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
                  {invoice.periodMonth}/{invoice.periodYear}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {invoice.status !== 'PAID' && (
              <button onClick={() => navigate(`/admin/payments?invoiceId=${invoice.id}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                <DollarSign className="w-4 h-4" /> Make Payment
              </button>
            )}
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoTile icon={FileText}  label="Contract"  value={invoice.contractCode} />
          <InfoTile icon={DoorOpen}  label="Room"      value={`${invoice.roomCode} · ${invoice.boardingHouseName}`} />
          <InfoTile icon={Calendar}  label="Due Date"  value={fmtDate(invoice.dueDate)} />
          <InfoTile icon={User}      label="Tenant"    value={invoice.mainTenantName} color="text-blue-700" />
          <InfoTile icon={Phone}     label="Phone"     value={invoice.mainTenantPhone} />
        </div>
      </div>

      {/* Invoice items */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <h2 className="font-black text-slate-900">Invoice Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {['Description','Type','Old Index','New Index','Qty','Unit Price','Amount'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.items?.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">No items</td></tr>
              ) : invoice.items?.map(item => {
                const tc = TYPE_CFG[item.type] || TYPE_CFG.OTHER
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{item.description}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg border ${tc.cls}`}>{item.type}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{item.oldIndex ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{item.newIndex ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{item.quantity ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{item.unitPrice ? fmt(item.unitPrice) : '—'}</td>
                    <td className="px-5 py-3.5 text-sm font-black text-slate-800">{fmt(item.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Summary */}
        <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-4">
          <div className="flex flex-col items-end gap-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between w-full text-slate-600"><span>Total</span><span className="font-bold text-slate-800">{fmt(invoice.totalAmount)}</span></div>
            <div className="flex justify-between w-full text-slate-600"><span>Paid</span><span className="font-bold text-emerald-600">{fmt(invoice.paidAmount)}</span></div>
            <div className="flex justify-between w-full border-t border-slate-200 pt-2">
              <span className="font-black text-slate-800">Remaining</span>
              <span className={`font-black text-lg ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(remaining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments */}
      {invoice.payments?.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <h2 className="font-black text-slate-900">Payments</h2>
            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{invoice.payments.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Date','Amount','Method','Transaction Code','Note'].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoice.payments.map(p => {
                  const MIcon = METHOD_ICON[p.method] || CreditCard
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-500">{fmtDate(p.paymentDate)}</td>
                      <td className="px-5 py-3.5 text-sm font-black text-emerald-600">{fmt(p.paidAmount)}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                          <MIcon className="w-3.5 h-3.5 text-slate-400" />{p.method}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{p.transactionCode || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{p.note || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoiceDetail
