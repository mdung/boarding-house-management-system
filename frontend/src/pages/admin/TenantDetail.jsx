import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { ArrowLeft } from 'lucide-react'

const TenantDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTenant()
  }, [id])

  const fetchTenant = async () => {
    try {
      const response = await api.get(`/tenants/${id}/detail`)
      setTenant(response.data)
    } catch (error) {
      console.error('Failed to fetch tenant:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!tenant) return <div>Tenant not found</div>

  return (
    <div>
      <button
        onClick={() => navigate('/admin/tenants')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tenants
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-3xl font-bold mb-6">{tenant.fullName}</h1>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
            <p className="text-lg">{tenant.phone}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
            <p className="text-lg">{tenant.email || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Identity Number</h3>
            <p className="text-lg">{tenant.identityNumber || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Date of Birth</h3>
            <p className="text-lg">{tenant.dateOfBirth || '-'}</p>
          </div>
          <div className="col-span-2">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Permanent Address</h3>
            <p className="text-lg">{tenant.permanentAddress || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span className={`px-3 py-1 text-sm rounded-full ${
              tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {tenant.status}
            </span>
          </div>
        </div>

        {tenant.contracts && tenant.contracts.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Contracts ({tenant.contracts.length})</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Rent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenant.contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{contract.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{contract.roomCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{contract.startDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{contract.endDate}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.monthlyRent || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        contract.status === 'TERMINATED' ? 'bg-red-100 text-red-800' :
                        contract.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {contract.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tenant.invoices && tenant.invoices.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">
              Invoices ({tenant.totalInvoices}) - Unpaid: {tenant.unpaidInvoices}
            </h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenant.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{invoice.periodMonth}/{invoice.periodYear}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.paidAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-red-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.remainingAmount || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                        invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TenantDetail

