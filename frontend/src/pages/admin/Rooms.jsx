import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import BulkActionBar from '../../components/BulkActionBar'
import { Plus, Edit, Trash2, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)

const Rooms = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [rooms, setRooms] = useState([])
  const [filteredRooms, setFilteredRooms] = useState([])
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [filterHouse, setFilterHouse] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('code')
  const [sortDirection, setSortDirection] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    code: '',
    boardingHouseId: '',
    floor: '',
    area: '',
    maxOccupants: '',
    baseRent: '',
    status: 'AVAILABLE',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const visibleRooms = useMemo(() => {
    let filtered = [...rooms]
    
    // Apply house filter
    if (filterHouse !== 'ALL') filtered = filtered.filter(r => r.boardingHouseId.toString() === filterHouse)
    
    // Apply status filter
    if (filterStatus !== 'ALL') filtered = filtered.filter(r => r.status === filterStatus)
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(room => 
        room.code?.toLowerCase().includes(term) ||
        room.boardingHouseName?.toLowerCase().includes(term) ||
        room.currentTenantName?.toLowerCase().includes(term) ||
        room.status?.toLowerCase().includes(term) ||
        room.floor?.toString().includes(term) ||
        room.area?.toString().includes(term) ||
        room.maxOccupants?.toString().includes(term) ||
        room.baseRent?.toString().includes(term)
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Handle null/undefined values
      if (aValue == null) aValue = sortField === 'floor' || sortField === 'area' || sortField === 'maxOccupants' || sortField === 'baseRent' ? 0 : ''
      if (bValue == null) bValue = sortField === 'floor' || sortField === 'area' || sortField === 'maxOccupants' || sortField === 'baseRent' ? 0 : ''
      
      // Handle numbers
      if (sortField === 'floor' || sortField === 'area' || sortField === 'maxOccupants' || sortField === 'baseRent') {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [rooms, filterHouse, filterStatus, searchTerm, sortField, sortDirection])
  
  // Pagination
  const totalPages = Math.ceil(visibleRooms.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRooms = visibleRooms.slice(startIndex, endIndex)

  const fetchData = async () => {
    try {
      const [roomsRes, housesRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/boarding-houses'),
      ])
      setRooms(roomsRes.data)
      setHouses(housesRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        boardingHouseId: parseInt(formData.boardingHouseId),
        floor: formData.floor ? parseInt(formData.floor) : null,
        area: formData.area ? parseFloat(formData.area) : null,
        maxOccupants: formData.maxOccupants ? parseInt(formData.maxOccupants) : null,
        baseRent: formData.baseRent ? parseFloat(formData.baseRent) : null,
      }
      if (editing) {
        await api.put(`/rooms/${editing.id}`, payload)
      } else {
        await api.post('/rooms', payload)
      }
      setShowModal(false)
      setEditing(null)
      setFormData({ code: '', boardingHouseId: '', floor: '', area: '', maxOccupants: '', baseRent: '', status: 'AVAILABLE' })
      fetchData()
      showToast(editing ? 'Room updated successfully' : 'Room added successfully', 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Error saving room', 'error')
    }
  }

  const handleEdit = (room) => {
    setEditing(room)
    setFormData({
      code: room.code,
      boardingHouseId: room.boardingHouseId.toString(),
      floor: room.floor?.toString() || '',
      area: room.area?.toString() || '',
      maxOccupants: room.maxOccupants?.toString() || '',
      baseRent: room.baseRent?.toString() || '',
      status: room.status,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/rooms/${id}`)
      fetchData()
      showToast('Room deleted', 'success')
    } catch (error) {
      showToast(error.response?.data?.message || 'Cannot delete room', 'error')
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === paginatedRooms.length) setSelected(new Set())
    else setSelected(new Set(paginatedRooms.map(r => r.id)))
  }

  const handleBulkDelete = async () => {
    let ok = 0, fail = 0
    for (const id of selected) {
      try { await api.delete(`/rooms/${id}`); ok++ }
      catch { fail++ }
    }
    setSelected(new Set())
    fetchData()
    showToast(`Deleted ${ok} rooms${fail > 0 ? `, ${fail} could not be deleted` : ''}`, fail > 0 ? 'warning' : 'success')
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Rooms</h1>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({ code: '', boardingHouseId: '', floor: '', area: '', maxOccupants: '', baseRent: '', status: 'AVAILABLE' })
            setShowModal(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Room
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-4">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm w-full"
            />
          </div>
          <select value={filterHouse} onChange={e => setFilterHouse(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="ALL">All boarding houses</option>
            {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="ALL">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="MAINTENANCE">Maintenance</option>
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
            {visibleRooms.length} rooms
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={selected.size === paginatedRooms.length && paginatedRooms.length > 0}
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
                    if (sortField === 'boardingHouseName') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('boardingHouseName')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Boarding House
                  {sortField === 'boardingHouseName' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'boardingHouseName' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'floor') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('floor')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Floor
                  {sortField === 'floor' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'floor' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'area') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('area')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Area (m²)
                  {sortField === 'area' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'area' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'baseRent') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('baseRent')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Rent
                  {sortField === 'baseRent' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'baseRent' && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={() => {
                    if (sortField === 'currentTenantName') {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortField('currentTenantName')
                      setSortDirection('asc')
                    }
                  }}
                  className="flex items-center gap-1 hover:text-gray-700"
                >
                  Tenant
                  {sortField === 'currentTenantName' && (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                  )}
                  {sortField !== 'currentTenantName' && <ArrowUpDown className="w-3 h-3" />}
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
            {paginatedRooms.map((room) => (
              <tr key={room.id} className={`hover:bg-gray-50 ${selected.has(room.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-4">
                  <input type="checkbox" checked={selected.has(room.id)}
                    onChange={() => toggleSelect(room.id)} className="rounded" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <button
                    onClick={() => navigate(`/admin/rooms/${room.id}/detail`)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {room.code}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{room.boardingHouseName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{room.floor || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{room.area || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(room.baseRent || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {room.currentTenantName || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    room.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                    room.status === 'OCCUPIED' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {room.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => navigate(`/admin/rooms/${room.id}/detail`)} className="text-blue-600 hover:text-blue-900 mr-4">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(room)} className="text-blue-600 hover:text-blue-900 mr-4">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirmDelete(room.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, visibleRooms.length)} of {visibleRooms.length} results
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Room</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Room Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Boarding House</label>
                <select
                  required
                  value={formData.boardingHouseId}
                  onChange={(e) => setFormData({ ...formData, boardingHouseId: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  {houses.map((house) => (
                    <option key={house.id} value={house.id}>{house.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Floor</label>
                  <input
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Area (m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Occupants</label>
                  <input
                    type="number"
                    value={formData.maxOccupants}
                    onChange={(e) => setFormData({ ...formData, maxOccupants: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Base Rent</label>
                  <input
                    type="number"
                    required
                    value={formData.baseRent}
                    onChange={(e) => setFormData({ ...formData, baseRent: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
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

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Room"
        message="Are you sure you want to delete this room?"
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={() => { handleDelete(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        isOpen={confirmBulkDelete}
        title={`Delete ${selected.size} rooms`}
        message={`Are you sure you want to delete ${selected.size} selected rooms? Rooms with guests cannot be deleted.`}
        confirmText="Delete All"
        cancelText="Cancel"
        danger
        onConfirm={() => { handleBulkDelete(); setConfirmBulkDelete(false) }}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      <BulkActionBar
        selectedCount={selected.size}
        onDelete={() => setConfirmBulkDelete(true)}
        onClear={() => setSelected(new Set())}
      />
    </div>
  )
}

export default Rooms

