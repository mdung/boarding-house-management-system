import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useProperty } from '../../context/PropertyContext'
import { Plus, Edit, Trash2, X, FlaskConical, Package, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all bg-white'

const CATEGORIES = [
  { value: 'FOOD_DRINK', label: '🍺 Food & Drink' },
  { value: 'SERVICE',    label: '🛵 Service' },
]

const ServiceCatalog = () => {
  const { selectedId: propertyId, properties } = useProperty()
  const [items, setItems] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [expandedRecipes, setExpandedRecipes] = useState({})
  const [toast, setToast] = useState(null) // { message, type: 'success'|'error' }
  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000) }
  const [formData, setFormData] = useState({
    name: '', category: 'FOOD_DRINK', unit: '', defaultPrice: '',
    icon: '', isActive: true, sortOrder: 0,
    inventoryItemId: null, boardingHouseId: null,
    recipes: [],
  })

  useEffect(() => { fetchData() }, [propertyId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const bhParam = propertyId !== 'ALL' ? `?boardingHouseId=${propertyId}` : ''
      const invParam = propertyId !== 'ALL' ? `?boardingHouseId=${propertyId}` : ''
      const [catalogRes, inventoryRes] = await Promise.all([
        api.get(`/service-catalog/all${bhParam}`),
        api.get(`/inventory/items${invParam}`),
      ])
      setItems(catalogRes.data)
      setInventoryItems(inventoryRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openAdd = () => {
    setEditing(null)
    setFormData({
      name: '', category: 'FOOD_DRINK', unit: '', defaultPrice: '',
      icon: '', isActive: true, sortOrder: 0, inventoryItemId: null,
      boardingHouseId: propertyId !== 'ALL' ? parseInt(propertyId) : null,
      recipes: [],
    })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setFormData({
      name: item.name, category: item.category, unit: item.unit || '',
      defaultPrice: item.defaultPrice, icon: item.icon || '',
      isActive: item.isActive, sortOrder: item.sortOrder || 0,
      inventoryItemId: item.inventoryItemId || null,
      boardingHouseId: item.boardingHouseId || null,
      recipes: item.recipes?.map(r => ({
        inventoryItemId: r.inventoryItemId?.toString() || '',
        quantityPerUnit: r.quantityPerUnit?.toString() || '1',
        inventoryItemName: r.inventoryItemName || '',
        inventoryItemUnit: r.inventoryItemUnit || '',
      })) || [],
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
        inventoryItemId: formData.inventoryItemId || null,
        recipes: formData.recipes
          .filter(r => r.inventoryItemId && parseFloat(r.quantityPerUnit) > 0)
          .map(r => ({ inventoryItemId: parseInt(r.inventoryItemId), quantityPerUnit: parseFloat(r.quantityPerUnit) })),
      }
      if (editing) await api.put(`/service-catalog/${editing.id}`, payload)
      else await api.post('/service-catalog', payload)
      setShowModal(false)
      showToast(editing ? 'Đã cập nhật!' : 'Đã thêm service!', 'success')
      fetchData()
    } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Ẩn service này?')) return
    await api.delete(`/service-catalog/${id}`)
    fetchData()
  }

  const addRecipeLine = () => setFormData(p => ({
    ...p, recipes: [...p.recipes, { inventoryItemId: '', quantityPerUnit: '1', inventoryItemName: '', inventoryItemUnit: '' }]
  }))

  const updateRecipeLine = (idx, field, value) => {
    setFormData(p => ({
      ...p,
      recipes: p.recipes.map((r, i) => {
        if (i !== idx) return r
        if (field === 'inventoryItemId') {
          const inv = inventoryItems.find(it => it.id === parseInt(value))
          return { ...r, inventoryItemId: value, inventoryItemName: inv?.name || '', inventoryItemUnit: inv?.unit || '' }
        }
        return { ...r, [field]: value }
      })
    }))
  }

  const removeRecipeLine = (idx) => setFormData(p => ({ ...p, recipes: p.recipes.filter((_, i) => i !== idx) }))

  const grouped = CATEGORIES.map(cat => ({ ...cat, items: items.filter(i => i.category === cat.value) }))

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 transition-all animate-[slideDown_0.3s_ease]
          ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          <span>{toast.type === 'error' ? '❌' : '✅'}</span> {toast.message}
        </div>
      )}

      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Service Catalog</h1>
          <p className="text-sm text-slate-400 mt-0.5">Danh mục dịch vụ · Giá bán · Định mức nguyên liệu</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={async () => {
            try {
              const bhParam = propertyId !== 'ALL' ? `?boardingHouseId=${propertyId}` : ''
              const r = await api.post(`/service-catalog/auto-link${bhParam}`)
              showToast(`Đã tự động link ${r.data} items với kho!`)
              fetchData()
            } catch (e) { showToast(e.response?.data?.message || 'Lỗi', 'error') }
          }}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all"
            title="Tự động link SC items với Inventory items cùng tên">
            🔗 Auto-link kho
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> Thêm Service
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {grouped.map(cat => {
          const catColor = cat.value === 'FOOD_DRINK' ? { bg: 'from-amber-500 to-orange-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' }
            : { bg: 'from-blue-500 to-indigo-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' }
          return (
          <div key={cat.value} className="space-y-3" style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Category header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${catColor.bg} flex items-center justify-center shadow-sm`}>
                  <span className="text-sm">{cat.value === 'FOOD_DRINK' ? '🍺' : '🛵'}</span>
                </div>
                <div>
                  <h2 className="font-black text-slate-800 text-sm">{cat.label}</h2>
                  <p className="text-[10px] text-slate-400">{cat.items.length} dịch vụ</p>
                </div>
              </div>
            </div>

            {cat.items.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-bold text-slate-400">Chưa có service nào</p>
                <button onClick={openAdd} className="mt-3 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all">
                  + Thêm service đầu tiên
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.items.map((item, idx) => {
                  const hasRecipe = item.recipes?.length > 0
                  const isExpanded = expandedRecipes[item.id]
                  const hasStock = item.stockQuantity != null
                  return (
                    <div key={item.id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${!item.isActive ? 'opacity-40' : 'border-slate-100'}`}
                      style={{ animation: `fadeIn 0.3s ease ${idx * 50}ms both` }}>
                      {/* Card header */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 text-base leading-tight">{item.name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {item.unit && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{item.unit}</span>}
                              {!item.isActive && <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Ẩn</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-lg font-black text-slate-900">{fmt(item.defaultPrice)}</p>
                            <p className="text-[10px] text-slate-400">/{item.unit || 'đơn vị'}</p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {hasRecipe && (
                            <button onClick={() => setExpandedRecipes(p => ({ ...p, [item.id]: !p[item.id] }))}
                              className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-emerald-100 transition-all">
                              <FlaskConical className="w-2.5 h-2.5" /> Recipe ({item.recipes.length})
                              {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                          )}
                          {item.inventoryItemName && !hasRecipe && (
                            <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Package className="w-2.5 h-2.5" /> {item.inventoryItemName}
                            </span>
                          )}
                          {hasStock && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${parseFloat(item.stockQuantity) <= 0 ? 'text-rose-600 bg-rose-50 border border-rose-200' : parseFloat(item.stockQuantity) <= 5 ? 'text-amber-600 bg-amber-50 border border-amber-200' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'}`}>
                              📦 {item.stockQuantity} {item.stockUnit || ''}
                            </span>
                          )}
                          {!item.inventoryItemName && !hasRecipe && (
                            <span className="text-[9px] text-slate-300 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">Chưa link kho</span>
                          )}
                        </div>

                        {/* Recipe expand */}
                        {hasRecipe && isExpanded && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 mb-3" style={{ animation: 'fadeIn 0.2s ease' }}>
                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Định mức / 1 {item.unit || 'đơn vị'}</p>
                            {item.recipes.map((r, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                <span className="text-slate-600">{r.inventoryItemName}</span>
                                <span className="text-slate-300">×</span>
                                <span className="font-black text-emerald-700">{r.quantityPerUnit} {r.inventoryItemUnit}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                          <button onClick={() => openEdit(item)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all">
                            <Edit className="w-3 h-3" /> Sửa
                          </button>
                          <button onClick={() => handleDelete(item.id)}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )})}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
          style={{ animation: 'fadeIn 0.2s ease' }}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalPop 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

            <style>{`
              @keyframes fadeIn{from{opacity:0}to{opacity:1}}
              @keyframes modalPop{from{opacity:0;transform:scale(0.92) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
            `}</style>

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between flex-shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <h2 className="font-black text-white text-lg">{editing ? '✏️ Sửa Service' : '✨ Thêm Service'}</h2>
                <p className="text-white/60 text-xs mt-0.5">Tên · Giá · Định mức nguyên liệu</p>
              </div>
              <button onClick={() => setShowModal(false)} className="relative w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all hover:rotate-90 duration-200">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Nhà trọ */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">🏠 Nhà trọ</label>
                <select value={formData.boardingHouseId || ''}
                  onChange={e => setFormData({...formData, boardingHouseId: e.target.value ? parseInt(e.target.value) : null})}
                  className={inputCls}>
                  <option value="">— Global (tất cả nhà trọ) —</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Category + Name with suggestions */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Danh mục *</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button"
                      onClick={() => setFormData({...formData, category: c.value})}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${formData.category === c.value
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Quick suggestions based on category */}
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tên service *</label>
                <input required type="text" value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder={formData.category === 'FOOD_DRINK' ? '🍺 Beer, ☕ Coffee, 🍜 Phở...' : '🛵 Xe máy, 👕 Giặt đồ, 🧹 Dọn phòng...'}
                  className={inputCls} />

                {/* Suggestion chips */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(formData.category === 'FOOD_DRINK'
                    ? ['🍺 Beer', '☕ Coffee', '🥤 Coke', '💧 Water', '🍳 Breakfast', '🍱 Lunch', '🍜 Dinner', '🍫 Snack', '🧃 Juice', '🍶 Rượu']
                    : ['🛵 Thuê xe máy', '🚲 Thuê xe đạp', '👕 Giặt đồ', '🧹 Dọn phòng', '🏙️ City Tour', '🚗 Đưa đón sân bay', '🖨️ In ấn', '📦 Gửi đồ']
                  ).map(s => (
                    <button key={s} type="button"
                      onClick={() => {
                        setFormData({...formData, name: s})
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-150 ${formData.name === s
                        ? 'bg-blue-600 text-white shadow-sm scale-105'
                        : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:scale-105'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Unit + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đơn vị</label>
                  <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                    placeholder={formData.category === 'FOOD_DRINK' ? 'lon, ly, đĩa...' : 'ngày, chuyến, kg...'}
                    className={inputCls} />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {(formData.category === 'FOOD_DRINK'
                      ? ['lon', 'chai', 'ly', 'đĩa', 'set', 'phần']
                      : ['ngày', 'chuyến', 'kg', 'lần', 'trang', 'giờ']
                    ).map(u => (
                      <button key={u} type="button" onClick={() => setFormData({...formData, unit: u})}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${formData.unit === u ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Giá bán *</label>
                  <input required type="number" value={formData.defaultPrice}
                    onChange={e => setFormData({...formData, defaultPrice: e.target.value})}
                    placeholder="0" className={inputCls + ' text-lg font-black'} />
                  {formData.defaultPrice > 0 && (
                    <p className="text-[10px] text-blue-600 font-bold mt-1 ml-1">{fmt(formData.defaultPrice)} / {formData.unit || 'đơn vị'}</p>
                  )}
                </div>
              </div>

              {/* Inventory link 1:1 */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  📦 Link kho 1:1 <span className="font-normal normal-case text-slate-300">(đồ đóng gói - trừ thẳng)</span>
                </label>
                <select value={formData.inventoryItemId || ''}
                  onChange={e => setFormData({...formData, inventoryItemId: e.target.value ? Number(e.target.value) : null})}
                  className={inputCls}>
                  <option value="">— Không link (dùng Recipe bên dưới nếu cần) —</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} · Tồn: {item.quantityOnHand} {item.unit || ''}</option>
                  ))}
                </select>
              </div>

              {/* Recipe section */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                      <FlaskConical className="w-3.5 h-3.5" /> Định mức nguyên liệu (Recipe)
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      Bán 1 {formData.unit || 'đơn vị'} → tự động trừ kho theo định mức
                    </p>
                  </div>
                  <button type="button" onClick={addRecipeLine}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                    <Plus className="w-3 h-3" /> Thêm
                  </button>
                </div>

                {formData.recipes.length === 0 ? (
                  <p className="text-[10px] text-emerald-400 text-center py-3">
                    Không có định mức → trừ kho qua link 1:1 ở trên (nếu có)
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formData.recipes.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-xl p-2.5 border border-emerald-100 shadow-sm"
                        style={{ animation: `fadeIn 0.2s ease ${idx * 50}ms both` }}>
                        <div className="flex-1 min-w-0">
                          <select value={r.inventoryItemId}
                            onChange={e => updateRecipeLine(idx, 'inventoryItemId', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                            <option value="">— Chọn nguyên liệu —</option>
                            {inventoryItems.map(it => (
                              <option key={it.id} value={it.id}>{it.name} ({it.unit}) · Tồn: {it.quantityOnHand}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px] text-slate-400">×</span>
                          <input type="number" min="0.001" step="0.001" value={r.quantityPerUnit}
                            onChange={e => updateRecipeLine(idx, 'quantityPerUnit', e.target.value)}
                            className="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-center font-black focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                          <span className="text-[10px] text-slate-500 w-8 truncate">{r.inventoryItemUnit || '—'}</span>
                        </div>
                        <button type="button" onClick={() => removeRecipeLine(idx)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-rose-100 text-slate-300 hover:text-rose-500 transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {formData.recipes.some(r => r.inventoryItemId) && (
                      <div className="bg-emerald-100/80 rounded-xl px-3 py-2.5 text-[10px] text-emerald-700 border border-emerald-200">
                        <strong>📊 Khi bán 1 {formData.unit || 'đơn vị'} {formData.name || '?'}:</strong>
                        {formData.recipes.filter(r => r.inventoryItemId).map((r, i) => (
                          <span key={i}> trừ <strong>{r.quantityPerUnit} {r.inventoryItemUnit}</strong> {r.inventoryItemName}{i < formData.recipes.filter(x => x.inventoryItemId).length - 1 ? ' +' : ''}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input type="checkbox" id="isActive" checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 rounded accent-blue-600" />
                <label htmlFor="isActive" className="text-sm text-slate-700 font-medium">Hiển thị trong danh sách</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Hủy</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:scale-[0.98]">
                  {editing ? '💾 Lưu thay đổi' : '✨ Thêm Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceCatalog
