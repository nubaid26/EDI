import { useEffect, useState } from "react";
import { Search, X, Activity } from "lucide-react";

const ANOMALY_COLORS: Record<string, string> = {
  cryptomining: "#ff4444", idle_gpu: "#ff8c00", orphaned_resource: "#aa44ff",
  over_provisioned: "#4488ff", cost_spike: "#f0c060", normal: "#22cc66",
  zombie_load_balancer: "#cc6600", reserved_waste: "#44aaff",
  orphaned_snapshot: "#8833cc", data_transfer_abuse: "#ff6644",
};

export function Resources() {
  const [resources, setResources] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/resources").then(r => r.json()).then(setResources);
  }, []);

  const filtered = resources
    .filter(r => filter === "all" || r.provider === filter)
    .filter(r => search === "" || r.name?.toLowerCase().includes(search.toLowerCase()) || r.id?.toLowerCase().includes(search.toLowerCase()));

  const providers = [...new Set(resources.map((r: any) => r.provider as string))] as string[];
  const orphaned = resources.filter((r: any) => ["orphaned_resource", "orphaned_snapshot", "zombie_load_balancer"].includes(r.anomaly_type || r.status || ""));

  const openDrawer = async (resource: any) => {
    setDrawer(resource);
    try {
      const m = await fetch(`/api/metrics/${resource.id}`).then(r => r.json());
      setMetrics(Array.isArray(m) ? m.slice(-24) : []);
    } catch { setMetrics([]); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Resource Explorer</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Monitor all cloud resources across providers</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All Providers ({resources.length})
        </button>
        {providers.map((p: string) => (
          <button key={p} className={`filter-tab ${filter === p ? "active" : ""}`} onClick={() => setFilter(p)}>
            {(p || "").toUpperCase()} ({resources.filter((r: any) => r.provider === p).length})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
          <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
            className="bg-transparent text-sm outline-none w-44" style={{ color: "var(--text-primary)" }} />
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((r, i) => {
          const atype = r.anomaly_type || "normal";
          const borderColor = ANOMALY_COLORS[atype] || ANOMALY_COLORS.normal;
          const waste = r.estimated_waste || 0;
          return (
            <div key={i} className="glass-card p-4 animate-in hover:scale-[1.01] transition-transform cursor-pointer"
              style={{ borderLeft: `4px solid ${borderColor}` }}
              onClick={() => openDrawer(r)}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                <span className="badge" style={{ background: `${borderColor}18`, color: borderColor, fontSize: 10 }}>
                  {atype.replace(/_/g, " ")}
                </span>
              </div>
              <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
                <div className="flex justify-between"><span>{r.provider?.toUpperCase()} · {r.service}</span><span>{r.region}</span></div>
                <div className="flex justify-between"><span>Type</span><span style={{ color: "var(--text-secondary)" }}>{r.instance_type}</span></div>
                <div className="flex justify-between"><span>Owner</span><span style={{ color: "var(--text-secondary)" }}>{r.owner_tag || "Unknown"}</span></div>
                <div className="flex justify-between"><span>Cost/hr</span><span className="font-semibold" style={{ color: "#fbbf24" }}>${r.cost_per_hour?.toFixed(2)}</span></div>
                {waste > 0 && (
                  <div className="flex justify-between"><span>Waste</span><span className="font-semibold" style={{ color: "#f43f5e" }}>${waste.toFixed(0)}</span></div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: "var(--border-glass)" }}>
                <span className={`badge badge-${r.status === "running" ? "low" : "medium"}`}>{r.status}</span>
                <button className="text-xs font-semibold flex items-center gap-1" style={{ color: "#a5b4fc" }}>
                  <Activity className="w-3 h-3" /> View Metrics
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Orphaned Resources Section */}
      {orphaned.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#aa44ff" }}>
            Orphaned Infrastructure ({orphaned.length})
          </h3>
          <table className="data-table">
            <thead>
              <tr><th>Resource</th><th>Type</th><th>Status</th><th>Cost/hr</th><th>Monthly Waste</th><th>Action</th></tr>
            </thead>
            <tbody>
              {orphaned.map((r, i) => (
                <tr key={i}>
                  <td className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{r.name}</td>
                  <td className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.service}</td>
                  <td><span className="badge badge-medium">{r.status}</span></td>
                  <td className="text-xs" style={{ color: "#fbbf24" }}>${r.cost_per_hour?.toFixed(2)}</td>
                  <td className="font-semibold" style={{ color: "#f43f5e" }}>${(r.cost_per_hour * 730).toFixed(0)}</td>
                  <td>
                    <button className="text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                      style={{ background: "rgba(244,63,94,0.12)", color: "#fb7185" }}>Terminate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setDrawer(null)}>
          <div className="w-[480px] h-full overflow-y-auto" onClick={e => e.stopPropagation()}
            style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-glass)" }}>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{drawer.name}</h3>
                <button onClick={() => setDrawer(null)} className="p-1 rounded-lg cursor-pointer" style={{ color: "var(--text-muted)" }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Provider", val: drawer.provider?.toUpperCase() },
                  { label: "Region", val: drawer.region },
                  { label: "Instance Type", val: drawer.instance_type },
                  { label: "Cost/hr", val: `$${drawer.cost_per_hour?.toFixed(2)}` },
                  { label: "Owner", val: drawer.owner_tag || "Unknown" },
                  { label: "Status", val: drawer.status },
                ].map(({ label, val }) => (
                  <div key={label} className="p-3 rounded-xl" style={{ background: "var(--bg-glass)" }}>
                    <p className="text-[10px] uppercase font-bold" style={{ color: "var(--text-muted)" }}>{label}</p>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{val}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <p className="text-xs font-bold uppercase mb-1" style={{ color: "#a5b4fc" }}>AI Recommendation</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {drawer.anomaly_type === "normal" ? "No issues detected. Resource operating normally." :
                    `Detected: ${drawer.anomaly_type?.replace(/_/g, " ")}. Consider stopping or resizing this resource.`}
                </p>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-xl text-xs font-bold text-white cursor-pointer" style={{ background: "#f43f5e" }}>Stop</button>
                <button className="flex-1 py-2 rounded-xl text-xs font-bold text-white cursor-pointer" style={{ background: "#3b82f6" }}>Downsize</button>
                <button className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer" style={{ background: "rgba(100,116,139,0.1)", color: "var(--text-muted)" }}>Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
