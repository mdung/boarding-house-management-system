import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import { useProperty } from '../../context/PropertyContext'
import { Plus, Trash2, ChevronDown, ChevronUp, Search, Calendar, DollarSign, Package, ShoppingCart, Coffee, Car, Home, CheckCircle, AlertTriangle, X, Zap, Receipt } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'

const CATEGORIES = { FOOD_DRINK: '🍺 Food & Drink', SERVICE: '🛵 Service' }

const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all'
const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
    {children}
  </div>
)

const StatCard = ({ icon: Icon, label, value, color, bg, sub }) => (
  <div className={`${bg} rounded-2xl p-4 border`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-white/60`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
    <p className={`text-xl font-black mt-0.5 ${color}`}>{value}</p>
    {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
)

const GuestCharges = () => {
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const { selectedId: propertyId } = useProperty()
  const [contracts, setContracts] = useState([])
  const [catalog, setCatalog] = useState([])
  const [inventoryItems, setInventoryItems] = useState([])
  const [selectedContractId, setSelectedContractId] = useState('')
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [expandedDates, setExpandedDates] = useState({})
  const [contractSearch, setContractSearch] = useState('')
  const [chargeSearch, setChargeSearch] = useState('')
  const [activeTab, setActiveTab] = useState('catalog')
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
  const [formData, setFormData] = useState({ chargeDate: todayLocal(), catalogId: '', inventoryItemId: '', description: '', quantity: '1', unitPrice: '', note: '' })

  useEffect(() => {
    api.get('/contracts').then(r => setContracts(r.data)).catch(console.error)
    const bhParam = propertyId !== 'ALL' ? `?boardingHouseId=${propertyId}` : ''
    api.get(`/service-catalog${bhParam}`).then(r => setCatalog(r.data)).catch(console.error)
    // Only load inventory if a specific property is selected
    if (propertyId !== 'ALL') {
      api.get('/inventory/items', { params: { boardingHouseId: propertyId } }).then(r => setInventoryItems(r.data)).catch(console.error)
    } else {
      setInventoryItems([])
    }
  }, [propertyId])

  // When a contract is selected and propertyId is ALL, reload catalog+inventory for that contract's boarding house
  useEffect(() => {
    if (!selectedContractId || propertyId !== 'ALL') return
    const contract = contracts.find(c => c.id.toString() === selectedContractId)
    if (!contract?.boardingHouseId) return
    const bhId = contract.boardingHouseId
    api.get(`/service-catalog?boardingHouseId=${bhId}`).then(r => setCatalog(r.data)).catch(console.error)
    api.get('/inventory/items', { params: { boardingHouseId: bhId } }).then(r => setInventoryItems(r.data)).catch(console.error)
  }, [selectedContractId, contracts, propertyId])

  useEffect(() => { const cid = searchParams.get('contractId'); if (cid) setSelectedContractId(cid) }, [searchParams])
  useEffect(() => { if (selectedContractId) fetchSummary() }, [selectedContractId])

  const filteredContracts = useMemo(() =>
    contracts.filter(c => {
      if (propertyId !== 'ALL' && c.boardingHouseId?.toString() !== propertyId) return false
      return [c.mainTenantName, c.roomCode, c.code].some(v => v?.toLowerCase().includes(contractSearch.toLowerCase()))
    })
  , [contracts, contractSearch, propertyId])

  const filteredChargesByDate = useMemo(() => {
    const charges = summary?.charges || []
    const filtered = chargeSearch ? charges.filter(c => [c.description, c.note].some(v => v?.toLowerCase().includes(chargeSearch.toLowerCase()))) : charges
    return filtered.reduce((acc, c) => { if (!acc[c.chargeDate]) acc[c.chargeDate] = []; acc[c.chargeDate].push(c); return acc }, {})
  }, [summary?.charges, chargeSearch])

  const fetchSummary = async () => {
    setLoading(true)
    try { const r = await api.get(`/guest-charges/contract/${selectedContractId}/summary`); setSummary(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const resetForm = () => { setFormData({ chargeDate: todayLocal(), catalogId: '', inventoryItemId: '', description: '', quantity: '1', unitPrice: '', note: '' }); setActiveTab('catalog') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.description.trim()) { showToast('Please enter a description', 'error'); return }
    if (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0) { showToast('Please enter a valid unit price', 'error'); return }
    if (formData.inventoryItemId) {
      const item = inventoryItems.find(i => i.id === parseInt(formData.inventoryItemId))
      if (item && item.quantityOnHand < parseFloat(formData.quantity)) { showToast(`Insufficient stock! Available: ${item.quantityOnHand}`, 'error'); return }
    }
    try {
      await api.post('/guest-charges', { contractId: parseInt(selectedContractId), inventoryItemId: formData.inventoryItemId ? parseInt(formData.inventoryItemId) : undefined, chargeDate: formData.chargeDate, description: formData.description, quantity: parseFloat(formData.quantity), unitPrice: parseFloat(formData.unitPrice), note: formData.note })
      showToast('Charge added!', 'success'); setShowModal(false); resetForm(); fetchSummary()
    } catch (e) { showToast(e.response?.data?.message || 'Failed to save charge', 'error') }
  }

  const handleCatalogSelect = (catalogId) => {
    const item = catalog.find(c => c.id === parseInt(catalogId))
    if (item) setFormData(p => ({ ...p, catalogId, inventoryItemId: item.inventoryItemId?.toString() || '', description: item.name, unitPrice: item.defaultPrice.toString() }))
    else setFormData(p => ({ ...p, catalogId, description: '', unitPrice: '', inventoryItemId: '' }))
  }

  const handleInventorySelect = (inventoryItemId) => {
    const item = inventoryItems.find(i => i.id === parseInt(inventoryItemId))
    if (item) setFormData(p => ({ ...p, inventoryItemId, catalogId: '', description: item.name, unitPrice: item.salePrice?.toString() || '' }))
    else setFormData(p => ({ ...p, inventoryItemId, description: '', unitPrice: '', catalogId: '' }))
  }

  const quickAdd = (desc, price) => { setFormData({ chargeDate: todayLocal(), catalogId: '', inventoryItemId: '', description: desc, quantity: '1', unitPrice: price, note: '' }); setShowModal(true) }

  const handleDelete = async (id) => {
    if (!confirm('Delete this charge?')) return
    try { await api.delete(`/guest-charges/${id}`); showToast('Deleted', 'success'); fetchSummary() }
    catch { showToast('Failed to delete', 'error') }
  }

  const totalAmount = formData.quantity && formData.unitPrice ? parseFloat(formData.quantity) * parseFloat(formData.unitPrice) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Guest Service Charges</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage additional charges for guests</p>
        </div>
        {selectedContractId && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> Add Charge
          </button>
        )}
      </div>

      {/* Contract selector */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-black text-slate-900">Select Guest Contract</h2>
          <p className="text-sm text-slate-500 mt-0.5">Choose an active contract to manage charges</p>
        </div>
        <div className="p-6">
          <div className="relative max-w-md mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={contractSearch} onChange={e => setContractSearch(e.target.value)} placeholder="Search by guest name, room, or contract code..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredContracts.filter(c => c.status === 'ACTIVE').map(c => {
              const active = selectedContractId === c.id.toString()
              return (
                <button key={c.id} onClick={() => setSelectedContractId(c.id.toString())}
                  className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 shadow-md' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {c.mainTenantName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-black text-sm ${active ? 'text-blue-900' : 'text-slate-900'}`}>{c.mainTenantName}</p>
                      <p className={`text-xs mt-0.5 ${active ? 'text-blue-600' : 'text-slate-400'}`}>Room {c.roomCode} · {c.code}</p>
                    </div>
                  </div>
                  {active && <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                </button>
              )
            })}
            {filteredContracts.filter(c => c.status === 'ACTIVE').length === 0 && (
              <div className="col-span-3 py-12 text-center text-slate-400">
                <Home className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No active contracts found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>}

      {summary && !loading && (
        <>
          {/* Quick add */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Quick Add</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[['🍺 Beer','12000',Coffee,'amber'],['🥤 Coke','10000',Coffee,'blue'],['🛵 Motorbike','50000',Car,'slate'],['👕 Laundry','30000',Zap,'purple']].map(([label, price, Icon, color]) => (
                <button key={label} onClick={() => quickAdd(label, price)}
                  className={`flex flex-col items-center gap-2 p-4 bg-${color}-50 border border-${color}-100 rounded-2xl hover:border-${color}-300 hover:shadow-md transition-all hover:-translate-y-0.5`}>
                  <div className={`w-10 h-10 bg-${color}-100 rounded-2xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                  </div>
                  <span className="text-sm font-bold text-slate-800">{label}</span>
                  <span className="text-xs font-bold text-slate-500">{fmt(parseInt(price))}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Home}         label="Room Charge"      value={fmt(summary.totalRent)}    color="text-blue-700"    bg="bg-blue-50 border-blue-100"    sub={`${summary.totalNights}n × ${fmt(summary.dailyRate)}`} />
            <StatCard icon={ShoppingCart} label="Service Charges"  value={fmt(summary.totalCharges)} color="text-violet-700"  bg="bg-violet-50 border-violet-100" />
            <StatCard icon={DollarSign}   label="Paid"             value={fmt(summary.totalPaid)}    color="text-emerald-700" bg="bg-emerald-50 border-emerald-100" />
            <StatCard icon={AlertTriangle} label="Remaining"       value={fmt(summary.remainingAmount)} color={summary.remainingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'} bg={summary.remainingAmount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'} sub={`Total: ${fmt(summary.totalAmount)}`} />
          </div>

          {/* Charges list */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500" />
                <h2 className="font-black text-slate-900">Service Charges</h2>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{summary.charges?.length || 0}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={chargeSearch} onChange={e => setChargeSearch(e.target.value)} placeholder="Search charges..."
                  className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all w-56" />
              </div>
            </div>

            {Object.keys(filteredChargesByDate).length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No service charges yet</p>
                <p className="text-sm mt-1">Add charges using the buttons above</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {Object.entries(filteredChargesByDate).sort((a,b) => b[0].localeCompare(a[0])).map(([date, items]) => {
                  const dayTotal = items.reduce((s,i) => s + parseFloat(i.amount), 0)
                  const expanded = expandedDates[date] !== false
                  return (
                    <div key={date}>
                      <button onClick={() => setExpandedDates(p => ({ ...p, [date]: !p[date] }))}
                        className="w-full flex justify-between items-center px-6 py-4 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800 text-sm">{fmtDate(date)}</p>
                            <p className="text-xs text-slate-400">{items.length} charge{items.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-blue-600">{fmt(dayTotal)}</span>
                          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </button>
                      {expanded && (
                        <div className="bg-slate-50/40 border-t border-slate-100">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-100">
                                {['Description','Qty','Unit Price','Amount','Note',''].map(h => (
                                  <th key={h} className="px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {items.map(item => (
                                <tr key={item.id} className="hover:bg-white transition-colors group">
                                  <td className="px-5 py-3 text-sm font-semibold text-slate-800">{item.description}</td>
                                  <td className="px-5 py-3 text-sm text-slate-500">{item.quantity}</td>
                                  <td className="px-5 py-3 text-sm text-slate-500">{fmt(item.unitPrice)}</td>
                                  <td className="px-5 py-3 text-sm font-black text-slate-800">{fmt(item.amount)}</td>
                                  <td className="px-5 py-3 text-sm text-slate-400">{item.note || '—'}</td>
                                  <td className="px-5 py-3">
                                    <button onClick={() => handleDelete(item.id)}
                                      className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Charge Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Add Service Charge</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{summary?.tenantName} · Room {summary?.roomCode}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-8 pt-5 flex gap-2">
              {[['catalog','📋 Service Catalog'],['inventory','📦 Inventory']].map(([tab, label]) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-bold rounded-2xl transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-8 py-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[55vh] overflow-y-auto">
                {/* Left: selection */}
                <div className="space-y-4">
                  <Field label="Charge Date">
                    <input required type="date" value={formData.chargeDate} onChange={e => setFormData(f => ({ ...f, chargeDate: e.target.value }))} className={inputCls} />
                  </Field>

                  {activeTab === 'catalog' && (
                    <Field label="Choose from Catalog">
                      <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                        {catalog.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 text-xs">
                            <p className="font-semibold">No catalog items for this property.</p>
                            <p className="mt-1 text-slate-300">Go to <strong>Service Catalog</strong> to add items.</p>
                          </div>
                        ) : (
                          Object.entries(CATEGORIES).map(([catKey, catLabel]) => {
                            const catItems = catalog.filter(c => c.category === catKey)
                            if (!catItems.length) return null
                            return (
                              <div key={catKey}>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">{catLabel}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {catItems.map(item => (
                                    <button key={item.id} type="button" onClick={() => handleCatalogSelect(item.id.toString())}
                                      className={`p-3 text-left rounded-2xl border transition-all ${formData.catalogId === item.id.toString() ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-slate-50 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50'}`}>
                                      <p className="font-bold text-sm text-slate-800">{item.name}</p>
                                      <p className="text-xs text-slate-500 mt-0.5">{fmt(item.defaultPrice)}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </Field>
                  )}

                  {activeTab === 'inventory' && (
                    <Field label="Choose from Inventory">
                      <select value={formData.inventoryItemId} onChange={e => handleInventorySelect(e.target.value)} className={inputCls + ' appearance-none'}>
                        <option value="">Select item...</option>
                        {inventoryItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name} · Stock: {item.quantityOnHand} · {fmt(item.salePrice || 0)}</option>
                        ))}
                      </select>
                      {formData.inventoryItemId && (
                        <div className="mt-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-2xl text-sm font-bold text-blue-700">
                          Available: {inventoryItems.find(i => i.id === parseInt(formData.inventoryItemId))?.quantityOnHand || 0} units
                        </div>
                      )}
                    </Field>
                  )}
                </div>

                {/* Right: details */}
                <div className="space-y-4">
                  <Field label="Description">
                    <input required type="text" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Enter charge description" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Quantity">
                      <input required type="number" step="1" min="1" value={formData.quantity} onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))} className={inputCls} />
                    </Field>
                    <Field label="Unit Price (VND)">
                      <input required type="number" step="1" min="0" value={formData.unitPrice} onChange={e => setFormData(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0" className={inputCls} />
                    </Field>
                  </div>
                  {totalAmount > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                      <span className="text-sm font-bold text-blue-700">Total</span>
                      <span className="text-lg font-black text-blue-700">{fmt(totalAmount)}</span>
                    </div>
                  )}
                  <Field label="Note (Optional)">
                    <textarea value={formData.note} onChange={e => setFormData(f => ({ ...f, note: e.target.value }))} placeholder="Additional notes..." rows={3} className={inputCls + ' resize-none'} />
                  </Field>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" className="px-8 py-2.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5">
                    Add Charge
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default GuestCharges
