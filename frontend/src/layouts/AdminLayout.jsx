import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Building2, DoorOpen, Users, FileText, Receipt, CreditCard, LogOut, Settings, BarChart3 } from 'lucide-react'

const AdminLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/admin/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/admin/boarding-houses', icon: Building2, label: 'Boarding Houses' },
    { path: '/admin/rooms', icon: DoorOpen, label: 'Rooms' },
    { path: '/admin/tenants', icon: Users, label: 'Tenants' },
    { path: '/admin/contracts', icon: FileText, label: 'Contracts' },
    { path: '/admin/invoices', icon: Receipt, label: 'Invoices' },
    { path: '/admin/payments', icon: CreditCard, label: 'Payments' },
    { path: '/admin/service-types', icon: Settings, label: 'Service Types' },
    { path: '/admin/room-services', icon: Settings, label: 'Room Services' },
    { path: '/admin/reports', icon: BarChart3, label: 'Reports' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white">
        <div className="p-6">
          <h1 className="text-xl font-bold">Boarding House</h1>
          <p className="text-sm text-gray-400">Management System</p>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-700">
          <div className="mb-4">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-gray-400">{user?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout

