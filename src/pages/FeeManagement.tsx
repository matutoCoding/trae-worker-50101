import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import type { FeeStatus, FeeRecord, SalesContract } from '@/types'
import { safeParseDate, sanitizeInput } from '@/utils/helpers'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Wallet, AlertTriangle, CheckCircle, Clock, DollarSign, CreditCard, X, History, ArrowRight, FileText, Search, User, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

const FEE_TYPE_LABEL: Record<string, string> = {
  management: '管理费', maintenance: '养护费', burial: '安葬费', inscription: '刻字费', relocation: '迁墓费',
}
const STATUS_BADGE: Record<FeeStatus, string> = {
  unpaid: 'badge bg-amber-50 text-amber-700', partial: 'badge bg-sky-50 text-sky-700',
  paid: 'badge bg-emerald-50 text-emerald-700', overdue: 'badge bg-red-50 text-red-700',
}
const STATUS_LABEL: Record<FeeStatus, string> = {
  unpaid: '未缴', partial: '部分缴纳', paid: '已缴', overdue: '逾期',
}
const CONTRACT_STATUS_LABEL: Record<string, string> = { pending: '待签', signed: '已签', completed: '已完成', cancelled: '已取消' }
const CONTRACT_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700', signed: 'bg-sky-50 text-sky-700',
  completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-red-50 text-red-700',
}

function getDisplayStatus(status: FeeStatus, dueDate: string): FeeStatus {
  if (status === 'paid') return 'paid'
  const d = safeParseDate(dueDate)
  if (d && differenceInDays(d, new Date()) < 0) return 'overdue'
  return status
}

function getWarningLevel(displayStatus: FeeStatus, daysLeft: number) {
  if (displayStatus === 'overdue') return { icon: '🔴', cls: 'text-red-600', label: '紧急' }
  if (daysLeft < 7) return { icon: '🟡', cls: 'text-amber-600', label: '预警' }
  if (daysLeft < 15) return { icon: '🟠', cls: 'text-orange-600', label: '注意' }
  return { icon: '🟢', cls: 'text-emerald-600', label: '安全' }
}

type TabKey = 'management' | 'contract'

export default function FeeManagement() {
  const { fees, contracts, addFeePayment } = useStore()
  const [activeTab, setActiveTab] = useState<TabKey>('management')
  const [payModalFee, setPayModalFee] = useState<FeeRecord | null>(null)
  const [historyFee, setHistoryFee] = useState<FeeRecord | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [payError, setPayError] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [expandedContract, setExpandedContract] = useState<string | null>(null)

  const ds = (f: FeeRecord) => getDisplayStatus(f.status, f.dueDate)
  const fmtDate = (s: string) => { const d = safeParseDate(s); return d ? format(d, 'yyyy-MM-dd') : '-' }

  const managementFees = useMemo(() => fees.filter(f => f.feeType === 'management' || f.feeType === 'maintenance'), [fees])
  const otherFees = useMemo(() => fees.filter(f => f.feeType !== 'management' && f.feeType !== 'maintenance'), [fees])
  const overdueManagementFees = useMemo(() => managementFees.filter(f => ds(f) === 'overdue'), [managementFees])

  const filteredContracts = useMemo(() => {
    if (!contractFilter.trim()) return contracts
    const term = sanitizeInput(contractFilter.trim())
    return contracts.filter(c =>
      c.contractNo.includes(term) ||
      c.buyerName.includes(term) ||
      c.plotPosition.includes(term)
    )
  }, [contracts, contractFilter])

  const summary = useMemo(() => {
    const now = new Date()
    const all = fees
    const mFe = managementFees
    const pending = all.filter((f) => ds(f) !== 'paid')
    const paid = all.filter((f) => f.status === 'paid')
    const overdue = all.filter((f) => ds(f) === 'overdue')
    const thisMonth = all.filter((f) => {
      const d = safeParseDate(f.dueDate)
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && f.status !== 'paid'
    })
    const contractPaidTotal = contracts.reduce((s, c) => s + c.paidAmount, 0)
    const contractTotal = contracts.filter(c => c.status !== 'cancelled').reduce((s, c) => s + c.price, 0)
    return {
      unpaidTotal: pending.reduce((s, f) => s + f.amount - f.paidAmount, 0),
      paidTotal: paid.reduce((s, f) => s + f.paidAmount, 0),
      overdueTotal: overdue.reduce((s, f) => s + f.amount - f.paidAmount, 0),
      thisMonthCount: thisMonth.length,
      contractPaidTotal,
      contractOutstandingTotal: Math.max(0, contractTotal - contractPaidTotal),
      managementCount: mFe.length,
    }
  }, [fees, contracts, managementFees])

  const renewals = useMemo(() => {
    const now = new Date()
    return managementFees
      .filter((f) => f.status !== 'paid')
      .map((f) => ({ ...f, daysLeft: (() => { const d = safeParseDate(f.dueDate); return d ? differenceInDays(d, now) : 999 })() }))
      .filter((f) => f.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [managementFees])

  const openPayModal = (fee: FeeRecord) => { setPayModalFee(fee); setPayAmount(String(fee.amount - fee.paidAmount)); setPayError('') }

  const handlePay = () => {
    if (!payModalFee || saving) return
    const amount = Number(payAmount)
    if (isNaN(amount) || amount <= 0) { setPayError('请输入有效的正数金额'); return }
    const remaining = payModalFee.amount - payModalFee.paidAmount
    if (amount > remaining) { setPayError(`收款金额不能超过待缴金额 ¥${remaining.toLocaleString()}`); return }
    setSaving(true)
    setTimeout(() => {
      addFeePayment(payModalFee.id, amount)
      setSaving(false); setPayModalFee(null); setPayAmount(''); setPayError('')
    }, 300)
  }

  const progressPercent = (paid: number, total: number) => total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0

  const toggleContract = (id: string) => setExpandedContract(expandedContract === id ? null : id)

  const managementSummaryCards = [
    { label: '管理费待收', value: `¥${summary.unpaidTotal.toLocaleString()}`, icon: Wallet, accent: 'bg-amber-500' },
    { label: '管理费已收', value: `¥${summary.paidTotal.toLocaleString()}`, icon: CheckCircle, accent: 'bg-emerald-500' },
    { label: '逾期金额', value: `¥${summary.overdueTotal.toLocaleString()}`, icon: AlertTriangle, accent: 'bg-red-500' },
    { label: '本月到期', value: `${summary.thisMonthCount} 笔`, icon: Clock, accent: 'bg-blue-500' },
  ]
  const contractSummaryCards = [
    { label: '合同总金额', value: `¥${contracts.filter(c => c.status !== 'cancelled').reduce((s, c) => s + c.price, 0).toLocaleString()}`, icon: FileText, accent: 'bg-[#C4A35A]' },
    { label: '已收款金额', value: `¥${summary.contractPaidTotal.toLocaleString()}`, icon: CheckCircle, accent: 'bg-emerald-500' },
    { label: '待收款金额', value: `¥${summary.contractOutstandingTotal.toLocaleString()}`, icon: Wallet, accent: 'bg-amber-500' },
    { label: '有效合同数', value: `${contracts.filter(c => c.status !== 'cancelled').length} 份`, icon: FileText, accent: 'bg-blue-500' },
  ]

  const summaryCards = activeTab === 'management' ? managementSummaryCards : contractSummaryCards

  return (
    <div className="space-y-6 font-sans" style={{ background: '#F5F3EF', minHeight: '100vh', padding: '24px' }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="section-title text-xl">费用管理</h1>
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
          <button onClick={() => setActiveTab('management')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'management' ? 'bg-[#1B3A2D] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Wallet className="w-4 h-4" />管理费
          </button>
          <button onClick={() => setActiveTab('contract')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === 'contract' ? 'bg-[#1B3A2D] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <FileText className="w-4 h-4" />合同收款
          </button>
        </div>
      </div>

      {activeTab === 'management' && overdueManagementFees.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          ⚠ 当前有 {overdueManagementFees.length} 笔管理费用逾期未缴，请及时催缴
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="card p-5 flex items-start gap-3">
            <div className={`w-1 h-12 rounded-full ${accent} shrink-0`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-500"><Icon className="w-4 h-4" />{label}</div>
              <div className="mt-1 text-2xl font-bold text-[#1B3A2D]">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'management' && (
        <>
          <div className="card p-6">
            <h2 className="section-title mb-4">续缴提醒（近30天）</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    {['客户', '墓位位置', '合同编号', '费用类型', '应缴金额', '到期日期', '剩余天数', '级别', '状态', '操作'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {renewals.map((f) => {
                    const displayStatus = ds(f)
                    const wl = getWarningLevel(displayStatus, f.daysLeft)
                    return (
                      <tr key={f.id} className="table-row">
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{f.buyerName || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{f.plotPosition}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{f.contractNo}</td>
                        <td className="px-3 py-2">{FEE_TYPE_LABEL[f.feeType]}</td>
                        <td className="px-3 py-2">¥{f.amount.toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.dueDate)}</td>
                        <td className={`px-3 py-2 font-medium ${wl.cls}`}>{f.daysLeft < 0 ? `逾期${Math.abs(f.daysLeft)}天` : `${f.daysLeft}天`}</td>
                        <td className="px-3 py-2">{wl.icon} {wl.label}</td>
                        <td className="px-3 py-2"><span className={STATUS_BADGE[displayStatus]}>{STATUS_LABEL[displayStatus]}</span></td>
                        <td className="px-3 py-2"><button onClick={() => openPayModal(f)} className="text-[#C4A35A] hover:underline text-xs font-medium">收款</button></td>
                      </tr>
                    )
                  })}
                  {renewals.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-400">暂无续缴提醒</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="section-title mb-4">管理费 / 养护费记录</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    {['客户', '墓位位置', '合同编号', '费用类型', '应缴金额', '已缴金额', '到期日期', '缴费日期', '状态', '操作'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...managementFees, ...otherFees].map((f) => {
                    const status = ds(f)
                    return (
                      <tr key={f.id} className="table-row">
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{f.buyerName || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{f.plotPosition}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{f.contractNo}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${f.feeType === 'management' ? 'bg-blue-50 text-blue-700' : f.feeType === 'maintenance' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {FEE_TYPE_LABEL[f.feeType]}
                          </span>
                        </td>
                        <td className="px-3 py-2">¥{f.amount.toLocaleString()}</td>
                        <td className={`px-3 py-2 ${f.paidAmount < f.amount ? 'text-amber-600' : 'text-emerald-600'}`}>¥{f.paidAmount.toLocaleString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.dueDate)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{f.paidDate ? fmtDate(f.paidDate) : '-'}</td>
                        <td className="px-3 py-2"><span className={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</span></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setHistoryFee(f)} className="text-sky-600 hover:underline text-xs font-medium flex items-center gap-1">
                              <History className="w-3 h-3" /> 查看历史
                            </button>
                            {f.status !== 'paid' && (
                              <>
                                <ArrowRight className="w-3 h-3 text-gray-200" />
                                <button onClick={() => openPayModal(f)} className="text-[#C4A35A] hover:underline text-xs font-medium">收款</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'contract' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="section-title mb-0">合同收款对账单</h2>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9" placeholder="按合同号/客户姓名/墓位位置筛选" value={contractFilter} onChange={e => setContractFilter(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            {filteredContracts.map((c) => {
              const remaining = c.price - c.paidAmount
              const isExpanded = expandedContract === c.id
              return (
                <div key={c.id} className={`border rounded-lg overflow-hidden transition-all ${c.status === 'cancelled' ? 'border-gray-200 bg-gray-50 opacity-75' : remaining === 0 ? 'border-emerald-200 bg-emerald-50/30' : remaining > 0 && c.paymentPlan.some(p => p.status === 'unpaid' && safeParseDate(p.dueDate) && differenceInDays(safeParseDate(p.dueDate)!, new Date()) < 0) ? 'border-red-200 bg-red-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                  <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/60 transition-colors" onClick={() => toggleContract(c.id)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.status === 'completed' ? 'bg-emerald-100' : c.status === 'cancelled' ? 'bg-gray-100' : 'bg-[#C4A35A]/10'}`}>
                        <FileText className={`w-5 h-5 ${c.status === 'completed' ? 'text-emerald-600' : c.status === 'cancelled' ? 'text-gray-500' : 'text-[#C4A35A]'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-[#1B3A2D]">{c.contractNo}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CONTRACT_STATUS_BADGE[c.status]}`}>
                            {CONTRACT_STATUS_LABEL[c.status]}
                          </span>
                          <span className="text-xs text-gray-500">{c.paymentMethod === 'full' ? '全款' : '分期'}</span>
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{c.buyerName}</span>
                          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(c.signingDate)}</span>
                          <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />墓位 {c.plotPosition}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">合同总额</p>
                        <p className="text-sm font-semibold text-[#1B3A2D]">¥{c.price.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">已收款</p>
                        <p className="text-sm font-semibold text-emerald-600">¥{c.paidAmount.toLocaleString()}</p>
                      </div>
                      <div className="text-right min-w-[110px]">
                        <p className="text-xs text-gray-500">尾款</p>
                        <p className={`text-sm font-semibold ${remaining === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {remaining === 0 ? '✓ 已结清' : `¥${remaining.toLocaleString()}`}
                        </p>
                      </div>
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">进度</span>
                          <span className="font-medium text-[#1B3A2D]">{progressPercent(c.paidAmount, c.price)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full">
                          <div className={`h-1.5 rounded-full transition-all ${remaining === 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-[#C4A35A]'}`}
                            style={{ width: `${progressPercent(c.paidAmount, c.price)}%` }} />
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-[#1B3A2D] transition-colors" onClick={(e) => { e.stopPropagation(); toggleContract(c.id) }}>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-white space-y-4">
                      {c.paymentPlan.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />分期计划
                          </h4>
                          <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-sm">
                              <thead><tr className="bg-gray-50">
                                <th className="px-3 py-2 text-left text-xs text-gray-500">应收日期</th>
                                <th className="px-3 py-2 text-right text-xs text-gray-500">应收金额</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">状态</th>
                                <th className="px-3 py-2 text-right text-xs text-gray-500">实收金额</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">收款日期</th>
                              </tr></thead>
                              <tbody>
                                {[...c.paymentPlan].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(p => {
                                  const overdue = p.status === 'unpaid' && safeParseDate(p.dueDate) && differenceInDays(safeParseDate(p.dueDate)!, new Date()) < 0
                                  return (
                                    <tr key={p.id} className="border-t border-gray-100">
                                      <td className="px-3 py-2">{fmtDate(p.dueDate)}</td>
                                      <td className="px-3 py-2 text-right font-medium">¥{p.amount.toLocaleString()}</td>
                                      <td className="px-3 py-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                          {p.status === 'paid' ? '已收' : overdue ? '逾期未收' : '待收'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-right text-emerald-600">{p.paidAmount ? `¥${p.paidAmount.toLocaleString()}` : '-'}</td>
                                      <td className="px-3 py-2">{p.paidDate ? fmtDate(p.paidDate) : '-'}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                          <History className="w-3.5 h-3.5" />收款历史（含收后剩余欠款）
                        </h4>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50">
                              <th className="px-3 py-2 text-left text-xs text-gray-500">收款日期</th>
                              <th className="px-3 py-2 text-right text-xs text-gray-500">收款金额</th>
                              <th className="px-3 py-2 text-left text-xs text-gray-500">关联分期</th>
                              <th className="px-3 py-2 text-right text-xs text-gray-500">累计已付</th>
                              <th className="px-3 py-2 text-right text-xs text-gray-500">收后剩余欠款</th>
                            </tr></thead>
                            <tbody>
                              {c.paymentHistory.length === 0 && (
                                <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">暂无收款记录</td></tr>
                              )}
                              {[...c.paymentHistory].sort((a, b) => a.date.localeCompare(b.date)).map((h, idx, arr) => {
                                const running = arr.slice(0, idx + 1).reduce((s, e) => s + e.amount, 0)
                                return (
                                  <tr key={h.id} className="border-t border-gray-100">
                                    <td className="px-3 py-2">{fmtDate(h.date)}</td>
                                    <td className="px-3 py-2 text-right text-emerald-600 font-medium">+¥{h.amount.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500">
                                      {h.relatedPlanId ? (c.paymentPlan.find(p => p.id === h.relatedPlanId) ? `${fmtDate(c.paymentPlan.find(p => p.id === h.relatedPlanId)!.dueDate)} 期` : '-') : '一般收款'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-600">¥{running.toLocaleString()}</td>
                                    <td className={`px-3 py-2 text-right font-semibold ${h.remainingAfter === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {h.remainingAfter === 0 ? '✓ 已结清' : `¥${h.remainingAfter.toLocaleString()}`}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {filteredContracts.length === 0 && <div className="text-center py-12 text-gray-400">没有匹配的合同记录</div>}
          </div>
        </div>
      )}

      {payModalFee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => !saving && setPayModalFee(null)}>
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">收款</h3>
              <button onClick={() => !saving && setPayModalFee(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between"><span className="text-gray-500">客户</span><span className="font-medium">{payModalFee.buyerName || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">墓位位置</span><span>{payModalFee.plotPosition}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">合同编号</span><span>{payModalFee.contractNo}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">费用类型</span><span>{FEE_TYPE_LABEL[payModalFee.feeType]}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">应缴金额</span><span>¥{payModalFee.amount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">已缴金额</span><span>¥{payModalFee.paidAmount.toLocaleString()}</span></div>
              <div className="flex justify-between font-medium"><span className="text-gray-500">待缴金额</span><span className="text-red-600">¥{(payModalFee.amount - payModalFee.paidAmount).toLocaleString()}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-1">收款金额</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input type="number" className="input-field pl-9" value={payAmount}
                  onChange={(e) => { setPayAmount(e.target.value); setPayError('') }}
                  max={payModalFee.amount - payModalFee.paidAmount} min={0} disabled={saving} />
              </div>
              {payError && <p className="text-xs text-red-500 mt-1">{payError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => !saving && setPayModalFee(null)} disabled={saving} className="btn-secondary flex-1">取消</button>
              <button onClick={handlePay} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" /> {saving ? '处理中...' : '确认收款'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyFee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setHistoryFee(null)}>
          <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[82vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="section-title flex items-center gap-2"><History className="w-4 h-4" /> 收款历史</h3>
              <button onClick={() => setHistoryFee(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-[#F5F3EF] rounded-lg p-4 space-y-2 text-sm border border-[#C4A35A]/20">
                <div className="flex justify-between gap-4"><span className="text-gray-500">客户</span><span className="font-medium text-[#1B3A2D]">{historyFee.buyerName || '-'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">墓位位置</span><span className="font-medium">{historyFee.plotPosition}</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">费用类型</span><span className="font-medium">{FEE_TYPE_LABEL[historyFee.feeType]}</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">应缴金额</span><span className="font-medium text-[#C4A35A]">¥{historyFee.amount.toLocaleString()}</span></div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">缴费进度</span>
                  <span className="font-medium">¥{historyFee.paidAmount.toLocaleString()} / ¥{historyFee.amount.toLocaleString()} ({progressPercent(historyFee.paidAmount, historyFee.amount)}%)</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-[#C4A35A] rounded-full transition-all" style={{ width: `${progressPercent(historyFee.paidAmount, historyFee.amount)}%` }} />
                </div>
                <div className="text-sm mt-2 text-right">
                  <span className="text-gray-500">还差：</span>
                  <span className={`font-medium ${historyFee.amount - historyFee.paidAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {historyFee.amount - historyFee.paidAmount > 0 ? `¥${(historyFee.amount - historyFee.paidAmount).toLocaleString()}` : '✓ 已结清'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-[#1B3A2D]">收款明细记录（含剩余欠款）</h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left whitespace-nowrap text-xs text-gray-500">日期</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap text-xs text-gray-500">收款金额</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap text-xs text-gray-500">收款累计</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap text-xs text-gray-500">收后剩余</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyFee.paymentHistory || []).length === 0 && (
                        <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">暂无收款记录</td></tr>
                      )}
                      {[...(historyFee.paymentHistory || [])].map((entry, idx, arr) => {
                        const running = arr.slice(0, idx + 1).reduce((s, e) => s + e.amount, 0)
                        return (
                          <tr key={entry.id} className="table-row">
                            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(entry.date)}</td>
                            <td className="px-3 py-2 text-right text-emerald-600 font-medium">+¥{entry.amount.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-gray-600">¥{running.toLocaleString()}</td>
                            <td className={`px-3 py-2 text-right font-semibold ${entry.remainingAfter === 0 || entry.remainingAfter === undefined && running >= historyFee.amount ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {entry.remainingAfter !== undefined
                                ? (entry.remainingAfter === 0 ? '✓ 结清' : `¥${entry.remainingAfter.toLocaleString()}`)
                                : running >= historyFee.amount ? '✓ 结清' : `¥${(historyFee.amount - running).toLocaleString()}`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setHistoryFee(null)} className="btn-secondary w-full">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
