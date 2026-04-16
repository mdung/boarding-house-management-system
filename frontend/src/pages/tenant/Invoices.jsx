import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)

const TenantInvoices = () => {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) fetchInvoices()
  }, [user])

  const fetchInvoices = async () => {
    try {
      const tenantRes = await api.get(`/tenants/user/${user.id}`)
      const detailRes = await api.get(`/tenants/${tenantRes.data.id}/detail`)
      setInvoices(detailRes.data.invoices || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Invoices</h1>
      {invoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">No invoices yet.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{inv.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{inv.periodMonth}/{inv.periodYear}</td>
                  <td className="px-4 py-3 text-sm text-right">{fmt(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{fmt(inv.paidAmount)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{fmt(inv.remainingAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      inv.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                      inv.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TenantInvoices
