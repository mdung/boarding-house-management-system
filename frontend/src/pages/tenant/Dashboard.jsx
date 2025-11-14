import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const TenantDashboard = () => {
  const { user } = useAuth()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContract()
  }, [])

  const fetchContract = async () => {
    try {
      // In a real app, you'd get tenant ID from user context
      // For now, we'll just show a placeholder
      setContract(null)
    } catch (error) {
      console.error('Failed to fetch contract:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Welcome, {user?.fullName}</h2>
        <p className="text-gray-600">View your room information, contracts, invoices, and payments from the menu.</p>
      </div>
    </div>
  )
}

export default TenantDashboard

