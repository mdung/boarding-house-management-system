import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { Plus, DollarSign } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US') : '-'

const methodLabel = { CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', MOMO: 'MoMo', OTHER: 'Other' }

const Payments = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [allInvoices, setAllInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [formData, setFormData] = useState({
    invoiceId: '',
    paidAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'CASH',
    note: '',
    transactionCode: '',
  })

  useEffect(() => { fetchData() }, [])

  // Auto-open modal if ?invoiceId= is in URL (from other pages)
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId')
    if (invoiceId && invoices.length > 0) {
      const inv = invoices.find(i => i.id.toString() === invoiceId)
      if (inv) {
        openPaymentModal(inv)
        setSearchParams({}, { replace: true })
      }
    }
  }, [invoices, searchParams])

  const fetchData = async () => {
    try {
      const [paymentsRes, invoicesRes] = await Promise.all([
        api.get('/payments'),
        api.get('/invoices'),
      ])
      setPayments(paymentsRes.data)
      setAllInvoices(invoicesRes.data)
      setInvoices(invoicesRes.data.filter(i => i.status !== 'PAID'))
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice)
    setFormData({
      invoiceId: invoice.id.toString(),
      paidAmount: invoice.remainingAmount?.toString() || '',
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'CASH',
      note: '',
      transactionCode: '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/payments', {
        ...formData,
        invoiceId: parseInt(formData.invoiceId),
        paidAmount: parseFloat(formData.paidAmount),
        paymentDate: formData.paymentDate || new Date().toISOString(),
      })
      setShowModal(false)
      setSelectedInvoice(null)
      setFormData({ invoiceId: '', paidAmount: '', method: 'CASH', note: '', transactionCode: '' })
      fetchData()
      eventBus.emit(EVENTS.PAYMENT_CHANGED)
    } catch (error) {
      console.error('Failed to save payment:', error)
      alert(error.response?.data?.message || 'Payment error')
    }
  }

  // Find invoice info for a payment
  const getInvoiceInfo = (invoiceId) => allInvoices.find(i => i.id === invoiceId)

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payments</h1>
        <button
          onClick={() => { setSelectedInvoice(null); setFormData({ invoiceId: '', paidAmount: '', paymentDate: new Date().toISOString().split('T')[0], method: 'CASH', note: '', transactionCode: '' }); setShowModal(true) }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Payment
        </button>
      </div>

      {/* Unpaid invoices quick-pay section */}
      {invoices.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Unpaid Invoices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{inv.tenantName || 'N/A'}</p>
                    <p className="text-xs text-gray-400">Room {inv.roomCode} · {inv.code}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    inv.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                    inv.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {inv.status === 'OVERDUE' ? 'Overdue' : inv.status === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Unpaid'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">Period: {inv.periodMonth}/{inv.periodYear}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400">Remaining</p>
                    <p className="text-lg font-bold text-red-600">{fmt(inv.remainingAmount)}</p>
                  </div>
                  <button
                    onClick={() => openPaymentModal(inv)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Payment History</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest / Room</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length === 0 ? (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No payments yet</td></tr>
            ) : (
              payments.map((p) => {
                const inv = getInvoiceInfo(p.invoiceId)
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.invoiceCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {inv ? <><span className="font-medium">{inv.tenantName}</span> <span className="text-gray-400">· {inv.roomCode}</span></> : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{fmt(p.paidAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(p.paymentDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{methodLabel[p.method] || p.method}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.transactionCode || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.note || '-'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
          {payments.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan="2" className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Total ({payments.length} payments)
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                  {fmt(payments.reduce((s, p) => s + (parseFloat(p.paidAmount) || 0), 0))}
                </td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Payment modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Payment</h2>

            {/* Invoice info card */}
            {selectedInvoice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedInvoice.tenantName}</p>
                    <p className="text-sm text-gray-500">Room {selectedInvoice.roomCode} · {selectedInvoice.code}</p>
                    <p className="text-sm text-gray-500">Period: {selectedInvoice.periodMonth}/{selectedInvoice.periodYear}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Total: {fmt(selectedInvoice.totalAmount)}</p>
                    <p className="text-xs text-gray-400">Paid: {fmt(selectedInvoice.paidAmount)}</p>
                    <p className="text-sm font-bold text-red-600">Remaining: {fmt(selectedInvoice.remainingAmount)}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!selectedInvoice && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Invoice</label>
                  <select
                    required
                    value={formData.invoiceId}
                    onChange={(e) => {
                      const inv = invoices.find(i => i.id.toString() === e.target.value)
                      setSelectedInvoice(inv || null)
                      setFormData({ ...formData, invoiceId: e.target.value, paidAmount: inv?.remainingAmount?.toString() || '' })
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select...</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.tenantName} · Room {inv.roomCode} · {inv.code} · Period {inv.periodMonth}/{inv.periodYear} · Remaining {fmt(inv.remainingAmount)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Amount</label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  required
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter amount..."
                />
                {selectedInvoice && formData.paidAmount && (
                  <p className="mt-1 text-xs text-gray-500">
                    {parseFloat(formData.paidAmount) >= selectedInvoice.remainingAmount
                      ? '✅ Full payment'
                      : `⚠️ Still owed ${fmt(selectedInvoice.remainingAmount - parseFloat(formData.paidAmount))}`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Method</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOMO">MoMo</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction Code</label>
                <input
                  type="text"
                  value={formData.transactionCode}
                  onChange={(e) => setFormData({ ...formData, transactionCode: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Optional..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Note</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="2"
                  placeholder="Optional..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setSelectedInvoice(null) }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Payments
