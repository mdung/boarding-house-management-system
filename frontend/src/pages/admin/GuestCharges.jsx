import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { Plus, Trash2, ChevronDown, ChevronUp, Search, Filter, Calendar, DollarSign, Package, ShoppingCart, Zap, Coffee, Car, Home, Star, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react'
import SearchFilter from '../../components/SearchFilter'
import { useToast } from '../../context/ToastContext'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)

const CATEGORIES = { FOOD_DRINK: '🍺 Food & Drink', SERVICE: '🛵 Service' }

const GuestCharges = () => {
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const [contracts, setContracts] = useState([])
  const [catalog, setCatalog] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [selectedContractId, setSelectedContractId] = useState('')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [expandedDates, setExpandedDates] = useState({})
  const [contractSearchTerm, setContractSearchTerm] = useState('')
  const [chargeSearchTerm, setChargeSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('catalog') // 'catalog' or 'inventory'
  const [formData, setFormData] = useState({
    chargeDate: new Date().toISOString().split('T')[0],
    catalogId: '',
    inventoryItemId: '',
    description: '',
    quantity: '1',
    unitPrice: '',
    note: '',
  })

  useEffect(() => {
    api.get('/contracts').then(r => setContracts(r.data)).catch(console.error)
    api.get('/service-catalog').then(r => setCatalog(r.data)).catch(console.error)
    api.get('/inventory/items').then(r => setInventoryItems(r.data)).catch(console.error)
  }, [])

  // Auto-select contract from URL param (e.g. from dashboard modal)
  useEffect(() => {
    const cid = searchParams.get('contractId')
    if (cid) setSelectedContractId(cid)
  }, [searchParams])

  useEffect(() => {
    if (selectedContractId) fetchSummary()
  }, [selectedContractId])

  // Filtered contracts for search
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract =>
      contract.mainTenantName.toLowerCase().includes(contractSearchTerm.toLowerCase()) ||
      contract.roomCode.toLowerCase().includes(contractSearchTerm.toLowerCase()) ||
      contract.code.toLowerCase().includes(contractSearchTerm.toLowerCase())
    )
  }, [contracts, contractSearchTerm])

  // Filtered charges for search
  const filteredChargesByDate = useMemo(() => {
    if (!summary?.charges || !chargeSearchTerm) return summary?.charges?.reduce((acc, c) => {
      const d = c.chargeDate
      if (!acc[d]) acc[d] = []
      acc[d].push(c)
      return acc
    }, {}) || {}

    const filteredCharges = summary.charges.filter(charge =>
      charge.description.toLowerCase().includes(chargeSearchTerm.toLowerCase()) ||
      charge.note?.toLowerCase().includes(chargeSearchTerm.toLowerCase())
    )

    return filteredCharges.reduce((acc, c) => {
      const d = c.chargeDate
      if (!acc[d]) acc[d] = []
      acc[d].push(c)
      return acc
    }, {})
  }, [summary?.charges, chargeSearchTerm])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/guest-charges/contract/${selectedContractId}/summary`)
      setSummary(r.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.description.trim()) {
      showToast('Please enter a description', 'error')
      return
    }
    if (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0) {
      showToast('Please enter a valid unit price', 'error')
      return
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      showToast('Please enter a valid quantity', 'error')
      return
    }

    // Check stock for inventory items
    if (formData.inventoryItemId) {
      const item = inventoryItems.find(i => i.id === parseInt(formData.inventoryItemId))
      if (item && item.quantityOnHand < parseFloat(formData.quantity)) {
        showToast(`Insufficient stock! Available: ${item.quantityOnHand}`, 'error')
        return
      }
    }

    try {
      await api.post('/guest-charges', {
        contractId: parseInt(selectedContractId),
        inventoryItemId: formData.inventoryItemId ? parseInt(formData.inventoryItemId) : undefined,
        chargeDate: formData.chargeDate,
        description: formData.description,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        note: formData.note,
      })

      showToast('Charge added successfully!', 'success')
      setShowModal(false)
      resetForm()
      fetchSummary()
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to save charge', 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      chargeDate: new Date().toISOString().split('T')[0],
      catalogId: '',
      inventoryItemId: '',
      description: '',
      quantity: '1',
      unitPrice: '',
      note: '',
    })
    setActiveTab('catalog')
  }

  const handleCatalogSelect = (catalogId) => {
    const item = catalog.find(c => c.id === parseInt(catalogId))
    if (item) {
      setFormData(prev => ({
        ...prev,
        catalogId,
        inventoryItemId: item.inventoryItemId ? item.inventoryItemId.toString() : '',
        description: item.name,
        unitPrice: item.defaultPrice.toString(),
      }))
      setActiveTab(item.inventoryItemId ? 'inventory' : 'catalog')
    } else {
      setFormData(prev => ({ ...prev, catalogId, description: '', unitPrice: '', inventoryItemId: '' }))
    }
  }

  const handleInventorySelect = (inventoryItemId) => {
    const item = inventoryItems.find(i => i.id === parseInt(inventoryItemId))
    if (item) {
      setFormData(prev => ({
        ...prev,
        inventoryItemId,
        catalogId: '',
        description: item.name,
        unitPrice: item.salePrice?.toString() || '',
      }))
      setActiveTab('inventory')
    } else {
      setFormData(prev => ({ ...prev, inventoryItemId, description: '', unitPrice: '', catalogId: '' }))
    }
  }

  // Quick actions for common charges
  const quickAddCharge = (type, data) => {
    const today = new Date().toISOString().split('T')[0]
    let formData = {
      chargeDate: today,
      catalogId: '',
      inventoryItemId: '',
      description: '',
      quantity: '1',
      unitPrice: '',
      note: '',
    }

    switch (type) {
      case 'beer':
        formData.description = '🍺 Beer'
        formData.unitPrice = '12000'
        break
      case 'coke':
        formData.description = '🥤 Coke'
        formData.unitPrice = '10000'
        break
      case 'motorbike':
        formData.description = '🛵 Motorbike Rental'
        formData.unitPrice = '50000'
        break
      case 'laundry':
        formData.description = '👕 Laundry Service'
        formData.unitPrice = '30000'
        break
      case 'custom':
        formData = { ...formData, ...data }
        break
    }

    setFormData(formData)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this charge?')) return
    try {
      await api.delete(`/guest-charges/${id}`)
      showToast('Charge deleted successfully', 'success')
      fetchSummary()
    } catch (e) {
      showToast('Failed to delete charge', 'error')
    }
  }

  const toggleDate = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))

  // Group charges by date
  const chargesByDate = summary?.charges?.reduce((acc, c) => {
    const d = c.chargeDate
    if (!acc[d]) acc[d] = []
    acc[d].push(c)
    return acc
  }, {}) || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Guest Service Charges</h1>
              <p className="mt-1 text-sm text-gray-500">Manage additional charges for guests</p>
            </div>
            {selectedContractId && (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Charge
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contract Selector */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Select Guest Contract</h2>
            <p className="mt-1 text-sm text-gray-500">Choose a contract to manage charges</p>
          </div>
          <div className="p-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search contracts</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={contractSearchTerm}
                  onChange={(e) => setContractSearchTerm(e.target.value)}
                  placeholder="Search by guest name, room, or contract code..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">Active Contracts</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContracts.filter(c => c.status === 'ACTIVE').map(contract => (
                  <div
                    key={contract.id}
                    onClick={() => setSelectedContractId(contract.id.toString())}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedContractId === contract.id.toString()
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Home className="w-5 h-5 text-gray-400 mr-2" />
                        <div>
                          <p className="font-medium text-gray-900">{contract.mainTenantName}</p>
                          <p className="text-sm text-gray-500">Room {contract.roomCode}</p>
                        </div>
                      </div>
                      {selectedContractId === contract.id.toString() && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Contract: {contract.code}
                    </div>
                  </div>
                ))}
              </div>
              {filteredContracts.filter(c => c.status === 'ACTIVE').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Home className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No active contracts found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        </div>

        {loading && <div className="text-center py-8 text-gray-500">Loading...</div>}

        {summary && !loading && (
          <>
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Quick Add Common Charges</h2>
                <p className="mt-1 text-sm text-gray-500">Click to quickly add frequently used services</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => quickAddCharge('beer')}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <Coffee className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-sm font-medium text-gray-900">🍺 Beer</span>
                    <span className="text-xs text-gray-500">₫12,000</span>
                  </button>
                  <button
                    onClick={() => quickAddCharge('coke')}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <Coffee className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-sm font-medium text-gray-900">🥤 Coke</span>
                    <span className="text-xs text-gray-500">₫10,000</span>
                  </button>
                  <button
                    onClick={() => quickAddCharge('motorbike')}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <Car className="w-8 h-8 text-gray-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">🛵 Motorbike</span>
                    <span className="text-xs text-gray-500">₫50,000</span>
                  </button>
                  <button
                    onClick={() => quickAddCharge('laundry')}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <Zap className="w-8 h-8 text-purple-500 mb-2" />
                    <span className="text-sm font-medium text-gray-900">👕 Laundry</span>
                    <span className="text-xs text-gray-500">₫30,000</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Guest Info & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Guest Info Card */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Guest Information</h3>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-20">Guest:</span>
                    <span className="text-sm text-gray-900">{summary.tenantName}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-20">Room:</span>
                    <span className="text-sm text-gray-900">{summary.roomCode}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-20">Check-in:</span>
                    <span className="text-sm text-gray-900">
                      {summary.checkInDate ? new Date(summary.checkInDate + 'T00:00:00').toLocaleDateString('en-US') : '-'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-20">Check-out:</span>
                    <span className="text-sm text-gray-900">
                      {summary.checkOutDate ? new Date(summary.checkOutDate + 'T00:00:00').toLocaleDateString('en-US') : '-'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-500 w-20">Nights:</span>
                    <span className="text-sm font-semibold text-blue-600">{summary.totalNights} nights</span>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <Home className="w-8 h-8 text-blue-500" />
                      <div className="ml-3">
                        <p className="text-xs text-gray-500">Room Charge</p>
                        <p className="text-lg font-bold text-gray-700">{fmt(summary.totalRent)}</p>
                        <p className="text-xs text-gray-400">{summary.totalNights} nights × {fmt(summary.dailyRate)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <ShoppingCart className="w-8 h-8 text-green-500" />
                      <div className="ml-3">
                        <p className="text-xs text-gray-500">Service Charges</p>
                        <p className="text-lg font-bold text-blue-600">{fmt(summary.totalCharges)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center">
                      <DollarSign className="w-8 h-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="text-lg font-bold text-green-600">{fmt(summary.totalPaid)}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`rounded-lg shadow p-4 ${summary.remainingAmount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className="flex items-center">
                      <AlertTriangle className={`w-8 h-8 ${summary.remainingAmount > 0 ? 'text-red-500' : 'text-green-500'}`} />
                      <div className="ml-3">
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className={`text-lg font-bold ${summary.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {fmt(summary.remainingAmount)}
                        </p>
                        <p className="text-xs text-gray-400">Total: {fmt(summary.totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charges Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Service Charges</h2>
                    <p className="mt-1 text-sm text-gray-500">All charges for this guest</p>
                  </div>
                  <SearchFilter
                    searchTerm={chargeSearchTerm}
                    onSearchChange={setChargeSearchTerm}
                    placeholder="Search charges..."
                  />
                </div>
              </div>

              {Object.keys(filteredChargesByDate).length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 mb-2">No service charges found</p>
                  <p className="text-sm text-gray-400">Add charges using the buttons above</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {Object.entries(filteredChargesByDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => {
                    const dayTotal = items.reduce((s, i) => s + parseFloat(i.amount), 0)
                    const expanded = expandedDates[date] !== false
                    return (
                      <div key={date} className="border-b last:border-0">
                        <button
                          onClick={() => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }))}
                          className="w-full flex justify-between items-center px-6 py-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                            <div className="text-left">
                              <span className="font-medium text-gray-900">
                                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                              <span className="ml-2 text-sm text-gray-500">({items.length} charges)</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-blue-600">{fmt(dayTotal)}</span>
                            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                          </div>
                        </button>
                        {expanded && (
                          <div className="bg-gray-50">
                            <table className="min-w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Note</th>
                                  <th className="px-6 py-3"></th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {items.map(item => (
                                  <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm text-gray-900">{item.description}</td>
                                    <td className="px-6 py-3 text-sm text-right text-gray-600">{item.quantity}</td>
                                    <td className="px-6 py-3 text-sm text-right text-gray-600">{fmt(item.unitPrice)}</td>
                                    <td className="px-6 py-3 text-sm text-right font-medium text-gray-900">{fmt(item.amount)}</td>
                                    <td className="px-6 py-3 text-sm text-gray-500">{item.note || '-'}</td>
                                    <td className="px-6 py-3 text-right">
                                      <button
                                        onClick={() => handleDelete(item.id)}
                                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
        </>
      )}

      {/* Add charge modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Add Service Charge</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">Add charges for {summary?.tenantName} - Room {summary?.roomCode}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[calc(90vh-120px)]">
              {/* Tabs */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'catalog'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    📋 Service Catalog
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'inventory'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    📦 Inventory Items
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Selection */}
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Charge Date</label>
                      <input
                        type="date"
                        required
                        value={formData.chargeDate}
                        onChange={e => setFormData({ ...formData, chargeDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {activeTab === 'catalog' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Choose from Service Catalog</label>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {Object.entries(CATEGORIES).map(([catKey, catLabel]) => {
                            const catItems = catalog.filter(c => c.category === catKey)
                            if (catItems.length === 0) return null
                            return (
                              <div key={catKey}>
                                <p className="text-xs font-medium text-gray-500 mb-2">{catLabel}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {catItems.map(item => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => handleCatalogSelect(item.id.toString())}
                                      className={`p-3 text-left border rounded-lg transition-all ${
                                        formData.catalogId === item.id.toString()
                                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="font-medium text-sm text-gray-900">{item.name}</div>
                                      <div className="text-xs text-gray-500">{fmt(item.defaultPrice)}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab === 'inventory' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Choose from Inventory</label>
                        <div className="max-h-60 overflow-y-auto">
                          <select
                            value={formData.inventoryItemId}
                            onChange={e => handleInventorySelect(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Select inventory item --</option>
                            {inventoryItems.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} · Stock: {item.quantityOnHand} · {fmt(item.salePrice || 0)}
                              </option>
                            ))}
                          </select>
                          {formData.inventoryItemId && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-md">
                              <p className="text-sm text-blue-800">
                                Available stock: {inventoryItems.find(i => i.id === parseInt(formData.inventoryItemId))?.quantityOnHand || 0}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Details */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <input
                        type="text"
                        required
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter charge description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={formData.quantity}
                          onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price (VND)</label>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          required
                          value={formData.unitPrice}
                          onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {formData.quantity && formData.unitPrice && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-900">Total Amount:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {fmt(parseFloat(formData.quantity) * parseFloat(formData.unitPrice))}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
                      <textarea
                        value={formData.note}
                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                        placeholder="Add any additional notes..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Charge
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GuestCharges
