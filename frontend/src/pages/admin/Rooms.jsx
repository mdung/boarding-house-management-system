import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import BulkActionBar from '../../components/BulkActionBar'
import { Plus, Edit, Trash2, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, DoorOpen, X, Building2, Layers, Maximize2, Users, DollarSign } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

const STATUS_CFG = {
  AVAILABLE:   { label: 'Available',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  OCCUPIED:    { label: 'Occupied',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  MAINTENANCE: { label: 'Maintenance', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

const inputCls = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all'
const selectCls = inputCls + ' appearance-none'

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
    {children}
  </div>
)

const SortBtn = ({ field, current, dir, onSort, children }) => (
  <button onClick={() => onSort(field)} className="flex items-center gap-1 hover:text-slate-800 transition-colors group">
    {children}
    <span className="text-slate-300 group-hover:text-slate-500">
      {current === field ? (dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
    </span>
  </button>
)

const Rooms = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [rooms, setRooms] = useState([])
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [filterHouse, setFilterHouse] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState('code')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const empty = { code: '', boardingHouseId: '', floor: '', area: '', maxOccupants: '', baseRent: '', status: 'AVAILABLE' }
  const [formData, setFormData] = useState(empty)

  useEffect(() => { fetchData() }, [])

  const visibleRooms = useMemo(() => {
    let f = [...rooms]
    if (filterHouse !== 'ALL') f = f.filter(r => r.boardingHouseId?.toString() === filterHouse)
    if (filterStatus !== 'ALL') f = f.filter(r => r.status === filterStatus)
    if (searchTerm) {
      const t = searchTerm.toLowerCase()
      f = f.filter(r => [r.code, r.boardingHouseName, r.currentTenantName, r.status].some(v => v?.toLowerCase().includes(t)))
    }
    const numFields = ['floor', 'area', 'maxOccupants', 'baseRent']
    f.sort((a, b) => {
      let av = a[sortField] ?? (numFields.includes(sortField) ? 0 : '')
      let bv = b[sortField] ?? (numFields.includes(sortField) ? 0 : '')
      if (numFields.includes(sortField)) { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0 }
      return sortDir === 'asc' ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0)
    })
    return f
  }, [rooms, filterHouse, filterStatus, searchTerm, sortField, sortDir])

  const totalPages = Math.ceil(visibleRooms.length / perPage)
  const start = (page - 1) * perPage
  const paginated = visibleRooms.slice(start, start + perPage)

  const fetchData = async () => {
    try {
      const [rr, hr] = await Promise.all([api.get('/rooms'), api.get('/boarding-houses')])
      setRooms(rr.data); setHouses(hr.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...formData, boardingHouseId: parseInt(formData.boardingHouseId), floor: formData.floor ? parseInt(formData.floor) : null, area: formData.area ? parseFloat(formData.area) : null, maxOccupants: formData.maxOccupants ? parseInt(formData.maxOccupants) : null, baseRent: formData.baseRent ? parseFloat(formData.baseRent) : null }
      editing ? await api.put(`/rooms/${editing.id}`, payload) : await api.post('/rooms', payload)
      setShowModal(false); setEditing(null); setFormData(empty); fetchData()
      showToast(editing ? 'Room updated' : 'Room added', 'success')
    } catch (err) { showToast(err.response?.data?.message || 'Error saving room', 'error') }
    finally { setSaving(false) }
  }

  const openEdit = (r) => { setEditing(r); setFormData({ code: r.code, boardingHouseId: r.boardingHouseId?.toString(), floor: r.floor?.toString() || '', area: r.area?.toString() || '', maxOccupants: r.maxOccupants?.toString() || '', baseRent: r.baseRent?.toString() || '', status: r.status }); setShowModal(true) }
  const openAdd = () => { setEditing(null); setFormData(empty); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const handleDelete = async (id) => {
    try { await api.delete(`/rooms/${id}`); fetchData(); showToast('Room deleted', 'success') }
    catch (err) { showToast(err.response?.data?.message || 'Cannot delete room', 'error') }
  }

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(r => r.id)))

  const handleBulkDelete = async () => {
    let ok = 0, fail = 0
    for (const id of selected) { try { await api.delete(`/rooms/${id}`); ok++ } catch { fail++ } }
    setSelected(new Set()); fetchData()
    showToast(`Deleted ${ok} rooms${fail > 0 ? `, ${fail} failed` : ''}`, fail > 0 ? 'warning' : 'success')
  }

  const onSort = (field) => { if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(field); setSortDir('asc') } }
  const set = (k) => (e) => setFormData(f => ({ ...f, [k]: e.target.value }))

  if (loading) return (
    <div className="space-y-4">
      <div className="h-10 w-48 bg-slate-100 rounded-2xl animate-pulse" />
      <div className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Rooms</h1>
          <p className="text-slate-500 mt-1 text-sm">{visibleRooms.length} of {rooms.length} rooms</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5">
          <Plus className="w-4 h-4" /> Add Room
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
            placeholder="Search rooms..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
        </div>
        <select value={filterHouse} onChange={e => { setFilterHouse(e.target.value); setPage(1) }}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
          <option value="ALL">All boarding houses</option>
          {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
          <option value="ALL">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="OCCUPIED">Occupied</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
        <select value={perPage} onChange={e => { setPerPage(parseInt(e.target.value)); setPage(1) }}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
          {[5,10,25,50].map(n => <option key={n} value={n}>{n} per page</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll}
                    className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                </th>
                {[['code','Code'],['boardingHouseName','Boarding House'],['floor','Floor'],['area','Area (m²)'],['baseRent','Rent'],['currentTenantName','Tenant'],['status','Status']].map(([f,l]) => (
                  <th key={f} className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <SortBtn field={f} current={sortField} dir={sortDir} onSort={onSort}>{l}</SortBtn>
                  </th>
                ))}
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                  <DoorOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No rooms found</p>
                </td></tr>
              ) : paginated.map(r => {
                const st = STATUS_CFG[r.status] || STATUS_CFG.AVAILABLE
                return (
                  <tr key={r.id} className={`hover:bg-slate-50/60 transition-colors group ${selected.has(r.id) ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => navigate(`/admin/rooms/${r.id}/detail`)}
                        className="font-black text-blue-600 hover:text-blue-800 text-sm transition-colors">{r.code}</button>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 font-medium">{r.boardingHouseName}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{r.floor ?? '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{r.area ? `${r.area} m²` : '—'}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-slate-700">{fmt(r.baseRent)}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{r.currentTenantName || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl border ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/admin/rooms/${r.id}/detail`)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(r)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 rounded-xl transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmDelete(r.id)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400">
              Showing {start + 1}–{Math.min(start + perPage, visibleRooms.length)} of {visibleRooms.length}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(page - 3, totalPages - 5)) + i + 1
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-xl text-sm font-bold transition-all ${p === page ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {p}
                  </button>
                )
              })}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 pt-8 pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <DoorOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{editing ? 'Edit' : 'Add'} Room</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{editing ? `Editing ${editing.code}` : 'Add a new room to a property'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Room Code">
                    <input required value={formData.code} onChange={set('code')} placeholder="e.g. A101" className={inputCls} />
                  </Field>
                  <Field label="Status">
                    <select value={formData.status} onChange={set('status')} className={selectCls}>
                      <option value="AVAILABLE">Available</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                  </Field>
                </div>
                <Field label="Boarding House">
                  <select required value={formData.boardingHouseId} onChange={set('boardingHouseId')} className={selectCls}>
                    <option value="">Select a property...</option>
                    {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Floor">
                    <input type="number" min="1" value={formData.floor} onChange={set('floor')} placeholder="1" className={inputCls} />
                  </Field>
                  <Field label="Area (m²)">
                    <input type="number" step="0.1" min="0" value={formData.area} onChange={set('area')} placeholder="20" className={inputCls} />
                  </Field>
                  <Field label="Max Occupants">
                    <input type="number" min="1" value={formData.maxOccupants} onChange={set('maxOccupants')} placeholder="2" className={inputCls} />
                  </Field>
                </div>
                <Field label="Base Rent (VND)">
                  <input type="number" required min="0" value={formData.baseRent} onChange={set('baseRent')} placeholder="e.g. 2500000" className={inputCls} />
                </Field>
              </div>

              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-6 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-8 py-2.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!confirmDelete} title="Delete Room" message="Are you sure you want to delete this room?" confirmText="Delete" cancelText="Cancel" danger
        onConfirm={() => { handleDelete(confirmDelete); setConfirmDelete(null) }} onCancel={() => setConfirmDelete(null)} />
      <ConfirmDialog isOpen={confirmBulkDelete} title={`Delete ${selected.size} rooms`} message={`Delete ${selected.size} selected rooms? Rooms with active contracts cannot be deleted.`} confirmText="Delete All" cancelText="Cancel" danger
        onConfirm={() => { handleBulkDelete(); setConfirmBulkDelete(false) }} onCancel={() => setConfirmBulkDelete(false)} />
      <BulkActionBar selectedCount={selected.size} onDelete={() => setConfirmBulkDelete(true)} onClear={() => setSelected(new Set())} />
    </div>
  )
}

export default Rooms
