import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import AddGuestModal from '../../components/AddGuestModal'
import BillPrintModal from '../../components/BillPrintModal'
import { useProperty } from '../../context/PropertyContext'
import {
  DoorOpen, Users, DollarSign, AlertCircle, LogIn, LogOut,
  BedDouble, CreditCard, X, ExternalLink, ShoppingCart, Receipt,
  ChevronRight, ChevronLeft, ChevronDown, Edit2, Save, Plus, CalendarDays, Package, Printer
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

  // Add Service Charge inline state
  const [showAddService, setShowAddService] = useState(false)
  const [catalog, setCatalog] = useState([])
  const [serviceTypes, setServiceTypes] = useState([])
  const [svcTab, setSvcTab] = useState('catalog')
  const [svcForm, setSvcForm] = useState({ chargeDate: new Date().toISOString().split('T')[0], catalogId: null, description: '', quantity: '1', unitPrice: '', note: '' })
  const [savingService, setSavingService] = useState(false)
  const [svcSuccess, setSvcSuccess] = useState(null)
  const [showBill, setShowBill] = useState(false)

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
  useEffect(() => {
    // Always pass boardingHouseId so catalog is filtered per property
    // If boardingHouseId is missing, fall back to global items only
    const bhParam = guest.boardingHouseId ? `?boardingHouseId=${guest.boardingHouseId}` : ''
    api.get(`/service-catalog${bhParam}`).then(r => setCatalog(r.data || [])).catch(() => {})
    api.get(`/service-types${bhParam}`).then(r => setServiceTypes(r.data || [])).catch(() => {})
  }, [guest.boardingHouseId, guest.contractId])
  const handleAddService = async (e) => {
    e.preventDefault()
    if (!svcForm.description.trim() || !svcForm.unitPrice) return
    setSavingService(true)
    try {
      await api.post('/guest-charges', {
        contractId: guest.contractId,
        catalogId: svcForm.catalogId || undefined,
        chargeDate: svcForm.chargeDate,
        description: svcForm.description,
        quantity: parseFloat(svcForm.quantity),
        unitPrice: parseFloat(svcForm.unitPrice),
        note: svcForm.note
      })
      setSvcSuccess(svcForm.description)
      setSvcForm({ chargeDate: new Date().toISOString().split('T')[0], catalogId: null, description: '', quantity: '1', unitPrice: '', note: '' })
      fetchAll()
      // Reload catalog to update stock quantities
      const bhParam = guest.boardingHouseId ? `?boardingHouseId=${guest.boardingHouseId}` : ''
      api.get(`/service-catalog${bhParam}`).then(r => setCatalog(r.data || [])).catch(() => {})
      eventBus.emit(EVENTS.PAYMENT_CHANGED)
      setTimeout(() => setSvcSuccess(null), 2500)
    } catch (e) { alert(e.response?.data?.message || 'Failed to add charge') }
    finally { setSavingService(false) }
  }

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
    <div className="fixed inset-0 z-50 modal-fix bg-black/50 p-4">
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
              onClick={() => setShowAddService(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" /> Add Service
            </button>
          )}
          {summary && (
            <button
              onClick={() => setShowBill(true)}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
              title="In phiếu thanh toán"
            >
              <Printer className="w-4 h-4" />
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

        {/* Add Service Charge Modal */}
        {showAddService && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center z-10 p-3 animate-in fade-in duration-200" onClick={() => setShowAddService(false)}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-5 pt-5 pb-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Add Service Charge</h3>
                    <p className="text-[11px] text-slate-400">{guest.tenantName} · Room {guest.roomCode}</p>
                  </div>
                </div>
                <button onClick={() => setShowAddService(false)} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {/* Success toast */}
              {svcSuccess && (
                <div className="mx-5 mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 animate-in slide-in-from-top duration-300">
                  ✅ Added "{svcSuccess}" successfully
                </div>
              )}

              {/* Tabs: Catalog / Service Types / Custom */}
              <div className="px-5 pt-4 flex gap-1.5">
                {[['catalog', '📋 Catalog'], ['types', '⚡ Service Types'], ['custom', '✏️ Custom']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setSvcTab(key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${svcTab === key ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddService} className="p-5 space-y-4 max-h-[55vh] overflow-y-auto">
                {/* Service Catalog tab */}
                {svcTab === 'catalog' && catalog.length > 0 && (
                  <div className="space-y-3">
                    {(() => {
                      const groups = {}
                      catalog.filter(c => c.isActive !== false).forEach(c => {
                        const cat = c.category || 'OTHER'
                        if (!groups[cat]) groups[cat] = []
                        groups[cat].push(c)
                      })
                      return Object.entries(groups).map(([cat, items]) => (
                        <div key={cat}>
                          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                            {cat === 'FOOD_DRINK' ? '🍺 Food & Drink' : cat === 'SERVICE' ? '🛵 Service' : cat}
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {items.map(item => (
                              <button key={item.id} type="button"
                                onClick={() => setSvcForm(f => ({ ...f, catalogId: item.id, description: item.name, unitPrice: item.defaultPrice?.toString() || '' }))}
                                className={`p-3 rounded-lg border text-center transition-all duration-150 hover:scale-[1.02] ${svcForm.description === item.name ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'}`}>
                                <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{fmt(item.defaultPrice)}</p>
                                {item.unit && <p className="text-[9px] text-slate-300 mt-0.5">per {item.unit}</p>}
                                {item.stockQuantity != null && (
                                  <p className={`text-[9px] font-black mt-1 ${parseFloat(item.stockQuantity) <= 0 ? 'text-rose-500' : parseFloat(item.stockQuantity) <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                                    📦 {item.stockQuantity} {item.stockUnit || ''}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    })()}
                    {catalog.filter(c => c.isActive !== false).length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No catalog items available</p>
                    )}
                  </div>
                )}
                {svcTab === 'catalog' && catalog.length === 0 && (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs text-slate-400">No catalog items for this property.</p>
                    <p className="text-[10px] text-slate-300">Go to <strong>Service Catalog</strong> settings to add items for <strong>{guest.boardingHouseName}</strong>.</p>
                  </div>
                )}

                {/* Service Types tab */}
                {svcTab === 'types' && (
                  <div className="space-y-2">
                    {serviceTypes.filter(s => s.isActive !== false).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No service types. Add them in Service Types settings.</p>
                    ) : (
                      serviceTypes.filter(s => s.isActive !== false).map(st => (
                        <button key={st.id} type="button"
                          onClick={() => setSvcForm(f => ({ ...f, catalogId: null, description: st.name, unitPrice: st.pricePerUnit?.toString() || '' }))}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-150 text-left ${svcForm.description === st.name ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                              st.category === 'ELECTRICITY' ? 'bg-amber-50 text-amber-600' :
                              st.category === 'WATER' ? 'bg-blue-50 text-blue-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {st.category === 'ELECTRICITY' ? '⚡' : st.category === 'WATER' ? '💧' : '📦'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{st.name}</p>
                              <p className="text-[10px] text-slate-400">{st.category} · {st.unit || 'unit'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-700">{fmt(st.pricePerUnit)}</p>
                            <p className="text-[9px] text-slate-400">/{st.unit || 'unit'}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Custom tab — just shows the form directly */}
                {svcTab === 'custom' && (
                  <p className="text-[10px] text-slate-400 font-semibold">Enter custom service details below</p>
                )}

                {/* Form fields — always visible */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Date</label>
                      <input type="date" required value={svcForm.chargeDate} onChange={e => setSvcForm(f => ({...f, chargeDate: e.target.value}))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Description</label>
                      <input type="text" required value={svcForm.description} onChange={e => setSvcForm(f => ({...f, description: e.target.value}))}
                        placeholder="e.g. Beer, Electricity..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Quantity</label>
                      <input type="number" required min="1" step="1" value={svcForm.quantity} onChange={e => setSvcForm(f => ({...f, quantity: e.target.value}))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Unit Price (VND)</label>
                      <input type="number" required min="0" step="1" value={svcForm.unitPrice} onChange={e => setSvcForm(f => ({...f, unitPrice: e.target.value}))}
                        placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" />
                    </div>
                  </div>

                  {/* Total preview */}
                  {svcForm.quantity && svcForm.unitPrice && parseFloat(svcForm.unitPrice) > 0 && (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-lg animate-in fade-in duration-200">
                      <span className="text-xs font-semibold text-purple-700">Total</span>
                      <span className="text-lg font-extrabold text-purple-700">{fmt(parseFloat(svcForm.quantity) * parseFloat(svcForm.unitPrice))}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Note (Optional)</label>
                    <input type="text" value={svcForm.note} onChange={e => setSvcForm(f => ({...f, note: e.target.value}))}
                      placeholder="Additional notes..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAddService(false)}
                    className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">Done</button>
                  <button type="submit" disabled={savingService || !svcForm.description || !svcForm.unitPrice}
                    className="flex-1 px-3 py-2.5 rounded-lg text-[12.5px] font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 shadow-sm transition-all active:scale-[0.98]">
                    {savingService ? 'Adding...' : 'Add & Continue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bill Print Modal */}
        {showBill && summary && (
          <BillPrintModal
            summary={{ ...summary, tenantPhone: guest.tenantPhone, boardingHouseName: guest.boardingHouseName, contractCode: summary.contractCode || guest.contractId }}
            onClose={() => setShowBill(false)}
          />
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
    <div className="fixed inset-0 z-50 modal-fix bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
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
  const { selectedId: propertyId } = useProperty()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState(null)
  const [revenueModal, setRevenueModal] = useState(null)
  const [centerOffset, setCenterOffset] = useState(0)
  const [extraDays, setExtraDays] = useState({})
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [monthlyExpenseTotal, setMonthlyExpenseTotal] = useState(0)

  const fetchDashboard = () => {
    const params = propertyId !== 'ALL' ? { boardingHouseId: propertyId } : {}
    api.get('/dashboard', { params }).then(r => setDashboard(r.data)).catch(console.error).finally(() => setLoading(false))
    // Fetch monthly expense total
    const now = new Date()
    const expParams = { month: now.getMonth() + 1, year: now.getFullYear() }
    if (propertyId !== 'ALL') expParams.boardingHouseId = propertyId
    api.get('/monthly-expenses/summary', { params: expParams }).then(r => setMonthlyExpenseTotal(parseFloat(r.data?.total || 0))).catch(() => {})
  }

  useEffect(() => { fetchDashboard() }, [propertyId])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchDashboard) }, [propertyId])

  // Clear extra days cache when property changes
  useEffect(() => { setExtraDays({}) }, [propertyId])

  // Fetch a specific day by offset from today
  const fetchDay = (offset) => {
    if (offset >= -1 && offset <= 1) return  // already in dashboard data
    setExtraDays(prev => {
      if (prev[offset] !== undefined) return prev  // already fetched or fetching
      const d = new Date(); d.setDate(d.getDate() + offset)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const params = { date: dateStr }
      if (propertyId !== 'ALL') params.boardingHouseId = propertyId
      api.get(`/dashboard/day`, { params })
        .then(r => setExtraDays(p => ({ ...p, [offset]: r.data })))
        .catch(console.error)
      return { ...prev, [offset]: null }  // null = loading
    })
  }

  // When center changes, prefetch neighbors
  useEffect(() => {
    fetchDay(centerOffset)
    fetchDay(centerOffset + 1)
    fetchDay(centerOffset + 2)
  }, [centerOffset])

  const getDayData = (offset) => {
    if (offset === -1) return dashboard?.yesterday
    if (offset === 0)  return dashboard?.today
    if (offset === 1)  return dashboard?.tomorrow
    return extraDays[offset] || null  // null = loading, undefined = not fetched yet
  }

  const navTo = (delta) => setCenterOffset(o => o + delta)
  const goToday = () => setCenterOffset(0)

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
  const offsetToDate = (offset) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d }
  const fmtDay = (offset) => offsetToDate(offset).toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: '2-digit' })
  const offsetLabel = (offset) => {
    if (offset === 0) return 'Today'
    if (offset === -1) return 'Yesterday'
    if (offset === 1) return 'Tomorrow'
    if (offset < 0) return `${Math.abs(offset)} days ago`
    return `In ${offset} days`
  }

  // Guests with debt — from backend (consistent with unpaidAmount)
  const debtGuests = (dashboard?.outstandingDebts || [])
    .filter(g => parseFloat(g.totalDebt) > 0)
    .sort((a, b) => parseFloat(b.totalDebt) - parseFloat(a.totalDebt))

  // Mini calendar helpers
  const calToday = new Date()
  const calYear = calToday.getFullYear()
  const calMonth = calToday.getMonth()
  const calFirstDay = new Date(calYear, calMonth, 1).getDay()
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const calMonthName = calToday.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Build calendar event map from today/yesterday/tomorrow data
  const calendarEvents = {}
  const todayData = getDayData(0)
  const yesterdayData = getDayData(-1)
  const tomorrowData = getDayData(1)
  const markDay = (data, offset) => {
    if (!data) return
    const d = new Date(calToday)
    d.setDate(d.getDate() + offset)
    const dayNum = d.getDate()
    if (d.getMonth() === calMonth) {
      if (!calendarEvents[dayNum]) calendarEvents[dayNum] = []
      if (data.checkIns?.length > 0) calendarEvents[dayNum].push('checkin')
      if (data.checkOuts?.length > 0) calendarEvents[dayNum].push('checkout')
      if (data.staying?.length > 0) calendarEvents[dayNum].push('staying')
    }
  }
  markDay(yesterdayData, -1)
  markDay(todayData, 0)
  markDay(tomorrowData, 1)

  // Room map data from dashboard
  const roomMap = dashboard?.roomMap || []

  return (
    <div className="max-w-[1440px] mx-auto space-y-5 animate-in fade-in duration-500 pb-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-extrabold text-slate-900">Good morning, Admin 👋</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Today: {todayData?.checkIns?.length || 0} check-in{(todayData?.checkIns?.length || 0) !== 1 ? 's' : ''}, {todayData?.checkOuts?.length || 0} check-out{(todayData?.checkOuts?.length || 0) !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/invoices')}
            className="px-3.5 py-2 text-[12.5px] font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Export Report
          </button>
          <button
            onClick={() => setShowAddGuest(true)}
            className="px-3.5 py-2 text-[12.5px] font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Guest
          </button>
        </div>
      </div>

      {/* ── Stat Cards (4 in a row) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Room Revenue */}
        <div
          onClick={() => setRevenueModal('RENT')}
          className="relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:shadow-blue-200/50 transition-all group overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <BedDouble className="w-4 h-4 text-white" />
              </div>
              <ChevronRight className="w-4 h-4 text-white/50 ml-auto group-hover:text-white/80 transition-colors" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">Room Revenue</p>
            <p className="text-[28px] font-extrabold tracking-tight text-white leading-tight">{fmt(dashboard?.roomRevenue)}</p>
            <p className="text-[10px] text-blue-200 mt-1">This month</p>
          </div>
        </div>

        {/* Service Revenue */}
        <div
          onClick={() => setRevenueModal('SERVICE')}
          className="relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 cursor-pointer hover:shadow-lg hover:shadow-purple-200/50 transition-all group overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <ChevronRight className="w-4 h-4 text-white/50 ml-auto group-hover:text-white/80 transition-colors" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-100">Service Revenue</p>
            <p className="text-[28px] font-extrabold tracking-tight text-white leading-tight">{fmt(dashboard?.serviceRevenue)}</p>
            <p className="text-[10px] text-purple-200 mt-1">This month</p>
          </div>
        </div>

        {/* Unpaid / Outstanding */}
        <div
          onClick={() => navigate('/admin/tenants')}
          className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-rose-400"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Outstanding</p>
          <p className="text-[28px] font-extrabold tracking-tight text-rose-500 leading-tight">{fmt(dashboard?.unpaidAmount)}</p>
          <div className="flex items-center gap-2 mt-1">
            {(dashboard?.overdueInvoices || 0) > 0 && (
              <span className="text-[10.5px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                {dashboard.overdueInvoices} overdue
              </span>
            )}
            {(dashboard?.lowStockItems || 0) > 0 && (
              <span className="text-[10.5px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {dashboard.lowStockItems} low stock
              </span>
            )}
          </div>
        </div>

        {/* Monthly Expenses */}
        <div
          onClick={() => navigate('/admin/monthly-expenses')}
          className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all border-l-4 border-l-pink-400"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-pink-500" />
            </div>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Chi phí tháng</p>
          <p className="text-[28px] font-extrabold tracking-tight text-pink-500 leading-tight">{fmt(monthlyExpenseTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Tháng này</p>
        </div>
      </div>

      {/* ── Debt Alert Bar ── */}
      {debtGuests.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl shadow-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="text-[12.5px] font-semibold text-rose-700">{debtGuests.length} guest{debtGuests.length > 1 ? 's' : ''} with outstanding debt</span>
            <span className="ml-auto text-[12.5px] font-extrabold text-rose-600">{fmt(debtGuests.reduce((s,g) => s + parseFloat(g.totalDebt||0), 0))}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {debtGuests.map(g => {
              const overdueDays = g.overdueDays || 0
              return (
                <button key={g.contractId} onClick={() => setSelectedGuest(g)}
                  className="flex items-center gap-2.5 px-3 py-2 bg-white border border-rose-200 rounded-lg hover:border-rose-400 hover:shadow-sm transition-all text-left">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-extrabold text-rose-600">{g.tenantName?.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{g.tenantName}</p>
                    <p className="text-[10px] text-slate-400">Room {g.roomCode}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 ml-1">
                    <span className="text-xs font-extrabold text-rose-600">{fmt(g.totalDebt)}</span>
                    {overdueDays > 0 && (
                      <span className="text-[10.5px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full mt-0.5">
                        {overdueDays}d overdue
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Day Navigator ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-800">Guest Calendar by Day</h2>
          <div className="flex items-center gap-2">
            {centerOffset !== 0 && (
              <button onClick={goToday}
                className="px-3 py-1.5 text-[12.5px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                Today
              </button>
            )}
            <button onClick={() => navTo(-1)}
              className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all">
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <button onClick={() => navTo(1)}
              className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-all">
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(delta => {
            const offset = centerOffset + delta
            const isCenter = delta === 0
            const data = getDayData(offset)
            const isLoading = offset < -1 || offset > 1 ? extraDays[offset] === null : false
            return (
              <div key={offset} className={`transition-all duration-300 ${isLoading ? 'opacity-50' : ''}`}>
                {isLoading ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 flex items-center justify-center shadow-sm">
                    <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <DayColumn
                    label={offsetLabel(offset)}
                    dateLabel={fmtDay(offset)}
                    data={data}
                    onSelect={setSelectedGuest}
                    highlight={isCenter && centerOffset === 0}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Calendar + Today Sidebar (2-column) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* LEFT: Mini Calendar */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800">{calMonthName}</h3>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-green-600"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Check-in</span>
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Check-out</span>
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Staying</span>
            </div>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: calFirstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14" />
            ))}
            {Array.from({ length: calDaysInMonth }).map((_, i) => {
              const day = i + 1
              const isToday = day === calToday.getDate()
              const events = calendarEvents[day] || []
              return (
                <div
                  key={day}
                  className={`h-14 rounded-lg p-1 text-center relative transition-colors ${
                    isToday ? 'bg-blue-50 border-2 border-blue-300' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-semibold ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>{day}</span>
                  {events.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-1 flex-wrap">
                      {events.includes('checkin') && <span className="w-4 h-1.5 rounded-full bg-green-400" />}
                      {events.includes('checkout') && <span className="w-4 h-1.5 rounded-full bg-amber-400" />}
                      {events.includes('staying') && <span className="w-4 h-1.5 rounded-full bg-blue-400" />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Today + Outstanding Debts */}
        <div className="space-y-4">
          {/* Today Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" /> Today
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <LogIn className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Check-ins</span>
                </div>
                <span className="text-sm font-extrabold text-green-700">{todayData?.checkIns?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700">Check-outs</span>
                </div>
                <span className="text-sm font-extrabold text-amber-700">{todayData?.checkOuts?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">Staying</span>
                </div>
                <span className="text-sm font-extrabold text-blue-700">{todayData?.staying?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Outstanding Debts Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" /> Outstanding Debts
              {debtGuests.length > 0 && (
                <span className="text-[10.5px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full ml-auto">
                  {debtGuests.length}
                </span>
              )}
            </h3>
            {debtGuests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No outstanding debts</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {debtGuests.slice(0, 8).map(g => (
                  <button
                    key={g.contractId}
                    onClick={() => setSelectedGuest(g)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg hover:border-rose-300 transition-all text-left"
                  >
                    <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-extrabold text-rose-600">{g.tenantName?.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{g.tenantName}</p>
                      <p className="text-[10px] text-slate-400">Room {g.roomCode}</p>
                    </div>
                    <span className="text-xs font-extrabold text-rose-600 flex-shrink-0">{fmt(g.totalDebt)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Room Map ── */}
      {roomMap.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800">Room Map</h3>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-green-600"><span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300 inline-block" /> Available</span>
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-blue-600"><span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300 inline-block" /> Occupied</span>
              <span className="flex items-center gap-1 text-[10.5px] font-bold text-amber-600"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300 inline-block" /> Maintenance</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {roomMap.map(room => {
              const status = room.status?.toUpperCase()
              const isOccupied = status === 'OCCUPIED'
              const isMaintenance = status === 'MAINTENANCE'
              const colorClasses = isMaintenance
                ? 'bg-amber-50 border-amber-200 hover:border-amber-400'
                : isOccupied
                ? 'bg-blue-50 border-blue-200 hover:border-blue-400'
                : 'bg-green-50 border-green-200 hover:border-green-400'
              return (
                <div
                  key={room.id || room.roomCode}
                  onClick={() => navigate('/admin/rooms')}
                  className={`border rounded-xl p-3 cursor-pointer transition-all hover:shadow-sm ${colorClasses}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-extrabold ${isMaintenance ? 'text-amber-700' : isOccupied ? 'text-blue-700' : 'text-green-700'}`}>
                      {room.roomCode}
                    </span>
                    <span className={`text-[10.5px] font-bold rounded-full px-1.5 py-0.5 ${
                      isMaintenance ? 'bg-amber-100 text-amber-600' : isOccupied ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {isMaintenance ? 'Maint.' : isOccupied ? 'In Use' : 'Free'}
                    </span>
                  </div>
                  {isOccupied && room.tenantName && (
                    <p className="text-[11px] text-slate-600 truncate">{room.tenantName}</p>
                  )}
                  {room.dailyRate > 0 && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmt(room.dailyRate)}/night</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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

      {/* Add Guest modal */}
      {showAddGuest && (
        <AddGuestModal
          onClose={() => setShowAddGuest(false)}
          onSuccess={() => { fetchDashboard(); setShowAddGuest(false) }}
        />
      )}
    </div>
  )
}

export default Dashboard
