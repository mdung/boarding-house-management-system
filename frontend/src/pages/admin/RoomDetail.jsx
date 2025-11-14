import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { ArrowLeft } from 'lucide-react'

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

  if (loading) return <div>Loading...</div>
  if (!room) return <div>Room not found</div>

  return (
    <div>
      <button
        onClick={() => navigate('/admin/rooms')}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Rooms
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-3xl font-bold mb-6">Room {room.code}</h1>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Boarding House</h3>
            <p className="text-lg">{room.boardingHouseName}</p>
            <p className="text-sm text-gray-600">{room.boardingHouseAddress}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
            <span className={`px-3 py-1 text-sm rounded-full ${
              room.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
              room.status === 'OCCUPIED' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {room.status}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Floor</h3>
            <p className="text-lg">{room.floor || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Area</h3>
            <p className="text-lg">{room.area ? `${room.area} m²` : '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Max Occupants</h3>
            <p className="text-lg">{room.maxOccupants || '-'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Base Rent</h3>
            <p className="text-lg">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.baseRent || 0)}
            </p>
          </div>
        </div>

        {room.services && room.services.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Services</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price Per Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fixed Price</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {room.services.map((service) => (
                  <tr key={service.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{service.serviceTypeName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{service.serviceCategory}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {service.pricePerUnit ? 
                        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(service.pricePerUnit) : 
                        '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {service.fixedPrice ? 
                        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(service.fixedPrice) : 
                        '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {room.currentContract && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Contract</h2>
            <div className="p-4 bg-gray-50 rounded">
              <p className="font-medium">{room.currentContract.code}</p>
              <p className="text-sm text-gray-600">Tenant: {room.currentContract.mainTenantName}</p>
              <p className="text-sm text-gray-600">
                {room.currentContract.startDate} to {room.currentContract.endDate}
              </p>
              <p className="text-sm text-gray-600">
                Rent: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(room.currentContract.monthlyRent || 0)}
              </p>
            </div>
          </div>
        )}

        {room.recentInvoices && room.recentInvoices.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {room.recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{invoice.periodMonth}/{invoice.periodYear}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(invoice.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                        invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default RoomDetail

