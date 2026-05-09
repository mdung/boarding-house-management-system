import { useState, useRef } from 'react'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import {
  Download, Upload, Database, AlertTriangle, CheckCircle2,
  FileJson, Info, Loader2, ShieldAlert, Trash2
} from 'lucide-react'

const DataTransfer = () => {
  const { showToast } = useToast()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [removeResult, setRemoveResult] = useState(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const fileInputRef = useRef(null)

  // ─── Deduplication ────────────────────────────────────────────────────────

  const handleScan = async () => {
    setScanning(true)
    setScanResult(null)
    setRemoveResult(null)
    try {
      const r = await api.get('/deduplication/scan', { skipCache: true })
      setScanResult(r.data)
      const totalDups = (r.data.serviceCatalog?.length || 0) + (r.data.inventoryItems?.length || 0)
      if (totalDups === 0) showToast('Không tìm thấy bản trùng lặp nào ✓', 'success')
      else showToast(`Tìm thấy ${totalDups} nhóm trùng lặp`, 'warning')
    } catch (err) {
      showToast('Scan thất bại: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setScanning(false)
    }
  }

  const handleRemoveDuplicates = async () => {
    setShowRemoveConfirm(false)
    setRemoving(true)
    setRemoveResult(null)
    try {
      const r = await api.post('/deduplication/remove')
      setRemoveResult(r.data)
      setScanResult(null)
      const total = (r.data.serviceCatalogRemoved || 0) + (r.data.inventoryItemsRemoved || 0)
      showToast(`Đã xóa ${total} bản trùng lặp thành công!`, 'success')
    } catch (err) {
      showToast('Xóa thất bại: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setRemoving(false)
    }
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await api.get('/data-transfer/export', {
        responseType: 'blob',
      })

      // Lấy tên file từ header hoặc tạo tên mặc định
      const contentDisposition = response.headers['content-disposition']
      let filename = `boarding-house-backup-${new Date().toISOString().slice(0, 10)}.json`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Tạo link download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      showToast('Export thất bại: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setExporting(false)
    }
  }

  // ─── Import ───────────────────────────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.json')) {
      showToast('Chỉ chấp nhận file .json', 'error')
      return
    }
    setSelectedFile(file)
    setImportResult(null)
    setImportError(null)
  }

  const handleImportClick = () => {
    if (!selectedFile) {
      showToast('Vui lòng chọn file backup trước', 'warning')
      return
    }
    setShowConfirm(true)
    setConfirmText('')
  }

  const handleConfirmImport = async () => {
    if (confirmText !== 'XAC NHAN') return

    setShowConfirm(false)
    setImporting(true)
    setImportResult(null)
    setImportError(null)

    try {
      const text = await selectedFile.text()
      const data = JSON.parse(text)
      const response = await api.post('/data-transfer/import', data)
      setImportResult(response.data)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      if (err.name === 'SyntaxError') {
        setImportError('File JSON không hợp lệ. Vui lòng kiểm tra lại file backup.')
      } else {
        setImportError(err.response?.data?.message || err.message || 'Import thất bại')
      }
    } finally {
      setImporting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Database className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Data Transfer</h1>
          <p className="text-sm text-gray-500">Export và import toàn bộ dữ liệu hệ thống</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Hướng dẫn sử dụng</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>Export để tạo file backup chứa toàn bộ dữ liệu (nhà trọ, phòng, hợp đồng, hóa đơn, thanh toán...)</li>
            <li>Import file backup đó vào máy khác để khôi phục dữ liệu</li>
            <li>Import sẽ <strong>xóa toàn bộ dữ liệu hiện tại</strong> và thay bằng dữ liệu từ file</li>
          </ul>
        </div>
      </div>

      {/* Export card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-gray-800">Export Data</h2>
        </div>
        <p className="text-sm text-gray-500">
          Tải xuống toàn bộ dữ liệu dưới dạng file JSON. File này có thể dùng để import vào máy khác.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {exporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Đang xuất...</>
          ) : (
            <><Download className="w-4 h-4" /> Xuất file backup</>
          )}
        </button>
      </div>

      {/* Import card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-800">Import Data</h2>
        </div>

        {/* Warning */}
        <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            <strong>Cảnh báo:</strong> Import sẽ xóa toàn bộ dữ liệu hiện tại (bao gồm tài khoản, phòng, hợp đồng, hóa đơn...) và thay bằng dữ liệu từ file. Hành động này không thể hoàn tác.
          </p>
        </div>

        {/* File picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chọn file backup (.json)</label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileJson className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-indigo-700">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">Click để chọn file hoặc kéo thả vào đây</p>
                <p className="text-xs text-gray-400 mt-1">Chỉ chấp nhận file .json</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <button
          onClick={handleImportClick}
          disabled={!selectedFile || importing}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {importing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Đang import...</>
          ) : (
            <><Upload className="w-4 h-4" /> Import dữ liệu</>
          )}
        </button>

        {/* Import result */}
        {importResult && (
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-base">
              <CheckCircle2 className="w-5 h-5" />
              Import hoàn tất!
            </div>

            {/* Warnings */}
            {importResult.imported?.warnings?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">⚠️ Lưu ý</p>
                {importResult.imported.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-amber-800">• {w}</p>
                ))}
              </div>
            )}

            {/* Errors */}
            {importResult.imported?.errors?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">❌ Lỗi</p>
                {importResult.imported.errors.map((e, i) => (
                  <p key={i} className="text-sm text-red-800">• {e}</p>
                ))}
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {importResult.imported && Object.entries(importResult.imported)
                .filter(([key]) => !['warnings', 'errors'].includes(key))
                .map(([key, val]) => (
                <div key={key} className={`flex items-center justify-between p-2.5 rounded-lg border ${val > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-xs text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className={`text-sm font-bold ${val > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {importError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-red-700 font-semibold">
              <AlertTriangle className="w-5 h-5" />
              Import thất bại
            </div>
            <p className="text-sm text-red-800 leading-relaxed">{importError}</p>
            <p className="text-xs text-red-500">Kiểm tra lại file backup hoặc thử export mới từ hệ thống gốc.</p>
          </div>
        )}
      </div>

      {/* Deduplication card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          <h2 className="font-semibold text-gray-800">Remove Duplicates</h2>
        </div>
        <p className="text-sm text-gray-500">
          Quét và xóa các bản ghi trùng lặp trong Service Catalog và Inventory. Bản gốc (ID nhỏ nhất) được giữ lại, các FK tham chiếu sẽ được chuyển sang bản gốc.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {scanning ? 'Đang quét...' : 'Quét duplicates'}
          </button>
          {scanResult && (
            <button
              onClick={() => setShowRemoveConfirm(true)}
              disabled={removing}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {removing ? 'Đang xóa...' : 'Xóa duplicates'}
            </button>
          )}
        </div>

        {scanResult && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-sm">
            <p className="font-medium text-slate-700">Kết quả quét:</p>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Service Catalog:</span>{' '}
                {scanResult.serviceCatalog?.length > 0
                  ? <span className="text-red-600">{scanResult.serviceCatalog.length} nhóm trùng lặp</span>
                  : <span className="text-green-600">Không có trùng lặp ✓</span>}
              </div>
              <div>
                <span className="font-medium">Inventory Items:</span>{' '}
                {scanResult.inventoryItems?.length > 0
                  ? <span className="text-red-600">{scanResult.inventoryItems.length} nhóm trùng lặp</span>
                  : <span className="text-green-600">Không có trùng lặp ✓</span>}
              </div>
            </div>
          </div>
        )}

        {removeResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Xóa duplicates thành công!
            </div>
            <div className="mt-2 text-emerald-800">
              <p>Service Catalog: xóa {removeResult.serviceCatalogRemoved} bản trùng</p>
              <p>Inventory Items: xóa {removeResult.inventoryItemsRemoved} bản trùng</p>
            </div>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Xác nhận Import</h3>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <p className="font-medium mb-1">Hành động này sẽ:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Xóa toàn bộ dữ liệu hiện tại</li>
                <li>Thay thế bằng dữ liệu từ file: <strong>{selectedFile?.name}</strong></li>
                <li>Không thể hoàn tác sau khi thực hiện</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gõ <code className="bg-gray-100 px-1 rounded font-mono">XAC NHAN</code> để tiếp tục
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="XAC NHAN"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={confirmText !== 'XAC NHAN'}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Xác nhận Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedup confirm modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Xác nhận xóa Duplicates</h3>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p>Bản gốc (ID nhỏ nhất) sẽ được giữ lại. Các FK tham chiếu sẽ được chuyển sang bản gốc trước khi xóa bản trùng.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRemoveConfirm(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleRemoveDuplicates} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Xác nhận xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTransfer
