import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Smartphone, X, Copy, Check, Wifi } from 'lucide-react'

const MobileAccess = () => {
  const [show, setShow] = useState(false)
  const [info, setInfo] = useState(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchInfo = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/network/info')
      const data = await res.json()
      const frontendPort = window.location.port || '5173'
      setInfo({ ...data, frontendPort, frontendUrl: `http://${data.lanIp}:${frontendPort}` })
    } catch {
      const host = window.location.hostname
      const port = window.location.port || '5173'
      setInfo({ lanIp: host, frontendPort: port, frontendUrl: `http://${host}:${port}` })
    } finally { setLoading(false) }
  }

  const handleCopy = () => {
    if (info?.frontendUrl) {
      navigator.clipboard.writeText(info.frontendUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => { if (show) fetchInfo() }, [show])

  if (typeof window !== 'undefined' && window.innerWidth < 1024) return null

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
        title="Truy cập từ điện thoại"
      >
        <Smartphone className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-bold text-blue-600">Mobile</span>
      </button>

      {show && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShow(false)}
        >
          <div
            style={{ width: '100%', maxWidth: '360px', margin: '1rem' }}
            className="bg-white rounded-[2rem] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Mobile Access</h2>
                  <p className="text-xs text-slate-400">Quét QR code bằng điện thoại</p>
                </div>
              </div>
              <button onClick={() => setShow(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : info ? (
                <>
                  {/* QR */}
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-200">
                      <QRCodeSVG value={info.frontendUrl} size={160} level="M" bgColor="#ffffff" fgColor="#0f172a" />
                    </div>
                  </div>

                  {/* URL + copy */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold text-blue-600 truncate select-all">
                      {info.frontendUrl}
                    </div>
                    <button onClick={handleCopy}
                      className={`p-3 rounded-2xl border transition-all ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200'}`}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Info row */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">LAN IP</p>
                      <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{info.lanIp}</p>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Port</p>
                      <p className="text-sm font-black text-slate-800 font-mono mt-0.5">{info.frontendPort}</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-center text-slate-400">📱 Điện thoại phải kết nối cùng mạng Wi-Fi</p>
                </>
              ) : (
                <p className="text-center py-8 text-sm text-slate-400">Không lấy được thông tin mạng</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default MobileAccess
