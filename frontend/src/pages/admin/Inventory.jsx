import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import { Plus, Edit, Trash2, Activity, Package, RefreshCcw, Wand2 } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(n || 0)

const TRANSACTION_TYPES = [
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'SALE', label: 'Sale' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'RETURN', label: 'Return' },
]

const Inventory = () => {
  const [items, setItems] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const [itemForm, setItemForm] = useState({
    sku: '',
    name: '',
    category: '',
    unit: '',
    purchasePrice: '',
    salePrice: '',
    quantityOnHand: '0',
    reorderLevel: '0',
    isActive: true,
    note: '',
  })

  const [transactionForm, setTransactionForm] = useState({
    itemId: '',
    type: 'SALE',
    quantity: '1',
    unitPrice: '0',
    reference: '',
    note: '',
  })

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    if (selectedItem) {
      fetchTransactions(selectedItem.id)
    } else {
      setTransactions([])
    }
  }, [selectedItem])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/items/all')
      setItems(r.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (itemId) => {
    try {
      const r = await api.get('/inventory/transactions', { params: { itemId } })
      setTransactions(r.data)
    } catch (e) {
      console.error(e)
    }
  }

  const lowStockCount = useMemo(() => {
    return items.filter(item => parseFloat(item.quantityOnHand || 0) <= parseFloat(item.reorderLevel || 0)).length
  }, [items])

  const totalStockValue = useMemo(() => {
    return items.reduce((sum, item) => sum + (parseFloat(item.quantityOnHand || 0) * parseFloat(item.purchasePrice || 0)), 0)
  }, [items])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const term = search.toLowerCase()
      const matchesSearch = item.name?.toLowerCase().includes(term) || item.sku?.toLowerCase().includes(term) || item.category?.toLowerCase().includes(term)
      const matchesFilter = filter === 'low'
        ? parseFloat(item.quantityOnHand || 0) <= parseFloat(item.reorderLevel || 0)
        : true
      return matchesSearch && matchesFilter
    })
  }, [items, search, filter])

  const openAddItem = () => {
    setEditingItem(null)
    setItemForm({
      sku: '',
      name: '',
      category: '',
      unit: '',
      purchasePrice: '',
      salePrice: '',
      quantityOnHand: '0',
      reorderLevel: '0',
      isActive: true,
      note: '',
    })
    setShowItemModal(true)
  }

  const openEditItem = (item) => {
    setEditingItem(item)
    setItemForm({
      sku: item.sku || '',
      name: item.name || '',
      category: item.category || '',
      unit: item.unit || '',
      purchasePrice: item.purchasePrice || '',
      salePrice: item.salePrice || '',
      quantityOnHand: item.quantityOnHand || '0',
      reorderLevel: item.reorderLevel || '0',
      isActive: item.isActive !== false,
      note: item.note || '',
    })
    setShowItemModal(true)
  }

  const generateSKU = (name, category) => {
    const prefix = (category || 'ITEM').substring(0, 3).toUpperCase()
    const namePart = (name || '').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 3)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}-${namePart || 'X'}-${random}`
  }

  const handleItemSubmit = async (e) => {
    e.preventDefault()
    try {
      let finalSku = itemForm.sku
      if (!finalSku) {
        finalSku = generateSKU(itemForm.name, itemForm.category)
      }

      const payload = {
        ...itemForm,
        sku: finalSku,
        purchasePrice: parseFloat(itemForm.purchasePrice || 0),
        salePrice: parseFloat(itemForm.salePrice || 0),
        quantityOnHand: parseFloat(itemForm.quantityOnHand || 0),
        reorderLevel: parseFloat(itemForm.reorderLevel || 0),
      }
      if (editingItem) {
        await api.put(`/inventory/items/${editingItem.id}`, payload)
      } else {
        await api.post('/inventory/items', payload)
      }
      setShowItemModal(false)
      fetchItems()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save inventory item')
    }
  }

  const handleTransactionSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/inventory/transactions', {
        itemId: parseInt(transactionForm.itemId),
        type: transactionForm.type,
        quantity: parseFloat(transactionForm.quantity),
        unitPrice: parseFloat(transactionForm.unitPrice),
        reference: transactionForm.reference,
        note: transactionForm.note,
      })
      setShowTransactionModal(false)
      if (selectedItem) {
        fetchItems()
        fetchTransactions(selectedItem.id)
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to record transaction')
    }
  }

  const handleDeleteItem = async (item) => {
    if (!confirm(`Hide item ${item.name}?`)) return
    await api.delete(`/inventory/items/${item.id}`)
    fetchItems()
    if (selectedItem?.id === item.id) {
      setSelectedItem(null)
      setTransactions([])
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage material stock, purchases, sales and low-stock alerts.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={openAddItem} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Item
          </button>
          <button onClick={fetchItems} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total items</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Value in stock</p>
          <p className="mt-3 text-3xl font-bold text-emerald-700">{fmt(totalStockValue)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Low stock</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">{lowStockCount}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-full border text-sm ${filter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >All items</button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-2 rounded-full border text-sm ${filter === 'low' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-200'}`}
          >Low stock</button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search SKU, name or category"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg w-full max-w-md"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Item</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">SKU / Category</th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Stock</th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Buy / Sell</th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Reorder</th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-5 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">Loading inventory...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">No inventory items found.</td></tr>
            ) : filteredItems.map(item => {
              const lowStock = parseFloat(item.quantityOnHand || 0) <= parseFloat(item.reorderLevel || 0)
              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50 ${lowStock ? 'bg-amber-50' : ''}`}
                >
                  <td className="px-5 py-4 align-top">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.unit || '-'} · {item.note || 'No note'}</div>
                  </td>
                  <td className="px-5 py-4 align-top text-sm text-slate-600">{item.sku || '-'} / {item.category || '-'}</td>
                  <td className="px-5 py-4 align-top text-right text-slate-900 font-semibold">{item.quantityOnHand || 0}</td>
                  <td className="px-5 py-4 align-top text-right text-slate-600">
                    <div>{fmt(item.purchasePrice)}</div>
                    <div className="text-xs text-slate-400">{fmt(item.salePrice)}</div>
                  </td>
                  <td className="px-5 py-4 align-top text-right text-slate-600">{item.reorderLevel || 0}</td>
                  <td className="px-5 py-4 align-top text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-right space-x-2">
                    <button onClick={() => { setSelectedItem(item); setShowTransactionModal(true); setTransactionForm({ itemId: item.id, type: 'SALE', quantity: '1', unitPrice: item.salePrice || '0', reference: '', note: '' }) }}
                      className="text-slate-500 hover:text-slate-900" title="New transaction">
                      <Activity className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditItem(item)} className="text-slate-500 hover:text-slate-900" title="Edit item">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteItem(item)} className="text-red-500 hover:text-red-700" title="Hide item">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {filteredItems.length > 0 && (
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan="3" className="px-5 py-3 text-sm font-semibold text-gray-700">
                  Total ({filteredItems.length} items)
                </td>
                <td className="px-5 py-3 text-sm font-bold text-gray-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(
                    filteredItems.reduce((s, i) => s + (parseFloat(i.quantityOnHand || 0) * parseFloat(i.purchasePrice || 0)), 0)
                  )}
                </td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {selectedItem && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedItem.name}</h2>
                <p className="text-sm text-slate-500">Recent transactions</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Package className="w-4 h-4" /> {selectedItem.quantityOnHand || 0} in stock
              </span>
            </div>
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No transactions yet for this item.</div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <div key={tx.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{tx.type}</p>
                          <p className="text-xs text-slate-500">{new Date(tx.createdDate).toLocaleString()}</p>
                        </div>
                        <div className="text-right text-sm text-slate-700">
                          {tx.quantity} × {fmt(tx.unitPrice)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{tx.reference || tx.note || '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Selected item</h2>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between"><span>SKU</span><span>{selectedItem.sku || '-'}</span></div>
              <div className="flex justify-between"><span>Category</span><span>{selectedItem.category || '-'}</span></div>
              <div className="flex justify-between"><span>Unit</span><span>{selectedItem.unit || '-'}</span></div>
              <div className="flex justify-between"><span>Stock</span><span>{selectedItem.quantityOnHand || 0}</span></div>
              <div className="flex justify-between"><span>Reorder level</span><span>{selectedItem.reorderLevel || 0}</span></div>
              <div className="flex justify-between"><span>Buy price</span><span>{fmt(selectedItem.purchasePrice)}</span></div>
              <div className="flex justify-between"><span>Sell price</span><span>{fmt(selectedItem.salePrice)}</span></div>
            </div>
            <button onClick={() => openEditItem(selectedItem)} className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              <Edit className="w-4 h-4" /> Edit item
            </button>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-semibold">{editingItem ? 'Edit' : 'Add'} Inventory Item</h2>
                <p className="mt-1 text-sm text-slate-500">Track purchase price, sale price, quantity and reorder level.</p>
              </div>
              <button onClick={() => setShowItemModal(false)} className="text-slate-500 hover:text-slate-900">Close</button>
            </div>
            <form onSubmit={handleItemSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">SKU (Auto-generated if empty)</label>
                <div className="mt-2 flex gap-2">
                  <input type="text" value={itemForm.sku}
                    onChange={e => setItemForm({ ...itemForm, sku: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2" />
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, sku: generateSKU(itemForm.name, itemForm.category) })}
                    className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                    title="Generate SKU"
                  >
                    <Wand2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input type="text" required value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Category</label>
                <input type="text" value={itemForm.category}
                  onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Unit</label>
                <input type="text" value={itemForm.unit}
                  onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Purchase price</label>
                <input type="number" min="0" step="1000" required value={itemForm.purchasePrice}
                  onChange={e => setItemForm({ ...itemForm, purchasePrice: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Sell price</label>
                <input type="number" min="0" step="1000" required value={itemForm.salePrice}
                  onChange={e => setItemForm({ ...itemForm, salePrice: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Stock quantity</label>
                <input type="number" min="0" step="0.01" required value={itemForm.quantityOnHand}
                  onChange={e => setItemForm({ ...itemForm, quantityOnHand: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Reorder level</label>
                <input type="number" min="0" step="0.01" required value={itemForm.reorderLevel}
                  onChange={e => setItemForm({ ...itemForm, reorderLevel: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Note</label>
                <textarea value={itemForm.note}
                  onChange={e => setItemForm({ ...itemForm, note: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2" rows={3}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-3">
                <button type="button" onClick={() => setShowItemModal(false)} className="rounded-xl border border-slate-200 px-5 py-2 text-sm text-slate-700">Cancel</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-semibold">Add stock transaction</h2>
                <p className="mt-1 text-sm text-slate-500">Record purchase, sale or adjustment and update inventory automatically.</p>
              </div>
              <button onClick={() => setShowTransactionModal(false)} className="text-slate-500 hover:text-slate-900">Close</button>
            </div>
            <form onSubmit={handleTransactionSubmit} className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Item</label>
                <select value={transactionForm.itemId} required
                  onChange={e => setTransactionForm({ ...transactionForm, itemId: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="">-- Choose item --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name} · Stock {item.quantityOnHand || 0}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Transaction type</label>
                  <select value={transactionForm.type}
                    onChange={e => setTransactionForm({ ...transactionForm, type: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
                  >
                    {TRANSACTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Quantity</label>
                  <input type="number" min="0.01" step="0.01" required value={transactionForm.quantity}
                    onChange={e => setTransactionForm({ ...transactionForm, quantity: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Unit price</label>
                  <input type="number" min="0" step="1000" required value={transactionForm.unitPrice}
                    onChange={e => setTransactionForm({ ...transactionForm, unitPrice: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Reference</label>
                  <input type="text" value={transactionForm.reference}
                    onChange={e => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Note</label>
                <textarea value={transactionForm.note}
                  onChange={e => setTransactionForm({ ...transactionForm, note: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2" rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowTransactionModal(false)} className="rounded-xl border border-slate-200 px-5 py-2 text-sm text-slate-700">Cancel</button>
                <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
