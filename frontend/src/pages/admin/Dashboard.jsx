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

const activityBadge = (type, roomReleased) => {
  if (roomReleased) return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full font-medium"><LogOut className="w-3 h-3" />Checked Out</span>
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
              {activityBadge(guest.activityType, guest.roomReleased)}
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
                    type="number" min="1" step="1"
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
  const isExpired = guest.contractStatus === 'EXPIRED' || guest.contractStatus === 'TERMINATED' || guest.roomReleased
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
        {activityBadge(guest.activityType, guest.roomReleased)}
        {debt > 0
          ? <span className="text-xs text-red-600 font-semibold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />Debt {fmt(debt)}</span>
          : <span className="text-xs text-green-600 font-medium">✓ Paid</span>
        }
      </div>
      <div className="mt-1.5 text-xs text-gray-400">
        {fmtDate(guest.checkInDate)} → {fmtDate(guest.checkOutDate)}
        {guest.totalDays > 0 && <span className="ml-1">({guest.totalDays} nights × {fmt(guest.dailyRate)})</span>}
        {parseFloat(guest.totalCharges) > 0 && (
          <span className="ml-1 text-purple-500">+ {fmt(guest.totalCharges)} services</span>
        )}
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
  const [expandedDates, setExpandedDates] = useState({})  // date → Set of active service filters
  const [animIn, setAnimIn] = useState(false)
  const isRent = category === 'RENT'

  useEffect(() => {
    requestAnimationFrame(() => setAnimIn(true))
  }, [])

  const filtered = details.filter(d => d.category === category)
  const grandTotal = filtered.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)

  // Group all items by date, sorted newest first
  const byDate = {}
  filtered.forEach(d => { if (!byDate[d.date]) byDate[d.date] = []; byDate[d.date].push(d) })
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  // Auto-expand all dates on open
  useEffect(() => {
    const init = {}
    sortedDates.forEach(d => { init[d] = false })  // collapsed by default
    setExpandedDates(init)
  }, [filtered.length])

  // Per-date active service filter (null = all)
  const [dateServiceFilter, setDateServiceFilter] = useState({})

  const toggleDate = (date) => setExpandedDates(p => ({ ...p, [date]: !p[date] }))
  const toggleServiceFilter = (date, svc) => {
    setDateServiceFilter(p => ({ ...p, [date]: p[date] === svc ? null : svc }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col transition-all duration-300
          ${animIn ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`px-6 py-5 rounded-t-3xl flex items-center justify-between ${isRent ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-violet-500 to-purple-600'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              {isRent ? <BedDouble className="w-5 h-5 text-white" /> : <Receipt className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{isRent ? 'Room Revenue' : 'Service Revenue'}</h2>
              <p className="text-white/70 text-xs font-medium">{filtered.length} items · {fmt(grandTotal)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedDates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <Receipt className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-bold">No data</p>
            </div>
          )}
          {sortedDates.map((date, dateIdx) => {
            const dayItems = byDate[date]
            const dayTotal = dayItems.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)
            const isOpen = expandedDates[date]
            const activeSvc = dateServiceFilter[date] || null

            // Service chips for this day
            const svcsInDay = !isRent ? [...new Set(dayItems.map(d => d.description))].sort() : []
            const svcTotals = {}
            svcsInDay.forEach(svc => {
              svcTotals[svc] = dayItems.filter(d => d.description === svc).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)
            })

            // Items to show (filtered by active service if any)
            const visibleItems = activeSvc ? dayItems.filter(d => d.description === activeSvc) : dayItems
            const visibleTotal = visibleItems.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)

            return (
              <div key={date} className={`border border-slate-100 rounded-2xl overflow-hidden shadow-sm ${dateIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                {/* Day header — click to expand/collapse */}
                <button onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${isRent ? 'bg-blue-100' : 'bg-violet-100'}`}>
                      <CalendarDays className={`w-3.5 h-3.5 ${isRent ? 'text-blue-600' : 'text-violet-600'}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800">{fmtDate(date)}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{dayItems.length} item{dayItems.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${isRent ? 'text-blue-600' : 'text-violet-600'}`}>{fmt(dayTotal)}</span>
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-slate-50">
                    {/* Service filter chips — only for SERVICE category */}
                    {!isRent && svcsInDay.length > 1 && (
                      <div className="px-4 py-2.5 flex gap-1.5 flex-wrap border-b border-slate-50 bg-slate-50/50">
                        <button onClick={() => setDateServiceFilter(p => ({ ...p, [date]: null }))}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${!activeSvc ? (isRent ? 'bg-blue-600 text-white' : 'bg-violet-600 text-white') : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                          All · {fmt(dayTotal)}
                        </button>
                        {svcsInDay.map(svc => (
                          <button key={svc} onClick={() => toggleServiceFilter(date, svc)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${activeSvc === svc ? (isRent ? 'bg-blue-600 text-white' : 'bg-violet-600 text-white') : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                            {svc} · {fmt(svcTotals[svc])}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Items */}
                    <div className="p-3 space-y-1.5">
                      {visibleItems.map((item, i) => (
                        <div key={`${item.invoiceCode}-${i}`}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group ${i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/70 hover:bg-slate-100'}`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isRent ? 'bg-blue-100' : 'bg-violet-100'}`}>
                              {isRent ? <BedDouble className="w-3.5 h-3.5 text-blue-600" /> : <Receipt className="w-3.5 h-3.5 text-violet-600" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{item.description}</p>
                              <p className="text-[10px] text-slate-400 truncate">{item.roomCode} · {item.tenantName}</p>
                              {!isRent && item.quantity && item.unitPrice && (
                                <p className="text-[10px] text-slate-300">{item.quantity} × {fmt(item.unitPrice)}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            <p className={`text-sm font-black ${isRent ? 'text-blue-700' : 'text-violet-700'}`}>{fmt(item.amount)}</p>
                            {item.invoiceId && (
                              <button onClick={() => { onClose(); navigate(`/admin/invoices/${item.invoiceId}/detail`) }}
                                className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Day subtotal (when filtered) */}
                    {activeSvc && (
                      <div className={`mx-3 mb-3 px-3 py-2 rounded-xl flex justify-between items-center ${isRent ? 'bg-blue-50' : 'bg-violet-50'}`}>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isRent ? 'text-blue-400' : 'text-violet-400'}`}>{activeSvc} · {fmtDate(date)}</span>
                        <span className={`text-sm font-black ${isRent ? 'text-blue-700' : 'text-violet-700'}`}>{fmt(visibleTotal)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 rounded-b-3xl bg-slate-50/60 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</p>
          <p className={`text-xl font-black ${isRent ? 'text-blue-700' : 'text-violet-700'}`}>{fmt(grandTotal)}</p>
        </div>
      </div>
    </div>
  )
}

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

  const [widgets, setWidgets] = useState([])
  const [draggedIdx, setDraggedIdx] = useState(null)

  useEffect(() => {
    if (dashboard) {
      setWidgets([
        { id: 'rooms', label: 'Total Rooms', value: dashboard.totalRooms || 0, icon: DoorOpen, color: 'bg-blue-500', link: '/admin/rooms' },
        { id: 'occupied', label: 'Occupied', value: dashboard.occupiedRooms || 0, icon: Users, color: 'bg-green-500', link: '/admin/tenants' },
        { id: 'available', label: 'Available', value: dashboard.availableRooms || 0, icon: DoorOpen, color: 'bg-gray-400', link: '/admin/rooms' },
        { id: 'unpaid', label: 'Unpaid', value: fmt(dashboard.unpaidAmount), icon: DollarSign, color: 'bg-yellow-500', link: '/admin/tenants' },
        { id: 'overdue', label: 'Overdue Invoices', value: dashboard.overdueInvoices || 0, icon: AlertCircle, color: 'bg-red-500', link: '/admin/invoices?status=PAST_DUE' },
        { id: 'inventory', label: 'Low Stock', value: dashboard.lowStockItems || 0, icon: Package, color: dashboard.lowStockItems > 0 ? 'bg-red-500' : 'bg-gray-400', link: '/admin/inventory' },
      ])
    }
  }, [dashboard])

  const handleDragStart = (idx) => setDraggedIdx(idx)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (idx) => {
    if (draggedIdx === null) return
    const newWidgets = [...widgets]
    const draggedItem = newWidgets[draggedIdx]
    newWidgets.splice(draggedIdx, 1)
    newWidgets.splice(idx, 0, draggedItem)
    setWidgets(newWidgets)
    setDraggedIdx(null)
  }

  if (loading) return (
    <div className="p-8 text-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-400 font-medium">Loading your intelligence...</p>
    </div>
  )

  const today = new Date()
  const fmtDay = (offset) => {
    const d = new Date(today); d.setDate(d.getDate() + offset)
    return d.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-10 sm:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">Intelligence Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">Welcome back, Admin. Here's your boarding house status.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-600">{new Date().toLocaleDateString('vi-VN', { dateStyle: 'full' })}</span>
        </div>
      </div>

      {/* Reorderable Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {widgets.map((s, i) => {
          const Icon = s.icon
          return (
            <div 
              key={s.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
              onClick={() => navigate(s.link)}
              className={`relative bg-white/70 backdrop-blur-md border border-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 cursor-move transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-95 group overflow-hidden ${draggedIdx === i ? 'opacity-40 grayscale' : ''}`}
            >
              {/* Decorative background element */}
              <div className={`absolute -right-4 -top-4 w-12 h-12 sm:w-16 sm:h-16 rounded-full opacity-10 transition-transform group-hover:scale-150 duration-500 ${s.color}`} />
              
              <div className={`${s.color} w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-current/20`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{s.label}</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 truncate">{s.value}</p>
              
              {/* Grab handle hint */}
              <div className="absolute bottom-3 right-5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 bg-slate-200 rounded-full" />
                  <div className="w-1 h-1 bg-slate-200 rounded-full" />
                  <div className="w-1 h-1 bg-slate-200 rounded-full" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Revenue breakdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div onClick={() => setRevenueModal('RENT')}
          className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 cursor-pointer hover:shadow-2xl hover:shadow-blue-200 transition-all duration-500 group overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <BedDouble className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-200 font-medium">Room Revenue This Month</p>
                <p className="text-2xl font-bold text-white">{fmt(dashboard?.roomRevenue)}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-200 group-hover:text-white transition-colors" />
          </div>
        </div>
        <div onClick={() => setRevenueModal('SERVICE')}
          className="relative bg-gradient-to-br from-purple-600 to-pink-600 rounded-[2.5rem] p-8 cursor-pointer hover:shadow-2xl hover:shadow-purple-200 transition-all duration-500 group overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-200 font-medium">Service Revenue This Month</p>
                <p className="text-2xl font-bold text-white">{fmt(dashboard?.serviceRevenue)}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" />
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
