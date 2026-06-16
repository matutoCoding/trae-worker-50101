import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay } from 'date-fns'
import { TreePine, Plus, Calendar, List, Play, CheckCircle, Clock, MapPin } from 'lucide-react'
import { useStore } from '@/store'
import type { MaintenanceTask } from '@/types'

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  greening: { label: '绿化', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cleaning: { label: '清洁', color: 'text-blue-700', bg: 'bg-blue-100' },
  repair: { label: '维修', color: 'text-orange-700', bg: 'bg-orange-100' },
  inspection: { label: '巡查', color: 'text-purple-700', bg: 'bg-purple-100' },
}

const TYPE_DOT: Record<string, string> = {
  greening: 'bg-emerald-500', cleaning: 'bg-blue-500', repair: 'bg-orange-500', inspection: 'bg-purple-500',
}

const STATUS_LABEL: Record<string, string> = { pending: '待执行', in_progress: '进行中', completed: '已完成' }

type ViewMode = 'list' | 'calendar'
type TaskForm = { areaId: string; type: string; description: string; scheduledDate: string; assignee: string }

const emptyForm: TaskForm = { areaId: '', type: 'greening', description: '', scheduledDate: '', assignee: '' }

export default function GreenMaintenance() {
  const { maintenance, areas, addMaintenanceTask, updateMaintenanceStatus } = useStore()
  const [view, setView] = useState<ViewMode>('list')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<TaskForm>(emptyForm)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const pending = maintenance.filter((t) => t.status === 'pending')
  const inProgress = maintenance.filter((t) => t.status === 'in_progress')
  const completed = maintenance.filter((t) => t.status === 'completed')

  const summaryCards = [
    { label: '待执行', count: pending.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '进行中', count: inProgress.length, icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '已完成', count: completed.length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const startWeekday = getDay(startOfMonth(currentMonth))

  const tasksByDate = useMemo(() => {
    const map = new Map<string, string[]>()
    maintenance.forEach((t) => {
      const types = map.get(t.scheduledDate) || []
      if (!types.includes(t.type)) types.push(t.type)
      map.set(t.scheduledDate, types)
    })
    return map
  }, [maintenance])

  const filteredTasks = selectedDate
    ? maintenance.filter((t) => isSameDay(new Date(t.scheduledDate), selectedDate))
    : maintenance

  const handleSubmit = () => {
    if (!form.areaId || !form.description || !form.scheduledDate || !form.assignee) return
    const area = areas.find((a) => a.id === form.areaId)
    addMaintenanceTask({
      id: `mt-${Date.now()}`, areaId: form.areaId, areaName: area?.name || '',
      type: form.type as TaskForm['type'] as MaintenanceTask['type'],
      scheduledDate: form.scheduledDate, assignee: form.assignee,
      status: 'pending', description: form.description,
    })
    setForm(emptyForm)
    setShowModal(false)
  }

  const renderTaskCard = (task: MaintenanceTask) => {
    const cfg = TYPE_CONFIG[task.type]
    return (
      <div key={task.id} className="bg-white rounded-lg p-3 border border-[#E2DDD5]/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-charcoal/70"><MapPin className="w-3 h-3" />{task.areaName}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
        </div>
        <p className="text-sm text-charcoal leading-snug line-clamp-2">{task.description}</p>
        <div className="flex items-center justify-between text-[11px] text-charcoal/50">
          <span>{task.assignee}</span>
          <span>{task.scheduledDate}</span>
        </div>
        <div className="flex gap-2 pt-1">
          {task.status === 'pending' && (
            <button onClick={() => updateMaintenanceStatus(task.id, 'in_progress')}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors">
              <Play className="w-3 h-3" />开始
            </button>
          )}
          {task.status === 'in_progress' && (
            <button onClick={() => updateMaintenanceStatus(task.id, 'completed')}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
              <CheckCircle className="w-3 h-3" />完成
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1B3A2D] font-serif flex items-center gap-2">
          <TreePine className="w-6 h-6 text-[#C4A35A]" />绿化养护
        </h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1">
          <Plus className="w-4 h-4" />新增任务
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map(({ label, count, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div><div className="text-2xl font-bold text-[#1B3A2D] font-serif">{count}</div><div className="text-xs text-charcoal/60">{label}</div></div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setView('list')}
          className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm transition-colors ${view === 'list' ? 'bg-[#1B3A2D] text-white' : 'bg-[#1B3A2D]/10 text-[#1B3A2D]'}`}>
          <List className="w-4 h-4" />列表
        </button>
        <button onClick={() => setView('calendar')}
          className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-sm transition-colors ${view === 'calendar' ? 'bg-[#1B3A2D] text-white' : 'bg-[#1B3A2D]/10 text-[#1B3A2D]'}`}>
          <Calendar className="w-4 h-4" />日历
        </button>
      </div>

      {view === 'calendar' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="px-3 py-1 rounded hover:bg-[#1B3A2D]/10 text-sm text-[#1B3A2D]">‹</button>
            <span className="font-semibold text-[#1B3A2D]">{format(currentMonth, 'yyyy年MM月')}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="px-3 py-1 rounded hover:bg-[#1B3A2D]/10 text-sm text-[#1B3A2D]">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-charcoal/50 mb-2">
            {['日','一','二','三','四','五','六'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {monthDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const types = tasksByDate.get(key) || []
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              return (
                <button key={key} onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={`p-1.5 rounded-lg text-sm relative hover:bg-[#1B3A2D]/5 transition-colors ${isSelected ? 'bg-[#1B3A2D]/10 ring-1 ring-[#C4A35A]' : ''}`}>
                  {format(day, 'd')}
                  {types.length > 0 && (
                    <div className="flex justify-center gap-0.5 mt-0.5">
                      {types.map((t) => <span key={t} className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[t]}`} />)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          {selectedDate && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-[#1B3A2D]">{format(selectedDate, 'MM月dd日')} 任务</h3>
              {filteredTasks.length === 0 && <p className="text-xs text-charcoal/40">暂无任务</p>}
              {filteredTasks.map(renderTaskCard)}
            </div>
          )}
        </div>
      )}

      {view === 'list' && (
        <div className="grid grid-cols-3 gap-4">
          {([['pending', pending], ['in_progress', inProgress], ['completed', completed]] as const).map(([status, tasks]) => (
            <div key={status} className="space-y-3">
              <h3 className="section-title text-sm">{STATUS_LABEL[status]}（{tasks.length}）</h3>
              <div className="space-y-3">
                {tasks.map(renderTaskCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-[#F5F3EF] rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title mb-4">新增任务</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-charcoal/60 mb-1 block">墓区</label>
                <select className="select-field w-full" value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}>
                  <option value="">请选择墓区</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-charcoal/60 mb-1 block">任务类型</label>
                <select className="select-field w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-charcoal/60 mb-1 block">任务描述</label>
                <input className="input-field w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-charcoal/60 mb-1 block">计划日期</label>
                <input type="date" className="input-field w-full" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-charcoal/60 mb-1 block">负责人</label>
                <input className="input-field w-full" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm rounded-lg border border-[#E2DDD5] text-charcoal/70 hover:bg-white transition-colors">取消</button>
              <button onClick={handleSubmit} className="btn-primary">确认添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
