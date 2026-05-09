import { useState, useRef } from 'react'
import axios from 'axios'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import {
  RefreshCw, Wifi, Server, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Play, ArrowDownToLine
} from 'lucide-react'

const TABLES = [
  { key: 'users', label: 'Users & Roles', icon: '👤' },
  { key: 'boardingHouses', label: 'Boarding Houses', icon: '🏠' },
  { key: 'rooms', label: 'Rooms', icon: '🚪' },
  { key: 'tenants', label: 'Tenants', icon: '👥' },
  { key: 'serviceTypes', label: 'Service Types', icon: '⚡' },
  { key: 'roomServices', label: 'Room Services', icon: '🔧' },
  { key: 'inventoryItems', label: 'Inventory Items', icon: '📦' },
  { key: 'inventoryTransactions', label: 'Inventory Transactions', icon: '📊' },
  { key: 'serviceCatalog', label: 'Service Catalog', icon: '📋' },
  { key: 'contracts', label: 'Contracts', icon: '📄' },
  { key: 'invoices', label: 'Invoices', icon: '🧾' },
  { key: 'invoiceItems', label: 'Invoice Items', icon: '📝' },
  { key: 'payments', label: 'Payments', icon: '💳' },
  { key: 'guestServiceCharges', label: 'Guest Charges', icon: '🛎️' },
  { key: 'monthlyExpenses', label: 'Monthly Expenses', icon: '💰' },
  { key: 'housekeepingTasks', label: 'Housekeeping Tasks', icon: '🧹' },
  { key: 'serviceCatalogRecipes', label: 'Catalog Recipes', icon: '🍳' },
]

const SyncFromLocal = () => {
  const { showToast } = useToast()
  const [localIp, setLocalIp] = useState(localStorage.getItem('syncLocalIp') || '192.168.1.')
  const [port, setPort] = useState(localStorage.getItem('syncLocalPort') || '8080')
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [connectionOk, setConnectionOk] = useState(null)
  const abortRef = useRef(false)

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN')
    setLogs(prev => [...prev, { time, msg, type }])
  }

  const localUrl = `http://${localIp}:${port}/api`

  // Test connection to local machine
  const testConnection = async () => {
    setTesting(true)
    setConnectionOk(null)
    try {
      const r = await axios.get(`${localUrl}/auth/health`, { timeout: 5000 })
      setConnectionOk(true)
      showToast('Kết nối thành công!', 'success')
    } catch (e) {
      // Try without /health
      try {
        await axios.get(`${localUrl}/boarding-houses`, {
          timeout: 5000,
          headers: { 'Authorization': api.defaults.headers.common['Authorization'] }
        })
        setConnectionOk(true)
        showToast('Kết nối thành công!', 'success')
      } catch (e2) {
        setConnectionOk(false)
        showToast('Không thể kết nối đến ' + localUrl, 'error')
      }
    } finally {
      setTesting(false)
    }
  }

  // Main sync process
  const startSync = async () => {
    if (!localIp || !port) {
      showToast('Vui lòng nhập IP và Port', 'warning')
      return
    }

    localStorage.setItem('syncLocalIp', localIp)
    localStorage.setItem('syncLocalPort', port)

    setSyncing(true)
    setProgress(0)
    setLogs([])
    setResult(null)
    abortRef.current = false

    try {
      // Step 1: Fetch data from local
      setCurrentStep('Đang tải dữ liệu từ máy local...')
      addLog(`Kết nối đến ${localUrl}/data-transfer/export`, 'info')
      setProgress(5)

      const token = api.defaults.headers.common['Authorization']
      const exportRes = await axios.get(`${localUrl}/data-transfer/export`, {
        headers: { 'Authorization': token },
        timeout: 60000,
      })

      const data = exportRes.data
      addLog(`✓ Tải dữ liệu thành công (version: ${data.exportVersion || '1.0'})`, 'success')
      setProgress(20)

      if (abortRef.current) { addLog('Đã hủy', 'warning'); return }

      // Step 2: Import to server
      setCurrentStep('Đang import dữ liệu lên server...')
      addLog('Gửi dữ liệu lên server để import...', 'info')
      setProgress(25)

      const importRes = await api.post('/data-transfer/import', data, { skipCache: true })
      const stats = importRes.data.imported || importRes.data

      setProgress(90)
      addLog('✓ Import hoàn tất!', 'success')

      // Step 3: Log results per table
      let successCount = 0
      let errorCount = 0
      const warnings = stats.warnings || []
      const errors = stats.errors || []

      TABLES.forEach((table, i) => {
        const count = stats[table.key]
        if (count !== undefined && count > 0) {
          addLog(`${table.icon} ${table.label}: ${count} records`, 'success')
          successCount++
        } else if (count === 0) {
          addLog(`${table.icon} ${table.label}: 0 (trống hoặc lỗi)`, 'warning')
        }
      })

      if (warnings.length > 0) {
        warnings.forEach(w => addLog(`⚠️ ${w}`, 'warning'))
      }
      if (errors.length > 0) {
        errors.forEach(e => addLog(`❌ ${e}`, 'error'))
        errorCount = errors.length
      }

      setProgress(100)
      setCurrentStep('Hoàn tất!')
      setResult({ success: true, stats, errorCount })
      showToast(`Sync hoàn tất! ${errorCount > 0 ? `(${errorCount} lỗi)` : ''}`, errorCount > 0 ? 'warning' : 'success')

    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Unknown error'
      addLog(`❌ Lỗi: ${msg}`, 'error')
      setCurrentStep('Thất bại')
      setResult({ success: false, error: msg })
      showToast('Sync thất bại: ' + msg, 'error')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
          <RefreshCw className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sync from Local</h1>
          <p className="text-sm text-slate-500">Đồng bộ toàn bộ dữ liệu từ máy local lên server</p>
        </div>
      </div>

      {/* Connection config */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Server className="w-4 h-4" />
          Kết nối máy Local
        </div>

        <div className="grid grid-cols-[1fr_100px_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">IP Address</label>
            <input
              type="text"
              value={localIp}
              onChange={e => setLocalIp(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={syncing}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Port</label>
            <input
              type="text"
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="8080"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={syncing}
            />
          </div>
          <button
            onClick={testConnection}
            disabled={testing || syncing}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            Test
          </button>
        </div>

        {connectionOk !== null && (
          <div className={`flex items-center gap-2 text-sm font-medium ${connectionOk ? 'text-emerald-600' : 'text-red-600'}`}>
            {connectionOk ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {connectionOk ? `Kết nối OK → ${localUrl}` : `Không thể kết nối đến ${localUrl}`}
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
          <p className="font-semibold">⚠️ Lưu ý:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Máy local phải đang chạy backend (Spring Boot) trên port {port}</li>
            <li>Toàn bộ dữ liệu trên server sẽ bị <strong>thay thế hoàn toàn</strong> bằng dữ liệu local</li>
            <li>Trình duyệt của bạn phải truy cập được IP local (cùng mạng WiFi hoặc dùng ngrok/IP public)</li>
          </ul>
        </div>
      </div>

      {/* Sync button */}
      <button
        onClick={startSync}
        disabled={syncing || !localIp || !port}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white text-base font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
      >
        {syncing ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Đang đồng bộ...</>
        ) : (
          <><ArrowDownToLine className="w-5 h-5" /> Bắt đầu Sync từ Local</>
        )}
      </button>

      {/* Progress */}
      {(syncing || result) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-700">{currentStep}</span>
              <span className="font-bold text-blue-600">{progress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${result?.success === false ? 'bg-red-500' : progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Result summary */}
          {result && (
            <div className={`flex items-center gap-3 p-3 rounded-xl ${result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div className="text-sm font-medium">
                {result.success
                  ? `Đồng bộ thành công!${result.errorCount > 0 ? ` (${result.errorCount} bảng có lỗi)` : ''}`
                  : `Đồng bộ thất bại: ${result.error}`
                }
              </div>
            </div>
          )}

          {/* Live log */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Log</p>
            <div className="bg-slate-900 rounded-xl p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
              {logs.length === 0 && (
                <p className="text-slate-500">Waiting...</p>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${
                  log.type === 'success' ? 'text-emerald-400' :
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-amber-400' :
                  'text-slate-300'
                }`}>
                  <span className="text-slate-500 flex-shrink-0">[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))}
              {syncing && (
                <div className="flex items-center gap-2 text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SyncFromLocal
