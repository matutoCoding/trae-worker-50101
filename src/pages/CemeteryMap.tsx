import { useState, useMemo } from 'react'
import { useStore } from '@/store'
import { Map, Filter, Search, X, Info } from 'lucide-react'
import type { PlotStatus } from '@/types'

const STATUS_CONFIG: Record<PlotStatus, { label: string; cellBg: string; cellBorder: string; badgeClass: string }> = {
  available: { label: '空闲', cellBg: 'bg-emerald-100', cellBorder: 'border-emerald-300', badgeClass: 'badge-available' },
  reserved: { label: '预留', cellBg: 'bg-amber-100', cellBorder: 'border-amber-300', badgeClass: 'badge-reserved' },
  sold: { label: '已售', cellBg: 'bg-sky-100', cellBorder: 'border-sky-300', badgeClass: 'badge-sold' },
  buried: { label: '安葬', cellBg: 'bg-violet-100', cellBorder: 'border-violet-300', badgeClass: 'badge-buried' },
  maintenance: { label: '维护', cellBg: 'bg-red-100', cellBorder: 'border-red-300', badgeClass: 'badge-maintenance' },
}

const TYPE_LABELS: Record<string, string> = { single: '单穴', double: '双穴', family: '家族' }
const STATUS_FILTERS: { key: PlotStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'available', label: '空闲' },
  { key: 'reserved', label: '预留' },
  { key: 'sold', label: '已售' },
  { key: 'buried', label: '安葬' },
  { key: 'maintenance', label: '维护' },
]

export default function CemeteryMap() {
  const { areas, plots } = useStore()
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<PlotStatus | 'all'>('all')
  const [searchText, setSearchText] = useState('')

  const filteredPlots = useMemo(() => {
    return plots.filter((p) => {
      if (selectedArea !== 'all' && p.areaId !== selectedArea) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (searchText && !p.position.includes(searchText) && !p.holderName?.includes(searchText)) return false
      return true
    })
  }, [plots, selectedArea, statusFilter, searchText])

  const currentArea = areas.find((a) => a.id === selectedArea)
  const activePlot = plots.find((p) => p.id === selectedPlot)
  const gridRows = currentArea ? currentArea.rows : Math.max(...areas.map((a) => a.rows))
  const gridCols = currentArea ? currentArea.columns : Math.max(...areas.map((a) => a.columns))

  return (
    <div className="min-h-screen bg-cream p-4 flex flex-col gap-4">
      {/* Top */}
      <div className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" />
          <h1 className="section-title text-xl">墓区图</h1>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Filter className="w-4 h-4 text-sage" />
          <select
            className="select-field w-32"
            value={selectedArea}
            onChange={(e) => { setSelectedArea(e.target.value); setSelectedPlot(null) }}
          >
            <option value="all">全部园区</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  statusFilter === f.key ? 'bg-primary text-gold' : 'bg-white border border-border text-charcoal hover:bg-cream'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-sage" />
            <input
              className="input-field pl-8 w-40"
              placeholder="搜索位置/持有人"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <X className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer" onClick={() => setSearchText('')} />
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Area list */}
        <div className="w-56 shrink-0 flex flex-col gap-2 overflow-y-auto">
          <h2 className="section-title text-sm flex items-center gap-1">
            <Info className="w-4 h-4" /> 园区列表
          </h2>
          {areas.map((a) => {
            const pct = Math.round((a.soldPlots / a.totalPlots) * 100)
            return (
              <div
                key={a.id}
                onClick={() => { setSelectedArea(a.id); setSelectedPlot(null) }}
                className={`card p-3 cursor-pointer ${selectedArea === a.id ? 'ring-2 ring-gold' : ''}`}
              >
                <div className="font-serif font-semibold text-primary text-sm">{a.name}</div>
                <div className="text-xs text-sage mt-1">{a.description}</div>
                <div className="flex justify-between text-xs mt-2 text-charcoal">
                  <span>总计 {a.totalPlots}</span>
                  <span>已售 {a.soldPlots}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded mt-1.5 overflow-hidden">
                  <div className="h-full bg-gold rounded transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-right text-xs text-gold-dark mt-0.5">{pct}%</div>
              </div>
            )
          })}
        </div>

        {/* Center: Grid */}
        <div className="card p-4 flex-1 overflow-auto">
          {currentArea && <h2 className="section-title text-base mb-3">{currentArea.name} · 墓位分布</h2>}
          {!currentArea && <h2 className="section-title text-base mb-3">全部园区 · 墓位分布</h2>}
          <div className="inline-block">
            <div className="flex mb-1 pl-8">
              {Array.from({ length: gridCols }, (_, i) => (
                <div key={i} className="w-[40px] text-center text-xs text-sage font-medium">{i + 1}列</div>
              ))}
            </div>
            {Array.from({ length: gridRows }, (_, ri) => (
              <div key={ri} className="flex items-center mb-0.5">
                <div className="w-8 text-right text-xs text-sage font-medium pr-1">{ri + 1}排</div>
                {Array.from({ length: gridCols }, (_, ci) => {
                  const plot = filteredPlots.find((p) => p.row === ri + 1 && p.column === ci + 1)
                  if (!plot) return <div key={ci} className="w-[40px] h-[36px] mx-[1px]" />
                  const cfg = STATUS_CONFIG[plot.status]
                  return (
                    <div
                      key={ci}
                      onClick={() => setSelectedPlot(plot.id)}
                      className={`w-[40px] h-[36px] mx-[1px] rounded border cursor-pointer flex items-center justify-center text-[10px] transition-all
                        ${cfg.cellBg} ${cfg.cellBorder} ${selectedPlot === plot.id ? 'ring-2 ring-gold scale-110 z-10' : 'hover:scale-105'}`}
                      title={`${plot.position} · ${cfg.label}`}
                    >
                      {plot.column}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="w-64 shrink-0">
          {activePlot ? (
            <div className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="section-title text-sm">墓位详情</h2>
                <X className="w-4 h-4 text-gray-400 cursor-pointer hover:text-charcoal" onClick={() => setSelectedPlot(null)} />
              </div>
              <div className="gold-accent-line h-[2px]" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-sage">位置</span>
                  <span className="font-medium">{activePlot.position}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sage">状态</span>
                  <span className={STATUS_CONFIG[activePlot.status].badgeClass}>{STATUS_CONFIG[activePlot.status].label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sage">类型</span>
                  <span>{TYPE_LABELS[activePlot.type] || activePlot.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sage">价格</span>
                  <span className="text-gold-dark font-semibold">¥{activePlot.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sage">朝向</span>
                  <span>{activePlot.orientation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sage">面积</span>
                  <span>{activePlot.area}㎡</span>
                </div>
              </div>
              {activePlot.holderName && (
                <div className="border-t border-border pt-2 space-y-2 text-sm">
                  <h3 className="text-xs text-sage font-medium">持有人信息</h3>
                  <div className="flex justify-between">
                    <span className="text-sage">持有人</span>
                    <span>{activePlot.holderName}</span>
                  </div>
                  {activePlot.deceasedName && (
                    <div className="flex justify-between">
                      <span className="text-sage">逝者</span>
                      <span>{activePlot.deceasedName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-4 flex flex-col items-center justify-center text-sage text-sm h-full min-h-[200px]">
              <Info className="w-8 h-8 mb-2 opacity-40" />
              <span>点击墓位查看详情</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Legend */}
      <div className="card p-3 flex items-center gap-6 justify-center">
        {(Object.entries(STATUS_CONFIG) as [PlotStatus, typeof STATUS_CONFIG[PlotStatus]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-charcoal">
            <div className={`w-4 h-3 rounded-sm border ${cfg.cellBg} ${cfg.cellBorder}`} />
            <span>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
