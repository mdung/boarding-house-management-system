import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Plus, Edit, Trash2, Building2, MapPin, Layers, DoorOpen, Users, X } from 'lucide-react'

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
    {children}
  </div>
)

const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"

const BoardingHouses = () => {
  const { showToast } = useToast()
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [saving, setSaving] = useState(false)
  const empty = { name: '', address: '', description: '', numberOfFloors: '', notes: '' }
  const [formData, setFormData] = useState(empty)

  useEffect(() => { fetchHouses() }, [])

  const fetchHouses = async () => {
    try {
      const r = await api.get('/boarding-houses')
      setHouses(r.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const openAdd = () => { setEditing(null); setFormData(empty); setShowModal(true) }
  const openEdit = (h) => { setEditing(h); setFormData({ name: h.name, address: h.address, description: h.description || '', numberOfFloors: h.numberOfFloors || '', notes: h.notes || '' }); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) await api.put(`/boarding-houses/${editing.id}`, formData)
      else await api.post('/boarding-houses', formData)
      closeModal(); fetchHouses()
      showToast(editing ? 'Updated successfully' : 'Boarding house added', 'success')
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/boarding-houses/${id}`)
      fetchHouses(); showToast('Deleted successfully', 'success')
    } catch (err) { showToast(err.response?.data?.message || 'Cannot delete', 'error') }
  }

  const set = (k) => (e) => setFormData(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Boarding Houses</h1>
          <p className="text-slate-500 mt-1 text-sm">{houses.length} properties managed</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5">
          <Plus className="w-4 h-4" /> Add Boarding House
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse" />)}
        </div>
      ) : houses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center">
          <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">No boarding houses yet</p>
          <button onClick={openAdd} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors">
            Add your first property
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {houses.map(h => (
            <div key={h.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
              {/* Card top accent */}
              <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-tight">{h.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-500 truncate max-w-[180px]">{h.address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(h)} className="w-8 h-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(h.id)} className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-lg font-black text-slate-800">{h.numberOfFloors || '—'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Floors</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-lg font-black text-slate-800">{h.totalRooms || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rooms</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-lg font-black text-slate-800">{h.occupiedRooms || 0}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Occupied</p>
                  </div>
                </div>

                {/* Occupancy bar */}
                {(h.totalRooms || 0) > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                      <span>Occupancy</span>
                      <span>{Math.round(((h.occupiedRooms || 0) / h.totalRooms) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(((h.occupiedRooms || 0) / h.totalRooms) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span className="text-emerald-600 font-bold">{h.availableRooms || 0} available</span>
                      <span>{h.occupiedRooms || 0} occupied</span>
                    </div>
                  </div>
                )}

                {h.notes && (
                  <p className="mt-3 text-xs text-slate-400 italic truncate">{h.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 modal-fix bg-slate-900/50 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{editing ? 'Edit' : 'Add'} Boarding House</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{editing ? 'Update property details' : 'Add a new property to manage'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <Field label="Property Name">
                  <input required value={formData.name} onChange={set('name')} placeholder="e.g. Nhà Trọ Ánh Dương" className={inputCls} />
                </Field>
                <Field label="Address">
                  <input required value={formData.address} onChange={set('address')} placeholder="e.g. 123 Nguyễn Trãi, Q.1, TP.HCM" className={inputCls} />
                </Field>
                <Field label="Number of Floors">
                  <input type="number" min="1" value={formData.numberOfFloors} onChange={set('numberOfFloors')} placeholder="e.g. 4" className={inputCls} />
                </Field>
                <Field label="Description">
                  <textarea value={formData.description} onChange={set('description')} placeholder="Brief description of the property..." rows={3}
                    className={inputCls + ' resize-none'} />
                </Field>
                <Field label="Notes">
                  <textarea value={formData.notes} onChange={set('notes')} placeholder="Internal notes..." rows={2}
                    className={inputCls + ' resize-none'} />
                </Field>
              </div>

              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={closeModal}
                  className="px-6 py-2.5 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-8 py-2.5 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete Boarding House"
        message="Are you sure? All associated rooms will also be affected."
        confirmText="Delete"
        cancelText="Cancel"
        danger
        onConfirm={() => { handleDelete(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

export default BoardingHouses
