import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import {
  Home, Building2, DoorOpen, Users, FileText, Receipt, CreditCard,
  LogOut, Settings, BarChart3, ShoppingCart, Package, Menu, CalendarDays, BookOpen, ShieldCheck, History
} from 'lucide-react'

const menuGroups = [
  {
    label: null,
    items: [
      { path: '/admin/dashboard', icon: Home, label: 'Dashboard' },
      { path: '/admin/calendar', icon: CalendarDays, label: 'Calendar' },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/admin/boarding-houses', icon: Building2, label: 'Boarding Houses' },
      { path: '/admin/rooms', icon: DoorOpen, label: 'Rooms', permission: 'MANAGE_ROOMS' },
      { path: '/admin/tenants', icon: Users, label: 'Tenants', permission: 'MANAGE_TENANTS' },
      { path: '/admin/contracts', icon: FileText, label: 'Contracts', permission: 'MANAGE_CONTRACTS' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/admin/invoices', icon: Receipt, label: 'Invoices', permission: 'MANAGE_FINANCE' },
      { path: '/admin/payments', icon: CreditCard, label: 'Payments', permission: 'MANAGE_FINANCE' },
      { path: '/admin/guest-charges', icon: ShoppingCart, label: 'Guest Charges', permission: 'MANAGE_FINANCE' },
      { path: '/admin/inventory', icon: Package, label: 'Inventory', permission: 'MANAGE_INVENTORY' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/admin/staff', icon: ShieldCheck, label: 'Staff & Access', permission: 'MANAGE_STAFF' },
      { path: '/admin/activity-logs', icon: History, label: 'Activity Logs', adminOnly: true },
      { path: '/admin/service-types', icon: Settings, label: 'Service Types', permission: 'MANAGE_SETTINGS' },
      { path: '/admin/room-services', icon: Settings, label: 'Room Services', permission: 'MANAGE_SETTINGS' },
      { path: '/admin/service-catalog', icon: BookOpen, label: 'Service Catalog', permission: 'MANAGE_SETTINGS' },
      { path: '/admin/reports', icon: BarChart3, label: 'Reports', permission: 'VIEW_REPORTS' },
    ],
  },
]

const AdminLayout = () => {
  const { user, logout, hasPermission, isAdmin: checkIsAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isResizing, setIsResizing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const startResizing = (e) => {
    e.preventDefault()
    setIsResizing(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
  }

  const handleMouseMove = (e) => {
    const newWidth = e.clientX
    if (newWidth > 180 && newWidth < 450) {
      setSidebarWidth(newWidth)
    }
  }

  const stopResizing = () => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
  }

  const handleLogout = () => { logout(); navigate('/login') }
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={`px-5 py-6 border-b border-white/10 ${collapsed ? 'px-3 py-4' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && sidebarWidth > 200 && (
            <div className="animate-in fade-in duration-300 truncate">
              <h1 className="text-base font-bold text-white leading-tight truncate">Boarding House</h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">Management System</p>
            </div>
          )}
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
        {menuGroups.map((group, gi) => {
          const visibleItems = group.items.filter(item => {
            if (item.adminOnly) return checkIsAdmin()
            return !item.permission || hasPermission(item.permission)
          })
          if (visibleItems.length === 0) return null

          return (
            <div key={gi}>
              {group.label && !collapsed && sidebarWidth > 180 && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{group.label}</p>
              )}
              {group.label && (collapsed || sidebarWidth <= 180) && <div className="border-t border-white/5 my-2 mx-2" />}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${active
                          ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        } ${(collapsed || sidebarWidth < 120) ? 'justify-center px-2' : ''}`}
                      title={(collapsed || sidebarWidth < 180) ? item.label : undefined}
                    >
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      {!collapsed && sidebarWidth > 120 && <span className="truncate">{item.label}</span>}
                      {active && !collapsed && sidebarWidth > 200 && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className={`border-t border-white/10 p-4 ${(collapsed || sidebarWidth < 150) ? 'p-2' : ''}`}>
        <Link
          to="/admin/profile"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors mb-2 ${(collapsed || sidebarWidth < 150) ? 'justify-center' : ''}`}
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-600 text-sm font-bold shadow-sm">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.fullName?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          {!collapsed && sidebarWidth > 150 && (
            <div className="min-w-0 animate-in fade-in duration-300">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
              <p className="text-[11px] text-slate-500 truncate font-bold uppercase tracking-tighter">
                {checkIsAdmin() ? 'Administrator' : user?.roles?.includes('STAFF') ? 'Staff' : 'User'}
              </p>
            </div>
          )}
        </Link>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ${(collapsed || sidebarWidth < 150) ? 'justify-center px-2' : ''}`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && sidebarWidth > 150 && <span>Logout</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className={`flex h-screen bg-slate-50 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Desktop sidebar */}
      <aside 
        className={`hidden lg:flex flex-col bg-slate-900 transition-all relative ${collapsed ? 'w-[72px]' : ''}`}
        style={!collapsed ? { width: sidebarWidth } : {}}
      >
        <SidebarContent />
        {/* Resize handle */}
        {!collapsed && (
          <div
            onMouseDown={startResizing}
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/30 transition-colors z-50 ${isResizing ? 'bg-blue-500/50 w-1.5' : ''}`}
          />
        )}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-slate-900 flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <Menu className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-800 hidden sm:flex items-center gap-2">
              {user?.profilePicture && (
                <img src={user.profilePicture} alt="" className="w-6 h-6 rounded-full object-cover" />
              )}
              {(() => {
                const h = new Date().getHours()
                const greeting = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
                return <>{greeting}, <span className="text-blue-600">{user?.fullName}</span> 👋</>
              })()}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline font-medium uppercase text-[10px] tracking-widest text-slate-400">
              {checkIsAdmin() ? 'Admin' : 'Staff'} Session
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
