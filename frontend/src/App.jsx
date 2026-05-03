import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { PropertyProvider } from './context/PropertyContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import AdminLayout from './layouts/AdminLayout'
import TenantLayout from './layouts/TenantLayout'
import Dashboard from './pages/admin/Dashboard'
import BoardingHouses from './pages/admin/BoardingHouses'
import Rooms from './pages/admin/Rooms'
import Tenants from './pages/admin/Tenants'
import Contracts from './pages/admin/Contracts'
import Invoices from './pages/admin/Invoices'
import Payments from './pages/admin/Payments'
import ServiceTypes from './pages/admin/ServiceTypes'
import RoomServices from './pages/admin/RoomServices'
import Reports from './pages/admin/Reports'
import InvoiceDetail from './pages/admin/InvoiceDetail'
import ContractDetail from './pages/admin/ContractDetail'
import RoomDetail from './pages/admin/RoomDetail'
import TenantDetail from './pages/admin/TenantDetail'
import Profile from './pages/admin/Profile'
import GuestCharges from './pages/admin/GuestCharges'
import Inventory from './pages/admin/Inventory'
import ServiceCatalog from './pages/admin/ServiceCatalog'
import Calendar from './pages/admin/Calendar'
import StaffManagement from './pages/admin/StaffManagement'
import ActivityLogs from './pages/admin/ActivityLogs'
import DataTransfer from './pages/admin/DataTransfer'
import TenantDashboard from './pages/tenant/Dashboard'
import TenantInvoices from './pages/tenant/Invoices'
import TenantPayments from './pages/tenant/Payments'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <PropertyProvider>
        <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="boarding-houses" element={<BoardingHouses />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="payments" element={<Payments />} />
            <Route path="service-types" element={<ServiceTypes />} />
            <Route path="room-services" element={<RoomServices />} />
            <Route path="guest-charges" element={<GuestCharges />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="service-catalog" element={<ServiceCatalog />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="reports" element={<Reports />} />
            <Route path="invoices/:id/detail" element={<InvoiceDetail />} />
            <Route path="contracts/:id/detail" element={<ContractDetail />} />
            <Route path="rooms/:id/detail" element={<RoomDetail />} />
            <Route path="tenants/:id/detail" element={<TenantDetail />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
            <Route path="data-transfer" element={<DataTransfer />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="/tenant" element={<PrivateRoute><TenantLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<TenantDashboard />} />
            <Route path="invoices" element={<TenantInvoices />} />
            <Route path="payments" element={<TenantPayments />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </PropertyProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App

