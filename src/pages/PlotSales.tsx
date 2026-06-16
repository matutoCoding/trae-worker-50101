import { useState } from 'react'
import { useStore } from '@/store'
import type { SalesContract, ContractStatus } from '@/types'
import { maskIdCard, maskPhone, generateUniqueId } from '@/utils/helpers'
import { format, parseISO } from 'date-fns'
import { ShoppingBag, Plus, Search, Eye, Printer, X, FileText, User, Phone, MapPin, CreditCard, ArrowRight } from 'lucide-react'

const statusLabels: Record<ContractStatus, string> = { pending: '待签', signed: '已签', completed: '已完成', cancelled: '已取消' }
const statusBadge: Record<ContractStatus, string> = {
  pending: 'bg-amber-50 text-amber-700', signed: 'bg-sky-50 text-sky-700',
  completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-red-50 text-red-700',
}

const emptyForm = { buyerName: '', buyerPhone: '', buyerIdCard: '', deceasedName: '', plotId: '', paymentMethod: 'full' as 'full' | 'installment', notes: '' }

export default function PlotSales() {
  const { contracts, plots, addContract, updateContractStatus, setPlotStatus } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [selectedContract, setSelectedContract] = useState<SalesContract | null>(null)
  const [printToast, setPrintToast] = useState<string | null>(null)

  const availablePlots = plots.filter(p => p.status === 'available')
  const selectedPlot = plots.find(p => p.id === form.plotId)

  const filteredContracts = contracts.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (searchTerm && !c.buyerName.includes(searchTerm) && !c.contractNo.includes(searchTerm) && !c.plotPosition.includes(searchTerm)) return false
    if (dateRange.start && c.signingDate < dateRange.start) return false
    if (dateRange.end && c.signingDate > dateRange.end) return false
    return true
  })

  const now = new Date()
  const monthContracts = contracts.filter(c => {
    const d = new Date(c.signingDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && c.status !== 'cancelled'
  })
  const pendingCount = contracts.filter(c => c.status === 'pending').length
  const totalAmount = monthContracts.reduce((s, c) => s + c.price, 0)

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
      buyerName: form.buyerName.trim(),
      buyerPhone: form.buyerPhone,
      buyerIdCard: form.buyerIdCard,
      deceasedName: form.deceasedName.trim() || undefined,
      price: selectedPlot?.price || 0,
      paymentMethod: form.paymentMethod,
      paidAmount: form.paymentMethod === 'full' ? (selectedPlot?.price || 0) : 0,
      status: 'pending',
      signingDate: new Date().toISOString().split('T')[0],
      notes: form.notes.trim() || undefined,
    }
    addContract(contract)
    setPlotStatus(form.plotId, 'reserved')
    setShowModal(false)
    setForm(emptyForm)
    setSaving(false)
  }

  const handleStatusChange = (newStatus: ContractStatus) => {
    if (!selectedContract) return
    updateContractStatus(selectedContract.id, newStatus)
    setSelectedContract({ ...selectedContract, status: newStatus })
  }

  const handlePrint = (contract: SalesContract) => {
    setPrintToast(`合同 ${contract.contractNo} 已发送打印`)
    setTimeout(() => setPrintToast(null), 2000)
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

  return (
    <div className="p-6 space-y-6 relative">
      {printToast && (
        <div className="fixed top-6 right-6 z-[60] bg-[#1B3A2D] text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {printToast}
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

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '本月成交', value: `${monthContracts.length}`, suffix: '单' },
          { label: '待签合同', value: `${pendingCount}`, suffix: '份' },
          { label: '销售金额', value: `¥${totalAmount.toLocaleString()}`, suffix: '' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="w-1 h-10 bg-[#C4A35A] rounded-full" />
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-[#1B3A2D]">{s.value}<span className="text-sm font-normal ml-0.5">{s.suffix}</span></p>
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
              <th className="px-4 py-3 text-left">联系电话</th>
              <th className="px-4 py-3 text-left">金额</th>
              <th className="px-4 py-3 text-left">付款方式</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">签约日期</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(c => (
              <tr key={c.id} className="table-row">
                <td className="px-4 py-3 font-medium text-[#1B3A2D]">{c.contractNo}</td>
                <td className="px-4 py-3">{c.plotPosition}</td>
                <td className="px-4 py-3">{c.buyerName}</td>
                <td className="px-4 py-3">{maskPhone(c.buyerPhone)}</td>
                <td className="px-4 py-3 text-[#C4A35A] font-semibold">¥{c.price.toLocaleString()}</td>
                <td className="px-4 py-3">{c.paymentMethod === 'full' ? '全款' : '分期'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge[c.status]}`}>
                    {statusLabels[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3">{c.signingDate}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="text-[#5A8F7B] hover:text-[#1B3A2D]" title="查看" onClick={() => setSelectedContract(c)}>
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-[#1B3A2D]" title="打印" onClick={() => handlePrint(c)}>
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
            {validationError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{validationError}</p>}
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
                  {availablePlots.map(p => <option key={p.id} value={p.id}>{p.position}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">墓位价格</label>
                <input className="input-field bg-gray-50" value={selectedPlot ? `¥${selectedPlot.price.toLocaleString()}` : ''} readOnly />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">付款方式</label>
                <select className="select-field" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as 'full' | 'installment' }))}>
                  <option value="full">全款</option>
                  <option value="installment">分期</option>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedContract(null)}>
          <div className="bg-white rounded-lg w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C4A35A]" />
                <h2 className="section-title text-lg">合同详情</h2>
              </div>
              <button onClick={() => setSelectedContract(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
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
              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${statusBadge[selectedContract.status]}`}>
                {statusLabels[selectedContract.status]}
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" /> 购墓人信息
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">姓名</p>
                    <p className="text-[#1B3A2D]">{selectedContract.buyerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">联系电话</p>
                    <p className="text-[#1B3A2D] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {maskPhone(selectedContract.buyerPhone)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">身份证号</p>
                    <p className="text-[#1B3A2D]">{maskIdCard(selectedContract.buyerIdCard)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" /> 墓位信息
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">墓位位置</p>
                    <p className="text-[#1B3A2D]">{selectedContract.plotPosition}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">价格</p>
                    <p className="text-[#C4A35A] font-semibold">¥{selectedContract.price.toLocaleString()}</p>
                  </div>
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
                      <span className="text-gray-400 mx-1">/</span>
                      ¥{selectedContract.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#5A8F7B] to-[#1B3A2D] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${paymentProgress(selectedContract.paidAmount, selectedContract.price)}%` }}
                    />
                  </div>
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

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>当前状态：</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge[selectedContract.status]}`}>
                  {statusLabels[selectedContract.status]}
                </span>
              </div>
              {renderStatusActions(selectedContract)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
