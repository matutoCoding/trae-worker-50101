import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns'
import { BookOpen, Calendar, Plus, CheckCircle, Clock, Eye, PenTool } from 'lucide-react'
import type { BurialRecord, BurialStatus, InscriptionStatus } from '@/types'

const STATUS_MAP: Record<BurialStatus, { label: string; cls: string }> = {
  scheduled: { label: '已预约', cls: 'bg-blue-50 text-blue-700' },
  preparing: { label: '准备中', cls: 'bg-amber-50 text-amber-700' },
  in_progress: { label: '进行中', cls: 'bg-purple-50 text-purple-700' },
  completed: { label: '已完成', cls: 'bg-emerald-50 text-emerald-700' },
}

const INSCR_STATUS_MAP: Record<InscriptionStatus, { label: string; cls: string }> = {
  pending: { label: '待确认', cls: 'bg-amber-50 text-amber-700' },
  confirmed: { label: '已确认', cls: 'bg-blue-50 text-blue-700' },
  engraved: { label: '已刻字', cls: 'bg-emerald-50 text-emerald-700' },
}

const TIME_SLOTS = ['08:00-10:00', '10:00-12:00', '13:00-15:00', '15:00-17:00']
const FONT_LABELS = { regular: '常规体', bold: '粗体', traditional: '繁体' }
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function BurialRegistration() {
  const { burials, plots, addBurial, updateBurialStatus } = useStore()
  const [tab, setTab] = useState<'booking' | 'inscription'>('booking')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<'all' | BurialStatus>('all')
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ plotId: '', deceasedName: '', deceasedIdCard: '', deathDate: '', burialDate: format(new Date(), 'yyyy-MM-dd'), burialTimeSlot: TIME_SLOTS[0] })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDay = getDay(monthStart)

  const dateBurialMap = useMemo(() => {
    const m: Record<string, BurialRecord[]> = {}
    burials.forEach(b => { (m[b.burialDate] ??= []).push(b) })
    return m
  }, [burials])

  const selectedKey = format(selectedDate, 'yyyy-MM-dd')
  const dayBurials = (dateBurialMap[selectedKey] || []).filter(b => statusFilter === 'all' || b.status === statusFilter)

  const inscriptions = burials.filter(b => b.inscription)

  const soldPlots = plots.filter(p => p.status === 'sold' || p.status === 'buried')

  const handleAdd = () => {
    const plot = plots.find(p => p.id === form.plotId)
    if (!plot || !form.deceasedName || !form.deathDate || !form.burialDate) return
    addBurial({
      id: `B${Date.now()}`, plotId: form.plotId, plotPosition: plot.position,
      deceasedName: form.deceasedName, deceasedIdCard: form.deceasedIdCard,
      deathDate: form.deathDate, burialDate: form.burialDate,
      burialTimeSlot: form.burialTimeSlot, status: 'scheduled',
    })
    setShowModal(false)
    setForm({ plotId: '', deceasedName: '', deceasedIdCard: '', deathDate: '', burialDate: format(new Date(), 'yyyy-MM-dd'), burialTimeSlot: TIME_SLOTS[0] })
  }

  const handleInscrAction = (burialId: string, inscription: BurialRecord['inscription']) => {
    if (!inscription) return
    const next: Record<InscriptionStatus, InscriptionStatus> = { pending: 'confirmed', confirmed: 'engraved', engraved: 'engraved' }
    const updated = { ...inscription, status: next[inscription.status] }
    useStore.setState(s => ({ burials: s.burials.map(b => b.id === burialId ? { ...b, inscription: updated } : b) }))
  }

  return (
    <div className="p-6 min-h-screen bg-cream">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-primary font-serif">安葬登记</h1>
      </div>

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
            <input type="date" value={format(selectedDate, 'yyyy-MM-dd')} onChange={e => setSelectedDate(new Date(e.target.value))} className="input-field w-40" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | BurialStatus)} className="select-field w-28">
              <option value="all">全部</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4" />新增预约</button>
          </div>

          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-ghost text-xs">‹ 上月</button>
              <span className="font-semibold text-primary">{format(currentMonth, 'yyyy年M月')}</span>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-ghost text-xs">下月 ›</button>
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
                    {dayB.length > 0 && <div className="flex justify-center gap-0.5 mt-0.5">{dayB.slice(0, 2).map((b, i) => <span key={i} className={`w-1 h-1 rounded-full ${sel ? 'bg-gold' : 'bg-sage'}`} />)}</div>}
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
                  <div className="text-xs text-gray-400 mt-0.5">{b.plotPosition} · {b.burialTimeSlot}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_MAP[b.status].cls}`}>{STATUS_MAP[b.status].label}</span>
                <div className="flex gap-1">
                  <button className="btn-ghost text-xs px-2 py-1"><Eye className="w-3 h-3" /></button>
                  {b.status !== 'completed' && (
                    <button onClick={() => updateBurialStatus(b.id, 'completed')} className="btn-ghost text-xs px-2 py-1 text-emerald-600"><CheckCircle className="w-3 h-3" /></button>
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
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-charcoal">{b.deceasedName}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{b.plotPosition} · {FONT_LABELS[b.inscription.fontStyle]}</div>
                </div>
                <span className="text-xs text-gray-400 truncate max-w-[120px]">{b.inscription.content.slice(0, 20)}…</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${INSCR_STATUS_MAP[b.inscription.status].cls}`}>{INSCR_STATUS_MAP[b.inscription.status].label}</span>
                <button className="btn-ghost text-xs px-2 py-1"><Eye className="w-3 h-3" /></button>
              </div>
              {expandedId === b.id && (
                <div className="border-t border-border p-4">
                  <div className="max-w-md mx-auto bg-charcoal rounded-lg p-8 text-center" style={{ background: 'linear-gradient(180deg, #3a3a3a 0%, #2C2C2C 100%)' }}>
                    <div className="font-serif text-cream/90 text-lg leading-relaxed whitespace-pre-wrap">{b.inscription.content}</div>
                  </div>
                  {b.inscription.specialRequests && <div className="mt-3 text-xs text-gray-400">备注：{b.inscription.specialRequests}</div>}
                  <div className="mt-3 flex justify-end">
                    {b.inscription.status === 'pending' && <button onClick={() => handleInscrAction(b.id, b.inscription)} className="btn-primary text-xs">确认刻字</button>}
                    {b.inscription.status === 'confirmed' && <button onClick={() => handleInscrAction(b.id, b.inscription)} className="btn-primary text-xs">完成刻字</button>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="section-title mb-4">新增安葬预约</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500 mb-1 block">选择墓位</label><select value={form.plotId} onChange={e => setForm({ ...form, plotId: e.target.value })} className="select-field"><option value="">请选择</option>{soldPlots.map(p => <option key={p.id} value={p.id}>{p.position}</option>)}</select></div>
              <div><label className="text-xs text-gray-500 mb-1 block">逝者姓名</label><input value={form.deceasedName} onChange={e => setForm({ ...form, deceasedName: e.target.value })} className="input-field" /></div>
              <div><label className="text-xs text-gray-500 mb-1 block">身份证号</label><input value={form.deceasedIdCard} onChange={e => setForm({ ...form, deceasedIdCard: e.target.value })} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">死亡日期</label><input type="date" value={form.deathDate} onChange={e => setForm({ ...form, deathDate: e.target.value })} className="input-field" /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">安葬日期</label><input type="date" value={form.burialDate} onChange={e => setForm({ ...form, burialDate: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block">安葬时段</label><select value={form.burialTimeSlot} onChange={e => setForm({ ...form, burialTimeSlot: e.target.value })} className="select-field">{TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
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
