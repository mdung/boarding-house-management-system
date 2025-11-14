import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Receipt, CreditCard, LogOut } from 'lucide-react'

const TenantLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/tenant/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/tenant/invoices', icon: Receipt, label: 'My Invoices' },
    { path: '/tenant/payments', icon: CreditCard, label: 'My Payments' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-blue-800 text-white">
        <div className="p-6">
          <h1 className="text-xl font-bold">Tenant Portal</h1>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center px-6 py-3 text-blue-200 hover:bg-blue-700 hover:text-white"
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-6 border-t border-blue-700">
          <div className="mb-4">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-blue-200">{user?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-blue-200 hover:bg-blue-700 rounded"
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

export default TenantLayout

