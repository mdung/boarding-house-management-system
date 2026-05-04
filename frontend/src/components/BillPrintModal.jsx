import { useState, useRef } from 'react'
import { X, Printer, Download, FileText } from 'lucide-react'
import { useProperty } from '../context/PropertyContext'

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '—'

const BillPrintModal = ({ summary, onClose }) => {
  const { selectedProperty } = useProperty()
  const [format, setFormat] = useState('A5') // 'A5' or 'thermal'
  const printRef = useRef(null)
  const isThermal = format === 'thermal'

  if (!summary) return null

  const propertyName = summary.boardingHouseName || selectedProperty?.name || 'Nhà Trọ'
  const propertyAddr = selectedProperty?.address || ''
  const printDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const remaining = parseFloat(summary.remainingAmount || 0)
  const deposit = parseFloat(summary.deposit || 0)

  const handlePrint = () => {
    const style = document.createElement('style')
    style.textContent = `@media print { body > * { display: none !important; } #bill-print-area { display: block !important; } @page { size: ${isThermal ? '80mm auto' : 'A5'}; margin: ${isThermal ? '2mm' : '10mm'}; } }`
    document.head.appendChild(style)
    window.print()
    setTimeout(() => document.head.removeChild(style), 500)
  }

  const handleDownloadPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const el = printRef.current
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = isThermal
        ? new jsPDF({ unit: 'mm', format: [80, canvas.height * 80 / canvas.width] })
        : new jsPDF({ unit: 'mm', format: 'a5' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, w, h)
      pdf.save(`bill-${summary.contractCode || 'unknown'}.pdf`)
    } catch (e) { console.error(e); alert('Lỗi tạo PDF') }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose} style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()} style={{ animation: 'modalPop 0.3s cubic-bezier(0.16,1,0.3,1)' }}>

        <style>{`
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes modalPop{from{opacity:0;transform:scale(0.92) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        `}</style>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="font-black text-slate-900">Phiếu thanh toán</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {[['A5', '📄 A5'], ['thermal', '🧾 80mm']].map(([k, label]) => (
                <button key={k} onClick={() => setFormat(k)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${format === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Bill preview */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
          <div id="bill-print-area" ref={printRef}
            className={`bg-white mx-auto shadow-lg ${isThermal ? 'max-w-[280px] p-3' : 'max-w-[400px] p-6'}`}
            style={{ fontFamily: isThermal ? 'monospace' : 'inherit' }}>

            {/* Header */}
            <div className={`text-center ${isThermal ? 'mb-2' : 'mb-4'}`}>
              <p className={`font-black ${isThermal ? 'text-sm' : 'text-lg'}`}>{propertyName}</p>
              {propertyAddr && <p className={`text-slate-500 ${isThermal ? 'text-[9px]' : 'text-xs'}`}>{propertyAddr}</p>}
              <p className={`text-slate-400 ${isThermal ? 'text-[8px]' : 'text-[10px]'} mt-1`}>{printDate}</p>
              <div className={`border-b-2 border-dashed border-slate-300 ${isThermal ? 'my-2' : 'my-3'}`} />
              <p className={`font-black ${isThermal ? 'text-xs' : 'text-base'}`}>PHIẾU THANH TOÁN</p>
              <p className={`text-slate-500 ${isThermal ? 'text-[9px]' : 'text-xs'}`}>{summary.contractCode}</p>
            </div>

            {/* Guest info */}
            <div className={`${isThermal ? 'text-[10px] space-y-0.5 mb-2' : 'text-xs space-y-1 mb-4'}`}>
              <div className="flex justify-between"><span className="text-slate-500">Khách:</span><span className="font-bold">{summary.tenantName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SĐT:</span><span>{summary.tenantPhone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phòng:</span><span className="font-bold">{summary.roomCode}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Check-in:</span><span>{fmtDate(summary.checkInDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Check-out:</span><span>{fmtDate(summary.checkOutDate)}</span></div>
            </div>

            <div className="border-b border-dashed border-slate-300 my-2" />

            {/* Room charge */}
            <div className={`${isThermal ? 'text-[10px] mb-2' : 'text-xs mb-3'}`}>
              <p className="font-black text-slate-700 mb-1">TIỀN PHÒNG</p>
              <div className="flex justify-between">
                <span>{summary.totalNights} đêm × {fmt(summary.dailyRate)}đ</span>
                <span className="font-black">{fmt(summary.totalRent)}đ</span>
              </div>
            </div>

            {/* Services */}
            {summary.charges?.length > 0 && (
              <>
                <div className="border-b border-dashed border-slate-300 my-2" />
                <div className={`${isThermal ? 'text-[10px] mb-2' : 'text-xs mb-3'}`}>
                  <p className="font-black text-slate-700 mb-1">DỊCH VỤ</p>
                  {summary.charges.map((c, i) => (
                    <div key={i} className="flex justify-between py-0.5">
                      <span className="truncate flex-1">{c.description} ×{parseFloat(c.quantity)}</span>
                      <span className="font-bold ml-2 flex-shrink-0">{fmt(c.amount)}đ</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="border-b-2 border-slate-400 my-2" />

            {/* Totals */}
            <div className={`${isThermal ? 'text-[10px] space-y-1' : 'text-xs space-y-1.5'}`}>
              <div className="flex justify-between"><span>Tổng cộng:</span><span className="font-black">{fmt(summary.totalAmount)}đ</span></div>
              {deposit > 0 && <div className="flex justify-between"><span>Đặt cọc:</span><span className="text-blue-600 font-bold">{fmt(deposit)}đ</span></div>}
              <div className="flex justify-between"><span>Đã thanh toán:</span><span className="text-emerald-600 font-bold">{fmt(summary.totalPaid)}đ</span></div>
              <div className={`flex justify-between pt-1 border-t border-slate-300 ${isThermal ? 'text-xs' : 'text-sm'}`}>
                <span className="font-black">CÒN LẠI:</span>
                <span className={`font-black ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {fmt(remaining)}đ
                </span>
              </div>
            </div>

            {/* Signature */}
            <div className={`${isThermal ? 'mt-4 text-[9px]' : 'mt-6 text-xs'} text-center text-slate-400`}>
              <div className="border-b border-dashed border-slate-300 my-3" />
              <div className="flex justify-between px-4">
                <div>
                  <p className="font-bold mb-6">Khách hàng</p>
                  <p>___________</p>
                </div>
                <div>
                  <p className="font-bold mb-6">Nhà trọ</p>
                  <p>___________</p>
                </div>
              </div>
              <p className="mt-4 text-[8px]">Cảm ơn quý khách! 🙏</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md transition-all hover:-translate-y-0.5">
            <Printer className="w-4 h-4" /> In phiếu
          </button>
          <button onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md transition-all hover:-translate-y-0.5">
            <Download className="w-4 h-4" /> Tải PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default BillPrintModal
