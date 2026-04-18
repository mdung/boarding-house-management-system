import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { ArrowLeft, Edit2, Save, X, CreditCard, ShoppingCart, Phone, Mail, MapPin, CreditCard as IdCard, Calendar, DoorOpen, FileText, Receipt, CheckCircle, AlertCircle, Clock } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '—'

const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all'
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
    {children}
  </div>
)

const INV_STATUS = {
  PAID:           { label: 'Paid',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIALLY_PAID: { label: 'Partial',        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  OVERDUE:        { label: 'Overdue',        cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  UNPAID:         { label: 'Unpaid',         cls: 'bg-slate-100 text-slate-600 border-slate-200' },
}

const CONTRACT_STATUS = {
  ACTIVE:     { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  EXPIRED:    { cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  TERMINATED: { cls: 'bg-rose-50 text-rose-600 border-rose-200' },
}

const TenantDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingCheckout, setEditingCheckout] = useState(null)
  const [newCheckoutDate, setNewCheckoutDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ paidAmount: '', method: 'CASH', note: '', transactionCode: '', paymentDate: new Date().toISOString().split('T')[0] })
  const [paying, setPaying] = useState(false)

  useEffect(() => { fetchAll() }, [id])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchAll) }, [id])

  const fetchAll = async () => {
    try {
      const r = await api.get(`/tenants/${id}/detail`)
      setTenant(r.data)
      const active = r.data.contracts?.find(c => c.status === 'ACTIVE')
      if (active) {
        const s = await api.get(`/guest-charges/contract/${active.id}/summary`)
        setSummary(s.data)
      } else setSummary(null)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const saveCheckout = async (contractId) => {
    setSaving(true)
    try { await api.patch(`/contracts/${contractId}/checkout-date`, { endDate: newCheckoutDate }); setEditingCheckout(null); fetchAll() }
    catch (e) { alert(e.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handlePay = async (e) => {
    e.preventDefault()
    const active = tenant.contracts?.find(c => c.status === 'ACTIVE')
    if (!active) return
    setPaying(true)
    try {
      await api.post(`/payments/contract/${active.id}`, { paidAmount: parseFloat(payForm.paidAmount), method: payForm.method, note: payForm.note, transactionCode: payForm.transactionCode, paymentDate: payForm.paymentDate ? new Date(payForm.paymentDate).toISOString() : null })
      setShowPayModal(false)
      setPayForm({ paidAmount: '', method: 'CASH', note: '', transactionCode: '', paymentDate: new Date().toISOString().split('T')[0] })
      eventBus.emit(EVENTS.PAYMENT_CHANGED); fetchAll()
    } catch (e) { alert(e.response?.data?.message || 'Payment error') }
    finally { setPaying(false) }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-slate-100 rounded-2xl" />
      <div className="h-48 bg-slate-100 rounded-3xl" />
      <div className="h-64 bg-slate-100 rounded-3xl" />
    </div>
  )
  if (!tenant) return <div className="p-8 text-center text-rose-500 font-semibold">Guest not found</div>

  const activeContract = tenant.contracts?.find(c => c.status === 'ACTIVE')
  const remaining = summary ? parseFloat(summary.remainingAmount) : 0
  const today = new Date(); today.setHours(0,0,0,0)
  const checkoutDate = activeContract ? new Date(activeContract.endDate + 'T00:00:00') : null
  const daysLeft = checkoutDate ? Math.round((checkoutDate - today) / 86400000) : null

  const checkoutAlert = daysLeft !== null && (
    daysLeft < 0  ? { msg: `Overdue by ${Math.abs(daysLeft)} days`, cls: 'bg-rose-50 border-rose-200 text-rose-700' } :
    daysLeft === 0 ? { msg: 'Checking out today', cls: 'bg-orange-50 border-orange-200 text-orange-700' } :
    daysLeft === 1 ? { msg: 'Checking out tomorrow', cls: 'bg-amber-50 border-amber-200 text-amber-700' } :
    null
  )

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <button onClick={() => navigate('/admin/tenants')}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Tenants
      </button>

      {/* Top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20 flex-shrink-0">
              {tenant.fullName?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{tenant.fullName}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {activeContract ? <span className="text-emerald-600 font-bold">● Staying · Room {activeContract.roomCode}</span> : <span className="text-slate-400">No active contract</span>}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Phone,    label: 'Phone',        value: tenant.phone },
              { icon: Mail,     label: 'Email',        value: tenant.email },
              { icon: IdCard,   label: 'ID Number',    value: tenant.identityNumber },
              { icon: Calendar, label: 'Date of Birth',value: fmtDate(tenant.dateOfBirth) },
              { icon: MapPin,   label: 'Address',      value: tenant.permanentAddress, full: true },
            ].map(({ icon: Icon, label, value, full }) => (
              <div key={label} className={`flex items-start gap-3 p-3 bg-slate-50 rounded-2xl ${full ? 'sm:col-span-2' : ''}`}>
                <div className="w-7 h-7 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{value || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment summary */}
        <div className={`rounded-3xl border shadow-sm p-6 flex flex-col ${remaining > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Payment Summary
          </h3>
          {summary ? (
            <div className="flex-1 space-y-2.5 text-sm">
              {[
                { label: 'Room charge', value: summary.totalRent },
                { label: 'Services',    value: summary.totalCharges },
                ...(summary.deposit > 0 ? [{ label: 'Deposit', value: summary.deposit, cls: 'text-blue-600' }] : []),
                { label: 'Total',       value: summary.totalAmount, bold: true, border: true },
                { label: 'Paid',        value: summary.totalPaid, cls: 'text-emerald-600' },
              ].map(({ label, value, cls, bold, border }) => (
                <div key={label} className={`flex justify-between ${border ? 'border-t border-slate-200 pt-2.5' : ''}`}>
                  <span className={`${bold ? 'font-bold text-slate-700' : 'text-slate-500'}`}>{label}</span>
                  <span className={`font-bold ${cls || 'text-slate-800'}`}>{fmt(value)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-2.5">
                <span className="font-black text-slate-800">Remaining</span>
                <span className={`font-black text-xl ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(remaining)}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-slate-400 font-medium">No active contract</p>
            </div>
          )}

          {checkoutAlert && (
            <div className={`mt-4 px-3 py-2 rounded-2xl border text-xs font-bold text-center ${checkoutAlert.cls}`}>
              {checkoutAlert.msg}
            </div>
          )}

          {activeContract && remaining > 0 && (
            <button onClick={() => { setPayForm(f => ({...f, paidAmount: remaining.toFixed(0)})); setShowPayModal(true) }}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
              <CreditCard className="w-4 h-4" /> Collect {fmt(remaining)}
            </button>
          )}
          {activeContract && (
            <button onClick={() => navigate(`/admin/guest-charges?contractId=${activeContract.id}`)}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-white/70 hover:bg-white text-purple-700 text-sm font-bold rounded-2xl border border-purple-200 transition-all">
              <ShoppingCart className="w-4 h-4" /> Add Service Charge
            </button>
          )}
        </div>
      </div>

      {/* Contracts */}
      {tenant.contracts?.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <h2 className="font-black text-slate-900">Rental Contracts</h2>
            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tenant.contracts.length}</span>
          </div>
          <div className="p-4 space-y-3">
            {tenant.contracts.map(c => {
              const stCls = CONTRACT_STATUS[c.status]?.cls || CONTRACT_STATUS.EXPIRED.cls
              return (
                <div key={c.id} className={`rounded-2xl border p-4 ${c.status === 'ACTIVE' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-blue-700 text-sm">{c.code}</span>
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                        <DoorOpen className="w-3 h-3" /> {c.roomCode}
                      </span>
                      <span className={`px-2 py-0.5 rounded-xl border text-[10px] font-black ${stCls}`}>{c.status}</span>
                    </div>
                    <span className="text-sm font-black text-slate-700">
                      {c.dailyRate ? `${fmt(c.dailyRate)}/ngày` : `${fmt(c.monthlyRent)}/tháng`}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Check-in: <strong>{fmtDate(c.startDate)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Check-out:
                      {editingCheckout === c.id ? (
                        <span className="flex items-center gap-1 ml-1">
                          <input type="date" value={newCheckoutDate} onChange={e => setNewCheckoutDate(e.target.value)}
                            className="px-2 py-1 border border-blue-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={() => saveCheckout(c.id)} disabled={saving} className="w-7 h-7 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl transition-colors">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCheckout(null)} className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 ml-1">
                          <strong>{fmtDate(c.endDate)}</strong>
                          {c.status === 'ACTIVE' && (
                            <button onClick={() => { setEditingCheckout(c.id); setNewCheckoutDate(c.endDate) }}
                              className="w-6 h-6 flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Invoices */}
      {tenant.invoices?.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h2 className="font-black text-slate-900">Invoices</h2>
            <span className="ml-1 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tenant.totalInvoices}</span>
            {tenant.unpaidInvoices > 0 && (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">{tenant.unpaidInvoices} unpaid</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Invoice Code','Period','Total','Paid','Remaining','Status',''].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tenant.invoices.map(inv => {
                  const st = INV_STATUS[inv.status] || INV_STATUS.UNPAID
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-800">{inv.code}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{inv.periodMonth}/{inv.periodYear}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">{fmt(inv.totalAmount)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-emerald-600">{fmt(inv.paidAmount)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-rose-600">{fmt(inv.remainingAmount)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl border ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {inv.status !== 'PAID' && (
                          <button onClick={() => { setPayForm(f => ({...f, paidAmount: inv.remainingAmount?.toFixed(0) || ''})); setShowPayModal(true) }}
                            className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all">
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowPayModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-7 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Collect Payment</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{tenant.fullName} · Room {activeContract?.roomCode}</p>
                </div>
              </div>
              <button onClick={() => setShowPayModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {summary && (
              <div className="mx-7 mt-5 bg-slate-50 rounded-2xl p-4 text-sm space-y-2">
                {[['Room charge', summary.totalRent], ['Services', summary.totalCharges], ['Paid', `-${fmt(summary.totalPaid)}`]].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-slate-500"><span>{l}</span><span className="font-semibold text-slate-700">{typeof v === 'string' ? v : fmt(v)}</span></div>
                ))}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-800">
                  <span>Remaining</span><span className="text-rose-600">{fmt(summary.remainingAmount)}</span>
                </div>
              </div>
            )}

            <form onSubmit={handlePay}>
              <div className="px-7 py-5 space-y-4">
                <Field label="Payment Amount (VND)">
                  <input required type="number" min="1000" step="1000" value={payForm.paidAmount}
                    onChange={e => setPayForm(f => ({...f, paidAmount: e.target.value}))}
                    className={inputCls + ' text-lg font-black'} placeholder="0" />
                  {payForm.paidAmount && summary && (
                    <p className={`text-xs mt-1 ml-1 font-bold ${parseFloat(payForm.paidAmount) >= parseFloat(summary.remainingAmount) ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {parseFloat(payForm.paidAmount) >= parseFloat(summary.remainingAmount) ? '✓ Full payment' : `Still owed ${fmt(parseFloat(summary.remainingAmount) - parseFloat(payForm.paidAmount))}`}
                    </p>
                  )}
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Method">
                    <select value={payForm.method} onChange={e => setPayForm(f => ({...f, method: e.target.value}))} className={inputCls + ' appearance-none'}>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="MOMO">MoMo</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </Field>
                  <Field label="Date">
                    <input type="date" value={payForm.paymentDate} onChange={e => setPayForm(f => ({...f, paymentDate: e.target.value}))} className={inputCls} />
                  </Field>
                </div>
                <Field label="Note">
                  <input type="text" value={payForm.note} onChange={e => setPayForm(f => ({...f, note: e.target.value}))} placeholder="Optional note..." className={inputCls} />
                </Field>
              </div>
              <div className="px-7 py-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={paying}
                  className="flex-1 py-2.5 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
                  {paying ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TenantDetail
