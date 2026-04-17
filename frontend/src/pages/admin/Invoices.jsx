import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { useToast } from '../../context/ToastContext'
import { Plus, Eye, EyeOff, Calculator, DollarSign, Trash2, ChevronUp, ChevronDown, X, AlertTriangle } from 'lucide-react'
import SearchFilter from '../../components/SearchFilter'
import ConfirmDialog from '../../components/ConfirmDialog'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)

const Invoices = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL')
  // New features
  const [selected, setSelected] = useState(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null) // invoice object or 'bulk'
  const [deleting, setDeleting] = useState(false)
  const [sortField, setSortField] = useState('code')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
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
    return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchData)
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchTerm, statusFilter, sortField, sortDir])

  const filterInvoices = () => {
    let filtered = [...invoices]
    
    if (searchTerm) {
      filtered = filtered.filter(inv => 
        inv.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.roomCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.tenantName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter === 'NOT_PAID') {
      filtered = filtered.filter(inv => (parseFloat(inv.remainingAmount) || 0) > 0)
    } else if (statusFilter === 'PAST_DUE') {
      const today = new Date().toISOString().split('T')[0]
      filtered = filtered.filter(inv => (parseFloat(inv.remainingAmount) || 0) > 0 && inv.dueDate && inv.dueDate < today)
    } else if (statusFilter !== 'ALL') {
      filtered = filtered.filter(inv => inv.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (sortField === 'totalAmount' || sortField === 'paidAmount' || sortField === 'remainingAmount') {
        va = parseFloat(va) || 0; vb = parseFloat(vb) || 0
      }
      if (sortField === 'period') {
        va = `${a.periodYear}-${String(a.periodMonth).padStart(2,'0')}`
        vb = `${b.periodYear}-${String(b.periodMonth).padStart(2,'0')}`
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    setFilteredInvoices(filtered)
    setPage(1)
    setSelected(new Set())
  }

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE)
  const pagedInvoices = filteredInvoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
  }

  const toggleSelect = (id) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const toggleAll = () => {
    if (selected.size === pagedInvoices.length) setSelected(new Set())
    else setSelected(new Set(pagedInvoices.map(i => i.id)))
  }

  const handleDelete = async (invoice) => {
    setDeleting(true)
    try {
      await api.delete(`/invoices/${invoice.id}`)
      showToast('Invoice deleted', 'success')
      setShowDeleteConfirm(null)
      fetchData()
    } catch (e) {
      showToast(e.response?.data?.message || 'Cannot delete invoice', 'error')
    } finally { setDeleting(false) }
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    try {
      const r = await api.post('/invoices/bulk-delete', { ids: [...selected] })
      showToast(`Deleted ${r.data.deleted} of ${r.data.total} invoices`, 'success')
      setShowDeleteConfirm(null)
      setSelected(new Set())
      fetchData()
    } catch (e) {
      showToast(e.response?.data?.message || 'Bulk delete failed', 'error')
    } finally { setDeleting(false) }
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

      <div className="mb-4 flex gap-4 items-center">
        <div className="flex-1">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search by code, room, or guest..."
          />
        </div>
        <div className="w-48">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="ALL">All Status</option>
            <option value="NOT_PAID">Not Paid (All)</option>
            <option value="PAST_DUE">Past Due</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
        {selected.size > 0 && (
          <button onClick={() => setShowDeleteConfirm('bulk')}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Delete {selected.size}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 w-10">
                <input type="checkbox" checked={pagedInvoices.length > 0 && selected.size === pagedInvoices.length}
                  onChange={toggleAll} className="rounded border-gray-300" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('code')}>
                <span className="flex items-center gap-1">Code <SortIcon field="code" /></span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('tenantName')}>
                <span className="flex items-center gap-1">Guest <SortIcon field="tenantName" /></span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('period')}>
                <span className="flex items-center gap-1">Period <SortIcon field="period" /></span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('totalAmount')}>
                <span className="flex items-center gap-1">Total <SortIcon field="totalAmount" /></span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('remainingAmount')}>
                <span className="flex items-center gap-1">Remaining <SortIcon field="remainingAmount" /></span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pagedInvoices.length === 0 ? (
              <tr><td colSpan="10" className="px-6 py-8 text-center text-sm text-gray-400">No invoices found</td></tr>
            ) : pagedInvoices.map((invoice) => (
              <tr key={invoice.id} className={`hover:bg-gray-50 ${selected.has(invoice.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.has(invoice.id)}
                    onChange={() => toggleSelect(invoice.id)} className="rounded border-gray-300" />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.code}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{invoice.tenantName || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{invoice.roomCode}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{invoice.periodMonth}/{invoice.periodYear}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{fmt(invoice.totalAmount)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{fmt(invoice.paidAmount)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{fmt(invoice.remainingAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                    invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>{invoice.status}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => navigate(`/admin/invoices/${invoice.id}/detail`)}
                      className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></button>
                    {invoice.status !== 'PAID' && (
                      <button onClick={() => navigate(`/admin/payments?invoiceId=${invoice.id}`)}
                        className="text-green-600 hover:text-green-800" title="Pay"><DollarSign className="w-4 h-4" /></button>
                    )}
                    {(parseFloat(invoice.paidAmount) || 0) === 0 && (
                      <button onClick={() => setShowDeleteConfirm(invoice)}
                        className="text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {filteredInvoices.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td></td>
                <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-gray-700">
                  Total ({filteredInvoices.length} invoices)
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">{fmt(filteredInvoices.reduce((s, i) => s + (parseFloat(i.totalAmount) || 0), 0))}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-600">{fmt(filteredInvoices.reduce((s, i) => s + (parseFloat(i.paidAmount) || 0), 0))}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-600">{fmt(filteredInvoices.reduce((s, i) => s + (parseFloat(i.remainingAmount) || 0), 0))}</td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40">Prev</button>
            {Array.from({length: totalPages}, (_, i) => i+1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2).map((p, i, arr) => (
              <span key={p}>
                {i > 0 && arr[i-1] !== p-1 && <span className="px-1 text-gray-400">...</span>}
                <button onClick={() => setPage(p)}
                  className={`px-3 py-1.5 text-sm border rounded-md ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>{p}</button>
              </span>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-red-50 px-6 py-5 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {showDeleteConfirm === 'bulk' ? `Delete ${selected.size} Invoices?` : 'Delete Invoice?'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {showDeleteConfirm === 'bulk'
                  ? 'Only invoices with no payments will be deleted.'
                  : `${showDeleteConfirm.code} — ${showDeleteConfirm.tenantName}`}
              </p>
            </div>
            <div className="px-6 pb-5 pt-4 flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => showDeleteConfirm === 'bulk' ? handleBulkDelete() : handleDelete(showDeleteConfirm)}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                        {item.unitPrice ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(item.unitPrice) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-right">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(item.amount || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan="5" className="px-4 py-2 text-right">Total Amount:</td>
                    <td className="px-4 py-2 text-right">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(previewInvoice.totalAmount || 0)}
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
}

export default Invoices

