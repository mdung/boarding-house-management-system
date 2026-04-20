import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import {
  Plus, Edit2, Trash2, Activity, Package, RefreshCw, Wand2,
  X, AlertTriangle, TrendingDown, TrendingUp, Search, ChevronRight,
  Tag, Settings, Check, ArrowUp, ArrowDown, RotateCcw, ShoppingCart
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtQty = (n) => { const v = parseFloat(n || 0); return Number.isInteger(v) ? v.toString() : v.toFixed(1) }

const DEFAULT_CATEGORIES = ['Food & Drink', 'Beverage', 'Toiletries', 'Cleaning', 'Electronics', 'Furniture', 'Other']

const TYPE_CFG = {
  PURCHASE: { label: 'Purchase',   icon: ArrowDown,   color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', sign: '+' },
  SALE:     { label: 'Sale',       icon: ArrowUp,     color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-400',    sign: '-' },
  ADJUSTMENT:{ label: 'Adjust',   icon: Settings,    color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-400',   sign: '±' },
  RETURN:   { label: 'Return',     icon: RotateCcw,   color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-400',  sign: '+' },
}

const inputCls = 'w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'

const Inventory = () => {
  const [items, setItems] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showTxModal, setShowTxModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('ALL')
  const [filterStock, setFilterStock] = useState('all')
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inv_categories') || 'null') || DEFAULT_CATEGORIES } catch { return DEFAULT_CATEGORIES }
  })
  const [newCatInput, setNewCatInput] = useState('')
  const [animIn, setAnimIn] = useState(false)

  const [itemForm, setItemForm] = useState({
    sku: '', name: '', category: '', unit: 'bottle',
    purchasePrice: '', salePrice: '',
    quantityOnHand: '0', reorderLevel: '5',
    isActive: true, note: '',
  })

  const [txForm, setTxForm] = useState({
    itemId: '', type: 'PURCHASE', quantity: '1', unitPrice: '0', reference: '', note: '',
  })

  useEffect(() => { fetchItems() }, [])
  useEffect(() => { if (selectedItem) fetchTransactions(selectedItem.id); else setTransactions([]) }, [selectedItem])
  useEffect(() => { if (showItemModal || showTxModal) requestAnimationFrame(() => setAnimIn(true)); else setAnimIn(false) }, [showItemModal, showTxModal])

  const saveCategories = (cats) => { setCategories(cats); localStorage.setItem('inv_categories', JSON.stringify(cats)) }

  const fetchItems = async () => {
    setLoading(true)
    try { const r = await api.get('/inventory/items/all'); setItems(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchTransactions = async (id) => {
    try { const r = await api.get('/inventory/transactions', { params: { itemId: id } }); setTransactions(r.data) }
    catch (e) { console.error(e) }
  }

  const stats = useMemo(() => ({
    total: items.filter(i => i.isActive).length,
    value: items.reduce((s, i) => s + parseFloat(i.quantityOnHand||0) * parseFloat(i.purchasePrice||0), 0),
    lowStock: items.filter(i => i.isActive && parseFloat(i.quantityOnHand||0) <= parseFloat(i.reorderLevel||0)).length,
    categories: [...new Set(items.map(i => i.category).filter(Boolean))].length,
  }), [items])

  const allCats = useMemo(() => {
    const fromItems = [...new Set(items.map(i => i.category).filter(Boolean))]
    return [...new Set([...categories, ...fromItems])].sort()
  }, [items, categories])

  const filtered = useMemo(() => items.filter(item => {
    const term = search.toLowerCase()
    const matchSearch = !term || item.name?.toLowerCase().includes(term) || item.sku?.toLowerCase().includes(term) || item.category?.toLowerCase().includes(term)
    const matchCat = filterCat === 'ALL' || item.category === filterCat
    const matchStock = filterStock === 'low' ? parseFloat(item.quantityOnHand||0) <= parseFloat(item.reorderLevel||0) : true
    return matchSearch && matchCat && matchStock
  }), [items, search, filterCat, filterStock])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(item => {
      const cat = item.category || 'Uncategorized'
      if (!map[cat]) map[cat] = []
      map[cat].push(item)
    })
    return map
  }, [filtered])

  const generateSKU = (name, cat) => {
    const p = (cat || 'ITEM').substring(0, 3).toUpperCase()
    const n = (name || '').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 3) || 'X'
    return `${p}-${n}-${Math.floor(1000 + Math.random() * 9000)}`
  }

  const openAdd = () => {
    setEditingItem(null)
    setItemForm({ sku: '', name: '', category: allCats[0] || '', unit: 'bottle', purchasePrice: '', salePrice: '', quantityOnHand: '0', reorderLevel: '5', isActive: true, note: '' })
    setShowItemModal(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setItemForm({ sku: item.sku||'', name: item.name||'', category: item.category||'', unit: item.unit||'', purchasePrice: item.purchasePrice||'', salePrice: item.salePrice||'', quantityOnHand: item.quantityOnHand||'0', reorderLevel: item.reorderLevel||'0', isActive: item.isActive!==false, note: item.note||'' })
    setShowItemModal(true)
  }

  const openTx = (item) => {
    setSelectedItem(item)
    setTxForm({ itemId: item.id, type: 'PURCHASE', quantity: '1', unitPrice: item.purchasePrice||'0', reference: '', note: '' })
    setShowTxModal(true)
  }

  const handleItemSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...itemForm, sku: itemForm.sku || generateSKU(itemForm.name, itemForm.category), purchasePrice: parseFloat(itemForm.purchasePrice||0), salePrice: parseFloat(itemForm.salePrice||0), quantityOnHand: parseInt(itemForm.quantityOnHand||0), reorderLevel: parseInt(itemForm.reorderLevel||0) }
      if (editingItem) await api.put(`/inventory/items/${editingItem.id}`, payload)
      else await api.post('/inventory/items', payload)
      setShowItemModal(false); fetchItems()
    } catch (err) { alert(err.response?.data?.message || 'Failed to save') }
  }

  const handleTxSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/inventory/transactions', { itemId: parseInt(txForm.itemId), type: txForm.type, quantity: parseInt(txForm.quantity), unitPrice: parseFloat(txForm.unitPrice), reference: txForm.reference, note: txForm.note })
      setShowTxModal(false); fetchItems()
      if (selectedItem) fetchTransactions(selectedItem.id)
    } catch (err) { alert(err.response?.data?.message || 'Failed') }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Hide "${item.name}"?`)) return
    await api.delete(`/inventory/items/${item.id}`); fetchItems()
    if (selectedItem?.id === item.id) setSelectedItem(null)
  }

  return (
    <div className="space-y-5">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}} .fade-up{animation:fadeUp 0.3s ease both} .scale-in{animation:scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both}`}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Inventory</h1>
            <p className="text-xs text-slate-400 font-medium">Stock · Purchases · Sales · Alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 shadow-sm transition-all">
            <Tag className="w-3.5 h-3.5" /> Categories
          </button>
          <button onClick={fetchItems} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <Plus className="w-4 h-4" /> New Item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: stats.total, icon: Package, color: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
          { label: 'Stock Value', value: fmt(stats.value), icon: TrendingUp, color: 'bg-gradient-to-br from-emerald-500 to-teal-600', small: true },
          { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: stats.lowStock > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-slate-400 to-slate-500' },
          { label: 'Categories', value: allCats.length, icon: Tag, color: 'bg-gradient-to-br from-violet-500 to-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm fade-up" style={{ animationDelay: `${i*50}ms` }}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-[18px] h-[18px] text-white" />
            </div>
            <p className={`font-black text-slate-900 leading-none ${s.small ? 'text-base' : 'text-2xl'}`}>{s.value}</p>
            <p className="text-xs text-slate-400 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="search" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStock(f => f === 'low' ? 'all' : 'low')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${filterStock === 'low' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-rose-300'}`}>
            <AlertTriangle className="w-3 h-3" /> Low Stock {stats.lowStock > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${filterStock==='low'?'bg-white/20':'bg-rose-100 text-rose-600'}`}>{stats.lowStock}</span>}
          </button>
          <button onClick={() => setFilterCat('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${filterCat==='ALL'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
            All
          </button>
          {allCats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(f => f === cat ? 'ALL' : cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${filterCat===cat?'bg-orange-500 text-white border-orange-500':'bg-white text-slate-500 border-slate-200 hover:border-orange-300'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items grouped by category */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center gap-3 text-slate-300 shadow-sm">
          <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-300 shadow-sm">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">No items found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([cat, catItems]) => (
            <div key={cat} className="space-y-3 fade-up">
              {/* Category header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{cat}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{catItems.length}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  Value: {fmt(catItems.reduce((s,i)=>s+parseFloat(i.quantityOnHand||0)*parseFloat(i.purchasePrice||0),0))}
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-5 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                      <th className="px-5 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                      <th className="px-5 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Buy / Sell</th>
                      <th className="px-5 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Reorder</th>
                      <th className="px-5 py-2.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-5 py-2.5 w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {catItems.map(item => {
                      const low = parseFloat(item.quantityOnHand||0) <= parseFloat(item.reorderLevel||0)
                      const active = selectedItem?.id === item.id
                      return (
                        <tr key={item.id} onClick={() => setSelectedItem(s => s?.id === item.id ? null : item)}
                          className={`cursor-pointer transition-all ${active ? 'bg-orange-50' : low ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50/60'}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${low ? 'bg-rose-100' : 'bg-orange-100'}`}>
                                <Package className={`w-4 h-4 ${low ? 'text-rose-500' : 'text-orange-500'}`} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{item.name}</p>
                                <p className="text-[10px] text-slate-400">{item.unit || '—'} · {item.sku || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-sm font-black ${low ? 'text-rose-600' : 'text-slate-800'}`}>{fmtQty(item.quantityOnHand)}</span>
                            {low && <div className="text-[9px] font-black text-rose-400 uppercase">Low</div>}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className="text-xs font-bold text-slate-600">{fmt(item.purchasePrice)}</p>
                            <p className="text-[10px] text-slate-400">{fmt(item.salePrice)}</p>
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-slate-500">{fmtQty(item.reorderLevel)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                              {item.isActive ? 'Active' : 'Hidden'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openTx(item)} title="Add transaction"
                                className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-all">
                                <Activity className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openEdit(item)} title="Edit"
                                className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-all">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(item)} title="Hide"
                                className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                 {catItems.map(item => {
                    const low = parseFloat(item.quantityOnHand||0) <= parseFloat(item.reorderLevel||0)
                    const active = selectedItem?.id === item.id
                    return (
                      <div key={item.id} onClick={() => setSelectedItem(s => s?.id === item.id ? null : item)}
                        className={`bg-white rounded-[1.5rem] p-4 border transition-all ${active ? 'border-orange-400 ring-1 ring-orange-400 bg-orange-50/30' : low ? 'border-rose-200 bg-rose-50/20' : 'border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                             <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${low ? 'bg-rose-100' : 'bg-orange-100'}`}>
                               <Package className={`w-4 h-4 ${low ? 'text-rose-500' : 'text-orange-500'}`} />
                             </div>
                             <div>
                               <p className="text-sm font-black text-slate-800 leading-tight">{item.name}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.sku || 'No SKU'}</p>
                             </div>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg border uppercase tracking-wider ${item.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                             {item.isActive ? 'Active' : 'Hidden'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                           <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100">
                             <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">In Stock</p>
                             <div className="flex items-baseline gap-1.5">
                               <span className={`text-base font-black ${low ? 'text-rose-600' : 'text-slate-800'}`}>{fmtQty(item.quantityOnHand)}</span>
                               <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span>
                             </div>
                           </div>
                           <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100">
                             <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Price (Sale)</p>
                             <p className="text-xs font-black text-slate-800">{fmt(item.salePrice)}</p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] text-slate-400 font-bold uppercase">Reorder @ {fmtQty(item.reorderLevel)}</span>
                             {low && <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[8px] font-black rounded-md uppercase animate-pulse">Low Stock</span>}
                          </div>
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openTx(item)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"><Activity className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openEdit(item)} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(item)} className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    )
                 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected item detail */}
      {selectedItem && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden fade-up">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-orange-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <Package className="w-4.5 h-4.5 text-orange-600 w-[18px] h-[18px]" />
              </div>
              <div>
                <p className="font-black text-slate-900">{selectedItem.name}</p>
                <p className="text-[10px] text-slate-400">{selectedItem.category} · {selectedItem.sku}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openTx(selectedItem)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">
                <Plus className="w-3 h-3" /> Transaction
              </button>
              <button onClick={() => setSelectedItem(null)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-slate-200 transition-all">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="p-5">
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => {
                  const cfg = TYPE_CFG[tx.type] || TYPE_CFG.ADJUSTMENT
                  const TIcon = cfg.icon
                  return (
                    <div key={tx.id} className={`flex items-center gap-3 p-3 rounded-2xl ${cfg.color} bg-opacity-30`}>
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <TIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black">{cfg.label}</span>
                          <span className="text-[10px] text-slate-400">{tx.createdDate}</span>
                        </div>
                        {(tx.reference || tx.note) && <p className="text-[10px] text-slate-500 truncate">{tx.reference || tx.note}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black">{cfg.sign}{fmtQty(tx.quantity)}</p>
                        <p className="text-[10px] text-slate-400">{fmt(tx.amount)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Item Modal ── */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 modal-fix p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowItemModal(false)}>
          <div className={`bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden transition-all duration-300 ${animIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-black text-white text-lg">{editingItem ? 'Edit Item' : 'New Item'}</h2>
                <p className="text-white/70 text-xs mt-0.5">Track stock, prices and reorder levels</p>
              </div>
              <button onClick={() => setShowItemModal(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <form onSubmit={handleItemSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SKU</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={itemForm.sku} onChange={e => setItemForm({...itemForm, sku: e.target.value})}
                      placeholder="Auto-generated" className={inputCls} />
                    <button type="button" onClick={() => setItemForm({...itemForm, sku: generateSKU(itemForm.name, itemForm.category)})}
                      className="w-10 flex-shrink-0 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center transition-colors">
                      <Wand2 className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Name *</label>
                  <input type="text" required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                  <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className={inputCls}>
                    <option value="">— Select —</option>
                    {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unit</label>
                  <input type="text" value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})}
                    placeholder="bottle, box, kg..." className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Purchase Price</label>
                  <input type="number" min="0" step="1" required value={itemForm.purchasePrice} onChange={e => setItemForm({...itemForm, purchasePrice: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sale Price</label>
                  <input type="number" min="0" step="1" required value={itemForm.salePrice} onChange={e => setItemForm({...itemForm, salePrice: e.target.value})} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Stock Qty</label>
                  <input type="number" min="0" step="1" required value={itemForm.quantityOnHand} onChange={e => setItemForm({...itemForm, quantityOnHand: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reorder Level</label>
                  <input type="number" min="0" step="1" required value={itemForm.reorderLevel} onChange={e => setItemForm({...itemForm, reorderLevel: e.target.value})} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Note</label>
                <textarea value={itemForm.note} onChange={e => setItemForm({...itemForm, note: e.target.value})}
                  rows={2} className={inputCls + ' resize-none'} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowItemModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transaction Modal ── */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 modal-fix p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowTxModal(false)}>
          <div className={`bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transition-all duration-300 ${animIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="font-black text-white text-lg">Add Transaction</h2>
                <p className="text-white/70 text-xs mt-0.5">{selectedItem?.name} · Stock: {fmtQty(selectedItem?.quantityOnHand)}</p>
              </div>
              <button onClick={() => setShowTxModal(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <form onSubmit={handleTxSubmit} className="p-6 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                    const TIcon = cfg.icon
                    return (
                      <button key={type} type="button" onClick={() => setTxForm({...txForm, type, unitPrice: type==='PURCHASE' ? selectedItem?.purchasePrice||'0' : selectedItem?.salePrice||'0'})}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border text-[10px] font-black transition-all ${txForm.type===type ? `${cfg.color} border-current shadow-sm` : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                        <TIcon className="w-4 h-4" />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity</label>
                  <input type="number" min="1" step="1" required value={txForm.quantity} onChange={e => setTxForm({...txForm, quantity: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unit Price</label>
                  <input type="number" min="0" step="1" required value={txForm.unitPrice} onChange={e => setTxForm({...txForm, unitPrice: e.target.value})} className={inputCls} />
                </div>
              </div>
              {txForm.quantity && txForm.unitPrice && (
                <div className="bg-blue-50 rounded-2xl px-4 py-2.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-600">Total</span>
                  <span className="text-sm font-black text-blue-700">{fmt(parseFloat(txForm.quantity||0)*parseFloat(txForm.unitPrice||0))}</span>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Note</label>
                <input type="text" value={txForm.note} onChange={e => setTxForm({...txForm, note: e.target.value})}
                  placeholder="Optional..." className={inputCls} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowTxModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Category Manager Modal ── */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 modal-fix p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCatModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-6 py-5 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="font-black text-white text-lg">Categories</h2>
                <p className="text-white/70 text-xs mt-0.5">Add, rename or remove categories</p>
              </div>
              <button onClick={() => setShowCatModal(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newCatInput} onChange={e => setNewCatInput(e.target.value)}
                  placeholder="New category name..." className={inputCls}
                  onKeyDown={e => { if (e.key==='Enter' && newCatInput.trim()) { saveCategories([...new Set([...categories, newCatInput.trim()])]); setNewCatInput('') }}} />
                <button type="button" onClick={() => { if (newCatInput.trim()) { saveCategories([...new Set([...categories, newCatInput.trim()])]); setNewCatInput('') }}}
                  className="w-10 flex-shrink-0 bg-violet-600 hover:bg-violet-700 rounded-2xl flex items-center justify-center transition-colors">
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {allCats.map(cat => {
                  const inUse = items.some(i => i.category === cat)
                  return (
                    <div key={cat} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-2xl group">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-400" />
                        <span className="text-sm font-bold text-slate-700">{cat}</span>
                        {inUse && <span className="text-[9px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">in use</span>}
                      </div>
                      {!inUse && (
                        <button onClick={() => saveCategories(categories.filter(c => c !== cat))}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-rose-100 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setShowCatModal(false)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all mt-2">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
