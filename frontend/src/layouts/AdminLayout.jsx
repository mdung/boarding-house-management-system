import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProperty } from '../context/PropertyContext'
import { useTheme } from '../context/ThemeContext'
import { useState } from 'react'
import {
  Home, Building2, DoorOpen, Users, FileText, Receipt, CreditCard,
  LogOut, Settings, BarChart3, ShoppingCart, Package, Menu, CalendarDays, BookOpen, ShieldCheck, History, XCircle, HardDriveDownload, ChevronDown, Palette, LayoutGrid
} from 'lucide-react'
import MobileAccess from '../components/MobileAccess'

const ThemeButton = () => {
  const { setShowPanel } = useTheme()
  return (
    <button onClick={() => setShowPanel(true)}
      className="p-1.5 rounded-xl hover:bg-slate-100 transition-all hover:rotate-12 duration-200"
      title="Tùy chỉnh giao diện">
      <Palette className="w-4 h-4 text-slate-400 hover:text-blue-500" />
    </button>
  )
}

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
      { path: '/admin/room-matrix', icon: LayoutGrid, label: 'Room Matrix', permission: 'MANAGE_ROOMS' },
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
      { path: '/admin/data-transfer', icon: HardDriveDownload, label: 'Data Transfer', adminOnly: true },
      { path: '/admin/service-types', icon: Settings, label: 'Service Types', permission: 'MANAGE_SETTINGS' },
      { path: '/admin/room-services', icon: Settings, label: 'Room Services', permission: 'MANAGE_SETTINGS' },
      { path: '/admin/service-catalog', icon: BookOpen, label: 'Service Catalog', permission: 'MANAGE_SETTINGS' },
      { path: '/admin/reports', icon: BarChart3, label: 'Reports', permission: 'VIEW_REPORTS' },
    ],
  },
]

const AdminLayout = () => {
  const { user, logout, hasPermission, isAdmin: checkIsAdmin } = useAuth()
  const { properties, selectedId, selectedProperty, select } = useProperty()
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

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full bg-slate-900 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="absolute top-4 right-4 lg:hidden">
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-xl">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <header className="h-14 sm:h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 sm:px-6 gap-3 flex-shrink-0 shadow-sm sticky top-0 z-40">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <Menu className="w-5 h-5 text-slate-500" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 truncate">
              {user?.profilePicture && (
                <img src={user.profilePicture} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover ring-2 ring-blue-500/10" />
              )}
              <span className="hidden xs:inline">
                {(() => {
                  const h = new Date().getHours()
                  const greeting = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'
                  return <>{greeting}, <span className="text-blue-600">{user?.fullName?.split(' ').pop()}</span> 👋</>
                })()}
              </span>
              <span className="xs:hidden text-blue-600 truncate">{user?.fullName?.split(' ').pop()}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
             <MobileAccess />
             {/* Property filter dropdown */}
             {properties.length > 1 && (
               <div className="relative">
                 <select
                   value={selectedId}
                   onChange={e => select(e.target.value)}
                   className="appearance-none pl-3 pr-8 py-1.5 text-[12px] font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer max-w-[160px] truncate"
                 >
                   {checkIsAdmin() && <option value="ALL">🏠 All Properties</option>}
                   {properties.map(p => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                   ))}
                 </select>
                 <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
               </div>
             )}
             {!checkIsAdmin() && properties.length === 1 && (
               <div className="flex items-center gap-1.5 pl-3 pr-3 py-1.5 text-[12px] font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 max-w-[160px] truncate">
                 <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                 <span className="truncate">{properties[0].name}</span>
               </div>
             )}
             <ThemeButton />
             <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium uppercase text-[10px] tracking-widest text-slate-400">
                {checkIsAdmin() ? 'Admin' : 'Staff'}
              </span>
            </div>
            <Link to="/admin/profile" className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors lg:hidden">
               <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                {user?.fullName?.charAt(0)}
               </div>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-2 py-2 pb-safe flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0,05)]">
          {[
            { path: '/admin/dashboard', icon: Home, label: 'Home' },
            { path: '/admin/rooms', icon: DoorOpen, label: 'Rooms' },
            { path: '/admin/tenants', icon: Users, label: 'Guests' },
            { path: '/admin/invoices', icon: Receipt, label: 'Bills' },
            { path: '/admin/staff', icon: ShieldCheck, label: 'Staff' },
          ].map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 px-1 rounded-xl transition-all duration-300 ${
                  active ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-blue-50' : 'group-hover:bg-slate-50'}`}>
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
                <span className={`text-[10px] font-bold tracking-tight ${active ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
                {active && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-600" />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default AdminLayout
