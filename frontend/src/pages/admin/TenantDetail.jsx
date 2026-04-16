import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { ArrowLeft, Edit2, Save, X, CreditCard, ShoppingCart } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '-'

const TenantDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState(null)
  const [summary, setSummary] = useState(null) // contract financial summary
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
      // Fetch contract summary for active contract
      const active = r.data.contracts?.find(c => c.status === 'ACTIVE')
      if (active) {
        const s = await api.get(`/guest-charges/contract/${active.id}/summary`)
        setSummary(s.data)
      } else {
        setSummary(null)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const startEditCheckout = (contract) => { setEditingCheckout(contract.id); setNewCheckoutDate(contract.endDate) }

  const saveCheckout = async (contractId) => {
    setSaving(true)
    try {
      await api.patch(`/contracts/${contractId}/checkout-date`, { endDate: newCheckoutDate })
      setEditingCheckout(null); fetchAll()
    } catch (e) { alert(e.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handlePay = async (e) => {
    e.preventDefault()
    const active = tenant.contracts?.find(c => c.status === 'ACTIVE')
    if (!active) return
    setPaying(true)
    try {
      await api.post(`/payments/contract/${active.id}`, {
        paidAmount: parseFloat(payForm.paidAmount),
        method: payForm.method,
        note: payForm.note,
        transactionCode: payForm.transactionCode,
        paymentDate: payForm.paymentDate ? new Date(payForm.paymentDate).toISOString() : null,
      })
      setShowPayModal(false)
      setPayForm({ paidAmount: '', method: 'CASH', note: '', transactionCode: '', paymentDate: new Date().toISOString().split('T')[0] })
      eventBus.emit(EVENTS.PAYMENT_CHANGED)
      fetchAll()
    } catch (e) { alert(e.response?.data?.message || 'Payment error') }
    finally { setPaying(false) }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!tenant) return <div className="p-8 text-center text-red-500">Guest not found</div>

  const activeContract = tenant.contracts?.find(c => c.status === 'ACTIVE')
  const remaining = summary ? parseFloat(summary.remainingAmount) : 0
  const today = new Date(); today.setHours(0,0,0,0)
  const checkoutDate = activeContract ? new Date(activeContract.endDate + 'T00:00:00') : null
  const daysUntilCheckout = checkoutDate ? Math.round((checkoutDate - today) / 86400000) : null

  return (
    <div>
      <button onClick={() => navigate('/admin/tenants')} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to list
      </button>

      {/* Header + debt summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">{tenant.fullName}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium ml-1">{tenant.phone}</span></div>
            <div><span className="text-gray-500">Email:</span> <span className="font-medium ml-1">{tenant.email || '-'}</span></div>
            <div><span className="text-gray-500">ID Number:</span> <span className="font-medium ml-1">{tenant.identityNumber || '-'}</span></div>
            <div><span className="text-gray-500">Date of Birth:</span> <span className="font-medium ml-1">{fmtDate(tenant.dateOfBirth)}</span></div>
            <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="font-medium ml-1">{tenant.permanentAddress || '-'}</span></div>
          </div>
        </div>

        {/* Debt summary card */}
        <div className={`rounded-lg shadow p-6 ${remaining > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <h3 className="font-semibold text-gray-700 mb-3">Payment Summary</h3>
          {summary ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Room charge:</span>
                <span className="font-medium">{fmt(summary.totalRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Services:</span>
                <span className="font-medium">{fmt(summary.totalCharges)}</span>
              </div>
              {summary.deposit > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Deposit:</span>
                  <span className="font-medium text-blue-600">{fmt(summary.deposit)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700 font-medium border-t pt-1">
                <span>Total:</span>
                <span>{fmt(summary.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid:</span>
                <span className="font-medium text-green-600">{fmt(summary.totalPaid)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Remaining:</span>
                <span className={`font-bold text-lg ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmt(remaining)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No active contract</p>
          )}
          {activeContract && daysUntilCheckout !== null && (
            <div className={`mt-3 pt-3 border-t text-xs text-center font-medium ${
              daysUntilCheckout < 0 ? 'text-red-600' : daysUntilCheckout === 0 ? 'text-orange-600' :
              daysUntilCheckout <= 2 ? 'text-yellow-600' : 'text-gray-500'
            }`}>
              {daysUntilCheckout < 0 ? `⚠️ Overdue by ${Math.abs(daysUntilCheckout)} days` :
               daysUntilCheckout === 0 ? '🔔 Checking out today' :
               daysUntilCheckout === 1 ? '🔔 Checking out tomorrow' :
               `📅 ${daysUntilCheckout} days remaining`}
            </div>
          )}
          {activeContract && remaining > 0 && (
            <button onClick={() => { setPayForm(f => ({...f, paidAmount: remaining.toFixed(0)})); setShowPayModal(true) }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
              <CreditCard className="w-4 h-4" /> Collect Payment ({fmt(remaining)})
            </button>
          )}
          {activeContract && (
            <button onClick={() => navigate(`/admin/guest-charges?contractId=${activeContract.id}`)}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 border border-purple-200">
              <ShoppingCart className="w-4 h-4" /> Add Service
            </button>
          )}
        </div>
      </div>

      {/* Contracts */}
      {tenant.contracts?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Rental Contracts</h2>
          <div className="space-y-3">
            {tenant.contracts.map(c => (
              <div key={c.id} className={`border rounded-lg p-4 ${c.status === 'ACTIVE' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-blue-700">{c.code}</span>
                    <span className="ml-2 text-sm text-gray-600">— Room {c.roomCode}</span>
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      c.status === 'TERMINATED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{c.status}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {c.dailyRate ? `${fmt(c.dailyRate)}/day` : `${fmt(c.monthlyRent)}/month`}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                  <span>Check-in: <strong>{fmtDate(c.startDate)}</strong></span>                  <span className="flex items-center gap-1">
                    Check-out:
                    {editingCheckout === c.id ? (
                      <span className="flex items-center gap-1 ml-1">
                        <input type="date" value={newCheckoutDate}
                          onChange={e => setNewCheckoutDate(e.target.value)}
                          className="px-2 py-0.5 border border-blue-300 rounded text-sm" />
                        <button onClick={() => saveCheckout(c.id)} disabled={saving}
                          className="p-1 text-green-600 hover:text-green-800"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingCheckout(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 ml-1">
                        <strong>{fmtDate(c.endDate)}</strong>
                        {c.status === 'ACTIVE' && (
                          <button onClick={() => startEditCheckout(c)} className="text-blue-400 hover:text-blue-600">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices */}
      {tenant.invoices?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            Invoices ({tenant.totalInvoices}) — Unpaid: <span className="text-red-600">{tenant.unpaidInvoices}</span>
          </h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Invoice Code</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Period</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Total</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase">Remaining</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenant.invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{inv.code}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{inv.periodMonth}/{inv.periodYear}</td>
                  <td className="px-4 py-2 text-sm text-right">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-2 text-sm text-right text-green-600">{fmt(inv.paidAmount)}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium text-red-600">{fmt(inv.remainingAmount)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      inv.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                      inv.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {inv.status !== 'PAID' && (
                      <button onClick={() => { setPayForm(f => ({...f, paidAmount: inv.remainingAmount?.toFixed(0) || ''})); setShowPayModal(true) }}
                        className="text-green-600 hover:text-green-800" title="Thanh toán">
                        <CreditCard className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Collect Payment</h2>
            <p className="text-sm text-gray-500 mb-4">{tenant.fullName} — {activeContract?.roomCode}</p>

            {summary && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">Room charge:</span><span>{fmt(summary.totalRent)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Services:</span><span>{fmt(summary.totalCharges)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Paid:</span><span className="text-green-600">- {fmt(summary.totalPaid)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Remaining:</span><span className="text-red-600">{fmt(summary.remainingAmount)}</span></div>
              </div>
            )}

            <form onSubmit={handlePay} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Amount *</label>
                <input required type="number" min="1000" step="1000"
                  value={payForm.paidAmount}
                  onChange={e => setPayForm(f => ({...f, paidAmount: e.target.value}))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold" />
                {payForm.paidAmount && summary && (
                  <p className="text-xs mt-1 text-gray-500">
                    {parseFloat(payForm.paidAmount) >= parseFloat(summary.remainingAmount)
                      ? '✅ Full payment'
                      : `⚠️ Still owed ${fmt(parseFloat(summary.remainingAmount) - parseFloat(payForm.paidAmount))}`}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Method</label>
                  <select value={payForm.method} onChange={e => setPayForm(f => ({...f, method: e.target.value}))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="MOMO">MoMo</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input type="date" value={payForm.paymentDate}
                    onChange={e => setPayForm(f => ({...f, paymentDate: e.target.value}))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Note</label>
                <input type="text" value={payForm.note}
                  onChange={e => setPayForm(f => ({...f, note: e.target.value}))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPayModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg">Cancel</button>
                <button type="submit" disabled={paying}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                  {paying ? 'Processing...' : 'Confirm'}
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
