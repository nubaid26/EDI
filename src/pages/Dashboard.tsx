import { useEffect, useState } from "react";
import { Activity, AlertTriangle, DollarSign, ShieldCheck, TrendingDown, Bell } from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler, Legend, ArcElement, BarElement,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend, ArcElement, BarElement);

const CHART_COLORS = ["#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

export function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const [metrics, setMetrics] = useState<any[]>([]);
  const [costTimeline, setCostTimeline] = useState<any[]>([]);
  const [riskScores, setRiskScores] = useState<any[]>([]);

  const fetchData = () => {
    fetch("/api/dashboard-stats").then(r => r.json()).then(setStats);
    fetch("/api/metrics/i-0abcd1234efgh5678").then(r => r.json()).then(d => setMetrics(d.reverse()));
    fetch("/api/cost-timeline").then(r => r.json()).then(setCostTimeline);
    fetch("/api/risk-scores").then(r => r.json()).then(setRiskScores);
  };

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 15000); return () => clearInterval(iv); }, []);

  const chartOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false, backgroundColor: "#1e293b", titleColor: "#f1f5f9", bodyColor: "#94a3b8", borderColor: "#334155", borderWidth: 1 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#475569", font: { size: 10 } } },
      y: { grid: { color: "rgba(100,116,139,0.1)", drawBorder: false }, ticks: { color: "#475569", font: { size: 10 } } },
    },
  };

  const cpuData = {
    labels: metrics.slice(-25).map(m => new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
    datasets: [{
      fill: true, label: "CPU", data: metrics.slice(-25).map(m => m.cpu_utilization),
      borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", tension: 0.4, pointRadius: 0, borderWidth: 2,
    }],
  };

  const costData = {
    labels: costTimeline.map(c => c.period?.split(" ")[1] || ""),
    datasets: [{
      fill: true, label: "Cost", data: costTimeline.map(c => c.total_cost),
      borderColor: "#f43f5e", backgroundColor: "rgba(244,63,94,0.08)", tension: 0.4, pointRadius: 0, borderWidth: 2,
    }],
  };

  const providerData = {
    labels: (stats.providerBreakdown || []).map((p: any) => p.provider),
    datasets: [{
      data: (stats.providerBreakdown || []).map((p: any) => p.count),
      backgroundColor: ["#f59e0b", "#3b82f6", "#ef4444"],
      borderWidth: 0, hoverOffset: 8,
    }],
  };

  const anomalyBarData = {
    labels: (stats.anomalyTypeDistribution || []).map((a: any) => a.type),
    datasets: [{
      data: (stats.anomalyTypeDistribution || []).map((a: any) => a.count),
      backgroundColor: CHART_COLORS,
      borderWidth: 0, borderRadius: 6,
    }],
  };

  const riskColor = (stats.riskScore || 0) > 60 ? "#f43f5e" : (stats.riskScore || 0) > 30 ? "#f59e0b" : "#10b981";
  const riskPct = ((stats.riskScore || 0) / 100) * 283;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard Overview</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Real-time multi-cloud monitoring & AI detection</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="risk-gauge">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="8" />
              <circle cx="60" cy="60" r="45" fill="none" stroke={riskColor} strokeWidth="8"
                strokeDasharray="283" strokeDashoffset={283 - riskPct} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: riskColor }}>{stats.riskScore || 0}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Risk</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Resources" value={stats.totalResources || 0} icon={Activity} accent="blue" />
        <StatCard title="Anomalies" value={stats.totalAnomalies || 0} icon={AlertTriangle} accent="amber" />
        <StatCard title="Est. Waste" value={`$${(stats.totalWaste || 0).toFixed(0)}`} icon={TrendingDown} accent="rose" />
        <StatCard title="Savings" value={`$${(stats.totalSavings || 0).toFixed(0)}`} icon={DollarSign} accent="emerald" />
        <StatCard title="Active Alerts" value={stats.activeAlerts || 0} icon={Bell} accent="indigo" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>CPU Utilization (Sample Node)</h3>
          <div style={{ height: 220 }}>{metrics.length > 0 && <Line options={chartOpts} data={cpuData} />}</div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Cost Timeline (All Resources)</h3>
          <div style={{ height: 220 }}>{costTimeline.length > 0 && <Line options={chartOpts} data={costData} />}</div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Provider Breakdown</h3>
          <div style={{ height: 200 }} className="flex items-center justify-center">
            {(stats.providerBreakdown || []).length > 0 && (
              <Doughnut data={providerData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" as const, labels: { color: "#94a3b8", font: { size: 11 }, padding: 16 } } }, cutout: "65%" }} />
            )}
          </div>
        </div>
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Anomaly Distribution</h3>
          <div style={{ height: 200 }}>
            {(stats.anomalyTypeDistribution || []).length > 0 && (
              <Bar data={anomalyBarData} options={{ ...chartOpts, scales: { ...chartOpts.scales, x: { ...chartOpts.scales.x, ticks: { ...chartOpts.scales.x.ticks, maxRotation: 45, minRotation: 0 } } }, plugins: { ...chartOpts.plugins, legend: { display: false } }, indexAxis: "x" as const }} />
            )}
          </div>
        </div>
      </div>

      {/* Risk Scores Table */}
      {riskScores.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Resource Risk Scores</h3>
          <table className="data-table">
            <thead><tr><th>Resource</th><th>Provider</th><th>Risk Score</th><th>Level</th></tr></thead>
            <tbody>
              {riskScores.slice(0, 8).map((r: any, i: number) => (
                <tr key={i}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>{r.resourceName}</td>
                  <td><span className="badge" style={{ background: r.provider === "AWS" ? "rgba(245,158,11,0.12)" : r.provider === "Azure" ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.12)", color: r.provider === "AWS" ? "#fbbf24" : r.provider === "Azure" ? "#60a5fa" : "#f87171" }}>{r.provider}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full" style={{ background: "rgba(100,116,139,0.15)" }}>
                        <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: r.score > 60 ? "#f43f5e" : r.score > 30 ? "#f59e0b" : "#10b981" }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: r.score > 60 ? "#fb7185" : r.score > 30 ? "#fbbf24" : "#34d399" }}>{r.score}</span>
                    </div>
                  </td>
                  <td><span className={`badge badge-${r.level === "HIGH" ? "critical" : r.level === "MEDIUM" ? "medium" : "low"}`}>{r.level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, accent }: { title: string; value: string | number; icon: any; accent: string }) {
  return (
    <div className={`stat-card ${accent} p-5 animate-in`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{value}</p>
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: "rgba(99,102,241,0.1)" }}>
          <Icon className="w-5 h-5" style={{ color: `var(--accent-${accent})` }} />
        </div>
      </div>
    </div>
  );
}
