import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import type { BurialStatus, InscriptionStatus, InscriptionFontStyle } from '@/types'
import { safeParseDate, generateUniqueId, maskIdCard, sanitizeInput } from '@/utils/helpers'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns'
import { BookOpen, Calendar, Plus, CheckCircle, Clock, Eye, PenTool, ChevronLeft, ChevronRight, X, User, FileText, MapPin } from 'lucide-react'

const STATUS_MAP: Record<BurialStatus, { label: string; cls: string }> = {
  scheduled: { label: '已预约', cls: 'bg-blue-50 text-blue-700' },
  preparing: { label: '准备中', cls: 'bg-amber-50 text-amber-700' },
  in_progress: { label: '进行中', cls: 'bg-purple-50 text-purple-700' },
  completed: { label: '已完成', cls: 'bg-emerald-50 text-emerald-700' },
}

const NEXT_STATUS: Record<Exclude<BurialStatus, 'completed'>, BurialStatus> = {
  scheduled: 'preparing',
  preparing: 'in_progress',
  in_progress: 'completed',
}

const NEXT_STATUS_LABEL: Record<Exclude<BurialStatus, 'completed'>, string> = {
  scheduled: '开始准备',
  preparing: '开始安葬',
  in_progress: '完成安葬',
}

const INSCR_STATUS_MAP: Record<InscriptionStatus, { label: string; cls: string }> = {
  pending: { label: '待确认', cls: 'bg-amber-50 text-amber-700' },
  confirmed: { label: '已确认', cls: 'bg-blue-50 text-blue-700' },
  engraved: { label: '已刻字', cls: 'bg-emerald-50 text-emerald-700' },
}

const INSCR_NEXT_STATUS: Record<InscriptionStatus, InscriptionStatus> = {
  pending: 'confirmed',
  confirmed: 'engraved',
  engraved: 'engraved',
}

const INSCR_PREV_STATUS: Record<InscriptionStatus, InscriptionStatus> = {
  pending: 'pending',
  confirmed: 'pending',
  engraved: 'confirmed',
}

const TIME_SLOTS = ['08:00-10:00', '10:00-12:00', '13:00-15:00', '15:00-17:00']
const FONT_LABELS: Record<InscriptionFontStyle, string> = { regular: '常规体', bold: '粗体', traditional: '繁体' }
const FONT_OPTIONS: InscriptionFontStyle[] = ['regular', 'bold', 'traditional']
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function BurialRegistration() {
  const { burials, plots, contracts, addBurial, updateBurialStatus, updateInscription } = useStore()
  const [tab, setTab] = useState<'booking' | 'inscription'>('booking')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<'all' | BurialStatus>('all')
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBurialId, setEditingBurialId] = useState<string | null>(null)
  const [viewBurialId, setViewBurialId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'warn' } | null>(null)
  const [editForm, setEditForm] = useState<{ content: string; fontStyle: InscriptionFontStyle; specialRequests: string }>({
    content: '', fontStyle: 'regular', specialRequests: '',
  })
  const [form, setForm] = useState({ contractId: '', plotId: '', buyerName: '', deceasedName: '', deceasedIdCard: '', deathDate: '', burialDate: format(new Date(), 'yyyy-MM-dd'), burialTimeSlot: TIME_SLOTS[0] })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = getDay(monthStart)

  const dateBurialMap = useMemo(() => {
    const m: Record<string, typeof burials> = {}
    burials.forEach(b => { (m[b.burialDate] ??= []).push(b) })
    return m
  }, [burials])

  const selectedKey = format(selectedDate, 'yyyy-MM-dd')
  const dayBurials = (dateBurialMap[selectedKey] || []).filter(b => statusFilter === 'all' || b.status === statusFilter)

  const inscriptions = burials.filter(b => b.inscription)
  const editingBurial = editingBurialId ? burials.find(b => b.id === editingBurialId) : null
  const viewBurial = viewBurialId ? burials.find(b => b.id === viewBurialId) : null

  const availableContracts = useMemo(() => contracts.filter(c => c.status === 'signed' || c.status === 'completed'), [contracts])

  const handleContractChange = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId)
    if (contract) {
      const plot = plots.find(p => p.id === contract.plotId)
      setForm(f => ({
        ...f,
        contractId,
        plotId: contract.plotId,
        buyerName: contract.buyerName,
        deceasedName: sanitizeInput(contract.deceasedName || f.deceasedName || ''),
      }))
    } else {
      setForm(f => ({ ...f, contractId: '', plotId: '', buyerName: '' }))
    }
  }

  const handlePlotChange = (plotId: string) => {
    const plot = plots.find(p => p.id === plotId)
    if (plot) {
      const contract = contracts.find(c => c.plotId === plotId && (c.status === 'signed' || c.status === 'completed'))
      setForm(f => ({
        ...f,
        plotId,
        contractId: contract?.id || '',
        buyerName: contract?.buyerName || plot?.holderName || '',
        deceasedName: sanitizeInput(contract?.deceasedName || plot?.deceasedName || f.deceasedName || ''),
      }))
    }
  }

  const soldPlots = useMemo(() => plots.filter(p => p.status === 'sold' || p.status === 'buried'), [plots])

  const showToast = (msg: string, type: 'ok' | 'warn' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleAdd = () => {
    const plot = plots.find(p => p.id === form.plotId)
    const contract = contracts.find(c => c.id === form.contractId)
    const deceasedName = sanitizeInput(form.deceasedName.trim())
    const deathDate = form.deathDate
    const burialDate = form.burialDate
    if (!plot || !deceasedName || !deathDate || !burialDate) {
      showToast('请完整填写墓位、逝者姓名、死亡日期和安葬日期', 'warn')
      return
    }
    addBurial({
      id: generateUniqueId(),
      plotId: form.plotId,
      plotPosition: plot.position,
      contractId: contract?.id,
      buyerName: contract?.buyerName || plot?.holderName,
      deceasedName,
      deceasedIdCard: sanitizeInput(form.deceasedIdCard.trim()) || undefined,
      deathDate,
      burialDate,
      burialTimeSlot: form.burialTimeSlot,
      status: 'scheduled',
    })
    showToast('安葬预约已创建，墓位状态已同步')
    setShowModal(false)
    setForm({ contractId: '', plotId: '', buyerName: '', deceasedName: '', deceasedIdCard: '', deathDate: '', burialDate: format(new Date(), 'yyyy-MM-dd'), burialTimeSlot: TIME_SLOTS[0] })
  }

  const handleOpenEdit = (burialId: string) => {
    const b = burials.find(x => x.id === burialId)
    if (!b?.inscription) return
    setEditingBurialId(burialId)
    setEditForm({
      content: b.inscription.content,
      fontStyle: b.inscription.fontStyle,
      specialRequests: b.inscription.specialRequests || '',
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!editingBurial?.inscription) return
    const current = editingBurial.inscription
    const nextStatus = INSCR_NEXT_STATUS[current.status]
    updateInscription(editingBurialId!, {
      ...current,
      content: sanitizeInput(editForm.content),
      fontStyle: editForm.fontStyle,
      specialRequests: sanitizeInput(editForm.specialRequests) || undefined,
      status: nextStatus,
    })
    showToast('碑文信息已保存并推进状态')
    setShowEditModal(false)
    setEditingBurialId(null)
  }

  const handleRollback = () => {
    if (!editingBurial?.inscription) return
    const current = editingBurial.inscription
    const prevStatus = INSCR_PREV_STATUS[current.status]
    updateInscription(editingBurialId!, {
      ...current,
      content: sanitizeInput(editForm.content),
      fontStyle: editForm.fontStyle,
      specialRequests: sanitizeInput(editForm.specialRequests) || undefined,
      status: prevStatus,
    })
    showToast('状态已回退')
    setShowEditModal(false)
    setEditingBurialId(null)
  }

  const handleAdvanceQuick = (burialId: string) => {
    const b = burials.find(x => x.id === burialId)
    if (!b?.inscription) return
    const nextStatus = INSCR_NEXT_STATUS[b.inscription.status]
    updateInscription(burialId, { ...b.inscription, status: nextStatus })
    showToast('状态已推进')
  }

  const handleAdvanceBurialStatus = (burialId: string) => {
    const b = burials.find(x => x.id === burialId)
    if (!b) return
    const next = NEXT_STATUS[b.status as Exclude<BurialStatus, 'completed'>]
    updateBurialStatus(burialId, next)
    if (next === 'completed') {
      showToast('安葬已完成，墓区图、客户档案、逝者信息已同步', 'ok')
    } else {
      showToast(`已推进到${STATUS_MAP[next].label}`)
    }
  }

  return (
    <div className="p-6 min-h-screen bg-cream relative">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-primary font-serif">安葬登记</h1>
      </div>

      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-border">
        {([['booking', '安葬预约', Calendar], ['inscription', '立碑刻字', PenTool]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as 'booking' | 'inscription')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-gold text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'booking' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <input type="date" value={format(selectedDate, 'yyyy-MM-dd')} onChange={e => { const d = safeParseDate(e.target.value); if (d) setSelectedDate(d) }} className="input-field w-40" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | BurialStatus)} className="select-field w-28">
              <option value="all">全部</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4" />新增预约</button>
          </div>

          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-ghost text-xs"><ChevronLeft className="w-3 h-3 inline" /> 上月</button>
              <span className="font-semibold text-primary">{format(currentMonth, 'yyyy年M月')}</span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-ghost text-xs">下月 <ChevronRight className="w-3 h-3 inline" /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs mb-1">
              {WEEKDAYS.map(d => <div key={d} className="py-1 font-medium text-gray-400">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: startDay }).map((_, i) => <div key={`e${i}`} />)}
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd')
                const dayB = dateBurialMap[key] || []
                const sel = isSameDay(day, selectedDate)
                return (
                  <button key={key} onClick={() => setSelectedDate(day)}
                    className={`relative p-1.5 rounded text-sm transition-colors ${sel ? 'bg-primary text-gold font-semibold' : 'hover:bg-primary/5'}`}>
                    {format(day, 'd')}
                    {dayB.length > 0 && <div className="flex justify-center gap-0.5 mt-0.5">{dayB.slice(0, 2).map((_b, i) => <span key={i} className={`w-1 h-1 rounded-full ${sel ? 'bg-gold' : 'bg-sage'}`} />)}</div>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="section-title flex items-center gap-2"><Clock className="w-4 h-4" />{format(selectedDate, 'M月d日')} 安葬安排</h3>
            {dayBurials.length === 0 ? (
              <div className="card p-6 text-center text-gray-400 text-sm">当日暂无安葬安排</div>
            ) : dayBurials.map(b => (
              <div key={b.id} className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-charcoal">{b.deceasedName}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{b.plotPosition}</span>
                    <span>·</span>
                    <span>{b.burialTimeSlot}</span>
                    {b.buyerName && <><span>·</span><span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{b.buyerName}</span></>}
                    {b.deceasedIdCard && <><span>·</span><span>{maskIdCard(b.deceasedIdCard)}</span></>}
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_MAP[b.status].cls}`}>{STATUS_MAP[b.status].label}</span>
                <div className="flex gap-1">
                  <button className="btn-ghost text-xs px-2 py-1" onClick={() => setViewBurialId(b.id)}><Eye className="w-3 h-3" /></button>
                  {b.status !== 'completed' && (
                    <button onClick={() => handleAdvanceBurialStatus(b.id)} className="btn-ghost text-xs px-2 py-1 text-emerald-600"><CheckCircle className="w-3 h-3" /><span className="ml-1">{NEXT_STATUS_LABEL[b.status as Exclude<BurialStatus, 'completed'>]}</span></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'inscription' && (
        <div className="space-y-3">
          {inscriptions.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">暂无刻字记录</div>
          ) : inscriptions.map(b => b.inscription && (
            <div key={b.id} className="card overflow-hidden">
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => handleOpenEdit(b.id)}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-charcoal">{b.deceasedName}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{b.plotPosition} · {FONT_LABELS[b.inscription.fontStyle]}</div>
                </div>
                <span className="text-xs text-gray-400 truncate max-w-[120px]">{(b.inscription.content || '').slice(0, 20)}…</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${INSCR_STATUS_MAP[b.inscription.status].cls}`}>{INSCR_STATUS_MAP[b.inscription.status].label}</span>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleOpenEdit(b.id)} className="btn-ghost text-xs px-2 py-1"><PenTool className="w-3 h-3" /><span className="ml-1">编辑</span></button>
                  {b.inscription.status !== 'engraved' && (
                    <button onClick={() => handleAdvanceQuick(b.id)} className="btn-ghost text-xs px-2 py-1 text-emerald-600"><CheckCircle className="w-3 h-3" /><span className="ml-1">下一步</span></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="section-title mb-4">新增安葬预约</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">关联合同（已签/已完成）</label>
                <select value={form.contractId} onChange={e => handleContractChange(e.target.value)} className="select-field">
                  <option value="">不选合同，手动选择墓位</option>
                  {availableContracts.map(c => <option key={c.id} value={c.id}>{c.contractNo} - {c.buyerName} - {c.plotPosition}</option>)}
                </select>
              </div>
              {form.contractId ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">购墓客户</label>
                    <div className="input-field bg-gray-50 text-gray-600 flex items-center gap-1"><User className="w-3 h-3" />{form.buyerName || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">墓位位置</label>
                    <div className="input-field bg-gray-50 text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" />{plots.find(p => p.id === form.plotId)?.position || '-'}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">选择墓位（已售/已安葬）</label>
                  <select value={form.plotId} onChange={e => handlePlotChange(e.target.value)} className="select-field">
                    <option value="">请选择</option>
                    {soldPlots.map(p => <option key={p.id} value={p.id}>{p.position}{p.holderName ? ` - ${p.holderName}` : ''}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">逝者姓名 <span className="text-red-500">*</span></label>
                  <input value={form.deceasedName} onChange={e => setForm({ ...form, deceasedName: e.target.value })} className="input-field" placeholder="必填" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">身份证号</label>
                  <input value={form.deceasedIdCard} onChange={e => setForm({ ...form, deceasedIdCard: e.target.value })} className="input-field" placeholder="选填" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">死亡日期 <span className="text-red-500">*</span></label><input type="date" value={form.deathDate} onChange={e => setForm({ ...form, deathDate: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">安葬日期 <span className="text-red-500">*</span></label><input type="date" value={form.burialDate} onChange={e => setForm({ ...form, burialDate: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block">安葬时段</label><select value={form.burialTimeSlot} onChange={e => setForm({ ...form, burialTimeSlot: e.target.value })} className="select-field">{TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              {(form.contractId || form.plotId) && (
                <div className="p-3 bg-[#F5F3EF] border border-[#C4A35A]/30 rounded-lg text-xs text-gray-500 flex items-start gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#C4A35A] mt-0.5 shrink-0" />
                  <span>提交后将自动同步：墓位持有人信息、客户档案；安葬完成后墓区图将变更为"已安葬"色。</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary">取消</button>
              <button onClick={handleAdd} className="btn-primary">确认预约</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingBurial?.inscription && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">编辑碑文信息</h3>
              <button onClick={() => setShowEditModal(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">墓位位置</label>
                  <div className="input-field bg-gray-50 text-gray-500">{editingBurial.plotPosition}</div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">逝者姓名</label>
                  <div className="input-field bg-gray-50 text-gray-500">{editingBurial.deceasedName}</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">碑文内容</label>
                <textarea value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                  className="input-field min-h-[100px] resize-y" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">字体样式</label>
                  <select value={editForm.fontStyle} onChange={e => setEditForm({ ...editForm, fontStyle: e.target.value as InscriptionFontStyle })} className="select-field">
                    {FONT_OPTIONS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">刻字状态</label>
                  <div className="flex items-center h-9">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${INSCR_STATUS_MAP[editingBurial.inscription!.status].cls}`}>
                      {INSCR_STATUS_MAP[editingBurial.inscription!.status].label}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">特殊要求</label>
                <textarea value={editForm.specialRequests} onChange={e => setEditForm({ ...editForm, specialRequests: e.target.value })}
                  className="input-field min-h-[60px] resize-y" rows={2} placeholder="选填" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              {editingBurial.inscription!.status !== 'pending' && (
                <button onClick={handleRollback} className="btn-secondary">状态回退</button>
              )}
              <div className="flex-1" />
              <button onClick={() => setShowEditModal(false)} className="btn-secondary">取消</button>
              <button onClick={handleSaveEdit} className="btn-primary">保存修改</button>
            </div>
          </div>
        </div>
      )}

      {viewBurial && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setViewBurialId(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">安葬详情</h3>
              <button onClick={() => setViewBurialId(null)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">墓位位置</span><span className="font-medium">{viewBurial.plotPosition}</span></div>
              {viewBurial.buyerName && <div className="flex justify-between"><span className="text-gray-500">购墓客户</span><span className="font-medium">{viewBurial.buyerName}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">逝者姓名</span><span className="font-medium text-primary">{viewBurial.deceasedName}</span></div>
              {viewBurial.deceasedIdCard && <div className="flex justify-between"><span className="text-gray-500">身份证号</span><span>{maskIdCard(viewBurial.deceasedIdCard)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">死亡日期</span><span>{viewBurial.deathDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">安葬日期</span><span>{viewBurial.burialDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">安葬时段</span><span>{viewBurial.burialTimeSlot}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">状态</span><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_MAP[viewBurial.status].cls}`}>{STATUS_MAP[viewBurial.status].label}</span></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setViewBurialId(null)} className="btn-secondary">关闭</button>
              {viewBurial.status !== 'completed' && (
                <button onClick={() => { handleAdvanceBurialStatus(viewBurial.id); setViewBurialId(null) }} className="btn-primary">{NEXT_STATUS_LABEL[viewBurial.status as Exclude<BurialStatus, 'completed'>]}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
