import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Plus, Edit, Trash2 } from 'lucide-react'

const RoomServices = () => {
  const [roomServices, setRoomServices] = useState([])
  const [rooms, setRooms] = useState([])
  const [serviceTypes, setServiceTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    serviceTypeId: '',
    pricePerUnit: '',
    fixedPrice: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [roomsRes, serviceTypesRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/service-types?active=true'),
      ])
      setRooms(roomsRes.data)
      setServiceTypes(serviceTypesRes.data)
      if (roomsRes.data.length > 0 && !selectedRoomId) {
        setSelectedRoomId(roomsRes.data[0].id.toString())
        fetchRoomServices(roomsRes.data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoomServices = async (roomId) => {
    try {
      const response = await api.get(`/rooms/${roomId}/services`)
      setRoomServices(response.data)
    } catch (error) {
      console.error('Failed to fetch room services:', error)
    }
  }

  const handleRoomChange = (roomId) => {
    setSelectedRoomId(roomId)
    fetchRoomServices(roomId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        serviceTypeId: parseInt(formData.serviceTypeId),
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : null,
        fixedPrice: formData.fixedPrice ? parseFloat(formData.fixedPrice) : null,
      }
      if (editing) {
        await api.put(`/room-services/${editing.id}`, payload)
      } else {
        await api.post(`/room-services/room/${selectedRoomId}`, payload)
      }
      setShowModal(false)
      setEditing(null)
      setFormData({ serviceTypeId: '', pricePerUnit: '', fixedPrice: '' })
      fetchRoomServices(parseInt(selectedRoomId))
    } catch (error) {
      console.error('Failed to save room service:', error)
      alert(error.response?.data?.message || 'Failed to save room service')
    }
  }

  const handleEdit = (roomService) => {
    setEditing(roomService)
    setFormData({
      serviceTypeId: roomService.serviceTypeId.toString(),
      pricePerUnit: roomService.pricePerUnit?.toString() || '',
      fixedPrice: roomService.fixedPrice?.toString() || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this service from the room?')) {
      try {
        await api.delete(`/room-services/${id}`)
        fetchRoomServices(parseInt(selectedRoomId))
      } catch (error) {
        console.error('Failed to delete room service:', error)
      }
    }
  }

  if (loading) return <div>Loading...</div>

  const selectedRoom = rooms.find(r => r.id.toString() === selectedRoomId)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Room Services</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedRoomId}
            onChange={(e) => handleRoomChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>{room.code}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditing(null)
              setFormData({ serviceTypeId: '', pricePerUnit: '', fixedPrice: '' })
              setShowModal(true)
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Service
          </button>
        </div>
      </div>

      {selectedRoom && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">Room: <span className="font-medium">{selectedRoom.code}</span></p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Per Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fixed Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roomServices.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  No services assigned to this room
                </td>
              </tr>
            ) : (
              roomServices.map((roomService) => (
                <tr key={roomService.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {roomService.serviceTypeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{roomService.serviceCategory}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {roomService.pricePerUnit ? 
                      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(roomService.pricePerUnit) : 
                      '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {roomService.fixedPrice ? 
                      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(roomService.fixedPrice) : 
                      '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleEdit(roomService)} className="text-blue-600 hover:text-blue-900 mr-4">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(roomService.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
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
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Assign'} Room Service</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Service Type</label>
                <select
                  required
                  value={formData.serviceTypeId}
                  onChange={(e) => setFormData({ ...formData, serviceTypeId: e.target.value })}
                  disabled={!!editing}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
                >
                  <option value="">Select...</option>
                  {serviceTypes.map((st) => (
                    <option key={st.id} value={st.id}>{st.name} ({st.category})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Per Unit (for ELECTRICITY/WATER)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricePerUnit}
                  onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fixed Price (for FIXED category)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fixedPrice}
                  onChange={(e) => setFormData({ ...formData, fixedPrice: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
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
    </div>
  )
}

export default RoomServices

