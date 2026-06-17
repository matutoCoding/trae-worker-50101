import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import { clampNumber, generateUniqueId, maskPhone, sanitizeInput, safeParseDate } from '@/utils/helpers'
import { Flame, Calendar, Users, Clock, Plus, Check, X, Camera, LayoutGrid, AlertTriangle } from 'lucide-react'
import type { SacrificeBooking, SacrificeStatus, SacrificeType, ProxyServiceType } from '@/types'
import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, addDays, isWeekend } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const STATUS_MAP: Record<SacrificeStatus, { label: string; cls: string }> = {
  pending: { label: '待确认', cls: 'bg-amber-50 text-amber-700' },
  confirmed: { label: '已确认', cls: 'bg-blue-50 text-blue-700' },
  completed: { label: '已完成', cls: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: '已取消', cls: 'bg-gray-100 text-gray-500' },
}
const TYPE_MAP: Record<SacrificeType, { label: string; cls: string }> = {
  self: { label: '自行祭扫', cls: 'bg-sky-50 text-sky-700' },
  proxy: { label: '代客祭扫', cls: 'bg-purple-50 text-purple-700' },
}
const SERVICE_MAP: Record<ProxyServiceType, { label: string; cls: string }> = {
  basic: { label: '基础', cls: 'bg-gray-100 text-gray-600' },
  standard: { label: '标准', cls: 'bg-blue-50 text-blue-700' },
  premium: { label: '高级', cls: 'bg-gold/10 text-gold-dark' },
}
const TIME_SLOTS = ['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00']
const MAX_CAPACITY = 20

const HOLIDAYS = [
  '01-01', '02-10', '02-11', '02-12', '02-13', '02-14', '02-15', '02-16', '02-17',
  '04-04', '04-05', '04-06', '05-01', '05-02', '05-03', '05-04', '05-05',
  '06-10', '06-11', '06-12', '09-15', '09-16', '09-17', '10-01', '10-02', '10-03',
  '10-04', '10-05', '10-06', '10-07', '12-22',
]

function isHoliday(dateStr: string) {
  const md = dateStr.slice(5)
  return HOLIDAYS.includes(md)
}

export default function SacrificeBooking() {
  const { sacrifices, plots, addSacrifice, updateSacrificeStatus } = useStore()
  const [tab, setTab] = useState<'booking' | 'capacity' | 'proxy'>('booking')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [typeFilter, setTypeFilter] = useState<'all' | SacrificeType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | SacrificeStatus>('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'warn' } | null>(null)
  const [form, setForm] = useState({
    plotId: '', visitorName: '', visitorPhone: '', visitDate: dateFilter,
    timeSlot: TIME_SLOTS[0], visitorCount: 1, type: 'self' as SacrificeType,
    serviceType: 'basic' as ProxyServiceType, flowerRequired: true, incenseRequired: true, specialRequests: '',
  })

  const showToast = (msg: string, type: 'ok' | 'warn' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = useMemo(() => sacrifices.filter(s =>
    (s.visitDate === dateFilter) &&
    (typeFilter === 'all' || s.type === typeFilter) &&
    (statusFilter === 'all' || s.status === statusFilter)
  ), [sacrifices, dateFilter, typeFilter, statusFilter])

  const getSlotCount = (date: string, slot: string) =>
    sacrifices.filter(s => s.visitDate === date && s.timeSlot === slot && s.status !== 'cancelled').length

  const getSlotProxyCount = (date: string, slot: string) =>
    sacrifices.filter(s => s.visitDate === date && s.timeSlot === slot && s.status !== 'cancelled' && s.type === 'proxy').length

  const slotCounts = useMemo(() => {
    const m: Record<string, number> = {}
    TIME_SLOTS.forEach(t => m[t] = getSlotCount(dateFilter, t))
    return m
  }, [sacrifices, dateFilter])

  const proxyBookings = useMemo(() => sacrifices.filter(s => s.type === 'proxy' && s.proxyService), [sacrifices])

  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) }), [weekStart])

  const slotBarColor = (count: number) => {
    const pct = count / MAX_CAPACITY
    if (pct >= 1) return 'bg-red-600'
    if (pct > 0.8) return 'bg-red-500'
    if (pct > 0.5) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const handleAdd = () => {
    if (saving) return
    const plot = plots.find(p => p.id === form.plotId)
    const name = sanitizeInput(form.visitorName.trim())
    const phone = sanitizeInput(form.visitorPhone.trim())
    if (!plot || !name || !phone || !/^\d{7,}$/.test(phone)) {
      showToast('请完整填写墓位、预约人姓名和有效电话', 'warn')
      return
    }
    const currentCount = getSlotCount(form.visitDate, form.timeSlot)
    if (currentCount >= MAX_CAPACITY) {
      showToast(`${form.visitDate} ${form.timeSlot} 时段已预约满(${MAX_CAPACITY}/${MAX_CAPACITY})，请选择其他时段`, 'warn')
      return
    }
    setSaving(true)
    const booking: SacrificeBooking = {
      id: generateUniqueId(), plotId: form.plotId, plotPosition: plot.position,
      visitorName: name, visitorPhone: phone,
      visitDate: form.visitDate, timeSlot: form.timeSlot, visitorCount: form.visitorCount,
      type: form.type, status: 'pending',
      ...(form.type === 'proxy' ? { proxyService: { serviceType: form.serviceType, flowerRequired: form.flowerRequired, incenseRequired: form.incenseRequired, specialRequests: sanitizeInput(form.specialRequests) || undefined } } : {}),
    }
    addSacrifice(booking)
    setShowModal(false)
    setSaving(false)
    showToast(`预约成功！${form.visitDate} ${form.timeSlot} 剩余${MAX_CAPACITY - currentCount - 1}个名额`)
    setForm({ plotId: '', visitorName: '', visitorPhone: '', visitDate: dateFilter, timeSlot: TIME_SLOTS[0], visitorCount: 1, type: 'self', serviceType: 'basic', flowerRequired: true, incenseRequired: true, specialRequests: '' })
  }

  return (
    <div className="p-6 min-h-screen bg-cream relative">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-primary font-serif">祭扫预约</h1>
      </div>

      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-border flex-wrap">
        {([['booking', '祭扫预约', Calendar], ['capacity', '容量分流', LayoutGrid], ['proxy', '代客祭扫', Users]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as 'booking' | 'capacity' | 'proxy')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-gold text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'booking' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="input-field w-40" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | SacrificeType)} className="select-field w-28">
              <option value="all">全部</option>
              <option value="self">自行祭扫</option>
              <option value="proxy">代客祭扫</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | SacrificeStatus)} className="select-field w-28">
              <option value="all">全部</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4" />新增预约</button>
          </div>

          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title flex items-center gap-2 mb-0"><Clock className="w-4 h-4" />{dateFilter} 时段容量</h3>
              {isHoliday(dateFilter) && <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-200">节假日高峰</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TIME_SLOTS.map(slot => {
                const count = slotCounts[slot] || 0
                const pct = Math.min(count / MAX_CAPACITY * 100, 100)
                const full = count >= MAX_CAPACITY
                return (
                  <div key={slot} className={`border rounded-lg p-3 ${full ? 'border-red-300 bg-red-50/50' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{slot}</span>
                      {full && <AlertTriangle className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full transition-all ${slotBarColor(count)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`text-xs ${full ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>{count}/{MAX_CAPACITY} {full ? '已满' : ''}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="text-left px-4 py-3">预约人</th>
                <th className="text-left px-4 py-3">联系电话</th>
                <th className="text-left px-4 py-3">墓位位置</th>
                <th className="text-left px-4 py-3">祭扫日期</th>
                <th className="text-left px-4 py-3">时段</th>
                <th className="text-left px-4 py-3">人数</th>
                <th className="text-left px-4 py-3">类型</th>
                <th className="text-left px-4 py-3">状态</th>
                <th className="text-left px-4 py-3">操作</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">暂无预约记录</td></tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="px-4 py-3 font-medium">{s.visitorName}</td>
                    <td className="px-4 py-3 text-gray-500">{maskPhone(s.visitorPhone)}</td>
                    <td className="px-4 py-3">{s.plotPosition}</td>
                    <td className="px-4 py-3">{s.visitDate}</td>
                    <td className="px-4 py-3">{s.timeSlot}</td>
                    <td className="px-4 py-3">{s.visitorCount}</td>
                    <td className="px-4 py-3"><span className={`badge ${TYPE_MAP[s.type].cls}`}>{TYPE_MAP[s.type].label}</span></td>
                    <td className="px-4 py-3"><span className={`badge ${STATUS_MAP[s.status].cls}`}>{STATUS_MAP[s.status].label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {s.status === 'pending' && <button onClick={() => { updateSacrificeStatus(s.id, 'confirmed'); showToast('已确认') }} className="btn-ghost text-xs px-2 py-1 text-emerald-600" title="确认"><Check className="w-3.5 h-3.5" /></button>}
                        {s.status === 'confirmed' && <button onClick={() => { updateSacrificeStatus(s.id, 'completed'); showToast('已完成') }} className="btn-ghost text-xs px-2 py-1 text-blue-600" title="完成"><Check className="w-3.5 h-3.5" /></button>}
                        {(s.status === 'pending' || s.status === 'confirmed') && <button onClick={() => { updateSacrificeStatus(s.id, 'cancelled'); showToast('已取消', 'warn') }} className="btn-ghost text-xs px-2 py-1 text-red-500" title="取消"><X className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'capacity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-ghost text-xs">← 上一周</button>
              <span className="font-semibold text-primary">{format(weekStart, 'yyyy年M月d日')} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'M月d日')}</span>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-ghost text-xs">下一周 →</button>
              <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="btn-secondary text-xs">本周</button>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>宽松</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>较满</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>紧张</span>
              <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-700 rounded-full"></span>已满</span>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="grid grid-cols-8 border-b border-border bg-gray-50">
              <div className="p-3 text-xs font-medium text-gray-500 text-center">时段</div>
              {weekDays.map(d => {
                const ds = format(d, 'yyyy-MM-dd')
                const holiday = isHoliday(ds)
                const weekend = isWeekend(d)
                return (
                  <div key={ds} className={`p-3 text-center border-l border-border ${holiday || weekend ? 'bg-red-50' : ''}`}>
                    <div className="text-xs text-gray-500">{format(d, 'EEE', { locale: zhCN })}</div>
                    <div className={`font-semibold ${holiday ? 'text-red-600' : 'text-primary'}`}>{format(d, 'M/d')}</div>
                    {holiday && <div className="text-[10px] text-red-500 mt-0.5">节假日</div>}
                  </div>
                )
              })}
            </div>
            {TIME_SLOTS.map(slot => (
              <div key={slot} className="grid grid-cols-8 border-b border-border last:border-b-0">
                <div className="p-3 text-xs font-medium text-gray-600 flex items-center justify-center border-r border-border bg-gray-50/50">{slot}</div>
                {weekDays.map(d => {
                  const ds = format(d, 'yyyy-MM-dd')
                  const count = getSlotCount(ds, slot)
                  const proxyCount = getSlotProxyCount(ds, slot)
                  const selfCount = count - proxyCount
                  const pct = Math.min(count / MAX_CAPACITY * 100, 100)
                  const full = count >= MAX_CAPACITY
                  return (
                    <div key={ds + slot} className={`p-2 border-l border-border ${full ? 'bg-red-50' : ''}`}>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${slotBarColor(count)}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={`text-center text-xs font-semibold ${full ? 'text-red-600' : count > MAX_CAPACITY * 0.8 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {count}/{MAX_CAPACITY}
                      </div>
                      {count > 0 && (
                        <div className="flex justify-center gap-1 mt-1 text-[10px]">
                          {selfCount > 0 && <span className="text-sky-600 bg-sky-50 px-1 rounded">自{selfCount}</span>}
                          {proxyCount > 0 && <span className="text-purple-600 bg-purple-50 px-1 rounded">代{proxyCount}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="card p-4">
            <h3 className="section-title mb-3">本周代客祭扫任务分布</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="table-header">
                  <th className="text-left px-3 py-2">日期</th>
                  {TIME_SLOTS.map(s => <th key={s} className="text-center px-3 py-2">{s}</th>)}
                  <th className="text-right px-3 py-2">合计</th>
                </tr></thead>
                <tbody>
                  {weekDays.map(d => {
                    const ds = format(d, 'yyyy-MM-dd')
                    const perSlot = TIME_SLOTS.map(s => getSlotProxyCount(ds, s))
                    const total = perSlot.reduce((a, b) => a + b, 0)
                    const holiday = isHoliday(ds)
                    return (
                      <tr key={ds} className={`table-row ${holiday ? 'bg-red-50/30' : ''}`}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="font-medium text-primary">{ds}</span>
                          {holiday && <span className="ml-1 text-[10px] text-red-500">节假日</span>}
                        </td>
                        {perSlot.map((n, i) => (
                          <td key={i} className="px-3 py-2 text-center">
                            {n > 0 ? <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full font-medium">{n}</span> : <span className="text-gray-300">-</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right font-semibold text-primary">{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'proxy' && (
        <div className="space-y-4">
          {proxyBookings.length === 0 ? (
            <div className="card p-6 text-center text-gray-400 text-sm">暂无代客祭扫服务</div>
          ) : proxyBookings.map(s => s.proxyService && (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-charcoal">{s.plotPosition}</div>
                  <div className="text-xs text-gray-400 mt-0.5">委托人：{s.visitorName} · {maskPhone(s.visitorPhone)} · {s.visitDate} {s.timeSlot}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${SERVICE_MAP[s.proxyService.serviceType].cls}`}>{SERVICE_MAP[s.proxyService.serviceType].label}</span>
                  <span className={`badge ${STATUS_MAP[s.status].cls}`}>{STATUS_MAP[s.status].label}</span>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 mb-2">
                <label className="flex items-center gap-1"><span className={s.proxyService.flowerRequired ? 'text-emerald-500' : 'text-gray-300'}>✓</span>鲜花</label>
                <label className="flex items-center gap-1"><span className={s.proxyService.incenseRequired ? 'text-emerald-500' : 'text-gray-300'}>✓</span>香烛</label>
              </div>
              {s.proxyService.specialRequests && <div className="text-xs text-gray-400 mb-2">特殊要求：{s.proxyService.specialRequests}</div>}
              {s.status === 'completed' && (
                <div className="border-t border-border mt-3 pt-3 flex items-center gap-2 text-xs text-gray-400">
                  <Camera className="w-4 h-4" />
                  <span>服务反馈（照片/视频）占位</span>
                </div>
              )}
              {s.status !== 'completed' && s.status !== 'cancelled' && (
                <div className="flex justify-end mt-2">
                  <button onClick={() => { updateSacrificeStatus(s.id, 'completed'); showToast('代客祭扫服务已完成') }} className="btn-primary text-xs flex items-center gap-1"><Check className="w-3.5 h-3.5" />完成服务</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="section-title mb-4">新增预约</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500 mb-1 block">选择墓位</label><select value={form.plotId} onChange={e => setForm({ ...form, plotId: e.target.value })} className="select-field"><option value="">请选择</option>{plots.filter(p => p.status === 'sold' || p.status === 'buried').map(p => <option key={p.id} value={p.id}>{p.position}</option>)}</select></div>
              <div><label className="text-xs text-gray-500 mb-1 block">预约人</label><input value={form.visitorName} onChange={e => setForm({ ...form, visitorName: e.target.value })} className="input-field" placeholder="请输入姓名" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">联系电话</label><input value={form.visitorPhone} onChange={e => setForm({ ...form, visitorPhone: e.target.value })} className="input-field" placeholder="请输入电话" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">日期</label><input type="date" value={form.visitDate} onChange={e => setForm({ ...form, visitDate: e.target.value })} className="input-field" /></div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">时段</label>
                  <select value={form.timeSlot} onChange={e => setForm({ ...form, timeSlot: e.target.value })} className="select-field">
                    {TIME_SLOTS.map(t => {
                      const cnt = getSlotCount(form.visitDate, t)
                      const full = cnt >= MAX_CAPACITY
                      return <option key={t} value={t} disabled={full}>{t} {full ? `(已满${cnt}/${MAX_CAPACITY})` : `(${cnt}/${MAX_CAPACITY})`}</option>
                    })}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">人数</label><input type="number" min={1} max={20} value={form.visitorCount} onChange={e => setForm({ ...form, visitorCount: clampNumber(Number(e.target.value), 1, 20) })} className="input-field" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">类型</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as SacrificeType })} className="select-field"><option value="self">自行祭扫</option><option value="proxy">代客祭扫</option></select></div>
              </div>
              {form.type === 'proxy' && (
                <>
                  <div><label className="text-xs text-gray-500 mb-1 block">服务类型</label><select value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value as ProxyServiceType })} className="select-field"><option value="basic">基础</option><option value="standard">标准</option><option value="premium">高级</option></select></div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.flowerRequired} onChange={e => setForm({ ...form, flowerRequired: e.target.checked })} className="rounded" />鲜花</label>
                    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={form.incenseRequired} onChange={e => setForm({ ...form, incenseRequired: e.target.checked })} className="rounded" />香烛</label>
                  </div>
                  <div><label className="text-xs text-gray-500 mb-1 block">特殊要求</label><textarea value={form.specialRequests} onChange={e => setForm({ ...form, specialRequests: e.target.value })} className="input-field h-16 resize-none" placeholder="如有特殊要求请填写" /></div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-secondary">取消</button>
              <button onClick={handleAdd} disabled={saving} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">{saving ? '提交中...' : '确认预约'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
