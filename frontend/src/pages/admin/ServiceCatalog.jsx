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
      fetchData()
    } catch (e) { alert(e.response?.data?.message || 'Error') }
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
              alert(`Đã tự động link ${r.data} items với kho!`)
              fetchData()
            } catch (e) { alert(e.response?.data?.message || 'Error') }
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
        {grouped.map(cat => (
          <div key={cat.value} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
              <h2 className="font-black text-slate-700">{cat.label} <span className="text-slate-400 font-normal text-sm">({cat.items.length})</span></h2>
            </div>
            {cat.items.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-300">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Chưa có service nào</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {cat.items.map(item => {
                  const hasRecipe = item.recipes?.length > 0
                  const isExpanded = expandedRecipes[item.id]
                  return (
                    <div key={item.id} className={!item.isActive ? 'opacity-40' : ''}>
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-800">{item.name}</span>
                            {item.unit && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{item.unit}</span>}
                            {hasRecipe && (
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <FlaskConical className="w-2.5 h-2.5" /> Recipe ({item.recipes.length})
                              </span>
                            )}
                            {item.inventoryItemName && !hasRecipe && (
                              <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Package className="w-2.5 h-2.5" /> {item.inventoryItemName}
                              </span>
                            )}
                            {item.boardingHouseName && propertyId === 'ALL' && (
                              <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">🏠 {item.boardingHouseName}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black text-slate-800">{fmt(item.defaultPrice)}</p>
                          <p className="text-[10px] text-slate-400">/{item.unit || 'đơn vị'}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {hasRecipe && (
                            <button onClick={() => setExpandedRecipes(p => ({ ...p, [item.id]: !p[item.id] }))}
                              className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-emerald-100 text-emerald-500 transition-all">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button onClick={() => openEdit(item)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-all">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {hasRecipe && isExpanded && (
                        <div className="mx-5 mb-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">📐 Định mức (cho 1 {item.unit || 'đơn vị'})</p>
                          <div className="space-y-1.5">
                            {item.recipes.map((r, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                <span className="font-bold text-slate-700">{r.inventoryItemName}</span>
                                <span className="text-slate-400">×</span>
                                <span className="font-black text-emerald-700">{r.quantityPerUnit} {r.inventoryItemUnit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-black text-white text-lg">{editing ? 'Sửa Service' : 'Thêm Service'}</h2>
                <p className="text-white/70 text-xs mt-0.5">Tên · Giá · Định mức nguyên liệu</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nhà trọ</label>
                <select value={formData.boardingHouseId || ''}
                  onChange={e => setFormData({...formData, boardingHouseId: e.target.value ? parseInt(e.target.value) : null})}
                  className={inputCls}>
                  <option value="">— Global (tất cả nhà trọ) —</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tên service *</label>
                  <input required type="text" value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="🍺 Beer, ☕ Coffee..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Danh mục *</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Đơn vị</label>
                  <input type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
                    placeholder="ly, đĩa, set..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Giá bán *</label>
                  <input required type="number" value={formData.defaultPrice}
                    onChange={e => setFormData({...formData, defaultPrice: e.target.value})}
                    placeholder="0" className={inputCls} />
                </div>
              </div>

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

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-emerald-800">📐 Định mức nguyên liệu (Recipe)</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      Bán 1 {formData.unit || 'đơn vị'} → tự động trừ kho theo định mức
                    </p>
                  </div>
                  <button type="button" onClick={addRecipeLine}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-700 transition-all">
                    <Plus className="w-3 h-3" /> Thêm
                  </button>
                </div>

                {formData.recipes.length === 0 ? (
                  <p className="text-[10px] text-emerald-400 text-center py-2">
                    Không có định mức → trừ kho qua link 1:1 ở trên (nếu có)
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formData.recipes.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-emerald-100">
                        <div className="flex-1 min-w-0">
                          <select value={r.inventoryItemId}
                            onChange={e => updateRecipeLine(idx, 'inventoryItemId', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white">
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
                            className="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-center font-black focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                          <span className="text-[10px] text-slate-500 w-8 truncate">{r.inventoryItemUnit || '—'}</span>
                        </div>
                        <button type="button" onClick={() => removeRecipeLine(idx)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-rose-100 text-slate-300 hover:text-rose-500 transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {formData.recipes.some(r => r.inventoryItemId) && (
                      <div className="bg-emerald-100 rounded-lg px-3 py-2 text-[10px] text-emerald-700">
                        <strong>Khi bán 1 {formData.unit || 'đơn vị'} {formData.name || '?'}:</strong>
                        {formData.recipes.filter(r => r.inventoryItemId).map((r, i) => (
                          <span key={i}> trừ <strong>{r.quantityPerUnit} {r.inventoryItemUnit}</strong> {r.inventoryItemName}{i < formData.recipes.filter(x=>x.inventoryItemId).length - 1 ? ' +' : ''}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 rounded" />
                <label htmlFor="isActive" className="text-sm text-slate-700 font-medium">Hiển thị trong danh sách</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Hủy</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md transition-all hover:-translate-y-0.5">
                  {editing ? 'Lưu thay đổi' : 'Thêm Service'}
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
