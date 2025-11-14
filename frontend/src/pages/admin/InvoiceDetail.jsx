import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { ArrowLeft, Printer } from 'lucide-react'

const InvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    try {
      const response = await api.get(`/invoices/${id}/detail`)
      setInvoice(response.data)
    } catch (error) {
      console.error('Failed to fetch invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (!invoice) return <div>Invoice not found</div>

  return (
    <div>
      <button
        onClick={() => navigate('/admin/invoices')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Invoices
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Invoice {invoice.code}</h1>
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Contract</h3>
            <p className="text-lg">{invoice.contractCode}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Room</h3>
            <p className="text-lg">{invoice.roomCode} - {invoice.boardingHouseName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Period</h3>
            <p className="text-lg">{invoice.periodMonth}/{invoice.periodYear}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Due Date</h3>
            <p className="text-lg">{invoice.dueDate}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Tenant</h3>
            <p className="text-lg">{invoice.mainTenantName}</p>
            <p className="text-sm text-gray-600">{invoice.mainTenantPhone}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span className={`px-3 py-1 text-sm rounded-full ${
              invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
              invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
              invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {invoice.status}
            </span>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Invoice Items</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Index</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Index</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.oldIndex || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.newIndex || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.quantity || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.unitPrice ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.unitPrice) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan="6" className="px-6 py-4 text-right text-sm font-medium text-gray-900">Total Amount:</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount || 0)}
                </td>
              </tr>
              <tr>
                <td colSpan="6" className="px-6 py-4 text-right text-sm font-medium text-gray-900">Paid Amount:</td>
                <td className="px-6 py-4 text-sm font-medium text-green-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.paidAmount || 0)}
                </td>
              </tr>
              <tr>
                <td colSpan="6" className="px-6 py-4 text-right text-sm font-medium text-gray-900">Remaining:</td>
                <td className="px-6 py-4 text-sm font-bold text-red-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.remainingAmount || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {invoice.payments && invoice.payments.length > 0 && (
          <div className="border-t pt-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Payments</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.paidAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payment.method}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payment.transactionCode || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payment.note || '-'}</td>
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

export default InvoiceDetail

