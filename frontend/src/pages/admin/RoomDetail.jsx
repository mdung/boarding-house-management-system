import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import RoomPhotoGallery from '../../components/RoomPhotoGallery'
import { ArrowLeft, DollarSign } from 'lucide-react'

const RoomDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRoom()
  }, [id])

  const fetchRoom = async () => {
    try {
      const response = await api.get(`/rooms/${id}/detail`)
      setRoom(response.data)
    } catch (error) {
      console.error('Failed to fetch room:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>
  if (!room) return <div className="p-6 text-sm text-slate-400">Room not found</div>

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/rooms')}
        className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Rooms
      </button>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-extrabold text-slate-900">Room {room.code}</h1>
        <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 ${
          room.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600' :
          room.status === 'OCCUPIED' ? 'bg-blue-50 text-blue-600' :
          'bg-amber-50 text-amber-600'
        }`}>
          {room.status}
        </span>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Room info card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-extrabold text-slate-800 mb-4">Room Information</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Floor</p>
                <p className="text-[13px] font-semibold text-slate-700">{room.floor || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Area</p>
                <p className="text-[13px] font-semibold text-slate-700">{room.area ? `${room.area} m²` : '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Max Occupants</p>
                <p className="text-[13px] font-semibold text-slate-700">{room.maxOccupants || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Base Rent</p>
                <p className="text-base font-extrabold text-blue-600">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(room.baseRent || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Photos Gallery card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              📸 Photos
              <span className="text-[10px] font-normal text-slate-400">Ảnh phòng · hiển thị cho khách</span>
            </h2>
            <RoomPhotoGallery roomId={parseInt(id)} />
          </div>

          {/* Services card */}
          {room.services && room.services.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-slate-800 mb-4">Services</h2>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-400">Service</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-400">Category</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-400">Price Per Unit</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-400">Fixed Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {room.services.map((service) => (
                      <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">{service.serviceTypeName}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10.5px] font-bold rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                            {service.serviceCategory}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-600">
                          {service.pricePerUnit ?
                            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(service.pricePerUnit) :
                            '-'}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-600">
                          {service.fixedPrice ?
                            new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(service.fixedPrice) :
                            '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Invoices card */}
          {room.recentInvoices && room.recentInvoices.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-slate-800 mb-4">Recent Invoices</h2>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-400">Invoice Code</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-400">Period</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase text-slate-400">Total</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase text-slate-400">Status</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {room.recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <button onClick={() => navigate(`/admin/invoices/${invoice.id}/detail`)} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                            {invoice.code}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-slate-600">{invoice.periodMonth}/{invoice.periodYear}</td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-right text-slate-700">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 ${
                            invoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' :
                            invoice.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-600' :
                            invoice.status === 'OVERDUE' ? 'bg-red-50 text-red-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {invoice.status !== 'PAID' && (
                            <button onClick={() => navigate(`/admin/payments?invoiceId=${invoice.id}`)} className="text-emerald-500 hover:text-emerald-700 transition-colors" title="Pay">
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Boarding house card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-extrabold text-slate-800 mb-3">Boarding House</h2>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600">
                  {room.boardingHouseName?.charAt(0) || 'B'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-700 truncate">{room.boardingHouseName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{room.boardingHouseAddress}</p>
              </div>
            </div>
          </div>

          {/* Current contract card */}
          {room.currentContract && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
              <h2 className="text-sm font-extrabold text-slate-800 mb-3">Current Contract</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button onClick={() => navigate(`/admin/contracts/${room.currentContract.id}/detail`)} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                    {room.currentContract.code}
                  </button>
                  <span className="text-base font-extrabold text-blue-600">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(room.currentContract.monthlyRent || 0)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Tenant</span>
                    <button onClick={() => navigate(`/admin/tenants/${room.currentContract.mainTenantId}/detail`)} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                      {room.currentContract.mainTenantName}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Period</span>
                    <span className="text-[13px] font-semibold text-slate-700">
                      {room.currentContract.startDate} → {room.currentContract.endDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Room summary card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-extrabold text-slate-800 mb-3">Summary</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Status</span>
                <span className={`text-[10.5px] font-bold rounded-full px-2 py-0.5 ${
                  room.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600' :
                  room.status === 'OCCUPIED' ? 'bg-blue-50 text-blue-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {room.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Services</span>
                <span className="text-[13px] font-semibold text-slate-700">{room.services?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Invoices</span>
                <span className="text-[13px] font-semibold text-slate-700">{room.recentInvoices?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">Base Rent</span>
                <span className="text-base font-extrabold text-blue-600">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND' }).format(room.baseRent || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomDetail
