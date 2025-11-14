import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Plus, Edit, Trash2 } from 'lucide-react'

const BoardingHouses = () => {
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    numberOfFloors: '',
    notes: '',
  })

  useEffect(() => {
    fetchHouses()
  }, [])

  const fetchHouses = async () => {
    try {
      const response = await api.get('/boarding-houses')
      setHouses(response.data)
    } catch (error) {
      console.error('Failed to fetch houses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.put(`/boarding-houses/${editing.id}`, formData)
      } else {
        await api.post('/boarding-houses', formData)
      }
      setShowModal(false)
      setEditing(null)
      setFormData({ name: '', address: '', description: '', numberOfFloors: '', notes: '' })
      fetchHouses()
    } catch (error) {
      console.error('Failed to save house:', error)
    }
  }

  const handleEdit = (house) => {
    setEditing(house)
    setFormData({
      name: house.name,
      address: house.address,
      description: house.description || '',
      numberOfFloors: house.numberOfFloors || '',
      notes: house.notes || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this boarding house?')) {
      try {
        await api.delete(`/boarding-houses/${id}`)
        fetchHouses()
      } catch (error) {
        console.error('Failed to delete house:', error)
      }
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Boarding Houses</h1>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({ name: '', address: '', description: '', numberOfFloors: '', notes: '' })
            setShowModal(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Boarding House
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Floors</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {houses.map((house) => (
              <tr key={house.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{house.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{house.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{house.numberOfFloors || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleEdit(house)} className="text-blue-600 hover:text-blue-900 mr-4">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(house.id)} className="text-red-600 hover:text-red-900">
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
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Boarding House</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Number of Floors</label>
                <input
                  type="number"
                  value={formData.numberOfFloors}
                  onChange={(e) => setFormData({ ...formData, numberOfFloors: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="3"
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

export default BoardingHouses

