import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, AlertTriangle, Server, Zap, ShieldAlert, DollarSign, Terminal, Settings, Shield } from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Alerts", path: "/alerts", icon: AlertTriangle },
  { name: "Resource Explorer", path: "/resources", icon: Server },
  { name: "Cost Optimization", path: "/optimization", icon: Zap },
  { name: "Billing Explorer", path: "/billing", icon: DollarSign },
  { name: "Security Threats", path: "/security", icon: ShieldAlert },
  { name: "API Activity", path: "/api-activity", icon: Terminal },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 flex flex-col h-screen shrink-0" style={{ background: 'rgba(10, 14, 26, 0.95)', borderRight: '1px solid var(--border-glass)' }}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="p-2 rounded-xl" style={{ background: 'var(--gradient-primary)' }}>
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight gradient-text">CloudGuard AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: isActive ? '#a5b4fc' : 'var(--text-muted)',
                borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
              }}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* System status */}
      <div className="mx-3 mb-4 p-4 rounded-xl" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>System Status</div>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />
          <span className="text-xs font-medium text-emerald-400">All Systems Operational</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 pulse-glow" />
          <span className="text-xs font-medium text-blue-400">V2 Engine Active</span>
        </div>
      </div>
    </div>
  );
}
