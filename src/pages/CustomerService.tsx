import { useState } from 'react'
import { useStore } from '@/store'
import type { RelocationInfo, RelocationStatus } from '@/types'
import { maskPhone, generateUniqueId } from '@/utils/helpers'
import { HeadphonesIcon, Search, Phone, MapPin, ArrowRightLeft, Star, Clock, X, User, FileText, Home } from 'lucide-react'

const tabs = ['墓园档案查询', '客户回访', '迁墓处理'] as const
const followTypeLabels: Record<string, string> = { phone: '电话', visit: '上门', wechat: '微信' }
const followTypeIcons: Record<string, typeof Phone> = { phone: Phone, visit: Home, wechat: FileText }
const relocTypeLabels: Record<string, string> = { relocate_out: '迁出', relocate_in: '迁入' }
const relocStatusLabels: Record<RelocationStatus, string> = { pending: '待审批', approved: '已批准', in_progress: '进行中', completed: '已完成' }
const relocStatusBadge: Record<RelocationStatus, string> = {
  pending: 'bg-amber-50 text-amber-700', approved: 'bg-blue-50 text-blue-700', in_progress: 'bg-purple-50 text-purple-700', completed: 'bg-emerald-50 text-emerald-700',
}
const nextStatus: Record<RelocationStatus, RelocationStatus> = { pending: 'approved', approved: 'in_progress', in_progress: 'completed', completed: 'completed' }

export default function CustomerService() {
  const { customers, addFollowUp, updateRelocationStatus, addRelocation } = useStore()
  const [activeTab, setActiveTab] = useState<number>(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [followCustId, setFollowCustId] = useState<string | null>(null)
  const [followForm, setFollowForm] = useState({ type: 'phone' as 'phone' | 'visit' | 'wechat', content: '', satisfaction: 5 })
  const [showRelocForm, setShowRelocForm] = useState(false)
  const [relocForm, setRelocForm] = useState({ customerId: '', type: 'relocate_out' as 'relocate_out' | 'relocate_in', fromPlot: '', toPlot: '', reason: '', fee: 0 })

  const filtered = customers.filter(c => {
    if (!searchTerm) return true
    return c.buyerName.includes(searchTerm) || c.plotPosition.includes(searchTerm) || c.contractNo.includes(searchTerm)
  })
  const sortedFollowUp = [...customers].filter(c => c.nextFollowUpDate).sort((a, b) => {
    const da = new Date(a.nextFollowUpDate!).getTime(), db = new Date(b.nextFollowUpDate!).getTime()
    if (isNaN(da) || isNaN(db)) return 0
    return da - db
  })
  const relocationList = customers.filter(c => c.relocationRequest)
  const today = new Date().toISOString().split('T')[0]
  const drawerCustomer = customers.find(c => c.id === drawerId)

  const handleAddFollowUp = () => {
    if (!followCustId || !followForm.content) return
    const record = { id: generateUniqueId(), date: today, type: followForm.type, content: followForm.content, satisfaction: followForm.satisfaction }
    addFollowUp(followCustId, record)
    setFollowCustId(null)
    setFollowForm({ type: 'phone', content: '', satisfaction: 5 })
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#F5F3EF', minHeight: '100vh' }}>
      <div className="flex items-center gap-3">
        <HeadphonesIcon className="w-6 h-6 text-[#C4A35A]" />
        <h1 className="section-title text-2xl">客户服务</h1>
      </div>

      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm w-fit">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${activeTab === i ? 'bg-[#1B3A2D] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9" placeholder="搜索 姓名/墓位号/合同号" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button className="btn-primary flex items-center gap-1"><Search className="w-4 h-4" /> 搜索</button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="table-header">
                <th className="px-4 py-3 text-left">合同编号</th><th className="px-4 py-3 text-left">购墓人</th>
                <th className="px-4 py-3 text-left">联系电话</th><th className="px-4 py-3 text-left">墓位位置</th>
                <th className="px-4 py-3 text-left">签约日期</th><th className="px-4 py-3 text-left">操作</th>
              </tr></thead>
              <tbody>{filtered.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="px-4 py-3 font-medium text-[#1B3A2D]">{c.contractNo}</td>
                  <td className="px-4 py-3">{c.buyerName}</td>
                  <td className="px-4 py-3">{maskPhone(c.buyerPhone)}</td>
                  <td className="px-4 py-3">{c.plotPosition}</td>
                  <td className="px-4 py-3">{c.lastVisitDate || '-'}</td>
                  <td className="px-4 py-3"><button className="text-[#5A8F7B] hover:text-[#1B3A2D] text-sm" onClick={() => setDrawerId(c.id)}>查看详情</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-4">
          {sortedFollowUp.map(c => (
            <div key={c.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1B3A2D]/10 flex items-center justify-center"><User className="w-5 h-5 text-[#1B3A2D]" /></div>
                <div>
                  <p className="font-medium text-[#1B3A2D]">{c.buyerName} <span className="text-gray-400 text-xs ml-2"><Phone className="w-3 h-3 inline" /> {maskPhone(c.buyerPhone)}</span></p>
                  <p className="text-sm text-gray-500"><MapPin className="w-3 h-3 inline mr-1" />{c.plotPosition}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400">下次回访</p>
                  <p className={`text-sm font-medium ${c.nextFollowUpDate! < today ? 'text-red-500' : 'text-[#1B3A2D]'}`}>
                    <Clock className="w-3 h-3 inline mr-1" />{c.nextFollowUpDate}
                    {c.nextFollowUpDate! < today && <span className="text-red-500 text-xs ml-1">已逾期</span>}
                  </p>
                </div>
                <button className="btn-primary text-sm" onClick={() => setFollowCustId(c.id)}>添加回访</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary flex items-center gap-1" onClick={() => setShowRelocForm(true)}><ArrowRightLeft className="w-4 h-4" /> 新增迁墓申请</button>
          </div>
          {relocationList.map(c => {
            const r = c.relocationRequest!
            return (
              <div key={c.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.type === 'relocate_out' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {relocTypeLabels[r.type]}
                  </span>
                  <div>
                    <p className="font-medium text-[#1B3A2D]">{c.buyerName}</p>
                    <p className="text-sm text-gray-500">{r.fromPlot} → {r.toPlot} | {r.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#C4A35A] font-semibold">¥{r.fee.toLocaleString()}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${relocStatusBadge[r.status]}`}>{relocStatusLabels[r.status]}</span>
                  {r.status !== 'completed' && (
                    <button className="btn-secondary text-xs" onClick={() => updateRelocationStatus(c.id, nextStatus[r.status])}>{relocStatusLabels[nextStatus[r.status]]}</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {drawerCustomer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setDrawerId(null)}>
          <div className="w-96 bg-white h-full overflow-y-auto shadow-xl p-6 space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="section-title text-lg">客户详情</h2>
              <button onClick={() => setDrawerId(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400 gold-accent-line inline-block pb-1 mb-2">客户信息</p>
              <p><User className="w-3.5 h-3.5 inline mr-2 text-[#C4A35A]" />{drawerCustomer.buyerName}</p>
              <p><Phone className="w-3.5 h-3.5 inline mr-2 text-[#C4A35A]" />{maskPhone(drawerCustomer.buyerPhone)}</p>
              <p><FileText className="w-3.5 h-3.5 inline mr-2 text-[#C4A35A]" />{drawerCustomer.contractNo}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-400 gold-accent-line inline-block pb-1 mb-2">墓位信息</p>
              <p><MapPin className="w-3.5 h-3.5 inline mr-2 text-[#C4A35A]" />{drawerCustomer.plotPosition}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 gold-accent-line inline-block pb-1 mb-2">回访记录</p>
              <div className="relative pl-4 space-y-3">
                {drawerCustomer.followUpRecords.length === 0 && <p className="text-sm text-gray-400">暂无记录</p>}
                {drawerCustomer.followUpRecords.map((r, i) => {
                  const Icon = followTypeIcons[r.type] || Phone
                  return (
                    <div key={r.id} className="relative">
                      <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-[#C4A35A] border-2 border-white" />
                      {i < drawerCustomer.followUpRecords.length - 1 && <div className="absolute -left-[11px] top-3 w-0.5 h-full bg-gray-200" />}
                      <div className="ml-2 text-sm">
                        <p className="font-medium text-[#1B3A2D]"><Icon className="w-3 h-3 inline mr-1" />{followTypeLabels[r.type]} <span className="text-xs text-gray-400 ml-2">{r.date}</span></p>
                        <p className="text-gray-600">{r.content}</p>
                        {r.satisfaction && <p className="text-[#C4A35A] text-xs">{Array.from({ length: r.satisfaction }, (_, j) => <Star key={j} className="w-3 h-3 inline fill-[#C4A35A]" />)}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {followCustId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setFollowCustId(null)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="section-title">添加回访</h2>
              <button onClick={() => setFollowCustId(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">回访方式</label>
              <select className="select-field" value={followForm.type} onChange={e => setFollowForm(f => ({ ...f, type: e.target.value as 'phone' | 'visit' | 'wechat' }))}>
                <option value="phone">电话</option><option value="visit">上门</option><option value="wechat">微信</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">回访内容</label>
              <textarea className="input-field min-h-[80px]" value={followForm.content} onChange={e => setFollowForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">满意度</label>
              <div className="flex gap-1">{[1,2,3,4,5].map(n => (
                <Star key={n} className={`w-6 h-6 cursor-pointer ${n <= followForm.satisfaction ? 'fill-[#C4A35A] text-[#C4A35A]' : 'text-gray-300'}`} onClick={() => setFollowForm(f => ({ ...f, satisfaction: n }))} />
              ))}</div>
            </div>
            <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setFollowCustId(null)}>取消</button><button className="btn-primary" onClick={handleAddFollowUp}>保存</button></div>
          </div>
        </div>
      )}

      {showRelocForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowRelocForm(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="section-title">新增迁墓申请</h2>
              <button onClick={() => setShowRelocForm(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">选择客户</label>
              <select className="select-field" value={relocForm.customerId} onChange={e => setRelocForm(f => ({ ...f, customerId: e.target.value }))}>
                <option value="">请选择客户</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.buyerName} - {c.plotPosition}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-500 mb-1">类型</label>
                <select className="select-field" value={relocForm.type} onChange={e => setRelocForm(f => ({ ...f, type: e.target.value as 'relocate_out' | 'relocate_in' }))}>
                  <option value="relocate_out">迁出</option><option value="relocate_in">迁入</option>
                </select></div>
              <div><label className="block text-xs text-gray-500 mb-1">费用</label>
                <input type="number" className="input-field" value={relocForm.fee} onChange={e => setRelocForm(f => ({ ...f, fee: +e.target.value }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">原墓位</label>
                <input className="input-field" value={relocForm.fromPlot} onChange={e => setRelocForm(f => ({ ...f, fromPlot: e.target.value }))} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">目标墓位</label>
                <input className="input-field" value={relocForm.toPlot} onChange={e => setRelocForm(f => ({ ...f, toPlot: e.target.value }))} /></div>
              <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">原因</label>
                <input className="input-field" value={relocForm.reason} onChange={e => setRelocForm(f => ({ ...f, reason: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setShowRelocForm(false)}>取消</button><button className="btn-primary" onClick={() => {
              if (!relocForm.customerId) return
              const info: RelocationInfo = { type: relocForm.type, fromPlot: relocForm.fromPlot, toPlot: relocForm.toPlot, reason: relocForm.reason, status: 'pending', fee: relocForm.fee }
              addRelocation(relocForm.customerId, info)
              setShowRelocForm(false)
              setRelocForm({ customerId: '', type: 'relocate_out', fromPlot: '', toPlot: '', reason: '', fee: 0 })
            }}>提交</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
