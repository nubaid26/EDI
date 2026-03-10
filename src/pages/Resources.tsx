import { useEffect, useState } from "react";
import { Cloud, Activity, X, Search } from "lucide-react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

type Provider = "all" | "AWS" | "Azure" | "GCP";

export function Resources() {
  const [resources, setResources] = useState<any[]>([]);
  const [filter, setFilter] = useState<Provider>("all");
  const [search, setSearch] = useState("");
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/resources").then(r => r.json()).then(setResources);
  }, []);

  const filtered = resources.filter(r =>
    (filter === "all" || r.provider === filter) &&
    (search === "" || r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()))
  );

  const openMetrics = async (res: any) => {
    setSelectedResource(res);
    const data = await fetch(`/api/metrics/${res.id}`).then(r => r.json());
    setSelectedMetrics(data.reverse());
  };

  const providerStyle = (p: string) => {
    if (p === "AWS") return { bg: "rgba(245,158,11,0.12)", color: "#fbbf24" };
    if (p === "Azure") return { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" };
    return { bg: "rgba(239,68,68,0.12)", color: "#f87171" };
  };

  const chartOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1e293b", titleColor: "#f1f5f9", bodyColor: "#94a3b8" } },
    scales: { x: { display: false }, y: { grid: { color: "rgba(100,116,139,0.1)" }, ticks: { color: "#475569", font: { size: 10 } } } },
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Resource Explorer</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Monitor all cloud resources across providers</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        {(["all", "AWS", "Azure", "GCP"] as Provider[]).map(p => (
          <button key={p} className={`filter-tab ${filter === p ? "active" : ""}`} onClick={() => setFilter(p)}>
            {p === "all" ? "All Providers" : p} ({resources.filter(r => p === "all" || r.provider === p).length})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
          <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
            className="bg-transparent text-sm outline-none w-44" style={{ color: "var(--text-primary)" }} />
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(res => {
          const ps = providerStyle(res.provider);
          return (
            <div key={res.id} className="glass-card p-5 animate-in cursor-pointer" onClick={() => openMetrics(res)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: ps.bg }}>
                  <Cloud className="w-5 h-5" style={{ color: ps.color }} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{res.name}</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{res.provider} · {res.service}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Region</span><span style={{ color: "var(--text-secondary)" }}>{res.region}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Type</span><span style={{ color: "var(--text-secondary)" }}>{res.instance_type || "—"}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Owner</span><span style={{ color: "var(--text-secondary)" }}>{res.owner_tag || "—"}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Cost/hr</span><span className="font-semibold" style={{ color: "#fbbf24" }}>${res.cost_per_hour?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Status</span>
                  <span className="badge" style={{ background: res.status === "running" || res.status === "active" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", color: res.status === "running" || res.status === "active" ? "#34d399" : "#fbbf24" }}>{res.status}</span>
                </div>
              </div>
              <div className="mt-4 pt-3 flex items-center gap-1 text-xs font-medium" style={{ borderTop: "1px solid var(--border-glass)", color: "#818cf8" }}>
                <Activity className="w-3.5 h-3.5" /> View Metrics
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics Modal */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="glass-card p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-glass)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{selectedResource.name}</h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedResource.provider} · {selectedResource.service} · {selectedResource.region}</p>
              </div>
              <button onClick={() => setSelectedResource(null)} className="p-2 rounded-lg hover:bg-white/5"><X className="w-4 h-4" style={{ color: "var(--text-muted)" }} /></button>
            </div>
            {selectedMetrics.length > 0 && (
              <div className="space-y-4">
                <div style={{ height: 180 }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>CPU Utilization</p>
                  <Line options={chartOpts} data={{
                    labels: selectedMetrics.map(m => new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
                    datasets: [{ fill: true, data: selectedMetrics.map(m => m.cpu_utilization), borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", tension: 0.4, pointRadius: 0, borderWidth: 2 }]
                  }} />
                </div>
                <div style={{ height: 180 }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Network Out</p>
                  <Line options={chartOpts} data={{
                    labels: selectedMetrics.map(m => new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
                    datasets: [{ fill: true, data: selectedMetrics.map(m => m.network_out), borderColor: "#f43f5e", backgroundColor: "rgba(244,63,94,0.08)", tension: 0.4, pointRadius: 0, borderWidth: 2 }]
                  }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
