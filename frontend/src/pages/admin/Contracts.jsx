import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import BulkActionBar from '../../components/BulkActionBar'
import { Plus, Edit, X, Eye, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US') : '-'

const Contracts = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [contracts, setContracts] = useState([])
  const [rooms, setRooms] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selected, setSelected] = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('code')
  const [sortDirection, setSortDirection] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    code: '',
    roomId: '',
    mainTenantId: '',
    startDate: '',
    endDate: '',
    deposit: '',
    monthlyRent: '',
    dailyRate: '',
    status: 'DRAFT',
    billingCycle: 'MONTHLY',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [contractsRes, roomsRes, tenantsRes] = await Promise.all([
        api.get('/contracts'),
        api.get('/rooms'),
        api.get('/tenants'),
      ])
      setContracts(contractsRes.data || [])
      setRooms(roomsRes.data || [])
      setTenants(tenantsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      showToast(error.response?.data?.message || 'Failed to fetch data', 'error')
      // Set empty arrays to prevent undefined errors
      setContracts([])
      setRooms([])
      setTenants([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Validate dates
    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) {
      showToast('Check-out date must be after check-in date', 'error')
      return
    }
    try {
      const payload = {
        ...formData,
        roomId: parseInt(formData.roomId),
        mainTenantId: parseInt(formData.mainTenantId),
        deposit: formData.deposit ? parseFloat(formData.deposit) : null,
        monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null,
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
      }
      if (editing) {
        await api.put(`/contracts/${editing.id}`, payload)
        showToast('Contract updated successfully', 'success')
      } else {
        await api.post('/contracts', payload)
        showToast('Contract created successfully', 'success')
      }
      setShowModal(false)
      setEditing(null)
      setFormData({ code: '', roomId: '', mainTenantId: '', startDate: '', endDate: '', deposit: '', monthlyRent: '', dailyRate: '', status: 'DRAFT', billingCycle: 'MONTHLY' })
      setCurrentPage(1) // Reset to first page after create/update
      fetchData()
    } catch (error) {
      console.error('Error saving contract:', error)
      showToast(error.response?.data?.message || 'Error saving contract', 'error')
    }
  }

  const handleEdit = (contract) => {
    setEditing(contract)
    setFormData({
      code: contract.code,
      roomId: contract.roomId?.toString() || '',
      mainTenantId: contract.mainTenantId?.toString() || '',
      startDate: contract.startDate || '',
      endDate: contract.endDate || '',
      deposit: contract.deposit?.toString() || '',
      monthlyRent: contract.monthlyRent?.toString() || '',
      dailyRate: contract.dailyRate?.toString() || '',
      status: contract.status || 'DRAFT',
      billingCycle: contract.billingCycle || 'MONTHLY',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/contracts/${id}`)
      fetchData()
      showToast('Contract deleted successfully', 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot delete contract', 'error')
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const visibleContracts = useMemo(() => {
    if (!contracts || !Array.isArray(contracts)) return []
    
    let filtered = statusFilter === 'ALL' ? contracts : contracts.filter(c => c.status === statusFilter)
    
    // Apply search filter with better error handling
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(contract => {
        try {
          return (
            contract.code?.toLowerCase().includes(term) ||
            contract.roomCode?.toLowerCase().includes(term) ||
            contract.mainTenantName?.toLowerCase().includes(term) ||
            contract.status?.toLowerCase().includes(term) ||
            contract.billingCycle?.toLowerCase().includes(term)
          )
        } catch (error) {
          console.error('Error filtering contract:', error)
          return false
        }
      })
    }
    
    // Apply sorting with better error handling
    filtered.sort((a, b) => {
      try {
        let aValue = a[sortField]
        let bValue = b[sortField]
        
        // Handle null/undefined values
        if (aValue == null) aValue = ''
        if (bValue == null) bValue = ''
        
        // Handle dates
        if (sortField.includes('Date')) {
          aValue = aValue ? new Date(aValue) : new Date(0)
          bValue = bValue ? new Date(bValue) : new Date(0)
        }
        
        // Handle numbers and BigDecimal
        if (sortField === 'monthlyRent' || sortField === 'deposit' || sortField === 'dailyRate') {
          aValue = aValue ? parseFloat(aValue) : 0
          bValue = bValue ? parseFloat(bValue) : 0
        }
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      } catch (error) {
        console.error('Error sorting contracts:', error)
        return 0
      }
    })
    
    return filtered
  }, [contracts, statusFilter, searchTerm, sortField, sortDirection])
  
  // Pagination
  const totalPages = Math.ceil(visibleContracts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedContracts = visibleContracts.slice(startIndex, endIndex)

  const toggleSelectAll = () => {
    if (selected.size === paginatedContracts.length) setSelected(new Set())
    else setSelected(new Set(paginatedContracts.map(c => c.id)))
  }

  const handleBulkDelete = async () => {
    let ok = 0, fail = 0
    for (const id of selected) {
      try {
        await api.delete(`/contracts/${id}`)
        ok++
      } catch (error) {
        fail++
        console.error(`Failed to delete contract ${id}:`, error)
      }
    }
    setSelected(new Set())
    setCurrentPage(1) // Reset to first page after bulk delete
    fetchData()
    showToast(`Deleted ${ok} contracts${fail > 0 ? `, ${fail} could not be deleted` : ''}`, fail > 0 ? 'warning' : 'success')
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-lg text-gray-600">Loading contracts...</div>
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Contracts</h1>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({ code: '', roomId: '', mainTenantId: '', startDate: '', endDate: '', deposit: '', monthlyRent: '', dailyRate: '', status: 'DRAFT', billingCycle: 'MONTHLY' })
            setShowModal(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Contract
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="TERMINATED">Terminated</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value))
              setCurrentPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
          <span className="flex items-center text-sm text-gray-500">
            {visibleContracts.length} contracts
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {paginatedContracts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No contracts found</div>
            <div className="text-gray-400 text-sm mt-2">
              {searchTerm || statusFilter !== 'ALL' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by adding your first contract'}
            </div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={selected.size === paginatedContracts.length && paginatedContracts.length > 0}
                    onChange={toggleSelectAll} className="rounded" />
                </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'code') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('code')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Code
                  {sortField === 'code' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'code' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'roomCode') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('roomCode')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Room
                  {sortField === 'roomCode' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'roomCode' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'mainTenantName') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('mainTenantName')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Tenant
                  {sortField === 'mainTenantName' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'mainTenantName' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'startDate') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('startDate')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Start Date
                  {sortField === 'startDate' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'startDate' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'endDate') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('endDate')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  End Date
                  {sortField === 'endDate' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'endDate' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'monthlyRent') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('monthlyRent')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Monthly Rent
                  {sortField === 'monthlyRent' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'monthlyRent' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'status') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('status')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Status
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'status' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedContracts.map((contract) => (
              <tr key={contract.id} className={`hover:bg-gray-50 ${selected.has(contract.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-4">
                  <input type="checkbox" checked={selected.has(contract.id)}
                    onChange={() => toggleSelect(contract.id)} className="rounded" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contract.code}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{contract.roomCode}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <button onClick={() => navigate(`/admin/tenants/${contract.mainTenantId}/detail`)} className="text-blue-600 hover:underline">
                    {contract.mainTenantName}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDate(contract.startDate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmtDate(contract.endDate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {fmt(contract.monthlyRent)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    contract.status === 'TERMINATED' ? 'bg-red-100 text-red-800' :
                    contract.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {contract.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-3">
                  <button onClick={() => navigate(`/admin/contracts/${contract.id}/detail`)} className="text-blue-600 hover:text-blue-900"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => handleEdit(contract)} className="text-gray-500 hover:text-gray-800"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(contract.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, visibleContracts.length)} of {visibleContracts.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Contract</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Contract Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Room</label>
                <select
                  required
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Main Tenant</label>
                <select
                  required
                  value={formData.mainTenantId}
                  onChange={(e) => setFormData({ ...formData, mainTenantId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deposit</label>
                  <input type="number" value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Daily Rate</label>
                  <input type="number" value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Rate</label>
                  <input type="number" value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="TERMINATED">Terminated</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Billing Cycle</label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditing(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk action bar */}
      <ConfirmDialog
        isOpen={confirmBulkDelete}
        title={`Delete ${selected.size} contracts`}
        message={`Delete ${selected.size} selected contracts? Contracts with invoices cannot be deleted.`}
        confirmText="Delete" cancelText="Cancel" danger
        onConfirm={() => { handleBulkDelete(); setConfirmBulkDelete(false) }}
        onCancel={() => setConfirmBulkDelete(false)}
      />
      <BulkActionBar selectedCount={selected.size} onDelete={() => setConfirmBulkDelete(true)} onClear={() => setSelected(new Set())} />
    </div>
  )
}

export default Contracts

