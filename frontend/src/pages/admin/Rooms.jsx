import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import BulkActionBar from '../../components/BulkActionBar'
import { Plus, Edit, Trash2, Eye } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

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

  useEffect(() => {
    let filtered = [...rooms]
    if (filterHouse !== 'ALL') filtered = filtered.filter(r => r.boardingHouseId.toString() === filterHouse)
    if (filterStatus !== 'ALL') filtered = filtered.filter(r => r.status === filterStatus)
    setFilteredRooms(filtered)
  }, [rooms, filterHouse, filterStatus])

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
    if (selected.size === filteredRooms.length) setSelected(new Set())
    else setSelected(new Set(filteredRooms.map(r => r.id)))
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

      <div className="mb-4 flex gap-3">
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
        <span className="flex items-center text-sm text-gray-500">{filteredRooms.length} rooms</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={selected.size === filteredRooms.length && filteredRooms.length > 0}
                  onChange={toggleSelectAll} className="rounded" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boarding House</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Floor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area (m²)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRooms.map((room) => (
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
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.baseRent || 0)}
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

