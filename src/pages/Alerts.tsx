import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Zap, DollarSign } from "lucide-react";

const ANOMALY_COLORS: Record<string, string> = {
  cryptomining: "#ff4444", idle_gpu: "#ff8c00", orphaned_resource: "#aa44ff",
  over_provisioned: "#4488ff", cost_spike: "#f0c060", gpu_idle: "#ff8c00",
  zombie_load_balancer: "#cc6600", reserved_waste: "#44aaff",
  data_transfer_abuse: "#ff6644", abnormal_egress: "#ff8844",
};

type Tab = "all" | "critical" | "high" | "medium" | "low";
type SortBy = "newest" | "waste" | "risk";

export function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    const load = () => fetch("/api/alerts").then(r => r.json()).then(setAlerts);
    load(); const i = setInterval(load, 10000); return () => clearInterval(i);
  }, []);

  const filtered = alerts
    .filter(a => tab === "all" || a.severity?.toLowerCase() === tab)
    .sort((a, b) => {
      if (sortBy === "waste") return (b.estimated_waste || 0) - (a.estimated_waste || 0);
      if (sortBy === "risk") return (b.severity === "critical" ? 4 : b.severity === "high" ? 3 : 2) - (a.severity === "critical" ? 4 : a.severity === "high" ? 3 : 2);
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const totalWaste = alerts.reduce((s, a) => s + (a.estimated_waste || 0), 0);
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  alerts.forEach(a => { const s = a.severity?.toLowerCase(); if (s in counts) counts[s as keyof typeof counts]++; });

  const toggle = (id: number) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Active Alerts</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Real-time anomaly detection across all cloud providers</p>
      </div>

      {/* Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Total Waste</p>
          <p className="text-xl font-bold" style={{ color: "#f43f5e" }}>${totalWaste.toLocaleString()}</p>
        </div>
        {Object.entries(counts).map(([sev, cnt]) => (
          <div key={sev} className="glass-card p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>{sev}</p>
            <p className="text-xl font-bold" style={{ color: sev === "critical" ? "#ff4444" : sev === "high" ? "#ff8c00" : sev === "medium" ? "#fbbf24" : "#22cc66" }}>{cnt}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "critical", "high", "medium", "low"] as Tab[]).map(t => (
          <button key={t} className={`filter-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "all" ? alerts.length : counts[t as keyof typeof counts] || 0})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sort:</span>
          {(["newest", "waste", "risk"] as SortBy[]).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className="text-xs px-2 py-1 rounded-lg cursor-pointer"
              style={{ background: sortBy === s ? "rgba(99,102,241,0.15)" : "transparent", color: sortBy === s ? "#a5b4fc" : "var(--text-muted)" }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Rows */}
      <div className="space-y-2">
        {filtered.map((alert, i) => {
          const isOpen = expanded.has(alert.id || i);
          const sevColor = alert.severity === "critical" ? "#ff4444" : alert.severity === "high" ? "#ff8c00" : "#fbbf24";
          const atype = alert.title?.includes("Idle") ? "idle_gpu" : alert.title?.includes("Orphaned") ? "orphaned_resource" : alert.title?.includes("GPU") ? "idle_gpu" : "normal";

          return (
            <div key={alert.id || i} className="glass-card overflow-hidden transition-all duration-200"
              style={{ borderLeft: `3px solid ${ANOMALY_COLORS[atype] || sevColor}` }}>
              {/* Header Row */}
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggle(alert.id || i)}>
                {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} /> :
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />}
                <span className={`badge badge-${alert.severity === "critical" ? "critical" : alert.severity === "high" ? "high" : "medium"}`}>
                  <Zap className="w-3 h-3 inline mr-0.5" />{alert.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{alert.title}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{alert.message}</p>
                </div>
                <span className="text-sm font-bold shrink-0" style={{ color: "#f43f5e" }}>
                  ${alert.estimated_waste || 0}
                </span>
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  {new Date(alert.timestamp).toLocaleDateString()}
                </span>
              </div>

              {/* Expanded Detail */}
              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: "var(--border-glass)" }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>ROOT CAUSE</p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{alert.message || "Resource showing abnormal behavior patterns detected by AI engine."}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>RECOMMENDED ACTIONS</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.06)" }}>
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>○ Stop instance</span>
                          <button className="text-[10px] font-bold px-2 py-0.5 rounded-lg cursor-pointer" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>Execute</button>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(59,130,246,0.06)" }}>
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>○ Downsize to t3.medium</span>
                          <button className="text-[10px] font-bold px-2 py-0.5 rounded-lg cursor-pointer" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>Execute</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--border-glass)" }}>
                    {!alert.acknowledged && (
                      <button className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
                        style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc" }}
                        onClick={() => fetch(`/api/alerts/${alert.id}/acknowledge`, { method: "PATCH" })}>
                        Acknowledge
                      </button>
                    )}
                    <button className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
                      style={{ background: "rgba(100,116,139,0.1)", color: "var(--text-muted)" }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
