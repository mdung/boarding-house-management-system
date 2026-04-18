import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import {
  History, Filter, Calendar as CalendarIcon, User as UserIcon,
  Activity, ChevronLeft, ChevronRight, LogIn, Plus, Pencil,
  Trash2, Shield, RefreshCw, Search, X
} from 'lucide-react'

const ACTION_META = {
  CREATE:             { label: 'Create',      color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  UPDATE:             { label: 'Update',      color: 'text-blue-700 bg-blue-50 border-blue-200' },
  DELETE:             { label: 'Delete',      color: 'text-rose-700 bg-rose-50 border-rose-200' },
  LOGIN:              { label: 'Login',       color: 'text-amber-700 bg-amber-50 border-amber-200' },
  DEACTIVATE:         { label: 'Deactivate',  color: 'text-orange-700 bg-orange-50 border-orange-200' },
  UPDATE_PERMISSIONS: { label: 'Permissions', color: 'text-purple-700 bg-purple-50 border-purple-200' },
}

const ACTION_ICONS = {
  CREATE: <Plus className="w-3.5 h-3.5" />,
  UPDATE: <Pencil className="w-3.5 h-3.5" />,
  DELETE: <Trash2 className="w-3.5 h-3.5" />,
  LOGIN:  <LogIn className="w-3.5 h-3.5" />,
  DEACTIVATE: <Trash2 className="w-3.5 h-3.5" />,
  UPDATE_PERMISSIONS: <Shield className="w-3.5 h-3.5" />,
}

const MODULES = ['AUTH', 'ROOM', 'TENANT', 'CONTRACT', 'INVOICE', 'PAYMENT', 'STAFF', 'INVENTORY', 'USER']
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'DEACTIVATE', 'UPDATE_PERMISSIONS']

const fmtTime = (ts) => {
  const d = new Date(ts)
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
const fmtDate = (ts) => {
  const d = new Date(ts)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ActivityLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [staffList, setStaffList] = useState([])
  const [filters, setFilters] = useState({ userId: '', module: '', action: '', start: '', end: '' })
  const [applied, setApplied] = useState({ userId: '', module: '', action: '', start: '', end: '' })
  const [sort, setSort] = useState({ field: 'timestamp', direction: 'desc' })

  useEffect(() => {
    api.get('/users/admin/all').then(r => setStaffList(r.data)).catch(() => {})
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, size: 20 }
      if (applied.userId) params.userId = applied.userId
      if (applied.module) params.module = applied.module
      if (applied.action) params.action = applied.action
      if (applied.start) params.start = applied.start
      if (applied.end) params.end = applied.end
      params.sort = `${sort.field},${sort.direction}`
      const r = await api.get('/audit-logs', { params })
      setLogs(r.data.content)
      setTotalPages(r.data.totalPages)
      setTotalElements(r.data.totalElements)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, applied, sort])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const applyFilters = () => { setPage(0); setApplied({ ...filters }) }
  const clearFilters = () => {
    const empty = { userId: '', module: '', action: '', start: '', end: '' }
    setFilters(empty); setApplied(empty); setPage(0)
  }
  const hasActiveFilters = Object.values(applied).some(v => v !== '')

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setPage(0)
  }

  const SortIndicator = ({ field }) => {
    if (sort.field !== field) return <History className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />
    return sort.direction === 'asc' ? 
      <ChevronLeft className="w-3 h-3 rotate-90 text-blue-600" /> : 
      <ChevronLeft className="w-3 h-3 -rotate-90 text-blue-600" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-2xl text-white shadow-lg">
              <History className="w-6 h-6" />
            </div>
            Activity Logs
          </h1>
          <p className="text-slate-500 mt-1">
            Monitor all staff actions across the system
            {totalElements > 0 && <span className="ml-2 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{totalElements.toLocaleString()} records</span>}
          </p>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wider">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Staff */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Member</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={filters.userId}
                onChange={e => setFilters({ ...filters, userId: e.target.value })}
              >
                <option value="">All Staff</option>
                {staffList.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} (@{u.username})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Module */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Module</label>
            <div className="relative">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={filters.module}
                onChange={e => setFilters({ ...filters, module: e.target.value })}
              >
                <option value="">All Modules</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={filters.action}
                onChange={e => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">All Actions</option>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* From */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">From</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="datetime-local"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-blue-500 outline-none"
                value={filters.start}
                onChange={e => setFilters({ ...filters, start: e.target.value })}
              />
            </div>
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">To</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="datetime-local"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-blue-500 outline-none"
                value={filters.end}
                onChange={e => setFilters({ ...filters, end: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={applyFilters}
            className="px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-all"
          >
            Apply Filters
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors group"
                  onClick={() => handleSort('timestamp')}
                >
                  <div className="flex items-center gap-1">Time <SortIndicator field="timestamp" /></div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors group"
                  onClick={() => handleSort('action')}
                >
                  <div className="flex items-center gap-1">Action <SortIndicator field="action" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors group"
                  onClick={() => handleSort('module')}
                >
                  <div className="flex items-center gap-1">Module <SortIndicator field="module" /></div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <History className="w-10 h-10 opacity-30" />
                      <p className="font-semibold">No activity logs found</p>
                      {hasActiveFilters && <p className="text-sm">Try adjusting your filters</p>}
                    </div>
                  </td>
                </tr>
              ) : logs.map((log) => {
                const meta = ACTION_META[log.action] || { label: log.action, color: 'text-slate-600 bg-slate-50 border-slate-200' }
                const icon = ACTION_ICONS[log.action] || <Activity className="w-3.5 h-3.5" />
                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-800">{fmtTime(log.timestamp)}</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">{fmtDate(log.timestamp)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">
                          {log.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{log.fullName || 'Unknown'}</div>
                          <div className="text-[11px] text-slate-400 font-medium">@{log.username || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border ${meta.color}`}>
                        {icon}
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-black rounded-lg">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-slate-500 truncate group-hover:text-slate-800 transition-colors" title={log.details}>
                        {log.details}
                      </p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      p === page
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              })}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="p-2 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-50 transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogs
