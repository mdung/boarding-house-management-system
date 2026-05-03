import { useState, useEffect } from 'react'
import api from '../services/api'
import {
  Users, Phone, Mail, MapPin, CreditCard, DoorOpen,
  Calendar, Search, X, Building2, BookOpen
} from 'lucide-react'

const fmt = (n) => n != null
  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
  : '-'

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'

const Field = ({ label, icon: Icon, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide ml-1">
      {Icon && <Icon className="w-3 h-3" />}{label}
    </label>
    {children}
  </div>
)

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  email: '',
  identityNumber: '',
  passportNumber: '',
  dateOfBirth: '',
  permanentAddress: '',
  status: 'ACTIVE',
  roomId: '',
  checkInDate: new Date().toISOString().split('T')[0],
  checkOutDate: '',
  monthlyRent: '',
  deposit: '',
}

/**
 * Reusable Add Guest modal.
 * Props:
 *   onClose()         — called when modal should close
 *   onSuccess(tenant) — called after successful save
 */
const AddGuestModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [availableRooms, setAvailableRooms] = useState([])
  const [roomSearch, setRoomSearch] = useState('')
  const [showRoomPicker, setShowRoomPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/rooms')
      .then(r => setAvailableRooms(Array.isArray(r.data) ? r.data.filter(rm => rm.status === 'AVAILABLE') : []))
      .catch(() => setAvailableRooms([]))
  }, [])

  const set = (k) => (e) => setFormData(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await api.post('/tenants', formData)
      const tenantId = res.data.id

      if (formData.roomId && formData.checkInDate && formData.checkOutDate) {
        if (formData.checkOutDate <= formData.checkInDate) {
          setError('Check-out must be after check-in')
          setSaving(false)
          return
        }
        await api.post('/contracts', {
          code: `CT-${Date.now()}`,
          roomId: parseInt(formData.roomId),
          mainTenantId: tenantId,
          startDate: formData.checkInDate,
          endDate: formData.checkOutDate,
          dailyRate: formData.monthlyRent ? parseFloat(formData.monthlyRent) : null,
          monthlyRent: formData.monthlyRent ? parseFloat(formData.monthlyRent) * 30 : null,
          deposit: formData.deposit ? parseFloat(formData.deposit) : 0,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
        })
      }

      onSuccess?.(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving guest')
    } finally {
      setSaving(false)
    }
  }

  const filteredRooms = availableRooms.filter(r =>
    !roomSearch ||
    r.code.toLowerCase().includes(roomSearch.toLowerCase()) ||
    (r.boardingHouseName || '').toLowerCase().includes(roomSearch.toLowerCase())
  )

  const selectedRoom = availableRooms.find(r => r.id === parseInt(formData.roomId))

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Add New Guest</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Register a new tenant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">

            {/* Full Name */}
            <Field label="Full Name" icon={Users}>
              <input
                required
                value={formData.fullName}
                onChange={set('fullName')}
                placeholder="e.g. Nguyễn Văn A"
                className={inputCls}
              />
            </Field>

            {/* Phone + ID Number */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" icon={Phone}>
                <input
                  value={formData.phone}
                  onChange={set('phone')}
                  placeholder="09xxxxxxxx"
                  className={inputCls}
                />
              </Field>
              <Field label="ID Number" icon={CreditCard}>
                <input
                  value={formData.identityNumber}
                  onChange={set('identityNumber')}
                  placeholder="CCCD/CMND"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Passport */}
            <Field label="Passport" icon={BookOpen}>
              <input
                value={formData.passportNumber}
                onChange={set('passportNumber')}
                placeholder="Passport number"
                className={inputCls}
              />
            </Field>

            {/* Email */}
            <Field label="Email" icon={Mail}>
              <input
                type="email"
                value={formData.email}
                onChange={set('email')}
                placeholder="email@example.com"
                className={inputCls}
              />
            </Field>

            {/* Permanent Address */}
            <Field label="Permanent Address" icon={MapPin}>
              <input
                value={formData.permanentAddress}
                onChange={set('permanentAddress')}
                placeholder="Địa chỉ thường trú"
                className={inputCls}
              />
            </Field>

            {/* Room Assignment */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Room Assignment (optional)
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <Field label="Select Room" icon={DoorOpen}>
              <div className="space-y-2">
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={roomSearch}
                    onChange={e => { setRoomSearch(e.target.value); setShowRoomPicker(true) }}
                    onFocus={() => setShowRoomPicker(true)}
                    placeholder="Search available rooms..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Selected room display */}
                {selectedRoom && !showRoomPicker && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DoorOpen className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-blue-900 text-[13px]">{selectedRoom.code}</p>
                        <p className="text-[11px] text-blue-600 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{selectedRoom.boardingHouseName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-blue-800">{fmt(selectedRoom.baseRent)}</p>
                      <p className="text-[10px] text-blue-500 font-semibold">/tháng</p>
                    </div>
                  </div>
                )}

                {/* Room list dropdown */}
                {showRoomPicker && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(f => ({ ...f, roomId: '', monthlyRent: '' }))
                        setShowRoomPicker(false)
                        setRoomSearch('')
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 ${!formData.roomId ? 'bg-slate-50' : ''}`}
                    >
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-slate-400" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-500">No room selected</span>
                    </button>

                    {filteredRooms.map(r => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => {
                          const daily = r.baseRent ? Math.round(r.baseRent / 30) : ''
                          setFormData(f => ({ ...f, roomId: r.id.toString(), monthlyRent: daily }))
                          setShowRoomPicker(false)
                          setRoomSearch('')
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 ${formData.roomId === r.id.toString() ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${formData.roomId === r.id.toString() ? 'bg-blue-600' : 'bg-slate-100'}`}>
                            <DoorOpen className={`w-3.5 h-3.5 ${formData.roomId === r.id.toString() ? 'text-white' : 'text-slate-500'}`} />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-800">{r.code}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{r.boardingHouseName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[13px] font-semibold text-slate-700">{fmt(r.baseRent)}</p>
                          <p className="text-[10px] text-slate-400">/tháng</p>
                        </div>
                      </button>
                    ))}

                    {filteredRooms.length === 0 && (
                      <div className="px-4 py-6 text-center text-slate-400 text-[13px]">No rooms found</div>
                    )}
                  </div>
                )}
              </div>
            </Field>

            {/* Dates & rates — only when room selected */}
            {formData.roomId && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Check-in Date" icon={Calendar}>
                    <input
                      required
                      type="date"
                      value={formData.checkInDate}
                      onChange={set('checkInDate')}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Check-out Date" icon={Calendar}>
                    <input
                      required
                      type="date"
                      value={formData.checkOutDate}
                      onChange={set('checkOutDate')}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Daily Rate (VND)">
                    <input
                      type="number"
                      value={formData.monthlyRent}
                      onChange={set('monthlyRent')}
                      placeholder="0"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Deposit (VND)">
                    <input
                      type="number"
                      value={formData.deposit}
                      onChange={set('deposit')}
                      placeholder="0"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </>
            )}

            {/* Error */}
            {error && (
              <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold text-[12.5px] text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg font-semibold text-[12.5px] text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-60 shadow-sm transition-colors"
            >
              {saving ? 'Saving...' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddGuestModal
