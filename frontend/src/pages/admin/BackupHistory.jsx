import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import {
  Database, Play, CheckCircle2, XCircle, Clock, Mail, MailPlus,
  RefreshCw, Filter, Calendar, HardDrive, Loader2, AlertTriangle,
  Settings2, Trash2, Plus, Save, Power, PowerOff, Timer, X
} from 'lucide-react'

const SCHEDULE_PRESETS = [
  { label: 'Every day at 00:00', cron: '0 0 0 * * ?', desc: 'Mỗi ngày lúc 00:00' },
  { label: 'Every day at 06:00', cron: '0 0 6 * * ?', desc: 'Mỗi ngày lúc 06:00' },
  { label: 'Every day at 12:00', cron: '0 0 12 * * ?', desc: 'Mỗi ngày lúc 12:00' },
  { label: 'Every day at 18:00', cron: '0 0 18 * * ?', desc: 'Mỗi ngày lúc 18:00' },
  { label: 'Every day at 23:00', cron: '0 0 23 * * ?', desc: 'Mỗi ngày lúc 23:00' },
  { label: 'Every 6 hours', cron: '0 0 */6 * * ?', desc: 'Mỗi 6 giờ' },
  { label: 'Every 12 hours', cron: '0 0 */12 * * ?', desc: 'Mỗi 12 giờ' },
  { label: 'Every Monday at 00:00', cron: '0 0 0 ? * MON', desc: 'Mỗi thứ Hai lúc 00:00' },
  { label: 'Every 1st of month', cron: '0 0 0 1 * ?', desc: 'Ngày 1 mỗi tháng lúc 00:00' },
]

const BackupHistory = () => {
  // History state
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTrigger, setFilterTrigger] = useState('')

  // Config state
  const [config, setConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [editEmails, setEditEmails] = useState([])
  const [editEnabled, setEditEnabled] = useState(true)
  const [editCron, setEditCron] = useState('0 0 0 * * ?')
  const [editScheduleDesc, setEditScheduleDesc] = useState('Every day at 00:00')
  const [toast, setToast] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)


  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ─── Fetch Data ────────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('size', 12)
      if (filterStatus) params.append('status', filterStatus)
      if (filterTrigger) params.append('triggerType', filterTrigger)

      const [historyRes, statsRes] = await Promise.all([
        api.get(`/backup/history?${params.toString()}`),
        api.get('/backup/stats')
      ])

      setHistory(historyRes.data.content)
      setTotalPages(historyRes.data.totalPages)
      setTotalElements(historyRes.data.totalElements)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to fetch backup history:', err)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterTrigger])

  const fetchConfig = async () => {
    setConfigLoading(true)
    try {
      const res = await api.get('/backup/config')
      setConfig(res.data)
      setEditEmails(res.data.emailRecipients || [])
      setEditEnabled(res.data.enabled)
      setEditCron(res.data.cronExpression || '0 0 0 * * ?')
      setEditScheduleDesc(res.data.scheduleDescription || 'Every day at 00:00')
    } catch (err) {
      console.error('Failed to fetch config:', err)
    } finally {
      setConfigLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [fetchHistory])
  useEffect(() => { fetchConfig() }, [])

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleTriggerBackup = async () => {
    setShowConfirmModal(false)
    setTriggering(true)
    try {
      await api.post('/backup/trigger')
      showToast('Backup thành công! Email đã được gửi.')
      await fetchHistory()
    } catch (err) {
      showToast('Backup thất bại: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setTriggering(false)
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const payload = {
        enabled: editEnabled,
        emailRecipients: editEmails,
        cronExpression: editCron,
        scheduleDescription: editScheduleDesc
      }
      const res = await api.put('/backup/config', payload)
      setConfig(res.data)
      showToast('Cấu hình đã được lưu thành công!')
      setShowSettings(false)
    } catch (err) {
      showToast('Lưu cấu hình thất bại: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddEmail = () => {
    setEmailError('')
    const email = newEmail.trim()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Email không hợp lệ')
      return
    }
    if (editEmails.includes(email)) {
      setEmailError('Email đã tồn tại')
      return
    }
    setEditEmails([...editEmails, email])
    setNewEmail('')
  }

  const handleRemoveEmail = (email) => {
    setEditEmails(editEmails.filter(e => e !== email))
  }

  const handlePresetSelect = (preset) => {
    setEditCron(preset.cron)
    setEditScheduleDesc(preset.desc)
  }


  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / 1024).toFixed(2)} KB`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      FAILED: 'bg-red-50 text-red-700 border-red-200',
      IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200'
    }
    const icons = {
      SUCCESS: <CheckCircle2 className="w-3.5 h-3.5" />,
      FAILED: <XCircle className="w-3.5 h-3.5" />,
      IN_PROGRESS: <Loader2 className="w-3.5 h-3.5 animate-spin" />
    }
    const labels = { SUCCESS: 'Thành công', FAILED: 'Thất bại', IN_PROGRESS: 'Đang chạy' }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {icons[status]} {labels[status] || status}
      </span>
    )
  }

  const getTriggerBadge = (type) => {
    if (type === 'SCHEDULED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Timer className="w-3 h-3" /> Tự động
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
        <Play className="w-3 h-3" /> Thủ công
      </span>
    )
  }


  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border animate-slide-in-right ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowConfirmModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-0 overflow-hidden animate-scale-in">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Xác nhận Backup</h3>
                  <p className="text-blue-100 text-sm">Tạo bản sao lưu dữ liệu</p>
                </div>
              </div>
            </div>
            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-gray-700 text-sm leading-relaxed">
                Hệ thống sẽ tạo file backup chứa toàn bộ dữ liệu và gửi email đến các địa chỉ đã cấu hình.
              </p>
              {config?.emailRecipients?.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Gửi đến:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {config.emailRecipients.map(email => (
                      <span key={email} className="text-xs bg-white px-2 py-0.5 rounded-full text-blue-600 border border-blue-200">
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(!config?.emailRecipients || config.emailRecipients.length === 0) && (
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Chưa cấu hình email. Backup sẽ chạy nhưng không gửi email.
                  </p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleTriggerBackup}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md text-sm"
              >
                <Play className="w-4 h-4" /> Chạy Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md">
              <Database className="w-6 h-6 text-white" />
            </div>
            Backup & Recovery
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 ml-[52px]">
            Quản lý backup tự động, cấu hình email nhận file và theo dõi lịch sử
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm ${
              showSettings
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Cấu hình
          </button>
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={triggering}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow-lg"
          >
            {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {triggering ? 'Đang backup...' : 'Backup ngay'}
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showSettings && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden animate-in slide-in-from-top duration-200">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-gray-600" /> Cấu hình Backup
            </h2>
            <p className="text-sm text-gray-500 mt-1">Thiết lập lịch backup tự động và danh sách email nhận file</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                {editEnabled ? <Power className="w-5 h-5 text-emerald-600" /> : <PowerOff className="w-5 h-5 text-gray-400" />}
                <div>
                  <p className="font-medium text-gray-900">Backup tự động</p>
                  <p className="text-xs text-gray-500">Bật/tắt chạy backup theo lịch</p>
                </div>
              </div>
              <button
                onClick={() => setEditEnabled(!editEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${editEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-600" /> Lịch backup
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SCHEDULE_PRESETS.map((preset) => (
                  <button
                    key={preset.cron}
                    onClick={() => handlePresetSelect(preset)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                      editCron === preset.cron
                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 font-medium'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                    }`}
                  >
                    <span className="block font-medium">{preset.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{preset.desc}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Cron hiện tại:</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded-lg font-mono text-gray-700">{editCron}</code>
              </div>
            </div>

            {/* Email Recipients */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" /> Email nhận backup
              </label>

              {/* Email list */}
              {editEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {editEmails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200">
                      <Mail className="w-3.5 h-3.5" />
                      {email}
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add email input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <MailPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setEmailError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                    placeholder="Nhập email và nhấn Enter hoặc nút Thêm"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                      emailError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                </div>
                <button
                  onClick={handleAddEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Thêm
                </button>
              </div>
              {emailError && <p className="text-xs text-red-600 mt-1.5">{emailError}</p>}
              {editEmails.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Chưa có email nào. Backup sẽ chạy nhưng không gửi email.
                </p>
              )}
            </div>
          </div>

          {/* Save button */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {config?.updatedAt && `Cập nhật lần cuối: ${formatDate(config.updatedAt)} bởi ${config.updatedBy || 'N/A'}`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Tổng backup</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Thành công</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.success}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-red-100 to-red-50 rounded-xl">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Thất bại</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-100 to-violet-50 rounded-xl">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Lần cuối OK</p>
                <p className="text-sm font-semibold text-gray-900">
                  {stats.lastSuccessAt ? formatDate(stats.lastSuccessAt) : 'Chưa có'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Config Summary */}
      {config && !showSettings && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {config.enabled ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                <Power className="w-3 h-3" /> Đang bật
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold">
                <PowerOff className="w-3 h-3" /> Đã tắt
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Timer className="w-4 h-4 text-blue-500" />
            <span>{config.scheduleDescription || config.cronExpression}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-blue-500" />
            <span>{config.emailRecipients?.length || 0} email</span>
          </div>
        </div>
      )}


      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Lọc:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(0) }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SUCCESS">Thành công</option>
            <option value="FAILED">Thất bại</option>
            <option value="IN_PROGRESS">Đang chạy</option>
          </select>
          <select
            value={filterTrigger}
            onChange={(e) => { setFilterTrigger(e.target.value); setPage(0) }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
          >
            <option value="">Tất cả loại</option>
            <option value="SCHEDULED">Tự động</option>
            <option value="MANUAL">Thủ công</option>
          </select>
          <button
            onClick={fetchHistory}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200"
          >
            <RefreshCw className="w-4 h-4" /> Làm mới
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="mt-3 text-gray-500 text-sm">Đang tải dữ liệu...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Database className="w-10 h-10" />
            </div>
            <p className="text-lg font-semibold text-gray-600">Chưa có backup nào</p>
            <p className="text-sm mt-1">Nhấn &quot;Backup ngay&quot; để tạo backup đầu tiên</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Trạng thái</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Loại</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Thời gian</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Bởi</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">File</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Kích thước</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-3.5">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-3.5">{getTriggerBadge(item.triggerType)}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-gray-800 font-medium">{formatDate(item.createdAt)}</div>
                      {item.completedAt && (
                        <div className="text-xs text-gray-400 mt-0.5">Xong: {formatDate(item.completedAt)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-gray-700 font-medium">{item.triggeredBy}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-gray-600 text-xs font-mono bg-gray-50 px-2 py-1 rounded-lg max-w-[180px] truncate inline-block" title={item.fileName}>
                        {item.fileName || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <HardDrive className="w-3.5 h-3.5 text-gray-400" />
                        {formatFileSize(item.fileSizeBytes)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {item.emailSent ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-medium" title={item.emailSentTo}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã gửi
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Không gửi</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {item.errorMessage ? (
                        <span className="inline-flex items-center gap-1 text-red-600 text-xs max-w-[200px]" title={item.errorMessage}>
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.errorMessage}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Trang {page + 1} / {totalPages} <span className="text-gray-400">({totalElements} bản ghi)</span>
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Đầu
              </button>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Cuối
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BackupHistory