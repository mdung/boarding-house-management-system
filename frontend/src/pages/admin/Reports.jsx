import { useEffect, useState } from 'react'
import api from '../../services/api'

const Reports = () => {
  const [activeTab, setActiveTab] = useState('revenue-month')
  const [revenueByMonth, setRevenueByMonth] = useState([])
  const [revenueByHouse, setRevenueByHouse] = useState([])
  const [tenants, setTenants] = useState([])
  const [outstandingDebts, setOutstandingDebts] = useState([])
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (activeTab === 'revenue-month') {
      fetchRevenueByMonth()
    } else if (activeTab === 'revenue-house') {
      fetchRevenueByHouse()
    } else if (activeTab === 'tenants') {
      fetchTenants()
    } else if (activeTab === 'debts') {
      fetchOutstandingDebts()
    }
  }, [activeTab, year, startDate, endDate])

  const fetchRevenueByMonth = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/reports/revenue-by-month?year=${year}`)
      setRevenueByMonth(response.data)
    } catch (error) {
      console.error('Failed to fetch revenue by month:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRevenueByHouse = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/reports/revenue-by-boarding-house?startDate=${startDate}&endDate=${endDate}`)
      setRevenueByHouse(response.data)
    } catch (error) {
      console.error('Failed to fetch revenue by house:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const response = await api.get('/reports/tenants-currently-renting')
      setTenants(response.data)
    } catch (error) {
      console.error('Failed to fetch tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOutstandingDebts = async () => {
    setLoading(true)
    try {
      const response = await api.get('/reports/outstanding-debts')
      setOutstandingDebts(response.data)
    } catch (error) {
      console.error('Failed to fetch outstanding debts:', error)
    } finally {
      setLoading(false)
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('revenue-month')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'revenue-month'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Revenue by Month
          </button>
          <button
            onClick={() => setActiveTab('revenue-house')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'revenue-house'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Revenue by Boarding House
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tenants'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Current Tenants
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'debts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Outstanding Debts
          </button>
        </nav>
      </div>

      {loading && <div className="text-center py-8">Loading...</div>}

      {activeTab === 'revenue-month' && !loading && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Chart */}
          {revenueByMonth.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Monthly Revenue Chart</h2>
              <div className="space-y-4">
                {revenueByMonth.map((item) => {
                  const maxRevenue = Math.max(...revenueByMonth.map(i => parseFloat(i.totalRevenue || 0)))
                  const percentage = maxRevenue > 0 ? (parseFloat(item.totalRevenue || 0) / maxRevenue) * 100 : 0
                  return (
                    <div key={item.month}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{monthNames[item.month - 1]}</span>
                        <span className="text-sm text-gray-600">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalRevenue || 0)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div
                          className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 10 && (
                            <span className="text-xs text-white font-medium">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.totalRevenue || 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Invoices</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Invoices</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenueByMonth.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No data available</td>
                  </tr>
                ) : (
                  revenueByMonth.map((item) => (
                    <tr key={item.month}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {monthNames[item.month - 1]} {item.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalRevenue || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.invoiceCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.paidInvoiceCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'revenue-house' && !loading && (
        <div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md w-full"
              />
            </div>
          </div>

          {/* Chart */}
          {revenueByHouse.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Revenue by Boarding House Chart</h2>
              <div className="space-y-4">
                {revenueByHouse.map((item) => {
                  const maxRevenue = Math.max(...revenueByHouse.map(i => parseFloat(i.totalRevenue || 0)))
                  const percentage = maxRevenue > 0 ? (parseFloat(item.totalRevenue || 0) / maxRevenue) * 100 : 0
                  return (
                    <div key={item.boardingHouseId}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{item.boardingHouseName}</span>
                        <span className="text-sm text-gray-600">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalRevenue || 0)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div
                          className="bg-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 15 && (
                            <span className="text-xs text-white font-medium">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(item.totalRevenue || 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boarding House</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Invoices</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Invoices</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {revenueByHouse.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No data available</td>
                  </tr>
                ) : (
                  revenueByHouse.map((item) => (
                    <tr key={item.boardingHouseId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.boardingHouseName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalRevenue || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.invoiceCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.paidInvoiceCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tenants' && !loading && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <p className="text-lg font-semibold">Total Active Tenants: <span className="text-blue-600">{tenants.length}</span></p>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Number</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No active tenants</td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tenant.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.identityNumber || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'debts' && !loading && (
        <div>
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Outstanding Debts</p>
                <p className="text-2xl font-bold text-red-600">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                    outstandingDebts.reduce((sum, debt) => sum + parseFloat(debt.remainingAmount || 0), 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{outstandingDebts.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue Invoices</p>
                <p className="text-2xl font-bold text-red-600">
                  {outstandingDebts.filter(d => d.daysOverdue > 0).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {outstandingDebts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-sm text-gray-500">No outstanding debts</td>
                  </tr>
                ) : (
                  outstandingDebts.map((debt) => (
                    <tr key={debt.invoiceId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{debt.invoiceCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{debt.roomCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{debt.tenantName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debt.totalAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debt.paidAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(debt.remainingAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{debt.dueDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {debt.daysOverdue > 0 ? (
                          <span className="text-red-600 font-medium">{debt.daysOverdue} days</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          debt.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          debt.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                          debt.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {debt.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports

