import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Plus, Edit, Trash2 } from 'lucide-react'

const ServiceTypes = () => {
  const [serviceTypes, setServiceTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'ELECTRICITY',
    unit: '',
    pricePerUnit: '',
    isActive: true,
  })

  useEffect(() => {
    fetchServiceTypes()
  }, [])

  const fetchServiceTypes = async () => {
    try {
      const response = await api.get('/service-types')
      setServiceTypes(response.data)
    } catch (error) {
      console.error('Failed to fetch service types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : null,
      }
      if (editing) {
        await api.put(`/service-types/${editing.id}`, payload)
      } else {
        await api.post('/service-types', payload)
      }
      setShowModal(false)
      setEditing(null)
      setFormData({ name: '', category: 'ELECTRICITY', unit: '', pricePerUnit: '', isActive: true })
      fetchServiceTypes()
    } catch (error) {
      console.error('Failed to save service type:', error)
    }
  }

  const handleEdit = (serviceType) => {
    setEditing(serviceType)
    setFormData({
      name: serviceType.name,
      category: serviceType.category,
      unit: serviceType.unit || '',
      pricePerUnit: serviceType.pricePerUnit?.toString() || '',
      isActive: serviceType.isActive,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service type?')) {
      try {
        await api.delete(`/service-types/${id}`)
        fetchServiceTypes()
      } catch (error) {
        console.error('Failed to delete service type:', error)
      }
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Service Types</h1>
        <button
          onClick={() => {
            setEditing(null)
            setFormData({ name: '', category: 'ELECTRICITY', unit: '', pricePerUnit: '', isActive: true })
            setShowModal(true)
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Service Type
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Per Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {serviceTypes.map((serviceType) => (
              <tr key={serviceType.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{serviceType.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{serviceType.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{serviceType.unit || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {serviceType.pricePerUnit ? 
                    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(serviceType.pricePerUnit) : 
                    '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    serviceType.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {serviceType.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleEdit(serviceType)} className="text-blue-600 hover:text-blue-900 mr-4">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(serviceType.id)} className="text-red-600 hover:text-red-900">
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
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Service Type</h2>
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
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="WATER">Water</option>
                  <option value="FIXED">Fixed (Internet, Cleaning, etc.)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="kWh, m³, month, etc."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Per Unit</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricePerUnit}
                  onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
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

export default ServiceTypes

