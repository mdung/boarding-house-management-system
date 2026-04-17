import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import {
  DoorOpen, Users, DollarSign, AlertCircle, LogIn, LogOut,
  BedDouble, CreditCard, X, ExternalLink, ShoppingCart, Receipt,
  ChevronRight, ChevronDown, Edit2, Save, Plus, CalendarDays, Package
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US') : '-'
const toISO = (d) => d ? d.split('T')[0] : ''

const activityBadge = (type) => {
  if (type === 'CHECKIN') return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium"><LogIn className="w-3 h-3" />Check-in</span>
  if (type === 'CHECKOUT') return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-medium"><LogOut className="w-3 h-3" />Check-out</span>
  return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium"><BedDouble className="w-3 h-3" />Staying</span>
}

// ─── Guest Detail Modal ───────────────────────────────────────────────────────
const GuestDetailModal = ({ guest, onClose, navigate }) => {
  const [summary, setSummary] = useState(null)
  const [payments, setPayments] = useState([])   // payment history
  const [loading, setLoading] = useState(true)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [payNote, setPayNote] = useState('')
  const [paying, setPaying] = useState(false)
  const [payResult, setPayResult] = useState(null)
  const [deletingPayId, setDeletingPayId] = useState(null)

  // Extend checkout state
  const [editingCheckout, setEditingCheckout] = useState(false)
  const [newCheckout, setNewCheckout] = useState('')
  const [extendPreview, setExtendPreview] = useState(null)
  const [savingCheckout, setSavingCheckout] = useState(false)

  // Checkout confirm state
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [showServiceDetail, setShowServiceDetail] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const s = await api.get(`/guest-charges/contract/${guest.contractId}/summary`)
      setSummary(s.data)
      // Fetch payments for the summary invoice (SUM- prefix)
      const invRes = await api.get(`/invoices`)
      const sumInv = invRes.data.find(i => i.contractId === guest.contractId && i.code?.startsWith('SUM-'))
      if (sumInv) {
        const pRes = await api.get(`/payments/invoice/${sumInv.id}`)
        setPayments(pRes.data)
      } else {
        setPayments([])
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [guest.contractId])

  // Compute extend preview whenever newCheckout changes
  useEffect(() => {
    if (!newCheckout || !summary) { setExtendPreview(null); return }
    const origOut = new Date(guest.checkOutDate + 'T00:00:00')
    const newOut  = new Date(newCheckout + 'T00:00:00')
    const origIn  = new Date(guest.checkInDate + 'T00:00:00')
    if (newOut <= origIn) { setExtendPreview(null); return }
    const totalNights = Math.round((newOut - origIn) / 86400000)
    const origNights  = Math.round((origOut - origIn) / 86400000)
    const extraNights = totalNights - origNights
    const dailyRate   = parseFloat(summary.dailyRate) || 0
    const extraCost   = extraNights * dailyRate
    const newRoomCost = totalNights * dailyRate
    const newTotal    = newRoomCost + parseFloat(summary.totalCharges)
    setExtendPreview({ extraNights, extraCost, newRoomCost, newTotal, totalNights, isShorten: extraNights < 0 })
  }, [newCheckout, summary, guest])

  const handleSaveCheckout = async () => {
    if (!newCheckout) return
    setSavingCheckout(true)
    try {
      await api.patch(`/contracts/${guest.contractId}/checkout-date`, { endDate: newCheckout })
      setEditingCheckout(false)
      setExtendPreview(null)
      fetchAll()
      eventBus.emit(EVENTS.PAYMENT_CHANGED)
    } catch (e) { alert(e.response?.data?.message || 'Error updating checkout date') }
    finally { setSavingCheckout(false) }
  }

  const remaining = summary ? parseFloat(summary.remainingAmount) : 0
  const payAmt = parseFloat(payAmount) || 0
  const payStatus = !payAmount ? null
    : payAmt <= 0 ? 'invalid'
    : payAmt > remaining ? 'over'
    : payAmt === remaining ? 'full'
    : 'partial'

  const handlePay = async (e) => {
    e.preventDefault()
    if (payStatus === 'over' || payStatus === 'invalid') return
    setPaying(true)
    try {
      await api.post(`/payments/contract/${guest.contractId}`, {
        paidAmount: payAmt, method: payMethod,
        note: payNote || null, paymentDate: new Date().toISOString(),
      })
      setPayResult({ amount: payAmt, remaining: remaining - payAmt })
      setPayAmount(''); setPayNote('')
      fetchAll()
      eventBus.emit(EVENTS.PAYMENT_CHANGED)
    } catch (e) { alert(e.response?.data?.message || 'Payment error') }
    finally { setPaying(false) }
  }

  const handleDeletePayment = async (payId) => {
    if (!window.confirm('Delete this payment?')) return
    setDeletingPayId(payId)
    try {
      await api.delete(`/payments/${payId}`)
      fetchAll()
      eventBus.emit(EVENTS.PAYMENT_CHANGED)
    } catch (e) { alert(e.response?.data?.message || 'Cannot delete') }
    finally { setDeletingPayId(null) }
  }

  const debt = parseFloat(guest.totalDebt) || 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex justify-between items-start ${debt > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{guest.tenantName}</h2>
              {activityBadge(guest.activityType)}
            </div>
            <p className="text-sm text-gray-500">{guest.tenantPhone}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Room & dates */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Room</p>
              <p className="text-lg font-bold text-blue-600">{guest.roomCode}</p>
              <p className="text-xs text-gray-400">{guest.boardingHouseName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Check-in</p>
              <p className="text-sm font-semibold">{fmtDate(guest.checkInDate)}</p>
            </div>
            {/* Check-out — editable */}
            <div
              className={`rounded-xl p-3 cursor-pointer transition-all ${editingCheckout ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50 hover:bg-blue-50 hover:border-2 hover:border-blue-200 border-2 border-transparent'}`}
              onClick={() => { if (!editingCheckout) { setEditingCheckout(true); setNewCheckout(toISO(guest.checkOutDate)) } }}
            >
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                Check-out <Edit2 className="w-2.5 h-2.5 text-blue-400" />
              </p>
              {editingCheckout ? (
                <input
                  type="date"
                  value={newCheckout}
                  min={toISO(guest.checkInDate)}
                  onChange={e => setNewCheckout(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="w-full text-xs border border-blue-300 rounded px-1 py-0.5 text-center bg-white"
                  autoFocus
                />
              ) : (
                <p className="text-sm font-semibold text-blue-600">{fmtDate(guest.checkOutDate)}</p>
              )}
            </div>
          </div>

          {/* Extend preview */}
          {editingCheckout && extendPreview && (
            <div className={`rounded-xl p-4 border-2 ${extendPreview.isShorten ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-300'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className={`w-4 h-4 ${extendPreview.isShorten ? 'text-yellow-600' : 'text-blue-600'}`} />
                <span className={`text-sm font-semibold ${extendPreview.isShorten ? 'text-yellow-700' : 'text-blue-700'}`}>
                  {extendPreview.isShorten
                    ? `Shorten by ${Math.abs(extendPreview.extraNights)} nights`
                    : `Extend by ${extendPreview.extraNights} nights`}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>New total nights:</span>
                  <span className="font-medium">{extendPreview.totalNights} nights × {fmt(summary?.dailyRate)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>New room charge:</span>
                  <span className="font-medium">{fmt(extendPreview.newRoomCost)}</span>
                </div>
                <div className={`flex justify-between font-semibold border-t pt-1 ${extendPreview.isShorten ? 'text-yellow-700' : 'text-blue-700'}`}>
                  <span>{extendPreview.isShorten ? 'Room charge reduction:' : 'Additional charge:'}</span>
                  <span>{extendPreview.isShorten ? '-' : '+'}{fmt(Math.abs(extendPreview.extraCost))}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 border-t pt-1">
                  <span>New total bill:</span>
                  <span>{fmt(extendPreview.newTotal)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setEditingCheckout(false); setExtendPreview(null) }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleSaveCheckout} disabled={savingCheckout}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${extendPreview.isShorten ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}>
                  <Save className="w-3.5 h-3.5" />
                  {savingCheckout ? 'Saving...' : extendPreview.isShorten ? 'Confirm Shorten' : 'Confirm Extension'}
                </button>
              </div>
            </div>
          )}
          {editingCheckout && !extendPreview && newCheckout && (
            <p className="text-xs text-red-500 text-center">Checkout date must be after check-in date</p>
          )}

          {/* Financial breakdown */}
          {loading ? (
            <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
          ) : summary ? (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Financial Details</div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center"><BedDouble className="w-3.5 h-3.5 text-blue-600" /></div>
                  <div>
                    <p className="text-sm font-medium">Room charge</p>
                    <p className="text-xs text-gray-400">{summary.totalNights} nights × {fmt(summary.dailyRate)}</p>
                  </div>
                </div>
                <span className="font-semibold">{fmt(summary.totalRent)}</span>
              </div>
              <div className="border-b border-gray-100">
                <button onClick={() => setShowServiceDetail(!showServiceDetail)}
                  className="w-full flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center"><ShoppingCart className="w-3.5 h-3.5 text-purple-600" /></div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Extra services</p>
                      <p className="text-xs text-gray-400">{summary.charges?.length || 0} items · click to {showServiceDetail ? 'hide' : 'view'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{fmt(summary.totalCharges)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showServiceDetail ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {showServiceDetail && summary.charges?.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="bg-purple-50 rounded-lg overflow-hidden">
                      {(() => {
                        const grouped = {}
                        summary.charges.forEach(ch => {
                          const d = ch.chargeDate || 'Unknown'
                          if (!grouped[d]) grouped[d] = []
                          grouped[d].push(ch)
                        })
                        return Object.entries(grouped).sort(([a],[b]) => b.localeCompare(a)).map(([date, items]) => (
                          <div key={date}>
                            <div className="px-3 py-1.5 bg-purple-100 text-xs font-semibold text-purple-700">
                              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              <span className="ml-2 font-normal text-purple-500">{fmt(items.reduce((s,i) => s + (parseFloat(i.amount)||0), 0))}</span>
                            </div>
                            {items.map((ch, i) => (
                              <div key={ch.id || i} className="flex items-center justify-between px-3 py-1.5 text-xs border-t border-purple-100">
                                <div className="flex-1 min-w-0">
                                  <span className="text-gray-700">{ch.description}</span>
                                  {ch.note && <span className="text-gray-400 ml-1">· {ch.note}</span>}
                                </div>
                                <div className="flex items-center gap-3 text-gray-500 flex-shrink-0 ml-2">
                                  <span>{parseFloat(ch.quantity)} × {fmt(ch.unitPrice)}</span>
                                  <span className="font-semibold text-gray-700 w-20 text-right">{fmt(ch.amount)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}
              </div>
              {summary.deposit > 0 && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-yellow-100 rounded-full flex items-center justify-center"><Receipt className="w-3.5 h-3.5 text-yellow-600" /></div>
                    <p className="text-sm font-medium">Deposit</p>
                  </div>
                  <span className="font-semibold text-blue-600">{fmt(summary.deposit)}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Total</p>
                <span className="font-bold">{fmt(summary.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center"><CreditCard className="w-3.5 h-3.5 text-green-600" /></div>
                  <p className="text-sm font-medium">Paid</p>
                </div>
                <span className="font-semibold text-green-600">- {fmt(summary.totalPaid)}</span>
              </div>
              <div className={`flex justify-between items-center px-4 py-3 ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="font-bold text-gray-800">Remaining</p>
                <span className={`text-xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(remaining)}</span>
              </div>
            </div>
          ) : null}

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex justify-between">
                <span>Payment History</span>
                <span className="text-gray-400 font-normal">{payments.length} payments</span>
              </div>
              <div className="divide-y divide-gray-50">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-3 h-3 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-700">{fmt(p.paidAmount)}</p>
                        <p className="text-xs text-gray-400">
                          {p.method === 'CASH' ? '💵 Cash' : p.method === 'BANK_TRANSFER' ? '🏦 Bank Transfer' : p.method === 'MOMO' ? '📱 MoMo' : p.method}
                          {p.paymentDate && ` · ${new Date(p.paymentDate).toLocaleDateString('en-US')}`}
                          {p.note && ` · ${p.note}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      disabled={deletingPayId === p.id}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete this payment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success feedback */}
          {payResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold text-green-700">✅ Recorded {fmt(payResult.amount)}</p>
              {payResult.remaining > 0
                ? <p className="text-green-600 mt-0.5">Remaining: <strong>{fmt(payResult.remaining)}</strong></p>
                : <p className="text-green-600 mt-0.5">Fully paid 🎉</p>
              }
            </div>
          )}

          {/* Payment form — inline, always visible if debt > 0 */}
          {remaining > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex justify-between items-center">
                <span>Collect Payment</span>
                <span className="text-gray-400 font-normal normal-case">Enter amount received</span>
              </div>
              <form onSubmit={handlePay} className="px-4 py-3 space-y-3">
                {/* Amount input with quick buttons */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount (VND)</label>
                  <input
                    type="number" min="1000" step="1000"
                    value={payAmount}
                    onChange={e => { setPayAmount(e.target.value); setPayResult(null) }}
                    placeholder={`Max ${fmt(remaining)}`}
                    className={`w-full px-3 py-2.5 border rounded-lg text-lg font-semibold transition-colors ${
                      payStatus === 'over' ? 'border-red-400 bg-red-50 text-red-700' :
                      payStatus === 'full' ? 'border-green-400 bg-green-50' :
                      payStatus === 'partial' ? 'border-yellow-400 bg-yellow-50' :
                      'border-gray-300'
                    }`}
                  />
                  {/* Quick amount buttons */}
                  <div className="flex gap-2 mt-2">
                    {[remaining, remaining * 0.5, remaining * 0.25].filter((v, i, a) => a.indexOf(v) === i && v > 0).map((v, i) => (
                      <button key={i} type="button"
                        onClick={() => { setPayAmount(Math.round(v).toString()); setPayResult(null) }}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                        {i === 0 ? 'Full' : i === 1 ? '50%' : '25%'} {fmt(Math.round(v))}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status indicator */}
                {payStatus && (
                  <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    payStatus === 'over' ? 'bg-red-100 text-red-700' :
                    payStatus === 'full' ? 'bg-green-100 text-green-700' :
                    payStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {payStatus === 'over' && `❌ Exceeds amount due (${fmt(remaining)})`}
                    {payStatus === 'full' && `✅ Full payment — invoice will be closed`}
                    {payStatus === 'partial' && `⚠️ Partial payment — remaining ${fmt(remaining - payAmt)}`}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Method</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="CASH">💵 Cash</option>
                      <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                      <option value="MOMO">📱 MoMo</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Note</label>
                    <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                      placeholder="Optional..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                <button type="submit"
                  disabled={paying || !payAmount || payStatus === 'over' || payStatus === 'invalid'}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                    paying || !payAmount || payStatus === 'over' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' :
                    payStatus === 'full' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}>
                  {paying ? 'Processing...' :
                   payStatus === 'full' ? `✅ Collect full ${fmt(payAmt)}` :
                   payStatus === 'partial' ? `⚠️ Collect partial ${fmt(payAmt)}` :
                   'Enter amount to collect'}
                </button>
              </form>
            </div>
          )}

          {remaining <= 0 && summary && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
              <p className="text-green-700 font-semibold">✅ Fully paid</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          {!guest.roomReleased && (
            <button
              onClick={() => setShowCheckoutConfirm(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
            >
              <LogOut className="w-4 h-4" /> {guest.contractStatus === 'EXPIRED' ? 'Release Room' : 'Check Out'}
            </button>
          )}
          {!guest.roomReleased && guest.contractStatus === 'ACTIVE' && (
            <button
              onClick={() => { onClose(); navigate(`/admin/guest-charges?contractId=${guest.contractId}`) }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" /> Add Service
            </button>
          )}
          {guest.roomReleased && (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-500 text-sm font-medium rounded-lg border border-gray-200">
              <LogOut className="w-4 h-4" /> Checked Out
            </div>
          )}
          <button
            onClick={() => { onClose(); navigate(`/admin/tenants/${guest.tenantId}/detail`) }}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Checkout Confirm Modal */}
        {showCheckoutConfirm && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10 p-6">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-orange-50 px-6 py-5 text-center">
                <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <LogOut className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Check Out</h3>
                <p className="text-sm text-gray-500 mt-1">This will release the room immediately</p>
              </div>
              <div className="px-6 py-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Guest</span>
                    <span className="font-semibold text-gray-800">{guest.tenantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Room</span>
                    <span className="font-semibold text-gray-800">{guest.roomCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stay</span>
                    <span className="text-gray-700">{fmtDate(guest.checkInDate)} → Today</span>
                  </div>
                  {remaining > 0 && (
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span className="text-red-600 font-medium">Outstanding</span>
                      <span className="font-bold text-red-600">{fmt(remaining)}</span>
                    </div>
                  )}
                </div>
                {remaining > 0 && (
                  <p className="text-xs text-orange-600 mt-3 text-center">
                    ⚠️ Guest still has unpaid balance. You can collect payment after checkout.
                  </p>
                )}
              </div>
              <div className="px-6 pb-5 flex gap-3">
                <button
                  onClick={() => setShowCheckoutConfirm(false)}
                  disabled={checkingOut}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setCheckingOut(true)
                    try {
                      await api.post(`/contracts/${guest.contractId}/checkout`)
                      setShowCheckoutConfirm(false)
                      onClose()
                      eventBus.emit(EVENTS.PAYMENT_CHANGED)
                    } catch (e) { alert(e.response?.data?.message || 'Checkout failed') }
                    finally { setCheckingOut(false) }
                  }}
                  disabled={checkingOut}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {checkingOut ? 'Processing...' : 'Check Out Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Guest Card ───────────────────────────────────────────────────────────────
const GuestCard = ({ guest, onSelect }) => {
  const debt = parseFloat(guest.totalDebt) || 0
  const isExpired = guest.contractStatus === 'EXPIRED' || guest.contractStatus === 'TERMINATED'
  return (
    <div
      onClick={() => onSelect(guest)}
      className={`p-3 border rounded-lg hover:shadow-md cursor-pointer transition-all group ${
        isExpired ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:border-blue-400'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          <p className={`font-semibold text-sm group-hover:text-blue-600 transition-colors ${isExpired ? 'text-gray-500' : 'text-gray-900'}`}>{guest.tenantName}</p>
          <p className="text-xs text-gray-400">{guest.tenantPhone}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-medium">{guest.roomCode}</span>
          {isExpired && <span className="px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-500 rounded font-medium">Done</span>}
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {activityBadge(guest.activityType)}
        {debt > 0
          ? <span className="text-xs text-red-600 font-semibold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />Debt {fmt(debt)}</span>
          : <span className="text-xs text-green-600 font-medium">✓ Paid</span>
        }
      </div>
      <div className="mt-1.5 text-xs text-gray-400">
        {fmtDate(guest.checkInDate)} → {fmtDate(guest.checkOutDate)}
        {guest.totalDays > 0 && <span className="ml-1">({guest.totalDays} nights × {fmt(guest.dailyRate)})</span>}
      </div>
    </div>
  )
}

// ─── Day Column ───────────────────────────────────────────────────────────────
const DayColumn = ({ label, dateLabel, data, onSelect, highlight }) => {
  const all = [...(data?.checkIns || []), ...(data?.checkOuts || []), ...(data?.staying || [])]
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="mb-3">
        <h3 className={`font-bold text-base ${highlight ? 'text-blue-700' : 'text-gray-700'}`}>{label}</h3>
        <p className="text-xs text-gray-400">{dateLabel}</p>
        <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
          {data?.checkIns?.length > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{data.checkIns.length} check-in</span>}
          {data?.checkOuts?.length > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{data.checkOuts.length} check-out</span>}
          {data?.staying?.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{data.staying.length} staying</span>}
          {all.length === 0 && <span className="text-gray-400">No guests</span>}
        </div>
      </div>
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
        {data?.checkIns?.map(g => <GuestCard key={`ci-${g.contractId}`} guest={g} onSelect={onSelect} />)}
        {data?.checkOuts?.map(g => <GuestCard key={`co-${g.contractId}`} guest={g} onSelect={onSelect} />)}
        {data?.staying?.map(g => <GuestCard key={`st-${g.contractId}`} guest={g} onSelect={onSelect} />)}
        {all.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No activity</p>}
      </div>
    </div>
  )
}

// ─── Revenue Detail Modal ─────────────────────────────────────────────────────
const RevenueDetailModal = ({ category, details, onClose, navigate }) => {
  const [filterDate, setFilterDate] = useState('ALL')
  const isRent = category === 'RENT'
  const title = isRent ? 'Room Revenue Details' : 'Service Revenue Details'
  const color = isRent ? 'blue' : 'purple'

  const bgHeader = isRent ? 'bg-blue-50' : 'bg-purple-50'
  const textHeader = isRent ? 'text-blue-800' : 'text-purple-800'
  const iconColor = isRent ? 'text-blue-600' : 'text-purple-600'
  const activeBtn = isRent ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
  const itemBg = isRent ? 'bg-blue-100' : 'bg-purple-100'

  const filtered = details.filter(d => d.category === category)
  const dates = [...new Set(filtered.map(d => d.date))].sort()
  const shown = filterDate === 'ALL' ? filtered : filtered.filter(d => d.date === filterDate)

  // Group by date
  const grouped = {}
  shown.forEach(d => {
    if (!grouped[d.date]) grouped[d.date] = []
    grouped[d.date].push(d)
  })

  const total = shown.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${bgHeader} rounded-t-2xl`}>
          <div className="flex items-center gap-3">
            {isRent
              ? <BedDouble className={`w-6 h-6 ${iconColor}`} />
              : <Receipt className={`w-6 h-6 ${iconColor}`} />}
            <div>
              <h2 className={`text-lg font-bold ${textHeader}`}>{title}</h2>
              <p className="text-sm text-gray-500">{shown.length} items · Total {fmt(total)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/60 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter */}
        <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500">Filter by date:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFilterDate('ALL')}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filterDate === 'ALL' ? activeBtn : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              All
            </button>
            {dates.map(d => (
              <button key={d} onClick={() => setFilterDate(d)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filterDate === d ? activeBtn : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {fmtDate(d)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">{fmtDate(date)}</span>
                <span className="text-xs text-gray-400">({items.length} items · {fmt(items.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0))})</span>
              </div>
              <div className="space-y-1.5 ml-6">
                {items.map((item, i) => (
                  <div key={`${item.invoiceCode}-${i}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${itemBg}`}>
                        {isRent
                          ? <BedDouble className={`w-4 h-4 ${iconColor}`} />
                          : <Receipt className={`w-4 h-4 ${iconColor}`} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.description}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {item.roomCode} · {item.tenantName} · {item.boardingHouseName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-sm font-bold text-gray-800">{fmt(item.amount)}</p>
                      {item.invoiceId && (
                        <button onClick={() => { onClose(); navigate(`/admin/invoices/${item.invoiceId}/detail`) }}
                          className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <p className="text-center text-gray-400 py-12">No data</p>
          )}
        </div>

        {/* Footer summary */}
        <div className="px-6 py-3 border-t bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <span className="text-sm text-gray-500">Grand Total</span>
          <span className="text-lg font-bold text-gray-800">{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState(null)
  const [revenueModal, setRevenueModal] = useState(null) // 'RENT' | 'SERVICE' | null

  const fetchDashboard = () => {
    api.get('/dashboard').then(r => setDashboard(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchDashboard() }, [])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchDashboard) }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  const today = new Date()
  const fmtDay = (offset) => {
    const d = new Date(today); d.setDate(d.getDate() + offset)
    return d.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: '2-digit' })
  }

  const stats = [
    { label: 'Total Rooms', value: dashboard?.totalRooms || 0, icon: DoorOpen, color: 'bg-blue-500', link: '/admin/rooms' },
    { label: 'Occupied', value: dashboard?.occupiedRooms || 0, icon: Users, color: 'bg-green-500', link: '/admin/tenants' },
    { label: 'Available', value: dashboard?.availableRooms || 0, icon: DoorOpen, color: 'bg-gray-400', link: '/admin/rooms' },
    { label: 'Unpaid', value: fmt(dashboard?.unpaidAmount), icon: DollarSign, color: 'bg-yellow-500', link: '/admin/tenants' },
    { label: 'Overdue Invoices', value: dashboard?.overdueInvoices || 0, icon: AlertCircle, color: 'bg-red-500', link: '/admin/invoices?status=PAST_DUE' },
    { label: 'Low Stock', value: dashboard?.lowStockItems || 0, icon: Package, color: dashboard?.lowStockItems > 0 ? 'bg-red-500' : 'bg-gray-400', link: '/admin/inventory' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} onClick={() => navigate(s.link)}
              className="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all">
              <div className={`${s.color} w-8 h-8 rounded-full flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-gray-500 text-xs">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Revenue breakdown cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div onClick={() => setRevenueModal('RENT')}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BedDouble className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Room Revenue This Month</p>
                <p className="text-2xl font-bold text-blue-700">{fmt(dashboard?.roomRevenue)}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
        <div onClick={() => setRevenueModal('SERVICE')}
          className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-100 rounded-xl p-4 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Service Revenue This Month</p>
                <p className="text-2xl font-bold text-purple-700">{fmt(dashboard?.serviceRevenue)}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-300 group-hover:text-purple-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Day columns */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-700">Guest Calendar by Day</h2>
        <p className="text-xs text-gray-400">Click on a guest to view details</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DayColumn label="Yesterday" dateLabel={fmtDay(-1)} data={dashboard?.yesterday} onSelect={setSelectedGuest} />
        <DayColumn label="Today" dateLabel={fmtDay(0)} data={dashboard?.today} onSelect={setSelectedGuest} highlight />
        <DayColumn label="Tomorrow" dateLabel={fmtDay(1)} data={dashboard?.tomorrow} onSelect={setSelectedGuest} />
      </div>

      {/* Guest detail modal */}
      {selectedGuest && (
        <GuestDetailModal
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          navigate={navigate}
        />
      )}

      {/* Revenue detail modal */}
      {revenueModal && (
        <RevenueDetailModal
          category={revenueModal}
          details={dashboard?.revenueDetails || []}
          onClose={() => setRevenueModal(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}

export default Dashboard
