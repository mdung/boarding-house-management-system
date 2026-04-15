import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import {
  DoorOpen, Users, DollarSign, AlertCircle, LogIn, LogOut,
  BedDouble, CreditCard, X, ExternalLink, ShoppingCart, Receipt,
  ChevronRight, Edit2, Save, Plus, CalendarDays
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '-'
const toISO = (d) => d ? d.split('T')[0] : ''

const activityBadge = (type) => {
  if (type === 'CHECKIN') return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium"><LogIn className="w-3 h-3" />Nhận phòng</span>
  if (type === 'CHECKOUT') return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full font-medium"><LogOut className="w-3 h-3" />Trả phòng</span>
  return <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium"><BedDouble className="w-3 h-3" />Đang ở</span>
}

// ─── Guest Detail Modal ───────────────────────────────────────────────────────
const GuestDetailModal = ({ guest, onClose, navigate }) => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')
  const [payNote, setPayNote] = useState('')
  const [paying, setPaying] = useState(false)
  const [payResult, setPayResult] = useState(null)

  // Extend checkout state
  const [editingCheckout, setEditingCheckout] = useState(false)
  const [newCheckout, setNewCheckout] = useState('')
  const [extendPreview, setExtendPreview] = useState(null) // { extraNights, extraCost, newTotal }
  const [savingCheckout, setSavingCheckout] = useState(false)

  const fetchSummary = () => {
    setLoading(true)
    api.get(`/guest-charges/contract/${guest.contractId}/summary`)
      .then(r => { setSummary(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchSummary() }, [guest.contractId])

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
      fetchSummary()
      eventBus.emit(EVENTS.PAYMENT_CHANGED)
    } catch (e) { alert(e.response?.data?.message || 'Lỗi khi cập nhật') }
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
      fetchSummary()
      eventBus.emit(EVENTS.PAYMENT_CHANGED)
    } catch (e) { alert(e.response?.data?.message || 'Lỗi khi thanh toán') }
    finally { setPaying(false) }
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
              <p className="text-xs text-gray-400 mb-1">Phòng</p>
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
                    ? `Rút ngắn ${Math.abs(extendPreview.extraNights)} đêm`
                    : `Gia hạn thêm ${extendPreview.extraNights} đêm`}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tổng số đêm mới:</span>
                  <span className="font-medium">{extendPreview.totalNights} đêm × {fmt(summary?.dailyRate)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tiền phòng mới:</span>
                  <span className="font-medium">{fmt(extendPreview.newRoomCost)}</span>
                </div>
                <div className={`flex justify-between font-semibold border-t pt-1 ${extendPreview.isShorten ? 'text-yellow-700' : 'text-blue-700'}`}>
                  <span>{extendPreview.isShorten ? 'Giảm tiền phòng:' : 'Tăng thêm:'}</span>
                  <span>{extendPreview.isShorten ? '-' : '+'}{fmt(Math.abs(extendPreview.extraCost))}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 border-t pt-1">
                  <span>Tổng bill mới:</span>
                  <span>{fmt(extendPreview.newTotal)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { setEditingCheckout(false); setExtendPreview(null) }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Hủy
                </button>
                <button onClick={handleSaveCheckout} disabled={savingCheckout}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${extendPreview.isShorten ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}>
                  <Save className="w-3.5 h-3.5" />
                  {savingCheckout ? 'Đang lưu...' : extendPreview.isShorten ? 'Xác nhận rút ngắn' : 'Xác nhận gia hạn'}
                </button>
              </div>
            </div>
          )}
          {editingCheckout && !extendPreview && newCheckout && (
            <p className="text-xs text-red-500 text-center">Ngày checkout phải sau ngày check-in</p>
          )}

          {/* Financial breakdown */}
          {loading ? (
            <div className="text-center py-4 text-gray-400 text-sm">Đang tải...</div>
          ) : summary ? (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Chi tiết tài chính</div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center"><BedDouble className="w-3.5 h-3.5 text-blue-600" /></div>
                  <div>
                    <p className="text-sm font-medium">Tiền phòng</p>
                    <p className="text-xs text-gray-400">{summary.totalNights} đêm × {fmt(summary.dailyRate)}</p>
                  </div>
                </div>
                <span className="font-semibold">{fmt(summary.totalRent)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center"><ShoppingCart className="w-3.5 h-3.5 text-purple-600" /></div>
                  <div>
                    <p className="text-sm font-medium">Dịch vụ phát sinh</p>
                    <p className="text-xs text-gray-400">{summary.charges?.length || 0} khoản</p>
                  </div>
                </div>
                <span className="font-semibold">{fmt(summary.totalCharges)}</span>
              </div>
              {summary.deposit > 0 && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-yellow-100 rounded-full flex items-center justify-center"><Receipt className="w-3.5 h-3.5 text-yellow-600" /></div>
                    <p className="text-sm font-medium">Tiền cọc</p>
                  </div>
                  <span className="font-semibold text-blue-600">{fmt(summary.deposit)}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Tổng cộng</p>
                <span className="font-bold">{fmt(summary.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center"><CreditCard className="w-3.5 h-3.5 text-green-600" /></div>
                  <p className="text-sm font-medium">Đã thanh toán</p>
                </div>
                <span className="font-semibold text-green-600">- {fmt(summary.totalPaid)}</span>
              </div>
              <div className={`flex justify-between items-center px-4 py-3 ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="font-bold text-gray-800">Còn lại</p>
                <span className={`text-xl font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(remaining)}</span>
              </div>
            </div>
          ) : null}

          {/* Success feedback */}
          {payResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
              <p className="font-semibold text-green-700">✅ Đã ghi nhận {fmt(payResult.amount)}</p>
              {payResult.remaining > 0
                ? <p className="text-green-600 mt-0.5">Còn lại: <strong>{fmt(payResult.remaining)}</strong></p>
                : <p className="text-green-600 mt-0.5">Đã thanh toán đầy đủ 🎉</p>
              }
            </div>
          )}

          {/* Payment form — inline, always visible if debt > 0 */}
          {remaining > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex justify-between items-center">
                <span>Thu tiền</span>
                <span className="text-gray-400 font-normal normal-case">Nhập số tiền khách trả</span>
              </div>
              <form onSubmit={handlePay} className="px-4 py-3 space-y-3">
                {/* Amount input with quick buttons */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Số tiền (VND)</label>
                  <input
                    type="number" min="1000" step="1000"
                    value={payAmount}
                    onChange={e => { setPayAmount(e.target.value); setPayResult(null) }}
                    placeholder={`Tối đa ${fmt(remaining)}`}
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
                        {i === 0 ? 'Đủ' : i === 1 ? '50%' : '25%'} {fmt(Math.round(v))}
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
                    {payStatus === 'over' && `❌ Vượt quá số tiền cần thu (${fmt(remaining)})`}
                    {payStatus === 'full' && `✅ Thanh toán đủ — hóa đơn sẽ được đóng`}
                    {payStatus === 'partial' && `⚠️ Trả một phần — còn lại ${fmt(remaining - payAmt)}`}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Phương thức</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="CASH">💵 Tiền mặt</option>
                      <option value="BANK_TRANSFER">🏦 Chuyển khoản</option>
                      <option value="MOMO">📱 MoMo</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
                    <input type="text" value={payNote} onChange={e => setPayNote(e.target.value)}
                      placeholder="Tùy chọn..."
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
                  {paying ? 'Đang xử lý...' :
                   payStatus === 'full' ? `✅ Thu đủ ${fmt(payAmt)}` :
                   payStatus === 'partial' ? `⚠️ Thu một phần ${fmt(payAmt)}` :
                   'Nhập số tiền để thu'}
                </button>
              </form>
            </div>
          )}

          {remaining <= 0 && summary && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
              <p className="text-green-700 font-semibold">✅ Đã thanh toán đầy đủ</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => { onClose(); navigate(`/admin/guest-charges?contractId=${guest.contractId}`) }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" /> Thêm dịch vụ
          </button>
          <button
            onClick={() => { onClose(); navigate(`/admin/tenants/${guest.tenantId}/detail`) }}
            className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Guest Card ───────────────────────────────────────────────────────────────
const GuestCard = ({ guest, onSelect }) => {
  const debt = parseFloat(guest.totalDebt) || 0
  return (
    <div
      onClick={() => onSelect(guest)}
      className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{guest.tenantName}</p>
          <p className="text-xs text-gray-400">{guest.tenantPhone}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-medium">{guest.roomCode}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {activityBadge(guest.activityType)}
        {debt > 0
          ? <span className="text-xs text-red-600 font-semibold flex items-center gap-0.5"><AlertCircle className="w-3 h-3" />Nợ {fmt(debt)}</span>
          : <span className="text-xs text-green-600 font-medium">✓ Đã TT</span>
        }
      </div>
      <div className="mt-1.5 text-xs text-gray-400">
        {fmtDate(guest.checkInDate)} → {fmtDate(guest.checkOutDate)}
        {guest.totalDays > 0 && <span className="ml-1">({guest.totalDays} đêm × {fmt(guest.dailyRate)})</span>}
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
          {data?.checkIns?.length > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{data.checkIns.length} nhận</span>}
          {data?.checkOuts?.length > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{data.checkOuts.length} trả</span>}
          {data?.staying?.length > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{data.staying.length} đang ở</span>}
          {all.length === 0 && <span className="text-gray-400">Không có khách</span>}
        </div>
      </div>
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
        {data?.checkIns?.map(g => <GuestCard key={`ci-${g.contractId}`} guest={g} onSelect={onSelect} />)}
        {data?.checkOuts?.map(g => <GuestCard key={`co-${g.contractId}`} guest={g} onSelect={onSelect} />)}
        {data?.staying?.map(g => <GuestCard key={`st-${g.contractId}`} guest={g} onSelect={onSelect} />)}
        {all.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Không có hoạt động</p>}
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

  const fetchDashboard = () => {
    api.get('/dashboard').then(r => setDashboard(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { fetchDashboard() }, [])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchDashboard) }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>

  const today = new Date()
  const fmtDay = (offset) => {
    const d = new Date(today); d.setDate(d.getDate() + offset)
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })
  }

  const stats = [
    { label: 'Tổng phòng', value: dashboard?.totalRooms || 0, icon: DoorOpen, color: 'bg-blue-500', link: '/admin/rooms' },
    { label: 'Đang có khách', value: dashboard?.occupiedRooms || 0, icon: Users, color: 'bg-green-500', link: '/admin/tenants' },
    { label: 'Phòng trống', value: dashboard?.availableRooms || 0, icon: DoorOpen, color: 'bg-gray-400', link: '/admin/rooms' },
    { label: 'Doanh thu tháng', value: fmt(dashboard?.monthlyRevenue), icon: DollarSign, color: 'bg-emerald-600', link: '/admin/reports' },
    { label: 'Chưa thanh toán', value: fmt(dashboard?.unpaidAmount), icon: DollarSign, color: 'bg-yellow-500', link: '/admin/invoices' },
    { label: 'HĐ quá hạn', value: dashboard?.overdueInvoices || 0, icon: AlertCircle, color: 'bg-red-500', link: '/admin/invoices' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
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

      {/* Day columns */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-700">Lịch khách theo ngày</h2>
        <p className="text-xs text-gray-400">Click vào khách để xem chi tiết</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DayColumn label="Hôm qua" dateLabel={fmtDay(-1)} data={dashboard?.yesterday} onSelect={setSelectedGuest} />
        <DayColumn label="Hôm nay" dateLabel={fmtDay(0)} data={dashboard?.today} onSelect={setSelectedGuest} highlight />
        <DayColumn label="Ngày mai" dateLabel={fmtDay(1)} data={dashboard?.tomorrow} onSelect={setSelectedGuest} />
      </div>

      {/* Guest detail modal */}
      {selectedGuest && (
        <GuestDetailModal
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}

export default Dashboard
