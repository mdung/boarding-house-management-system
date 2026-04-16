import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '-'
const methodLabel = { CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', MOMO: 'MoMo', OTHER: 'Other' }

const TenantPayments = () => {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) fetchPayments()
  }, [user])

  const fetchPayments = async () => {
    try {
      const tenantRes = await api.get(`/tenants/user/${user.id}`)
      const detailRes = await api.get(`/tenants/${tenantRes.data.id}/detail`)
      // Get payments for each invoice
      const invoices = detailRes.data.invoices || []
      const allPayments = []
      for (const inv of invoices) {
        const pRes = await api.get(`/payments/invoice/${inv.id}`)
        pRes.data.forEach(p => allPayments.push({ ...p, invoiceCode: inv.code }))
      }
      allPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      setPayments(allPayments)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payment History</h1>
      {payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">No payments yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{p.invoiceCode}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{fmt(p.paidAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(p.paymentDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{methodLabel[p.method] || p.method}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.transactionCode || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TenantPayments
