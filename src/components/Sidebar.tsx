import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  ShoppingBag,
  BookOpen,
  Flame,
  TreePine,
  HeadphonesIcon,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/cemetery-map', label: '墓区图', icon: Map },
  { path: '/plot-sales', label: '墓位销售', icon: ShoppingBag },
  { path: '/burial-registration', label: '安葬登记', icon: BookOpen },
  { path: '/sacrifice-booking', label: '祭扫预约', icon: Flame },
  { path: '/green-maintenance', label: '绿化养护', icon: TreePine },
  { path: '/customer-service', label: '客户服务', icon: HeadphonesIcon },
  { path: '/fee-management', label: '费用管理', icon: Wallet },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-primary-gradient text-white flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-[68px]' : 'w-[220px]'
      }`}
    >
      <div className={`flex items-center h-16 border-b border-white/10 px-4 ${collapsed ? 'justify-center' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gold/20 flex items-center justify-center">
              <TreePine size={18} className="text-gold" />
            </div>
            <div>
              <h1 className="text-sm font-serif font-semibold text-gold leading-tight">永宁陵园</h1>
              <p className="text-[10px] text-white/50">管理系统</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded bg-gold/20 flex items-center justify-center">
            <TreePine size={18} className="text-gold" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 mx-3 my-1 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-white/15 text-gold shadow-sm'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              } ${collapsed ? 'justify-center mx-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className={`shrink-0 ${isActive ? 'text-gold' : 'text-white/60 group-hover:text-white/90'}`} />
              {!collapsed && <span className="text-sm truncate">{item.label}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className={`border-t border-white/10 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all duration-200"
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span className="text-xs">收起</span>
            </>
          )}
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className={`border-t border-white/10 pt-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">管</div>
              <div>
                <p className="text-xs text-white/90">系统管理员</p>
                <p className="text-[10px] text-white/40">admin@yongning.com</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">管</div>
          )}
        </div>
      </div>
    </aside>
  )
}
