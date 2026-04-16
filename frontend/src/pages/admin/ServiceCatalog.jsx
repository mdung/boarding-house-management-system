import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)

const CATEGORIES = [
  { value: 'FOOD_DRINK', label: '🍺 Food & Drink' },
  { value: 'SERVICE', label: '🛵 Service' },
]

const ServiceCatalog = () => {
  const [items, setItems] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '', category: 'FOOD_DRINK', unit: '', defaultPrice: '', icon: '', isActive: true, sortOrder: 0, inventoryItemId: null,
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [catalogRes, inventoryRes] = await Promise.all([
        api.get('/service-catalog/all'),
        api.get('/inventory/items'),
      ])
      setItems(catalogRes.data)
      setInventoryItems(inventoryRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openAdd = () => {
    setEditing(null)
    setFormData({ name: '', category: 'FOOD_DRINK', unit: '', defaultPrice: '', icon: '', isActive: true, sortOrder: 0, inventoryItemId: null })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setFormData({
      name: item.name,
      category: item.category,
      unit: item.unit || '',
      defaultPrice: item.defaultPrice,
      icon: item.icon || '',
      isActive: item.isActive,
      sortOrder: item.sortOrder || 0,
      inventoryItemId: item.inventoryItemId || null,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        defaultPrice: parseFloat(formData.defaultPrice),
        sortOrder: parseInt(formData.sortOrder),
        inventoryItemId: formData.inventoryItemId,
      }
      if (editing) await api.put(`/service-catalog/${editing.id}`, payload)
      else await api.post('/service-catalog', payload)
      setShowModal(false)
      fetchData()
    } catch (e) { alert(e.response?.data?.message || 'Error') }  }

  const handleDelete = async (id) => {
    if (!confirm('Hide this service?')) return
    await api.delete(`/service-catalog/${id}`)
    fetchData()
  }

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: items.filter(i => i.category === cat.value),
  }))

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Service Catalog</h1>
        <button onClick={openAdd} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {grouped.map(cat => (
          <div key={cat.value} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-gray-700">{cat.label} ({cat.items.length})</h2>
            </div>
            <table className="min-w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase bg-gray-50">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Unit</th>
                  <th className="px-4 py-2 text-left">Inventory</th>
                  <th className="px-4 py-2 text-right">Default Price</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cat.items.map(item => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${!item.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2 text-sm font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{item.unit || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{item.inventoryItemName || '-'}</td>
                    <td className="px-4 py-2 text-sm text-right">{fmt(item.defaultPrice)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {item.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right flex gap-2 justify-end">
                      <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {cat.items.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-400 text-sm">No services yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Service</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Service Name *</label>
                <input required type="text" value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="VD: 🍺 Beer, 🛵 Motorbike Rent"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <input type="text" value={formData.unit}
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    placeholder="bottle, day, set..."
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Price *</label>
                  <input required type="number" value={formData.defaultPrice}
                    onChange={e => setFormData({...formData, defaultPrice: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                  <input type="number" value={formData.sortOrder}
                    onChange={e => setFormData({...formData, sortOrder: e.target.value})}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Inventory Item</label>
                <select value={formData.inventoryItemId || ''}
                  onChange={e => setFormData({...formData, inventoryItemId: e.target.value ? Number(e.target.value) : null})}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="">None</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.quantityOnHand} {item.unit || 'pcs'})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                <label htmlFor="isActive" className="text-sm text-gray-700">Show in list</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceCatalog
