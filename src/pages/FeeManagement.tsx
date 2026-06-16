import { useState, useMemo } from 'react'
import { Wallet, AlertTriangle, CheckCircle, Clock, DollarSign, CreditCard, Plus, X } from 'lucide-react'
import { differenceInDays, format } from 'date-fns'
import { useStore } from '@/store'
import { safeParseDate } from '@/utils/helpers'
import type { FeeRecord, FeeStatus } from '@/types'

const FEE_TYPE_LABEL: Record<string, string> = {
  management: '管理费', maintenance: '维护费', burial: '安葬费', inscription: '刻碑费', relocation: '迁坟费',
}
const STATUS_BADGE: Record<FeeStatus, string> = {
  unpaid: 'badge bg-amber-50 text-amber-700', partial: 'badge bg-sky-50 text-sky-700',
  paid: 'badge bg-emerald-50 text-emerald-700', overdue: 'badge bg-red-50 text-red-700',
}
const STATUS_LABEL: Record<FeeStatus, string> = {
  unpaid: '未缴', partial: '部分缴纳', paid: '已缴', overdue: '逾期',
}

function remainingBadge(days: number) {
  if (days > 15) return { icon: '🟢', cls: 'text-emerald-600', label: '安全' }
  if (days >= 7) return { icon: '🟡', cls: 'text-amber-600', label: '预警' }
  return { icon: '🔴', cls: 'text-red-600', label: '紧急' }
}

function getDisplayStatus(status: FeeStatus, dueDate: string): FeeStatus {
  if (status === 'unpaid') {
    const d = safeParseDate(dueDate)
    if (d && differenceInDays(d, new Date()) < 0) return 'overdue'
  }
  return status
}

export default function FeeManagement() {
  const { fees, updateFeeStatus } = useStore()
  const [modalFee, setModalFee] = useState<FeeRecord | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [payError, setPayError] = useState('')

  const ds = (f: FeeRecord) => getDisplayStatus(f.status, f.dueDate)
  const fmtDate = (s: string) => { const d = safeParseDate(s); return d ? format(d, 'yyyy-MM-dd') : '-' }

  const overdueFees = useMemo(() => fees.filter((f) => ds(f) === 'overdue'), [fees])

  const summary = useMemo(() => {
    const now = new Date()
    const pending = fees.filter((f) => ds(f) !== 'paid')
    const paid = fees.filter((f) => f.status === 'paid')
    const overdue = fees.filter((f) => ds(f) === 'overdue')
    const thisMonth = fees.filter((f) => {
      const d = safeParseDate(f.dueDate)
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && f.status !== 'paid'
    })
    return {
      unpaidTotal: pending.reduce((s, f) => s + f.amount - f.paidAmount, 0),
      paidTotal: paid.reduce((s, f) => s + f.paidAmount, 0),
      overdueTotal: overdue.reduce((s, f) => s + f.amount - f.paidAmount, 0),
      thisMonthCount: thisMonth.length,
    }
  }, [fees])

  const renewals = useMemo(() => {
    const now = new Date()
    return fees
      .filter((f) => f.status !== 'paid')
      .map((f) => ({ ...f, daysLeft: (() => { const d = safeParseDate(f.dueDate); return d ? differenceInDays(d, now) : 999 })() }))
      .filter((f) => f.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [fees])

  const openModal = (fee: FeeRecord) => { setModalFee(fee); setPayAmount(String(fee.amount - fee.paidAmount)); setPayError('') }

  const handlePay = () => {
    if (!modalFee || saving) return
    const amount = Number(payAmount)
    if (isNaN(amount) || amount <= 0) { setPayError('请输入有效的正数金额'); return }
    const remaining = modalFee.amount - modalFee.paidAmount
    if (amount > remaining) { setPayError(`收款金额不能超过待缴金额 ¥${remaining.toLocaleString()}`); return }
    setSaving(true)
    const newPaid = modalFee.paidAmount + amount
    updateFeeStatus(modalFee.id, newPaid >= modalFee.amount ? 'paid' : 'partial', newPaid)
    setSaving(false); setModalFee(null); setPayAmount(''); setPayError('')
  }

  const summaryCards = [
    { label: '待收金额', value: `¥${summary.unpaidTotal.toLocaleString()}`, icon: Wallet, accent: 'bg-amber-500' },
    { label: '已收金额', value: `¥${summary.paidTotal.toLocaleString()}`, icon: CheckCircle, accent: 'bg-emerald-500' },
    { label: '逾期金额', value: `¥${summary.overdueTotal.toLocaleString()}`, icon: AlertTriangle, accent: 'bg-red-500' },
    { label: '本月到期', value: `${summary.thisMonthCount} 笔`, icon: Clock, accent: 'bg-blue-500' },
  ]

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="section-title text-xl">费用管理</h1>
        <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> 生成账单</button>
      </div>

      {overdueFees.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          ⚠ 当前有 {overdueFees.length} 笔逾期未缴费用，请及时催缴
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="card p-5 flex items-start gap-3">
            <div className={`w-1 h-12 rounded-full ${accent} shrink-0`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-charcoal/60"><Icon className="w-4 h-4" />{label}</div>
              <div className="mt-1 text-2xl font-bold text-gold font-serif">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">续缴提醒</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                {['墓位位置', '合同编号', '费用类型', '应缴金额', '到期日期', '剩余天数', '级别', '状态', '操作'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renewals.map((f) => {
                const rb = remainingBadge(f.daysLeft)
                const status = ds(f)
                return (
                  <tr key={f.id} className="table-row">
                    <td className="px-3 py-2 whitespace-nowrap">{f.plotPosition}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{f.contractNo}</td>
                    <td className="px-3 py-2">{FEE_TYPE_LABEL[f.feeType]}</td>
                    <td className="px-3 py-2">¥{f.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.dueDate)}</td>
                    <td className={`px-3 py-2 font-medium ${rb.cls}`}>{f.daysLeft < 0 ? `逾期${Math.abs(f.daysLeft)}天` : `${f.daysLeft}天`}</td>
                    <td className="px-3 py-2">{rb.icon} {rb.label}</td>
                    <td className="px-3 py-2"><span className={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</span></td>
                    <td className="px-3 py-2"><button onClick={() => openModal(f)} className="text-[#C4A35A] hover:underline text-xs font-medium">收款</button></td>
                  </tr>
                )
              })}
              {renewals.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-charcoal/40">暂无续缴提醒</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">费用记录</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                {['墓位位置', '合同编号', '费用类型', '应缴金额', '已缴金额', '到期日期', '缴费日期', '状态', '操作'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => {
                const status = ds(f)
                return (
                  <tr key={f.id} className="table-row">
                    <td className="px-3 py-2 whitespace-nowrap">{f.plotPosition}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{f.contractNo}</td>
                    <td className="px-3 py-2">{FEE_TYPE_LABEL[f.feeType]}</td>
                    <td className="px-3 py-2">¥{f.amount.toLocaleString()}</td>
                    <td className="px-3 py-2">¥{f.paidAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(f.dueDate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{f.paidDate ? fmtDate(f.paidDate) : '-'}</td>
                    <td className="px-3 py-2"><span className={STATUS_BADGE[status]}>{STATUS_LABEL[status]}</span></td>
                    <td className="px-3 py-2">
                      {f.status !== 'paid' && <button onClick={() => openModal(f)} className="text-[#C4A35A] hover:underline text-xs font-medium">收款</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalFee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setModalFee(null)}>
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">收款</h3>
              <button onClick={() => setModalFee(null)} className="text-charcoal/40 hover:text-charcoal"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between"><span className="text-charcoal/60">墓位位置</span><span>{modalFee.plotPosition}</span></div>
              <div className="flex justify-between"><span className="text-charcoal/60">合同编号</span><span>{modalFee.contractNo}</span></div>
              <div className="flex justify-between"><span className="text-charcoal/60">费用类型</span><span>{FEE_TYPE_LABEL[modalFee.feeType]}</span></div>
              <div className="flex justify-between"><span className="text-charcoal/60">应缴金额</span><span>¥{modalFee.amount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-charcoal/60">已缴金额</span><span>¥{modalFee.paidAmount.toLocaleString()}</span></div>
              <div className="flex justify-between font-medium"><span className="text-charcoal/60">待缴金额</span><span className="text-red-600">¥{(modalFee.amount - modalFee.paidAmount).toLocaleString()}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-charcoal/60 mb-1">收款金额</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
                <input type="number" className="input-field pl-9" value={payAmount}
                  onChange={(e) => { setPayAmount(e.target.value); setPayError('') }}
                  max={modalFee.amount - modalFee.paidAmount} min={0} />
              </div>
              {payError && <p className="text-xs text-red-500 mt-1">{payError}</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalFee(null)} className="btn-secondary flex-1">取消</button>
              <button onClick={handlePay} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <CreditCard className="w-4 h-4" /> {saving ? '处理中...' : '确认收款'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
