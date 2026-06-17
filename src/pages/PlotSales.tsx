import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import type { SalesContract, ContractStatus } from '@/types'
import { maskIdCard, maskPhone, generateUniqueId, sanitizeInput } from '@/utils/helpers'
import { format, parseISO, isBefore } from 'date-fns'
import { ShoppingBag, Plus, Search, Eye, Printer, X, FileText, User, Phone, MapPin, CreditCard, ArrowRight, Calendar, AlertCircle, Check, DollarSign, Clock, ChevronDown, ChevronUp } from 'lucide-react'

const statusLabels: Record<ContractStatus, string> = { pending: '待签', signed: '已签', completed: '已完成', cancelled: '已取消' }
const statusBadge: Record<ContractStatus, string> = {
  pending: 'bg-amber-50 text-amber-700', signed: 'bg-sky-50 text-sky-700',
  completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-red-50 text-red-700',
}

const emptyForm = { buyerName: '', buyerPhone: '', buyerIdCard: '', deceasedName: '', plotId: '', paymentMethod: 'full' as 'full' | 'installment', notes: '' }

export default function PlotSales() {
  const { contracts, plots, addContract, updateContractStatus, setPlotStatus, addPaymentPlanItem, addContractPayment } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [printToast, setPrintToast] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'plan' | 'history'>('info')
  const [planForm, setPlanForm] = useState({ dueDate: '', amount: 0 })
  const [paymentForm, setPaymentForm] = useState({ planId: '', amount: 0 })
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showPlanForm, setShowPlanForm] = useState(false)

  const selectedContract = contracts.find(c => c.id === selectedContractId) || null

  const availablePlots = plots.filter(p => p.status === 'available')
  const selectedPlot = plots.find(p => p.id === form.plotId)

  const filteredContracts = contracts.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (searchTerm) {
      const term = sanitizeInput(searchTerm)
      if (!c.buyerName.includes(term) && !c.contractNo.includes(term) && !c.plotPosition.includes(term)) return false
    }
    if (dateRange.start && c.signingDate < dateRange.start) return false
    if (dateRange.end && c.signingDate > dateRange.end) return false
    return true
  })

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const monthContracts = contracts.filter(c => {
    const d = new Date(c.signingDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && c.status !== 'cancelled'
  })
  const pendingCount = contracts.filter(c => c.status === 'pending').length
  const totalAmount = monthContracts.reduce((s, c) => s + c.price, 0)

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 2500)
    return () => clearTimeout(t)
  }, [toastMsg])

  const validate = (): string => {
    const name = form.buyerName.trim()
    if (!name) return '请输入购墓人姓名'
    if (!/^\d{7,}$/.test(form.buyerPhone)) return '联系电话格式不正确（需为数字且至少7位）'
    if (form.buyerIdCard.length < 15) return '身份证号格式不正确（至少15位）'
    if (!form.plotId) return '请选择墓位'
    return ''
  }

  const handleSave = () => {
    const error = validate()
    if (error) { setValidationError(error); return }
    setValidationError('')
    setSaving(true)
    const uid = generateUniqueId()
    const contract: SalesContract = {
      id: `c-${uid}`,
      contractNo: `HT${uid.slice(-8)}`,
      plotId: form.plotId,
      plotPosition: selectedPlot?.position || '',
      buyerName: sanitizeInput(form.buyerName.trim()),
      buyerPhone: form.buyerPhone,
      buyerIdCard: form.buyerIdCard,
      deceasedName: form.deceasedName.trim() ? sanitizeInput(form.deceasedName.trim()) : undefined,
      price: selectedPlot?.price || 0,
      paymentMethod: form.paymentMethod,
      paidAmount: form.paymentMethod === 'full' ? (selectedPlot?.price || 0) : 0,
      status: 'pending',
      signingDate: today,
      notes: form.notes.trim() ? sanitizeInput(form.notes.trim()) : undefined,
      paymentPlan: [],
      paymentHistory: form.paymentMethod === 'full' && (selectedPlot?.price || 0) > 0 ? [{
        id: generateUniqueId(),
        amount: selectedPlot?.price || 0,
        date: today,
        remainingAfter: 0,
      }] : [],
    }
    addContract(contract)
    setPlotStatus(form.plotId, 'reserved')
    setShowModal(false)
    setForm(emptyForm)
    setSaving(false)
    setToastMsg({ type: 'success', msg: '合同创建成功，墓位已锁定为预留' })
  }

  const handleStatusChange = (newStatus: ContractStatus) => {
    if (!selectedContract) return
    if (newStatus === 'completed') {
      const remaining = selectedContract.price - selectedContract.paidAmount
      if (remaining > 0) {
        setToastMsg({ type: 'error', msg: `尾款¥${remaining.toLocaleString()}未结清，无法完成交易` })
        return
      }
    }
    updateContractStatus(selectedContract.id, newStatus)
    const map: Record<ContractStatus, string> = {
      pending: '合同待签 - 墓位已预留', signed: '合同已签 - 墓位已预留',
      completed: '交易完成 - 墓位已标记已售', cancelled: '合同已作废 - 墓位已释放',
    }
    setToastMsg({ type: 'success', msg: map[newStatus] })
  }

  const handlePrint = (contract: SalesContract) => {
    setPrintToast(`合同 ${contract.contractNo} 已发送打印`)
    setTimeout(() => setPrintToast(null), 2000)
  }

  const handleAddPlan = () => {
    if (!selectedContract) return
    if (!planForm.dueDate || planForm.amount <= 0) {
      setToastMsg({ type: 'error', msg: '请填写应收日期和金额' })
      return
    }
    addPaymentPlanItem(selectedContract.id, { dueDate: planForm.dueDate, amount: planForm.amount })
    setPlanForm({ dueDate: '', amount: 0 })
    setShowPlanForm(false)
    setToastMsg({ type: 'success', msg: '分期计划已添加' })
  }

  const handleAddPayment = () => {
    if (!selectedContract) return
    if (paymentForm.amount <= 0) {
      setToastMsg({ type: 'error', msg: '收款金额必须大于0' })
      return
    }
    const r = addContractPayment(selectedContract.id, paymentForm.amount, paymentForm.planId || undefined)
    if (r.ok) {
      setPaymentForm({ planId: '', amount: 0 })
      setToastMsg({ type: 'success', msg: '收款成功' })
    } else {
      setToastMsg({ type: 'error', msg: r.message || '收款失败' })
    }
  }

  const renderStatusActions = (contract: SalesContract) => {
    switch (contract.status) {
      case 'pending':
        return (
          <div className="flex gap-2">
            <button className="btn-primary flex items-center gap-1" onClick={() => handleStatusChange('signed')}>
              签约 <ArrowRight className="w-4 h-4" />
            </button>
            <button className="btn-secondary text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleStatusChange('cancelled')}>
              作废
            </button>
          </div>
        )
      case 'signed':
        return (
          <div className="flex gap-2">
            <button className="btn-primary flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange('completed')}>
              完成交易 <ArrowRight className="w-4 h-4" />
            </button>
            <button className="btn-secondary" onClick={() => handleStatusChange('pending')}>
              退回待签
            </button>
          </div>
        )
      case 'completed':
        return <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">已完成 ✓</span>
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 text-red-600 font-medium">已作废</span>
      default:
        return null
    }
  }

  const paymentProgress = (paid: number, total: number) => total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0

  const fmtDate = (s: string) => {
    try { return format(parseISO(s), 'yyyy-MM-dd') } catch { return s }
  }

  const remainingAmount = (c: SalesContract) => Math.max(0, c.price - c.paidAmount)
  const hasUnpaidPlan = (c: SalesContract) => c.paymentPlan.some(p => p.status === 'unpaid' && isBefore(parseISO(p.dueDate), new Date()))
  const unpaidPlansTotal = (c: SalesContract) => c.paymentPlan.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-6 space-y-6 relative" style={{ background: '#F5F3EF', minHeight: '100vh' }}>
      {(toastMsg || printToast) && (
        <div className={`fixed top-6 right-6 z-[60] text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in ${toastMsg?.type === 'error' ? 'bg-red-600' : 'bg-[#1B3A2D]'}`}>
          {toastMsg?.msg || printToast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-6 h-6 text-[#C4A35A]" />
          <h1 className="section-title text-2xl">墓位销售</h1>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> 新增合同
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '本月成交', value: `${monthContracts.length}`, suffix: '单' },
          { label: '待签合同', value: `${pendingCount}`, suffix: '份', warn: pendingCount > 0 },
          { label: '销售金额', value: `¥${totalAmount.toLocaleString()}`, suffix: '' },
          { label: '分期合同数', value: `${contracts.filter(c => c.paymentMethod === 'installment').length}`, suffix: '份' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`w-1 h-10 rounded-full ${s.warn ? 'bg-red-500' : 'bg-[#C4A35A]'}`} />
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.warn ? 'text-red-600' : 'text-[#1B3A2D]'}`}>{s.value}<span className="text-sm font-normal ml-0.5">{s.suffix}</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="搜索合同编号、购墓人、墓位位置" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="select-field w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value as ContractStatus | 'all')}>
          <option value="all">全部</option>
          <option value="pending">待签</option>
          <option value="signed">已签</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
        <div className="flex items-center gap-2">
          <input type="date" className="input-field w-36" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))} />
          <span className="text-gray-400">~</span>
          <input type="date" className="input-field w-36" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3 text-left">合同编号</th>
              <th className="px-4 py-3 text-left">墓位位置</th>
              <th className="px-4 py-3 text-left">购墓人</th>
              <th className="px-4 py-3 text-left">金额</th>
              <th className="px-4 py-3 text-left">付款</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">签约日期</th>
              <th className="px-4 py-3 text-left">付款进度</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(c => {
              const remaining = remainingAmount(c)
              const overdue = hasUnpaidPlan(c)
              return (
                <tr key={c.id} className="table-row">
                  <td className="px-4 py-3 font-medium text-[#1B3A2D]">{c.contractNo}</td>
                  <td className="px-4 py-3">{c.plotPosition}</td>
                  <td className="px-4 py-3">{c.buyerName}</td>
                  <td className="px-4 py-3 text-[#C4A35A] font-semibold">¥{c.price.toLocaleString()}</td>
                  <td className="px-4 py-3">{c.paymentMethod === 'full' ? '全款' : '分期'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge[c.status]}`}>
                      {statusLabels[c.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.signingDate}</td>
                  <td className="px-4 py-3 min-w-[180px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">¥{c.paidAmount.toLocaleString()} / ¥{c.price.toLocaleString()}</span>
                        <span className={`font-medium ${remaining > 0 ? (overdue ? 'text-red-500' : 'text-amber-600') : 'text-emerald-600'}`}>
                          {remaining > 0 ? `尾款 ¥${remaining.toLocaleString()}${overdue ? ' (逾期)' : ''}` : '✓ 已结清'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${remaining > 0 ? (overdue ? 'bg-red-500' : 'bg-gradient-to-r from-amber-400 to-[#C4A35A]') : 'bg-gradient-to-r from-[#5A8F7B] to-[#1B3A2D]'}`}
                          style={{ width: `${paymentProgress(c.paidAmount, c.price)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-[#5A8F7B] hover:text-[#1B3A2D]" title="查看详情" onClick={() => { setSelectedContractId(c.id); setDetailTab('info') }}>
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-[#1B3A2D]" title="打印" onClick={() => handlePrint(c)}>
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="section-title">新增合同</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            {validationError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded flex items-center gap-1"><AlertCircle className="w-4 h-4" />{validationError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">购墓人姓名 *</label>
                <input className="input-field" value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">联系电话 *</label>
                <input className="input-field" value={form.buyerPhone} onChange={e => setForm(f => ({ ...f, buyerPhone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">身份证号 *</label>
                <input className="input-field" value={form.buyerIdCard} onChange={e => setForm(f => ({ ...f, buyerIdCard: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">逝者姓名</label>
                <input className="input-field" value={form.deceasedName} onChange={e => setForm(f => ({ ...f, deceasedName: e.target.value }))} placeholder="选填" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">选择墓位 *</label>
                <select className="select-field" value={form.plotId} onChange={e => setForm(f => ({ ...f, plotId: e.target.value }))}>
                  <option value="">请选择</option>
                  {availablePlots.map(p => <option key={p.id} value={p.id}>{p.position} (¥{p.price.toLocaleString()})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">墓位价格</label>
                <input className="input-field bg-gray-50" value={selectedPlot ? `¥${selectedPlot.price.toLocaleString()}` : ''} readOnly />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">付款方式</label>
                <select className="select-field" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as 'full' | 'installment' }))}>
                  <option value="full">全款（签约时全额收款）</option>
                  <option value="installment">分期（签约后可录入分期计划）</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">备注</label>
                <input className="input-field" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button className="btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>取消</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedContract && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedContractId(null)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C4A35A]" />
                <h2 className="section-title text-lg">合同详情</h2>
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${statusBadge[selectedContract.status]}`}>
                  {statusLabels[selectedContract.status]}
                </span>
              </div>
              <button onClick={() => setSelectedContractId(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">合同编号</p>
                <p className="font-semibold text-[#1B3A2D]">{selectedContract.contractNo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">签约日期</p>
                <p className="text-sm">{fmtDate(selectedContract.signingDate)}</p>
              </div>
              <div className={`text-right px-3 py-2 rounded-lg ${remainingAmount(selectedContract) > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <p className="text-xs text-gray-500">尾款情况</p>
                <p className={`font-semibold text-sm ${remainingAmount(selectedContract) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {remainingAmount(selectedContract) > 0 ? `欠¥${remainingAmount(selectedContract).toLocaleString()}` : '✓ 尾款已结清'}
                </p>
              </div>
            </div>

            <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
              {([['info', '基础信息', FileText], ['plan', `分期计划(${selectedContract.paymentPlan.length})`, Calendar], ['history', `收款记录(${selectedContract.paymentHistory.length})`, DollarSign]] as const).map(([k, l, Icon]) => (
                <button key={k} onClick={() => setDetailTab(k as any)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${detailTab === k ? 'bg-white shadow-sm text-[#1B3A2D]' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Icon className="w-3.5 h-3.5" />{l}
                </button>
              ))}
            </div>

            {detailTab === 'info' && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" /> 购墓人信息
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-gray-500">姓名</p><p className="text-[#1B3A2D]">{selectedContract.buyerName}</p></div>
                    <div><p className="text-xs text-gray-500">联系电话</p><p className="text-[#1B3A2D] flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" />{maskPhone(selectedContract.buyerPhone)}</p></div>
                    <div className="col-span-2"><p className="text-xs text-gray-500">身份证号</p><p className="text-[#1B3A2D]">{maskIdCard(selectedContract.buyerIdCard)}</p></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" /> 墓位信息
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-gray-500">墓位位置</p><p className="text-[#1B3A2D]">{selectedContract.plotPosition}</p></div>
                    <div><p className="text-xs text-gray-500">价格</p><p className="text-[#C4A35A] font-semibold">¥{selectedContract.price.toLocaleString()}</p></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-gray-400" /> 付款信息
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">付款方式</p>
                      <p className="text-[#1B3A2D] font-medium">{selectedContract.paymentMethod === 'full' ? '全款' : '分期'}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">已付 / 应缴</p>
                      <p className="text-[#1B3A2D]">
                        <span className="text-emerald-600 font-semibold">¥{selectedContract.paidAmount.toLocaleString()}</span>
                        <span className="text-gray-400 mx-1">/</span>¥{selectedContract.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#5A8F7B] to-[#1B3A2D] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${paymentProgress(selectedContract.paidAmount, selectedContract.price)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">完成进度：{paymentProgress(selectedContract.paidAmount, selectedContract.price)}%</p>
                  </div>
                </div>
                {selectedContract.deceasedName && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-xs text-gray-500">逝者姓名</p>
                      <p className="text-[#1B3A2D]">{selectedContract.deceasedName}</p>
                    </div>
                  </div>
                )}
                {selectedContract.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">备注</p>
                    <p className="text-sm text-gray-700">{selectedContract.notes}</p>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'plan' && (
              <div className="space-y-4">
                {selectedContract.paymentMethod === 'full' && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-sm text-sky-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5" />全款合同无需录入分期计划
                  </div>
                )}
                {selectedContract.paymentMethod === 'installment' && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-[#1B3A2D]">{selectedContract.paymentPlan.length}</span> 期计划 ·
                          已到期未付：<span className={hasUnpaidPlan(selectedContract) ? 'text-red-500 font-medium' : 'text-emerald-600'}>
                            {hasUnpaidPlan(selectedContract) ? `${unpaidPlansTotal(selectedContract).toLocaleString()}元（逾期）` : '无'}
                          </span>
                        </p>
                      </div>
                      {selectedContract.status !== 'cancelled' && (
                        <button className="btn-primary text-xs flex items-center gap-1" onClick={() => setShowPlanForm(!showPlanForm)}>
                          {showPlanForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showPlanForm ? '收起' : '+ 添加分期'}
                        </button>
                      )}
                    </div>
                    {showPlanForm && selectedContract.status !== 'cancelled' && (
                      <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">应收日期</label>
                          <input type="date" className="input-field text-sm" value={planForm.dueDate} onChange={e => setPlanForm(f => ({ ...f, dueDate: e.target.value }))} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">应收金额(元)</label>
                          <input type="number" min="0" className="input-field text-sm" value={planForm.amount || ''} onChange={e => setPlanForm(f => ({ ...f, amount: Math.max(0, +e.target.value) }))} />
                        </div>
                        <div className="flex items-end">
                          <button className="btn-primary text-sm w-full" onClick={handleAddPlan}>
                            <Plus className="w-3 h-3 inline mr-1" />添加
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {selectedContract.paymentPlan.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">暂无分期计划，点击上方"+ 添加分期"开始录入</div>
                      )}
                      {[...selectedContract.paymentPlan].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(p => {
                        const overdue = (p.status === 'unpaid' || p.status === 'partial') && isBefore(parseISO(p.dueDate), new Date())
                        const partialPaid = p.status === 'partial'
                        return (
                          <div key={p.id} className={`border rounded-lg p-3 flex items-center justify-between ${overdue ? 'border-red-200 bg-red-50/50' : p.status === 'paid' ? 'border-emerald-200 bg-emerald-50/50' : partialPaid ? 'border-sky-200 bg-sky-50/50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${p.status === 'paid' ? 'bg-emerald-100' : partialPaid ? 'bg-sky-100' : overdue ? 'bg-red-100' : 'bg-gray-100'}`}>
                                {p.status === 'paid' ? <Check className="w-4 h-4 text-emerald-600" /> : <Clock className={`w-4 h-4 ${partialPaid ? 'text-sky-600' : overdue ? 'text-red-600' : 'text-gray-500'}`} />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#1B3A2D]">
                                  <Calendar className="w-3.5 h-3.5 inline mr-1 text-gray-400" />{fmtDate(p.dueDate)}
                                  {overdue && <span className="text-xs text-red-500 ml-2">已逾期</span>}
                                  {partialPaid && !overdue && <span className="text-xs text-sky-600 ml-2">部分收款</span>}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {p.status === 'paid'
                                    ? `实收¥${(p.paidAmount || 0).toLocaleString()} · ${fmtDate(p.paidDate!)}`
                                    : partialPaid
                                      ? `已收¥${(p.paidAmount || 0).toLocaleString()}，还剩¥${(p.amount - (p.paidAmount || 0)).toLocaleString()}`
                                      : `待收`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className={`font-semibold ${p.status === 'paid' ? 'text-emerald-600' : partialPaid ? 'text-sky-600' : overdue ? 'text-red-600' : 'text-[#C4A35A]'}`}>
                                ¥{p.amount.toLocaleString()}
                              </p>
                              {(p.status === 'unpaid' || p.status === 'partial') && selectedContract.status !== 'cancelled' && (
                                <button className="btn-primary text-xs px-2 py-1" onClick={() => { setPaymentForm(f => ({ planId: p.id, amount: p.amount - (p.paidAmount || 0) })); setDetailTab('history') }}>
                                  {partialPaid ? '补收' : '收款'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {detailTab === 'history' && (
              <div className="space-y-4">
                {selectedContract.status !== 'cancelled' && remainingAmount(selectedContract) > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-amber-800 mb-3 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />新增收款
                    </h4>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">关联分期（选填）</label>
                        <select className="select-field text-sm" value={paymentForm.planId} onChange={e => setPaymentForm(f => ({ ...f, planId: e.target.value }))}>
                          <option value="">不关联 - 作为一般收款</option>
                          {selectedContract.paymentPlan.filter(p => p.status !== 'paid').map(p => (
                            <option key={p.id} value={p.id}>第 {fmtDate(p.dueDate)} 期 · ¥{(p.amount - (p.paidAmount || 0)).toLocaleString()} {p.status === 'partial' ? '(已部分收款)' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">收款金额(元)</label>
                        <input type="number" min="0" className="input-field text-sm" value={paymentForm.amount || ''} onChange={e => setPaymentForm(f => ({ ...f, amount: Math.max(0, +e.target.value) }))} />
                      </div>
                      <div className="flex items-end">
                        <button className="btn-primary text-sm w-full" onClick={handleAddPayment}>
                          <Check className="w-3 h-3 inline mr-1" />确认收款
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">收款记录</h4>
                  <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="table-header">
                          <th className="px-4 py-2 text-left">日期</th>
                          <th className="px-4 py-2 text-left">金额</th>
                          <th className="px-4 py-2 text-left">关联分期</th>
                          <th className="px-4 py-2 text-right">收后剩余</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedContract.paymentHistory.length === 0 && (
                          <tr><td className="px-4 py-8 text-center text-gray-400" colSpan={4}>暂无收款记录</td></tr>
                        )}
                        {[...selectedContract.paymentHistory].reverse().map(h => (
                          <tr key={h.id} className="table-row">
                            <td className="px-4 py-2 text-gray-600">{fmtDate(h.date)}</td>
                            <td className="px-4 py-2 text-emerald-600 font-semibold">+¥{h.amount.toLocaleString()}</td>
                            <td className="px-4 py-2 text-gray-500 text-xs">
                              {h.relatedPlanId
                                ? (selectedContract.paymentPlan.find(p => p.id === h.relatedPlanId)
                                  ? `${fmtDate(selectedContract.paymentPlan.find(p => p.id === h.relatedPlanId)!.dueDate)} 期`
                                  : '-')
                                : '一般收款'}
                            </td>
                            <td className={`px-4 py-2 text-right font-medium ${h.remainingAfter === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {h.remainingAfter === 0 ? '✓ 结清' : `¥${h.remainingAfter.toLocaleString()}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>状态推进：</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge[selectedContract.status]}`}>
                  {statusLabels[selectedContract.status]}
                </span>
                <span className="text-gray-400">→ 操作将同步墓区图颜色</span>
              </div>
              {renderStatusActions(selectedContract)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
