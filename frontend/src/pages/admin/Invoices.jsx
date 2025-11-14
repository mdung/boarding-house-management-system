import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { Plus, Eye, EyeOff, Calculator } from 'lucide-react'
import SearchFilter from '../../components/SearchFilter'
import ConfirmDialog from '../../components/ConfirmDialog'

const Invoices = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [invoices, setInvoices] = useState([])
  const [filteredInvoices, setFilteredInvoices] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showReadingsModal, setShowReadingsModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)
  const [roomServices, setRoomServices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
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

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchTerm, statusFilter])

  const filterInvoices = () => {
    let filtered = [...invoices]
    
    if (searchTerm) {
      filtered = filtered.filter(inv => 
        inv.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.roomCode?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(inv => inv.status === statusFilter)
    }
    
    setFilteredInvoices(filtered)
  }

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
      showToast('Invoice generated successfully', 'success')
      fetchData()
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      showToast(error.response?.data?.message || 'Failed to generate invoice', 'error')
    }
  }

  const handlePreview = async () => {
    if (!readingsData.contractId || readingsData.readings.length === 0) {
      showToast('Please fill in all required fields', 'warning')
      return
    }
    
    // Validate readings
    for (const reading of readingsData.readings) {
      if (!reading.oldIndex || !reading.newIndex) {
        showToast('Please fill in all utility readings', 'warning')
        return
      }
      if (parseFloat(reading.newIndex) < parseFloat(reading.oldIndex)) {
        showToast('New index must be greater than or equal to old index', 'error')
        return
      }
    }

    try {
      const response = await api.post('/invoices/preview-with-readings', readingsData)
      setPreviewInvoice(response.data)
      setShowPreview(true)
    } catch (error) {
      console.error('Failed to preview invoice:', error)
      showToast(error.response?.data?.message || 'Failed to preview invoice', 'error')
    }
  }

  const calculateConsumption = (oldIndex, newIndex) => {
    if (!oldIndex || !newIndex) return 0
    return parseFloat(newIndex) - parseFloat(oldIndex)
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

      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search by invoice code or room code..."
          />
        </div>
        <div className="w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">All Status</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
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
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">No invoices found</td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
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
              ))
            )}
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
                        <div className="grid grid-cols-3 gap-4">
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
                          <div>
                            <label className="block text-sm text-gray-600">Consumption</label>
                            <input
                              type="number"
                              step="0.01"
                              readOnly
                              value={calculateConsumption(reading.oldIndex, reading.newIndex)}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
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
                    setShowPreview(false)
                    setPreviewInvoice(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center"
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Preview
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Invoice Preview</h2>
              <button
                onClick={() => {
                  setShowPreview(false)
                  setPreviewInvoice(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <EyeOff className="w-5 h-5" />
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Invoice Code: {previewInvoice.code}</h3>
                <p className="text-sm text-gray-600">Period: {previewInvoice.periodMonth}/{previewInvoice.periodYear}</p>
                <p className="text-sm text-gray-600">Room: {previewInvoice.roomCode}</p>
              </div>
              <table className="w-full mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">Description</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Old Index</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">New Index</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Consumption</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right text-sm font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {previewInvoice.items?.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2 text-sm">{item.description}</td>
                      <td className="px-4 py-2 text-sm">{item.oldIndex || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.newIndex || '-'}</td>
                      <td className="px-4 py-2 text-sm">{item.quantity || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        {item.unitPrice ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.unitPrice) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan="5" className="px-4 py-2 text-right">Total Amount:</td>
                    <td className="px-4 py-2 text-right">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(previewInvoice.totalAmount || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
      setShowPreview(false)
      setPreviewInvoice(null)
      showToast('Invoice generated successfully', 'success')
      fetchData()
    } catch (error) {
      console.error('Failed to generate invoice:', error)
      showToast(error.response?.data?.message || 'Failed to generate invoice', 'error')
    }
  }
}

export default Invoices

