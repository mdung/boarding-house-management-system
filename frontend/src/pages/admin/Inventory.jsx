import { useEffect, useMemo, useState, useRef } from 'react'
import api from '../../services/api'
import { useProperty } from '../../context/PropertyContext'
import {
  Plus, Edit2, Trash2, Activity, Package, RefreshCw, Wand2,
  X, AlertTriangle, TrendingUp, Search,
  Tag, Settings, ArrowUp, ArrowDown, RotateCcw, Building2,
  ShoppingBag, Droplets, Zap, Coffee, ChevronDown, ChevronUp,
  Boxes, FlaskConical, Layers
} from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtQty = (n) => { const v = parseFloat(n || 0); return Number.isInteger(v) ? v.toString() : v.toFixed(2).replace(/\.?0+$/, '') }

// Nhóm hàng theo tư vấn Gemini
const ITEM_GROUPS = [
  { key: 'PACKAGED',    label: 'Đồ đóng gói',   desc: 'Trừ 1:1',           emoji: '📦', color: 'from-blue-500 to-cyan-500',    bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   examples: 'Beer, Coke, Water, Cigarette' },
  { key: 'INGREDIENT',  label: 'Nguyên liệu',    desc: 'Trừ theo định mức', emoji: '🧪', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50',border: 'border-emerald-200',text: 'text-emerald-700',examples: 'Hạt cà phê, Hành vòng, Tôm' },
  { key: 'OTHER',       label: 'Khác',           desc: 'Tự quản lý',        emoji: '🗂️', color: 'from-slate-400 to-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-600',  examples: 'Vật tư, Đồ dùng' },
]

const TYPE_CFG = {
  PURCHASE:   { label: 'Nhập kho',  icon: ArrowDown,  color: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-400', sign: '+', desc: 'Tăng tồn kho' },
  SALE:       { label: 'Bán ra',    icon: ArrowUp,    color: 'bg-blue-100 text-blue-700',       ring: 'ring-blue-400',    sign: '-', desc: 'Giảm tồn kho' },
  ADJUSTMENT: { label: 'Điều chỉnh',icon: Settings,   color: 'bg-amber-100 text-amber-700',     ring: 'ring-amber-400',   sign: '±', desc: 'Số âm = giảm' },
  RETURN:     { label: 'Hoàn trả',  icon: RotateCcw,  color: 'bg-violet-100 text-violet-700',   ring: 'ring-violet-400',  sign: '+', desc: 'Tăng tồn kho' },
}

const QUICK_UNITS = ['lon', 'chai', 'bao', 'kg', 'g', 'lít', 'ml', 'cái', 'hộp', 'túi', 'set']

const inputCls = 'w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white'

// Stock bar visual
const StockBar = ({ qty, reorder, unit }) => {
  const q = parseFloat(qty || 0)
  const r = parseFloat(reorder || 0)
  const max = Math.max(r * 3, q * 1.2, 1)
  const pct = Math.min((q / max) * 100, 100)
  const low = q <= r
  const critical = q <= r * 0.5
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className={`text-lg font-black leading-none ${critical ? 'text-rose-600' : low ? 'text-amber-600' : 'text-slate-800'}`}>
          {fmtQty(q)}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">{unit}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${critical ? 'bg-rose-500' : low ? 'bg-amber-400' : 'bg-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {low && (
        <p className={`text-[9px] font-black uppercase tracking-wide ${critical ? 'text-rose-500' : 'text-amber-500'}`}>
          {critical ? '⚠ Sắp hết' : '↓ Sắp hết hàng'}
        </p>
      )}
    </div>
  )
}

const Inventory = () => {
  const { selectedId: propertyId, properties } = useProperty()
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
  const [filterGroup, setFilterGroup] = useState('ALL')
  const [filterStock, setFilterStock] = useState('all')
  const [collapsedCats, setCollapsedCats] = useState({})
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inv_categories') || 'null') || [] } catch { return [] }
  })
  const [newCatInput, setNewCatInput] = useState('')
  const [animIn, setAnimIn] = useState(false)
  const [txSuccess, setTxSuccess] = useState(null)
  const [catalogItems, setCatalogItems] = useState([]) // service catalog items for PACKAGED dropdown
  // Recipe lines for INGREDIENT: [{ catalogItemId, catalogItemName, qtyPerUnit }]
  const [itemRecipes, setItemRecipes] = useState([])
  // Quick restock inline
  const [restockItemId, setRestockItemId] = useState(null)
  const [restockQty, setRestockQty] = useState('')
  const [restockPrice, setRestockPrice] = useState('')
  const [restocking, setRestocking] = useState(false)

  const [itemForm, setItemForm] = useState({
    sku: '', name: '', category: '', unit: 'lon',
    purchasePrice: '', salePrice: '',
    quantityOnHand: '0', reorderLevel: '5',
    isActive: true, note: '',
    boardingHouseId: '',
    itemGroup: 'PACKAGED',
  })

  const [txForm, setTxForm] = useState({
    itemId: '', type: 'PURCHASE', quantity: '1', unitPrice: '0', reference: '', note: '',
  })

  useEffect(() => { fetchItems() }, [propertyId])
  useEffect(() => { if (selectedItem) fetchTransactions(selectedItem.id); else setTransactions([]) }, [selectedItem])
  useEffect(() => { if (showItemModal || showTxModal) requestAnimationFrame(() => setAnimIn(true)); else setAnimIn(false) }, [showItemModal, showTxModal])

  // Fetch service catalog items when modal opens or boardingHouseId changes (for PACKAGED dropdown)
  useEffect(() => {
    if (!showItemModal) return
    const bhId = itemForm.boardingHouseId
    if (!bhId) { setCatalogItems([]); return }
    api.get(`/service-catalog?boardingHouseId=${bhId}`).then(r => setCatalogItems(r.data || [])).catch(() => {})
  }, [showItemModal, itemForm.boardingHouseId])

  const saveCategories = (cats) => { setCategories(cats); localStorage.setItem('inv_categories', JSON.stringify(cats)) }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = propertyId !== 'ALL' ? { boardingHouseId: propertyId } : {}
      const r = await api.get('/inventory/items/all', { params })
      setItems(r.data)
    } catch (e) { console.error(e) }
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
    const matchGroup = filterGroup === 'ALL' || (item.itemGroup || 'OTHER') === filterGroup
    const matchStock = filterStock === 'low' ? parseFloat(item.quantityOnHand||0) <= parseFloat(item.reorderLevel||0) : true
    return matchSearch && matchCat && matchGroup && matchStock
  }), [items, search, filterCat, filterGroup, filterStock])

  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(item => {
      const cat = item.category || 'Chưa phân loại'
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
    setItemRecipes([])
    setItemForm({
      sku: '', name: '', category: allCats[0] || '', unit: 'lon',
      purchasePrice: '', salePrice: '', quantityOnHand: '0', reorderLevel: '5',
      isActive: true, note: '',
      boardingHouseId: propertyId !== 'ALL' ? propertyId : (properties[0]?.id?.toString() || ''),
      itemGroup: 'PACKAGED',
    })
    setShowItemModal(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    // Load existing recipes if any (from item.recipes field if backend returns it)
    setItemRecipes(item.recipes?.map(r => ({
      catalogItemId: r.catalogItemId || '',
      catalogItemName: r.catalogItemName || '',
      qtyPerUnit: r.qtyPerUnit?.toString() || '1',
    })) || [])
    setItemForm({
      sku: item.sku||'', name: item.name||'', category: item.category||'',
      unit: item.unit||'', purchasePrice: item.purchasePrice||'', salePrice: item.salePrice||'',
      quantityOnHand: item.quantityOnHand||'0', reorderLevel: item.reorderLevel||'0',
      isActive: item.isActive!==false, note: item.note||'',
      boardingHouseId: item.boardingHouseId?.toString() || '',
      itemGroup: item.itemGroup || 'PACKAGED',
    })
    setShowItemModal(true)
  }

  const openTx = (item, e) => {
    if (e) e.stopPropagation()
    setSelectedItem(item)
    setTxForm({ itemId: item.id, type: 'PURCHASE', quantity: '1', unitPrice: item.purchasePrice||'0', reference: '', note: '' })
    setShowTxModal(true)
  }

  const handleItemSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...itemForm,
        sku: itemForm.sku || generateSKU(itemForm.name, itemForm.category),
        purchasePrice: parseFloat(itemForm.purchasePrice||0),
        salePrice: itemForm.itemGroup === 'PACKAGED' ? 0 : parseFloat(itemForm.salePrice||0),
        quantityOnHand: parseFloat(itemForm.quantityOnHand||0),
        reorderLevel: parseFloat(itemForm.reorderLevel||0),
        boardingHouseId: itemForm.boardingHouseId ? parseInt(itemForm.boardingHouseId) : null,
        // Include recipes for INGREDIENT type
        recipes: itemForm.itemGroup === 'INGREDIENT'
          ? itemRecipes.filter(r => r.catalogItemId && parseFloat(r.qtyPerUnit) > 0).map(r => ({
              catalogItemId: parseInt(r.catalogItemId),
              qtyPerUnit: parseFloat(r.qtyPerUnit),
            }))
          : [],
      }
      if (editingItem) await api.put(`/inventory/items/${editingItem.id}`, payload)
      else await api.post('/inventory/items', payload)
      setShowItemModal(false); fetchItems()
    } catch (err) { alert(err.response?.data?.message || 'Failed to save') }
  }

  const handleTxSubmit = async (e) => {
    e.preventDefault()
    try {
      const qty = txForm.type === 'ADJUSTMENT' ? parseFloat(txForm.quantity) : parseFloat(txForm.quantity)
      await api.post('/inventory/transactions', {
        itemId: parseInt(txForm.itemId), type: txForm.type,
        quantity: qty, unitPrice: parseFloat(txForm.unitPrice),
        reference: txForm.reference, note: txForm.note
      })
      setShowTxModal(false)
      setTxSuccess(`${TYPE_CFG[txForm.type].label} ${fmtQty(qty)} ${selectedItem?.unit || ''} thành công`)
      setTimeout(() => setTxSuccess(null), 3000)
      fetchItems()
      if (selectedItem) fetchTransactions(selectedItem.id)
    } catch (err) { alert(err.response?.data?.message || 'Failed') }
  }

  const handleDelete = async (item, e) => {
    if (e) e.stopPropagation()
    if (!confirm(`Ẩn "${item.name}"?`)) return
    await api.delete(`/inventory/items/${item.id}`); fetchItems()
    if (selectedItem?.id === item.id) setSelectedItem(null)
  }

  const toggleCat = (cat) => setCollapsedCats(p => ({ ...p, [cat]: !p[cat] }))

  const openRestock = (item, e) => {
    if (e) e.stopPropagation()
    setRestockItemId(item.id)
    setRestockQty('')
    setRestockPrice(item.purchasePrice?.toString() || '0')
  }

  const handleRestock = async (item) => {
    if (!restockQty || parseFloat(restockQty) <= 0) return
    setRestocking(true)
    try {
      await api.post('/inventory/transactions', {
        itemId: item.id,
        type: 'PURCHASE',
        quantity: parseFloat(restockQty),
        unitPrice: parseFloat(restockPrice || 0),
        reference: 'Quick restock',
        note: `Nhập thêm ${restockQty} ${item.unit || ''}`
      })
      setRestockItemId(null)
      setTxSuccess(`Đã nhập thêm ${restockQty} ${item.unit || ''} ${item.name}`)
      setTimeout(() => setTxSuccess(null), 3000)
      fetchItems()
    } catch (err) {
      setTxSuccess(null)
      alert(err.response?.data?.message || 'Lỗi nhập kho')
    }
    finally { setRestocking(false) }
  }

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(0.94)}to{opacity:1;transform:scale(1)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-soft{0%,100%{opacity:1}50%{opacity:0.6}}
        .fade-up{animation:fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both}
        .scale-in{animation:scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both}
        .slide-down{animation:slideDown 0.2s ease both}
        .pulse-soft{animation:pulse-soft 2s ease-in-out infinite}
      `}</style>

      {/* Toast success */}
      {txSuccess && (
        <div className="fixed top-4 right-4 z-[100] slide-down bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2">
          <span>✅</span> {txSuccess}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Kho hàng</h1>
            <p className="text-xs text-slate-400 font-medium">Nhập · Xuất · Tồn kho · Cảnh báo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCatModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 shadow-sm transition-all">
            <Tag className="w-3.5 h-3.5" /> Danh mục
          </button>
          <button onClick={fetchItems} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <Plus className="w-4 h-4" /> Thêm hàng
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Tổng mặt hàng', value: stats.total, icon: Package, color: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
          { label: 'Giá trị kho', value: fmt(stats.value), icon: TrendingUp, color: 'bg-gradient-to-br from-emerald-500 to-teal-600', small: true },
          { label: 'Sắp hết hàng', value: stats.lowStock, icon: AlertTriangle, color: stats.lowStock > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-slate-400 to-slate-500' },
          { label: 'Danh mục', value: allCats.length, icon: Tag, color: 'bg-gradient-to-br from-violet-500 to-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm fade-up" style={{ animationDelay: `${i*60}ms` }}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-[18px] h-[18px] text-white" />
            </div>
            <p className={`font-black text-slate-900 leading-none ${s.small ? 'text-base' : 'text-2xl'}`}>{s.value}</p>
            <p className="text-xs text-slate-400 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Group tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterGroup('ALL')}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${filterGroup==='ALL'?'bg-slate-900 text-white border-slate-900 shadow-md':'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
          Tất cả
        </button>
        {ITEM_GROUPS.map(g => (
          <button key={g.key} onClick={() => setFilterGroup(f => f === g.key ? 'ALL' : g.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${filterGroup===g.key?`bg-gradient-to-r ${g.color} text-white border-transparent shadow-md`:'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
            <span>{g.emoji}</span> {g.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${filterGroup===g.key?'bg-white/20 text-white':'bg-slate-100 text-slate-500'}`}>
              {items.filter(i => (i.itemGroup||'OTHER') === g.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="search" placeholder="Tìm hàng hóa..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterStock(f => f === 'low' ? 'all' : 'low')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${filterStock==='low'?'bg-rose-600 text-white border-rose-600 shadow-md':'bg-white text-slate-500 border-slate-200 hover:border-rose-300'}`}>
            <AlertTriangle className="w-3 h-3" /> Sắp hết
            {stats.lowStock > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${filterStock==='low'?'bg-white/20':'bg-rose-100 text-rose-600'}`}>{stats.lowStock}</span>}
          </button>
          <button onClick={() => setFilterCat('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${filterCat==='ALL'?'bg-slate-800 text-white border-slate-800':'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
            Tất cả DM
          </button>
          {allCats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(f => f === cat ? 'ALL' : cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${filterCat===cat?'bg-orange-500 text-white border-orange-500':'bg-white text-slate-500 border-slate-200 hover:border-orange-300'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 flex flex-col items-center gap-3 text-slate-300 shadow-sm">
          <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold">Đang tải...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center text-slate-300 shadow-sm">
          <Boxes className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold">Không có hàng hóa</p>
          <button onClick={openAdd} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all">
            + Thêm hàng đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([cat, catItems], catIdx) => {
            const collapsed = collapsedCats[cat]
            const catValue = catItems.reduce((s,i) => s + parseFloat(i.quantityOnHand||0)*parseFloat(i.purchasePrice||0), 0)
            const catLow = catItems.filter(i => parseFloat(i.quantityOnHand||0) <= parseFloat(i.reorderLevel||0)).length
            return (
              <div key={cat} className="fade-up" style={{ animationDelay: `${catIdx*80}ms` }}>
                {/* Category header - clickable to collapse */}
                <button onClick={() => toggleCat(cat)}
                  className="w-full flex items-center justify-between px-1 mb-3 group">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{cat}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{catItems.length}</span>
                    {catLow > 0 && (
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full pulse-soft">
                        {catLow} sắp hết
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400">{fmt(catValue)}</span>
                    {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
                  </div>
                </button>

                {!collapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {catItems.map((item, idx) => {
                      const low = parseFloat(item.quantityOnHand||0) <= parseFloat(item.reorderLevel||0)
                      const critical = parseFloat(item.quantityOnHand||0) <= parseFloat(item.reorderLevel||0) * 0.5
                      const grp = ITEM_GROUPS.find(g => g.key === (item.itemGroup||'OTHER')) || ITEM_GROUPS[2]
                      const isSelected = selectedItem?.id === item.id
                      return (
                        <div key={item.id}
                          onClick={() => setSelectedItem(s => s?.id === item.id ? null : item)}
                          className={`relative bg-white rounded-2xl border p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md fade-up
                            ${isSelected ? 'border-orange-400 ring-2 ring-orange-200 shadow-md' : critical ? 'border-rose-300 bg-rose-50/30' : low ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100 hover:border-orange-200'}`}
                          style={{ animationDelay: `${idx*40}ms` }}>

                          {/* Group badge */}
                          <div className={`absolute top-3 right-3 text-[9px] font-black px-1.5 py-0.5 rounded-lg ${grp.bg} ${grp.text} border ${grp.border}`}>
                            {grp.emoji} {grp.label}
                          </div>

                          {/* Item name + SKU */}
                          <div className="mb-3 pr-16">
                            <p className="font-black text-slate-900 text-sm leading-tight">{item.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.sku || '—'}</p>
                            {item.boardingHouseName && propertyId === 'ALL' && (
                              <p className="text-[10px] text-blue-500 font-semibold mt-0.5">🏠 {item.boardingHouseName}</p>
                            )}
                          </div>

                          {/* Stock bar */}
                          <StockBar qty={item.quantityOnHand} reorder={item.reorderLevel} unit={item.unit} />

                          {/* Prices + Actions */}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">Nhập / Bán</p>
                              <p className="text-xs font-black text-slate-700">{fmt(item.purchasePrice)} <span className="text-slate-300">/</span> <span className="text-emerald-600">{fmt(item.salePrice)}</span></p>
                            </div>
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={(e) => openRestock(item, e)} title="Nhập thêm hàng"
                                className="w-7 h-7 flex items-center justify-center rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all hover:scale-110">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => openTx(item, e)} title="Giao dịch kho"
                                className="w-7 h-7 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all">
                                <Activity className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openEdit(item) }} title="Sửa"
                                className="w-7 h-7 flex items-center justify-center rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => handleDelete(item, e)} title="Ẩn"
                                className="w-7 h-7 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Quick Restock inline form */}
                          {restockItemId === item.id && (
                            <div className="mt-3 pt-3 border-t border-emerald-200 bg-emerald-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-2xl"
                              onClick={e => e.stopPropagation()}
                              style={{ animation: 'fadeIn 0.2s ease' }}>
                              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">📥 Nhập thêm {item.name}</p>
                              <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <label className="text-[9px] text-slate-400 font-bold">Số lượng</label>
                                  <input type="number" min="0.1" step="0.1" value={restockQty}
                                    onChange={e => setRestockQty(e.target.value)}
                                    placeholder="0" autoFocus
                                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-xl text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                                  <p className="text-[9px] text-slate-400 text-center mt-0.5">{item.unit}</p>
                                </div>
                                <div className="flex-1">
                                  <label className="text-[9px] text-slate-400 font-bold">Đơn giá</label>
                                  <input type="number" min="0" step="1" value={restockPrice}
                                    onChange={e => setRestockPrice(e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-emerald-300 rounded-xl text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                                </div>
                                <button onClick={() => handleRestock(item)} disabled={restocking || !restockQty || parseFloat(restockQty) <= 0}
                                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 disabled:opacity-40 transition-all shadow-sm flex-shrink-0">
                                  {restocking ? '...' : '✓'}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setRestockItemId(null) }}
                                  className="px-2 py-1.5 text-slate-400 hover:text-slate-600 transition-all flex-shrink-0">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {restockQty && parseFloat(restockQty) > 0 && restockPrice && (
                                <div className="flex justify-between items-center mt-2 bg-emerald-100 rounded-lg px-3 py-1.5 text-[10px]">
                                  <span className="text-emerald-600">Thành tiền: <strong>{fmt(parseFloat(restockQty) * parseFloat(restockPrice))}</strong></span>
                                  <span className="text-emerald-700 font-black">Tồn sau: {fmtQty(parseFloat(item.quantityOnHand) + parseFloat(restockQty))} {item.unit}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Inactive overlay */}
                          {!item.isActive && (
                            <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                              <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Đã ẩn</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Transaction history panel */}
      {selectedItem && (
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden fade-up">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <Activity className="w-[18px] h-[18px] text-orange-600" />
              </div>
              <div>
                <p className="font-black text-slate-900">{selectedItem.name}</p>
                <p className="text-[10px] text-slate-400">{selectedItem.category} · Tồn: <strong>{fmtQty(selectedItem.quantityOnHand)} {selectedItem.unit}</strong></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => openTx(selectedItem, e)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all shadow-sm">
                <Plus className="w-3 h-3" /> Giao dịch
              </button>
              <button onClick={() => setSelectedItem(null)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-slate-200 transition-all">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="p-5">
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p className="text-sm text-slate-400">Chưa có giao dịch nào</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transactions.map((tx, i) => {
                  const cfg = TYPE_CFG[tx.type] || TYPE_CFG.ADJUSTMENT
                  const TIcon = cfg.icon
                  return (
                    <div key={tx.id} className={`flex items-center gap-3 p-3 rounded-2xl ${cfg.color} bg-opacity-40 slide-down`} style={{ animationDelay: `${i*30}ms` }}>
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
                        <p className="text-sm font-black">{cfg.sign}{fmtQty(tx.quantity)} {selectedItem.unit}</p>
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
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowItemModal(false)}
          style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalPop 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

            <style>{`
              @keyframes fadeIn{from{opacity:0}to{opacity:1}}
              @keyframes modalPop{from{opacity:0;transform:scale(0.92) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
            `}</style>

            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 px-6 py-5 flex items-center justify-between flex-shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <h2 className="font-black text-white text-lg">{editingItem ? '✏️ Sửa hàng hóa' : '✨ Thêm hàng mới'}</h2>
                <p className="text-white/60 text-xs mt-0.5">Quản lý tồn kho, giá và mức cảnh báo</p>
              </div>
              <button onClick={() => setShowItemModal(false)} className="relative w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all hover:rotate-90 duration-200">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <form onSubmit={handleItemSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* Item Group selector */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Loại hàng</label>
                <div className="grid grid-cols-3 gap-2">
                  {ITEM_GROUPS.map(g => (
                    <button key={g.key} type="button" onClick={() => setItemForm({...itemForm, itemGroup: g.key})}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border text-center transition-all duration-200 hover:-translate-y-0.5 ${itemForm.itemGroup===g.key ? `bg-gradient-to-br ${g.color} text-white border-transparent shadow-lg` : `${g.bg} ${g.border} ${g.text} hover:shadow-md`}`}>
                      <span className="text-xl">{g.emoji}</span>
                      <span className="text-[10px] font-black">{g.label}</span>
                      <span className={`text-[8px] font-medium ${itemForm.itemGroup===g.key?'text-white/80':'text-slate-400'}`}>{g.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SKU + Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">SKU</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={itemForm.sku} onChange={e => setItemForm({...itemForm, sku: e.target.value})}
                      placeholder="Tự tạo" className={inputCls} />
                    <button type="button" onClick={() => setItemForm({...itemForm, sku: generateSKU(itemForm.name, itemForm.category)})}
                      className="w-10 flex-shrink-0 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center transition-all hover:scale-105">
                      <Wand2 className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tên hàng *</label>
                  {itemForm.itemGroup === 'PACKAGED' && catalogItems.length > 0 ? (
                    <select required value={itemForm.name}
                      onChange={e => {
                        const selected = catalogItems.find(c => c.name === e.target.value)
                        setItemForm({ ...itemForm, name: e.target.value, unit: selected?.unit || itemForm.unit })
                      }}
                      className={inputCls}>
                      <option value="">— Chọn từ Service Catalog —</option>
                      {catalogItems.map(c => (
                        <option key={c.id} value={c.name}>{c.name} ({fmt(c.defaultPrice)})</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})}
                      placeholder={itemForm.itemGroup === 'INGREDIENT' ? 'VD: Hạt cà phê, Hành vòng...' : 'VD: Khăn tắm, Bóng đèn...'}
                      className={inputCls} />
                  )}
                </div>
              </div>

              {/* Name suggestion chips */}
              <div className="flex gap-1.5 flex-wrap -mt-2">
                {(itemForm.itemGroup === 'PACKAGED'
                  ? ['🍺 Beer', '🥤 Coke', '💧 Water', '☕ Coffee', '🚬 Cigarette', '🧃 Juice', '🍫 Snack']
                  : itemForm.itemGroup === 'INGREDIENT'
                  ? ['☕ Hạt cà phê', '🥔 Khoai tây', '🧅 Hành vòng', '🦐 Tôm', '🥩 Thịt bò', '🥛 Sữa tươi', '🧈 Bơ']
                  : ['🧹 Chổi', '💡 Bóng đèn', '🧴 Nước lau sàn', '🧻 Giấy vệ sinh', '🛏️ Ga trải giường']
                ).map(s => (
                  <button key={s} type="button"
                    onClick={() => setItemForm({...itemForm, name: s})}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-150 ${itemForm.name === s
                      ? 'bg-orange-500 text-white shadow-sm scale-105'
                      : 'bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:scale-105'}`}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Boarding House */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Nhà trọ *
                </label>
                <select required value={itemForm.boardingHouseId} onChange={e => setItemForm({...itemForm, boardingHouseId: e.target.value})} className={inputCls}>
                  <option value="">— Chọn nhà trọ —</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Unit + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đơn vị tính</label>
                  <input type="text" value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})}
                    placeholder={itemForm.itemGroup === 'INGREDIENT' ? 'kg, g, lít, ml...' : 'lon, chai, cái...'}
                    className={inputCls} />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {(itemForm.itemGroup === 'INGREDIENT'
                      ? ['kg', 'g', 'lít', 'ml', 'túi', 'hộp']
                      : ['lon', 'chai', 'bao', 'cái', 'hộp', 'cuộn']
                    ).map(u => (
                      <button key={u} type="button" onClick={() => setItemForm({...itemForm, unit: u})}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${itemForm.unit===u?'bg-orange-500 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Danh mục</label>
                  <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className={inputCls}>
                    <option value="">— Chọn —</option>
                    {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Nhập kho section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-blue-800 flex items-center gap-1.5">📥 Thông tin nhập kho</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Số lượng nhập</label>
                    <input type="number" min="0" step="0.1" required value={itemForm.quantityOnHand}
                      onChange={e => setItemForm({...itemForm, quantityOnHand: e.target.value})} className={inputCls + ' text-lg font-black'} />
                    <p className="text-[10px] text-slate-400 mt-0.5 ml-1">{itemForm.unit || 'đơn vị'}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đơn giá nhập</label>
                    <input type="number" min="0" step="1" required value={itemForm.purchasePrice}
                      onChange={e => setItemForm({...itemForm, purchasePrice: e.target.value})} className={inputCls + ' text-lg font-black'} placeholder="0" />
                    <p className="text-[10px] text-slate-400 mt-0.5 ml-1">VND / {itemForm.unit || 'đơn vị'}</p>
                  </div>
                </div>
                {parseFloat(itemForm.quantityOnHand) > 0 && parseFloat(itemForm.purchasePrice) > 0 && (
                  <div className="flex justify-between items-center bg-blue-100/80 rounded-xl px-4 py-2.5 border border-blue-200"
                    style={{ animation: 'fadeIn 0.2s ease' }}>
                    <span className="text-xs font-bold text-blue-700">💰 Thành tiền</span>
                    <span className="text-xl font-black text-blue-800">
                      {fmt(parseFloat(itemForm.quantityOnHand) * parseFloat(itemForm.purchasePrice))}
                    </span>
                  </div>
                )}
              </div>

              {/* Giá bán */}
              {itemForm.itemGroup !== 'PACKAGED' ? (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Giá bán</label>
                  <input type="number" min="0" step="1" value={itemForm.salePrice}
                    onChange={e => setItemForm({...itemForm, salePrice: e.target.value})} className={inputCls} placeholder="0" />
                  {itemForm.purchasePrice && itemForm.salePrice && parseFloat(itemForm.salePrice) > parseFloat(itemForm.purchasePrice) && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1 ml-1">
                      📈 Lãi: {fmt(parseFloat(itemForm.salePrice) - parseFloat(itemForm.purchasePrice))} / {itemForm.unit || 'đơn vị'}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  💡 Giá bán đã khai báo trong <strong>Service Catalog</strong>, không cần nhập lại
                </p>
              )}

              {/* Mức cảnh báo */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">⚠️ Mức cảnh báo</label>
                <input type="number" min="0" step="0.1" required value={itemForm.reorderLevel}
                  onChange={e => setItemForm({...itemForm, reorderLevel: e.target.value})} className={inputCls} />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Cảnh báo khi tồn ≤ mức này</p>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">📝 Ghi chú</label>
                <textarea value={itemForm.note} onChange={e => setItemForm({...itemForm, note: e.target.value})}
                  rows={2} placeholder="Nhà cung cấp, lưu ý bảo quản..." className={inputCls + ' resize-none'} />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowItemModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Hủy</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]">
                  {editingItem ? '💾 Lưu thay đổi' : '✨ Thêm hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transaction Modal ── */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTxModal(false)}
          style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalPop 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div className={`px-6 py-5 flex items-center justify-between bg-gradient-to-r ${
              txForm.type === 'PURCHASE' ? 'from-emerald-500 to-teal-600' :
              txForm.type === 'SALE' ? 'from-blue-500 to-indigo-600' :
              txForm.type === 'RETURN' ? 'from-violet-500 to-purple-600' :
              'from-amber-500 to-orange-500'
            }`}>
              <div>
                <h2 className="font-black text-white text-lg">Giao dịch kho</h2>
                <p className="text-white/70 text-xs mt-0.5">{selectedItem?.name} · Tồn: <strong>{fmtQty(selectedItem?.quantityOnHand)} {selectedItem?.unit}</strong></p>
              </div>
              <button onClick={() => setShowTxModal(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <form onSubmit={handleTxSubmit} className="p-6 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Loại giao dịch</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                    const TIcon = cfg.icon
                    return (
                      <button key={type} type="button"
                        onClick={() => setTxForm({...txForm, type, unitPrice: type==='PURCHASE' ? selectedItem?.purchasePrice||'0' : selectedItem?.salePrice||'0'})}
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl border text-left transition-all ${txForm.type===type ? `${cfg.color} border-current shadow-sm ring-2 ${cfg.ring}` : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${txForm.type===type ? 'bg-white/50' : 'bg-white'}`}>
                          <TIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-black">{cfg.label}</p>
                          <p className="text-[9px] opacity-70">{cfg.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Số lượng {txForm.type === 'ADJUSTMENT' && <span className="text-amber-500 normal-case font-normal">(âm = giảm)</span>}
                  </label>
                  <input type="number"
                    min={txForm.type === 'ADJUSTMENT' ? undefined : '0.1'}
                    step="0.1" required value={txForm.quantity}
                    onChange={e => setTxForm({...txForm, quantity: e.target.value})}
                    className={inputCls + ' text-lg font-black'} />
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">{selectedItem?.unit}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đơn giá</label>
                  <input type="number" min="0" step="1" required value={txForm.unitPrice}
                    onChange={e => setTxForm({...txForm, unitPrice: e.target.value})} className={inputCls} />
                  <div className="flex gap-1 mt-1.5">
                    <button type="button" onClick={() => setTxForm({...txForm, unitPrice: selectedItem?.purchasePrice||'0'})}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-500 transition-all">
                      Giá nhập
                    </button>
                    <button type="button" onClick={() => setTxForm({...txForm, unitPrice: selectedItem?.salePrice||'0'})}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-500 transition-all">
                      Giá bán
                    </button>
                  </div>
                </div>
              </div>

              {txForm.quantity && txForm.unitPrice && (
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Thành tiền</p>
                    <p className="text-lg font-black text-slate-800">{fmt(Math.abs(parseFloat(txForm.quantity||0)) * parseFloat(txForm.unitPrice||0))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tồn sau</p>
                    <p className={`text-lg font-black ${
                      (txForm.type === 'PURCHASE' || txForm.type === 'RETURN') ? 'text-emerald-600' :
                      txForm.type === 'SALE' ? 'text-blue-600' : 'text-amber-600'
                    }`}>
                      {fmtQty(
                        txForm.type === 'PURCHASE' || txForm.type === 'RETURN'
                          ? parseFloat(selectedItem?.quantityOnHand||0) + parseFloat(txForm.quantity||0)
                          : txForm.type === 'SALE'
                          ? parseFloat(selectedItem?.quantityOnHand||0) - parseFloat(txForm.quantity||0)
                          : parseFloat(selectedItem?.quantityOnHand||0) + parseFloat(txForm.quantity||0)
                      )} {selectedItem?.unit}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ghi chú</label>
                <input type="text" value={txForm.note} onChange={e => setTxForm({...txForm, note: e.target.value})}
                  placeholder="Nhà cung cấp, lý do điều chỉnh..." className={inputCls} />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowTxModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Hủy</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  Xác nhận
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
                <h2 className="font-black text-white text-lg">Danh mục</h2>
                <p className="text-white/70 text-xs mt-0.5">Thêm, đổi tên hoặc xóa danh mục</p>
              </div>
              <button onClick={() => setShowCatModal(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newCatInput} onChange={e => setNewCatInput(e.target.value)}
                  placeholder="Tên danh mục mới..." className={inputCls}
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
                        {inUse && <span className="text-[9px] font-black text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">đang dùng</span>}
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
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
