import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { ArrowLeft } from 'lucide-react'

const ContractDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContract()
  }, [id])

  const fetchContract = async () => {
    try {
      const response = await api.get(`/contracts/${id}/detail`)
      setContract(response.data)
    } catch (error) {
      console.error('Failed to fetch contract:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!contract) return <div>Contract not found</div>

  return (
    <div>
      <button
        onClick={() => navigate('/admin/contracts')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Contracts
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-3xl font-bold mb-6">Contract {contract.code}</h1>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Room</h3>
            <p className="text-lg">{contract.roomCode} - {contract.boardingHouseName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span className={`px-3 py-1 text-sm rounded-full ${
              contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
              contract.status === 'TERMINATED' ? 'bg-red-100 text-red-800' :
              contract.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {contract.status}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Start Date</h3>
            <p className="text-lg">{contract.startDate}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">End Date</h3>
            <p className="text-lg">{contract.endDate}</p>
            {contract.daysRemaining !== null && contract.daysRemaining !== undefined && (
              <p className="text-sm text-gray-600">{contract.daysRemaining} days remaining</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Monthly Rent</h3>
            <p className="text-lg">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.monthlyRent || 0)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Deposit</h3>
            <p className="text-lg">
              {contract.deposit ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(contract.deposit) : '-'}
            </p>
          </div>
        </div>

        <div className="border-t pt-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Main Tenant</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{contract.mainTenantName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{contract.mainTenantPhone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{contract.mainTenantEmail || '-'}</p>
            </div>
          </div>
        </div>

        {contract.tenants && contract.tenants.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">All Tenants</h2>
            <div className="space-y-2">
              {contract.tenants.map((tenant) => (
                <div key={tenant.id} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{tenant.fullName}</p>
                  <p className="text-sm text-gray-600">{tenant.phone}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {contract.invoices && contract.invoices.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Invoices</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contract.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{invoice.periodMonth}/{invoice.periodYear}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount || 0)}
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

export default ContractDetail

