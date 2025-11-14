import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Plus, Eye } from 'lucide-react'

const Invoices = () => {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showReadingsModal, setShowReadingsModal] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [roomServices, setRoomServices] = useState([])
  const [formData, setFormData] = useState({
    contractId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })
  const [readingsData, setReadingsData] = useState({
    contractId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    readings: [],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [invoicesRes, contractsRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/contracts'),
      ])
      setInvoices(invoicesRes.data)
      setContracts(contractsRes.data.filter(c => c.status === 'ACTIVE'))
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/invoices/generate', {
        contractId: parseInt(formData.contractId),
        month: parseInt(formData.month),
        year: parseInt(formData.year),
      })
      setShowModal(false)
      setFormData({ contractId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })
      fetchData()
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      alert(error.response?.data?.message || 'Failed to generate invoice')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Invoice
          </button>
          <button
            onClick={() => setShowReadingsModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate with Readings
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.code}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{invoice.roomCode}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {invoice.periodMonth}/{invoice.periodYear}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.paidAmount || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.remainingAmount || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                    invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => navigate(`/admin/invoices/${invoice.id}/detail`)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate Invoice</h2>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract</label>
                <select
                  required
                  value={formData.contractId}
                  onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>{contract.code} - {contract.roomCode}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Month</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReadingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Generate Invoice with Utility Readings</h2>
            <form onSubmit={handleGenerateWithReadings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract</label>
                <select
                  required
                  value={readingsData.contractId}
                  onChange={async (e) => {
                    const contractId = e.target.value
                    setReadingsData({ ...readingsData, contractId })
                    if (contractId) {
                      try {
                        const contract = contracts.find(c => c.id.toString() === contractId)
                        if (contract) {
                          const servicesRes = await api.get(`/rooms/${contract.roomId}/services`)
                          const services = servicesRes.data.filter(s => s.serviceCategory !== 'FIXED')
                          setRoomServices(services)
                          setReadingsData({
                            ...readingsData,
                            contractId,
                            readings: services.map(s => ({
                              serviceTypeId: s.serviceTypeId,
                              oldIndex: '',
                              newIndex: '',
                            })),
                          })
                        }
                      } catch (error) {
                        console.error('Failed to fetch room services:', error)
                      }
                    }
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>{contract.code} - {contract.roomCode}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Month</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={readingsData.month}
                    onChange={(e) => setReadingsData({ ...readingsData, month: parseInt(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year</label>
                  <input
                    type="number"
                    required
                    value={readingsData.year}
                    onChange={(e) => setReadingsData({ ...readingsData, year: parseInt(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              {readingsData.readings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Utility Readings</label>
                  {readingsData.readings.map((reading, index) => {
                    const service = roomServices.find(s => s.serviceTypeId === reading.serviceTypeId)
                    return (
                      <div key={index} className="mb-4 p-4 border border-gray-200 rounded">
                        <h4 className="font-medium mb-2">{service?.serviceTypeName}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600">Old Index</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={reading.oldIndex || ''}
                              onChange={(e) => {
                                const newReadings = [...readingsData.readings]
                                newReadings[index].oldIndex = parseFloat(e.target.value) || 0
                                setReadingsData({ ...readingsData, readings: newReadings })
                              }}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600">New Index</label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={reading.newIndex || ''}
                              onChange={(e) => {
                                const newReadings = [...readingsData.readings]
                                newReadings[index].newIndex = parseFloat(e.target.value) || 0
                                setReadingsData({ ...readingsData, readings: newReadings })
                              }}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReadingsModal(false)
                    setReadingsData({ contractId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), readings: [] })
                    setRoomServices([])
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  const handleGenerateWithReadings = async (e) => {
    e.preventDefault()
    try {
      await api.post('/invoices/generate-with-readings', readingsData)
      setShowReadingsModal(false)
      setReadingsData({ contractId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), readings: [] })
      setRoomServices([])
      fetchData()
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      alert(error.response?.data?.message || 'Failed to generate invoice')
    }
  }
}

export default Invoices

