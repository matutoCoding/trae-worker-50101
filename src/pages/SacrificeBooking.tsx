import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import { Flame, Calendar, Users, Clock, Plus, Check, X, Camera } from 'lucide-react'
import type { SacrificeBooking, SacrificeStatus, SacrificeType, ProxyServiceType } from '@/types'

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

export default function SacrificeBooking() {
  const { sacrifices, plots, addSacrifice, updateSacrificeStatus } = useStore()
  const [tab, setTab] = useState<'booking' | 'proxy'>('booking')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [typeFilter, setTypeFilter] = useState<'all' | SacrificeType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | SacrificeStatus>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    plotId: '', visitorName: '', visitorPhone: '', visitDate: dateFilter,
    timeSlot: TIME_SLOTS[0], visitorCount: 1, type: 'self' as SacrificeType,
    serviceType: 'basic' as ProxyServiceType, flowerRequired: true, incenseRequired: true, specialRequests: '',
  })

  const filtered = useMemo(() => sacrifices.filter(s =>
    (s.visitDate === dateFilter) &&
    (typeFilter === 'all' || s.type === typeFilter) &&
    (statusFilter === 'all' || s.status === statusFilter)
  ), [sacrifices, dateFilter, typeFilter, statusFilter])

  const slotCounts = useMemo(() => {
    const m: Record<string, number> = {}
    TIME_SLOTS.forEach(t => m[t] = 0)
    sacrifices.filter(s => s.visitDate === dateFilter && s.status !== 'cancelled').forEach(s => { m[s.timeSlot] = (m[s.timeSlot] || 0) + 1 })
    return m
  }, [sacrifices, dateFilter])

  const proxyBookings = useMemo(() => sacrifices.filter(s => s.type === 'proxy' && s.proxyService), [sacrifices])

  const slotBarColor = (count: number) => {
    const pct = count / MAX_CAPACITY
    if (pct > 0.8) return 'bg-red-500'
    if (pct > 0.5) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const handleAdd = () => {
    const plot = plots.find(p => p.id === form.plotId)
    if (!plot || !form.visitorName || !form.visitorPhone) return
    const booking: SacrificeBooking = {
      id: `S${Date.now()}`, plotId: form.plotId, plotPosition: plot.position,
      visitorName: form.visitorName, visitorPhone: form.visitorPhone,
      visitDate: form.visitDate, timeSlot: form.timeSlot, visitorCount: form.visitorCount,
      type: form.type, status: 'pending',
      ...(form.type === 'proxy' ? { proxyService: { serviceType: form.serviceType, flowerRequired: form.flowerRequired, incenseRequired: form.incenseRequired, specialRequests: form.specialRequests || undefined } } : {}),
    }
    addSacrifice(booking)
    setShowModal(false)
    setForm({ plotId: '', visitorName: '', visitorPhone: '', visitDate: dateFilter, timeSlot: TIME_SLOTS[0], visitorCount: 1, type: 'self', serviceType: 'basic', flowerRequired: true, incenseRequired: true, specialRequests: '' })
  }

  return (
    <div className="p-6 min-h-screen bg-cream">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-6 h-6 text-gold" />
        <h1 className="text-2xl font-bold text-primary font-serif">祭扫预约</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border">
        {([['booking', '祭扫预约', Calendar], ['proxy', '代客祭扫', Users]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as 'booking' | 'proxy')}
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
            <h3 className="section-title flex items-center gap-2 mb-3"><Clock className="w-4 h-4" />时段容量</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TIME_SLOTS.map(slot => {
                const count = slotCounts[slot] || 0
                const pct = Math.min(count / MAX_CAPACITY * 100, 100)
                return (
                  <div key={slot} className="border border-border rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">{slot}</div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full transition-all ${slotBarColor(count)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-gray-400">{count}/{MAX_CAPACITY}</div>
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
                    <td className="px-4 py-3 text-gray-500">{s.visitorPhone}</td>
                    <td className="px-4 py-3">{s.plotPosition}</td>
                    <td className="px-4 py-3">{s.visitDate}</td>
                    <td className="px-4 py-3">{s.timeSlot}</td>
                    <td className="px-4 py-3">{s.visitorCount}</td>
                    <td className="px-4 py-3"><span className={`badge ${TYPE_MAP[s.type].cls}`}>{TYPE_MAP[s.type].label}</span></td>
                    <td className="px-4 py-3"><span className={`badge ${STATUS_MAP[s.status].cls}`}>{STATUS_MAP[s.status].label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {s.status === 'pending' && <button onClick={() => updateSacrificeStatus(s.id, 'confirmed')} className="btn-ghost text-xs px-2 py-1 text-emerald-600" title="确认"><Check className="w-3.5 h-3.5" /></button>}
                        {s.status === 'confirmed' && <button onClick={() => updateSacrificeStatus(s.id, 'completed')} className="btn-ghost text-xs px-2 py-1 text-blue-600" title="完成"><Check className="w-3.5 h-3.5" /></button>}
                        {(s.status === 'pending' || s.status === 'confirmed') && <button onClick={() => updateSacrificeStatus(s.id, 'cancelled')} className="btn-ghost text-xs px-2 py-1 text-red-500" title="取消"><X className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
                  <div className="text-xs text-gray-400 mt-0.5">委托人：{s.visitorName} · {s.visitorPhone}</div>
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
                  <button onClick={() => updateSacrificeStatus(s.id, 'completed')} className="btn-primary text-xs flex items-center gap-1"><Check className="w-3.5 h-3.5" />完成服务</button>
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
                <div><label className="text-xs text-gray-500 mb-1 block">时段</label><select value={form.timeSlot} onChange={e => setForm({ ...form, timeSlot: e.target.value })} className="select-field">{TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">人数</label><input type="number" min={1} max={20} value={form.visitorCount} onChange={e => setForm({ ...form, visitorCount: Number(e.target.value) })} className="input-field" /></div>
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
              <button onClick={handleAdd} className="btn-primary">确认预约</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
