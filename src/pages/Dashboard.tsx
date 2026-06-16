import { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { MapPin, Users, CircleDot, Clock, TrendingUp, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { useStore } from '@/store'

const PIE_COLORS: Record<string, string> = {
  available: '#10B981',
  reserved: '#F59E0B',
  sold: '#0EA5E9',
  buried: '#8B5CF6',
  maintenance: '#EF4444',
}

const STATUS_LABEL: Record<string, string> = {
  available: '空闲',
  reserved: '预留',
  sold: '已售',
  buried: '已安葬',
  maintenance: '维护中',
}

const URGENCY_DOT = { red: 'bg-red-500', yellow: 'bg-amber-400', green: 'bg-emerald-400' }

const BAR_COLORS = ['#1B3A2D', '#C4A35A']

export default function Dashboard() {
  const { plots, contracts, burials, sacrifices, fees, maintenance } = useStore()

  const todayStr = new Date().toISOString().split('T')[0]

  const tasks = useMemo(() => {
    const list: { id: string; text: string; time: string; urgency: 'red' | 'yellow' | 'green' }[] = []
    burials
      .filter((b) => b.burialDate === todayStr)
      .forEach((b) =>
        list.push({ id: `burial-${b.id}`, text: `${b.deceasedName}安葬仪式 — ${b.plotPosition}`, time: b.burialTimeSlot || '09:00', urgency: 'red' })
      )
    sacrifices
      .filter((s) => s.visitDate === todayStr)
      .forEach((s) =>
        list.push({ id: `sacrifice-${s.id}`, text: `祭扫接待：${s.visitorName} — ${s.plotPosition}`, time: s.timeSlot || '09:00', urgency: 'yellow' })
      )
    fees
      .filter((f) => f.status === 'overdue')
      .forEach((f) =>
        list.push({ id: `fee-${f.id}`, text: `管理费催缴提醒 — ${f.plotPosition}(逾期)`, time: '10:00', urgency: 'red' })
      )
    maintenance
      .filter((m) => m.scheduledDate === todayStr)
      .forEach((m) =>
        list.push({ id: `maint-${m.id}`, text: `${m.areaName}${m.description}`, time: '09:00', urgency: 'green' })
      )
    return list
  }, [burials, sacrifices, fees, maintenance, todayStr])

  const stats = useMemo(() => {
    const available = plots.filter((p) => p.status === 'available').length
    const reserved = plots.filter((p) => p.status === 'reserved').length
    const sold = plots.filter((p) => p.status === 'sold').length
    const buried = plots.filter((p) => p.status === 'buried').length
    const maintenanceCount = plots.filter((p) => p.status === 'maintenance').length
    return {
      total: plots.length,
      soldCount: sold + buried,
      available,
      reserved,
      pieData: plots.length > 0
        ? [
            { name: '空闲', value: available, key: 'available' },
            { name: '预留', value: reserved, key: 'reserved' },
            { name: '已售', value: sold, key: 'sold' },
            { name: '已安葬', value: buried, key: 'buried' },
            { name: '维护中', value: maintenanceCount, key: 'maintenance' },
          ].filter((d) => d.value > 0)
        : [],
    }
  }, [plots])

  const monthlySales = useMemo(() => {
    if (contracts.length === 0) return []
    const monthMap: Record<string, number> = {}
    contracts.forEach((c) => {
      const m = c.signingDate.slice(0, 7)
      monthMap[m] = (monthMap[m] || 0) + 1
    })
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([m, count]) => ({ month: m.slice(5) + '月', count }))
  }, [contracts])

  const statCards = [
    { label: '总墓位数', value: stats.total, icon: MapPin, trend: '+2', trendUp: true },
    { label: '已售墓位', value: stats.soldCount, icon: Users, trend: '+5', trendUp: true },
    { label: '空闲墓位', value: stats.available, icon: CircleDot, trend: '-3', trendUp: false },
    { label: '预留墓位', value: stats.reserved, icon: Clock, trend: '+1', trendUp: true },
  ]

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-4 gap-6">
        {statCards.map(({ label, value, icon: Icon, trend, trendUp }) => (
          <div key={label} className="card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-charcoal/70">{label}</span>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                {trend}
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold text-gold font-serif">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-6">
          <h2 className="section-title mb-4">今日待办</h2>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-charcoal/40 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />今日暂无待办事项
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-cream/60 transition-colors">
                  <div className="gold-accent-line h-10" />
                  <span className={`w-2 h-2 rounded-full shrink-0 ${URGENCY_DOT[task.urgency]}`} />
                  <span className="flex-1 text-sm text-charcoal">{task.text}</span>
                  <span className="text-xs text-charcoal/50 shrink-0 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {task.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="section-title mb-4">墓位状态分布</h2>
          {stats.pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-charcoal/40 text-sm">暂无墓位数据</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.pieData.map((entry) => (
                      <Cell key={entry.key} fill={PIE_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} 个`, name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2DDD5', fontSize: 13 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {stats.pieData.map((entry) => (
                  <div key={entry.key} className="flex items-center gap-2 text-xs text-charcoal/70">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[entry.key] }} />
                    {entry.name}：{entry.value}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="section-title mb-4">月度销售趋势</h2>
        {monthlySales.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-charcoal/40 text-sm">
            <AlertTriangle className="w-4 h-4 mr-2" />暂无合同数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlySales} barSize={36}>
              <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#2C2C2C' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 13, fill: '#999' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [`${value} 笔`, '签约数']}
                contentStyle={{ borderRadius: 8, border: '1px solid #E2DDD5', fontSize: 13 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {monthlySales.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % 2]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
