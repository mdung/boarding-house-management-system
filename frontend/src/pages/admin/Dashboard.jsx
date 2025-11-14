import { useEffect, useState } from 'react'
import api from '../../services/api'
import { Building2, DoorOpen, Users, DollarSign, AlertCircle } from 'lucide-react'

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard')
      setDashboard(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  const stats = [
    {
      label: 'Total Rooms',
      value: dashboard?.totalRooms || 0,
      icon: DoorOpen,
      color: 'bg-blue-500',
    },
    {
      label: 'Occupied',
      value: dashboard?.occupiedRooms || 0,
      icon: Building2,
      color: 'bg-green-500',
    },
    {
      label: 'Available',
      value: dashboard?.availableRooms || 0,
      icon: DoorOpen,
      color: 'bg-gray-500',
    },
    {
      label: 'Monthly Revenue',
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboard?.monthlyRevenue || 0),
      icon: DollarSign,
      color: 'bg-green-600',
    },
    {
      label: 'Unpaid Amount',
      value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboard?.unpaidAmount || 0),
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      label: 'Overdue Invoices',
      value: dashboard?.overdueInvoices || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Dashboard

