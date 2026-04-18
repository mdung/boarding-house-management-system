import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import eventBus, { EVENTS } from '../../services/eventBus'
import { ArrowLeft, DollarSign, FileText, DoorOpen, Users, Calendar, Phone, Mail, Receipt, CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('vi-VN') : '—'

const STATUS_CFG = {
  ACTIVE:     { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  DRAFT:      { label: 'Draft',       cls: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-500'   },
  EXPIRED:    { label: 'Expired',     cls: 'bg-slate-100 text-slate-500 border-slate-200',       dot: 'bg-slate-400'   },
  TERMINATED: { label: 'Terminated',  cls: 'bg-rose-50 text-rose-600 border-rose-200',           dot: 'bg-rose-500'    },
}

const INV_STATUS = {
  PAID:           { label: 'Paid',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIALLY_PAID: { label: 'Partial', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  OVERDUE:        { label: 'Overdue', cls: 'bg-rose-50 text-rose-600 border-rose-200' },
  UNPAID:         { label: 'Unpaid',  cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const InfoTile = ({ icon: Icon, label, value, color = 'text-slate-800', onClick }) => (
  <div className={`flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl ${onClick ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`} onClick={onClick}>
    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${color}`}>{value || '—'}</p>
    </div>
  </div>
)

const ContractDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchContract() }, [id])
  useEffect(() => { return eventBus.on(EVENTS.PAYMENT_CHANGED, fetchContract) }, [id])

  const fetchContract = async () => {
    try { const r = await api.get(`/contracts/${id}/detail`); setContract(r.data) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-slate-100 rounded-2xl" />
      <div className="h-56 bg-slate-100 rounded-3xl" />
      <div className="h-48 bg-slate-100 rounded-3xl" />
    </div>
  )
  if (!contract) return <div className="p-8 text-center text-rose-500 font-semibold">Contract not found</div>

  const st = STATUS_CFG[contract.status] || STATUS_CFG.EXPIRED
  const today = new Date(); today.setHours(0,0,0,0)
  const endDate = contract.endDate ? new Date(contract.endDate + 'T00:00:00') : null
  const daysLeft = endDate ? Math.round((endDate - today) / 86400000) : null

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate('/admin/contracts')}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contracts
      </button>

      {/* Header card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{contract.code}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black ${st.cls}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
                {contract.billingCycle && (
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">{contract.billingCycle}</span>
                )}
              </div>
            </div>
          </div>
          {daysLeft !== null && contract.status === 'ACTIVE' && (
            <div className={`px-4 py-2 rounded-2xl border text-sm font-bold text-center ${
              daysLeft < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' :
              daysLeft === 0 ? 'bg-orange-50 border-orange-200 text-orange-700' :
              daysLeft <= 3 ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              {daysLeft < 0 ? `⚠ Overdue ${Math.abs(daysLeft)}d` : daysLeft === 0 ? '🔔 Ends today' : `📅 ${daysLeft} days left`}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoTile icon={DoorOpen}  label="Room"         value={`${contract.roomCode} · ${contract.boardingHouseName}`} />
          <InfoTile icon={Calendar}  label="Start Date"   value={fmtDate(contract.startDate)} />
          <InfoTile icon={Calendar}  label="End Date"     value={fmtDate(contract.endDate)} />
          <InfoTile icon={Receipt}   label="Monthly Rent" value={fmt(contract.monthlyRent)} color="text-blue-700" />
          <InfoTile icon={CreditCard} label="Deposit"     value={contract.deposit ? fmt(contract.deposit) : '—'} />
          {contract.dailyRate && <InfoTile icon={DollarSign} label="Daily Rate" value={fmt(contract.dailyRate)} />}
        </div>
      </div>

      {/* Main tenant */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <h2 className="font-black text-slate-900">Main Tenant</h2>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InfoTile icon={Users} label="Name" value={contract.mainTenantName} color="text-blue-700"
            onClick={() => navigate(`/admin/tenants/${contract.mainTenantId}/detail`)} />
          <InfoTile icon={Phone} label="Phone" value={contract.mainTenantPhone} />
          <InfoTile icon={Mail}  label="Email" value={contract.mainTenantEmail} />
        </div>
        {contract.tenants?.length > 1 && (
          <div className="px-5 pb-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">All Tenants</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {contract.tenants.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-7 h-7 bg-blue-100 rounded-xl flex items-center justify-center text-xs font-black text-blue-700 flex-shrink-0">
                    {t.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{t.fullName}</p>
                    <p className="text-xs text-slate-400">{t.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoices */}
      {contract.invoices?.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h2 className="font-black text-slate-900">Invoices</h2>
            <span className="ml-auto text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{contract.invoices.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Invoice Code','Period','Total','Paid','Remaining','Status',''].map(h => (
                    <th key={h} className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contract.invoices.map(inv => {
                  const ist = INV_STATUS[inv.status] || INV_STATUS.UNPAID
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <button onClick={() => navigate(`/admin/invoices/${inv.id}/detail`)}
                          className="font-bold text-blue-600 hover:text-blue-800 text-sm transition-colors">{inv.code}</button>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{inv.periodMonth}/{inv.periodYear}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">{fmt(inv.totalAmount)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-emerald-600">{fmt(inv.paidAmount)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-rose-600">{fmt(inv.remainingAmount)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl border ${ist.cls}`}>{ist.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {inv.status !== 'PAID' && (
                          <button onClick={() => navigate(`/admin/payments?invoiceId=${inv.id}`)}
                            className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all">
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContractDetail
