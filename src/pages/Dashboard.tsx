import { useEffect, useState, useCallback } from "react";
import { Server, AlertTriangle, DollarSign, Zap, Bell } from "lucide-react";
import { useCollector } from "../context/CollectorContext";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler, Legend, ArcElement, BarElement,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend, ArcElement, BarElement);
// Register annotation plugin if available (graceful fallback)
try { ChartJS.register(annotationPlugin); } catch {}

const ANOMALY_COLORS: Record<string, string> = {
  cryptomining: "#ff4444", data_transfer_abuse: "#ff6644", abnormal_egress: "#ff8844",
  cost_spike: "#f0c060", idle_gpu: "#ff8c00", zombie_load_balancer: "#cc6600",
  reserved_waste: "#44aaff", over_provisioned: "#4488ff", orphaned_resource: "#aa44ff",
  orphaned_snapshot: "#8833cc", normal: "#22cc66",
};

export function Dashboard() {
  const { summary, loading } = useCollector();
  const [stats, setStats] = useState<any>({});
  const [cpuData, setCpuData] = useState<any[]>([]);
  const [costData, setCostData] = useState<any[]>([]);
  const [riskScores, setRiskScores] = useState<any[]>([]);

  const fetchDashboard = useCallback(async () => {
    const [statsR, metricsR, costR, riskR] = await Promise.all([
      fetch("/api/dashboard-stats").then(r => r.json()),
      fetch("/api/metrics/sample").then(r => r.json()).catch(() => []),
      fetch("/api/cost-timeline").then(r => r.json()).catch(() => []),
      fetch("/api/risk-scores").then(r => r.json()).catch(() => []),
    ]);
    setStats(statsR);
    setCpuData(Array.isArray(metricsR) ? metricsR : []);
    setCostData(Array.isArray(costR) ? costR : []);
    setRiskScores(Array.isArray(riskR) ? riskR.slice(0, 10) : []);
  }, []);

  useEffect(() => { fetchDashboard(); const i = setInterval(fetchDashboard, 15000); return () => clearInterval(i); }, [fetchDashboard]);

  const providers = stats.providerBreakdown || [];
  const anomalyDist = stats.anomalyTypeDistribution || [];
  const waste = stats.totalWaste || 0;
  const savings = summary?.savings_potential || stats.totalSavings || 0;

  // ── Stat Cards ────────────────────────────────────────────────────────────
  const statCards = [
    { label: "RESOURCES", value: stats.totalResources || 0, icon: Server, color: "#60a5fa", border: "blue" },
    { label: "ANOMALIES", value: stats.totalAnomalies || 0, icon: AlertTriangle, color: "#fbbf24", border: "amber",
      glow: (stats.totalAnomalies || 0) > 5 },
    { label: "EST. WASTE", value: `$${waste.toLocaleString()}`, icon: DollarSign, color: "#f43f5e", border: "rose" },
    { label: "SAVINGS OPP.", value: `$${Math.round(savings).toLocaleString()}`, icon: Zap, color: "#22c55e", border: "green" },
    { label: "ACTIVE ALERTS", value: stats.activeAlerts || 0, icon: Bell, color: "#a78bfa", border: "purple" },
  ];

  // ── CPU Chart Config ──────────────────────────────────────────────────────
  const cpuChartData = {
    labels: cpuData.slice(-50).map((m: any) => new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
    datasets: [{
      label: "CPU %", data: cpuData.slice(-50).map((m: any) => m.cpu_utilization),
      borderColor: "#6366f1", backgroundColor: (ctx: any) => {
        const val = ctx.parsed?.y; if (val == null) return "rgba(99,102,241,0.1)";
        return val > 80 ? "rgba(244,63,94,0.15)" : "rgba(99,102,241,0.1)";
      },
      fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
    }],
  };
  const cpuChartOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1e293b", titleColor: "#f1f5f9", bodyColor: "#94a3b8",
        callbacks: { label: (ctx: any) => `CPU: ${ctx.parsed.y?.toFixed(1)}%` } },
      annotation: { annotations: {
        threshold: { type: "line", yMin: 80, yMax: 80, borderColor: "rgba(244,63,94,0.5)",
          borderWidth: 1, borderDash: [4, 4],
          label: { display: true, content: "Alert 80%", position: "end",
            backgroundColor: "rgba(244,63,94,0.8)", color: "#fff", font: { size: 9 } } },
      }},
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#475569", font: { size: 9 }, maxTicksLimit: 8 } },
      y: { min: 0, max: 100, grid: { color: "rgba(100,116,139,0.08)" },
        ticks: { color: "#475569", font: { size: 10 }, callback: (v: number) => `${v}%` } },
    },
  };

  // ── Cost Timeline ─────────────────────────────────────────────────────────
  const costChartData = {
    labels: costData.slice(-50).map((c: any) => {
      const d = new Date(c.timestamp);
      return isNaN(d.getTime()) ? (c.timestamp || "").slice(5, 16) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }),
    datasets: [{
      label: "Cost ($/hr)", data: costData.slice(-50).map((c: any) => c.total_cost),
      borderColor: "#f43f5e", backgroundColor: "rgba(244,63,94,0.08)",
      fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
    }],
  };
  const costChartOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1e293b", titleColor: "#f1f5f9", bodyColor: "#94a3b8",
        callbacks: { label: (ctx: any) => `$${ctx.parsed.y?.toFixed(2)}/hr` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#475569", font: { size: 9 }, maxTicksLimit: 8 } },
      y: { grid: { color: "rgba(100,116,139,0.08)" },
        ticks: { color: "#475569", font: { size: 10 }, callback: (v: number) => `$${v}` } },
    },
  };

  // ── Provider Donut ────────────────────────────────────────────────────────
  const providerTotal = providers.reduce((a: number, p: any) => a + p.count, 0);
  const providerDonut = {
    labels: providers.map((p: any) => `${p.provider} (${Math.round(p.count / Math.max(providerTotal, 1) * 100)}%)`),
    datasets: [{ data: providers.map((p: any) => p.count),
      backgroundColor: ["#f59e0b", "#3b82f6", "#ef4444"], borderWidth: 0, hoverOffset: 8 }],
  };

  // ── Anomaly Bar ───────────────────────────────────────────────────────────
  const anomalyBar = {
    labels: anomalyDist.map((a: any) => a.type?.replace(/_/g, " ") || "unknown"),
    datasets: [{ data: anomalyDist.map((a: any) => a.count),
      backgroundColor: anomalyDist.map((a: any) => ANOMALY_COLORS[a.type] || "#64748b"),
      borderWidth: 0, borderRadius: 6 }],
  };
  const anomalyBarOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#1e293b", bodyColor: "#94a3b8" },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#475569", font: { size: 9 }, maxRotation: 45 } },
      y: { grid: { color: "rgba(100,116,139,0.08)" }, ticks: { color: "#475569", font: { size: 10 } },
        beginAtZero: true },
    },
  };

  // ── Risk Gauge SVG ────────────────────────────────────────────────────────
  const riskScore = stats.riskScore || 0;
  const gaugeAngle = (riskScore / 100) * 270;
  const gauceColor = riskScore >= 60 ? "#ff4444" : riskScore >= 30 ? "#ff8c00" : "#22cc66";

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard Overview</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Real-time multi-cloud monitoring & AI detection</p>
        </div>
        {/* Risk Gauge */}
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[135deg]">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="8"
              strokeDasharray={`${270 * Math.PI * 42 / 180} 999`} strokeLinecap="round" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={gauceColor} strokeWidth="8"
              strokeDasharray={`${gaugeAngle * Math.PI * 42 / 180} 999`} strokeLinecap="round"
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold" style={{ color: gauceColor }}>{riskScore}</span>
            <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>RISK</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, border, glow }) => (
          <div key={label} className={`stat-card ${border} p-4 animate-in ${glow ? "ring-1 ring-red-500/30" : ""}`}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl" style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-lg font-bold" style={{ color }}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>CPU Utilization (0-100%)</h3>
          <div style={{ height: 220 }}>
            {cpuData.length > 0 ? <Line data={cpuChartData} options={cpuChartOpts} /> :
              <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>Collecting metrics...</div>}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Cost Timeline ($/hr)</h3>
          <div style={{ height: 220 }}>
            {costData.length > 0 ? <Line data={costChartData} options={costChartOpts} /> :
              <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>Collecting cost data...</div>}
          </div>
        </div>
      </div>

      {/* Provider + Anomaly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Provider Breakdown</h3>
          <div style={{ height: 220 }} className="flex items-center justify-center">
            {providers.length > 0 && <Doughnut data={providerDonut} options={{
              responsive: true, maintainAspectRatio: false, cutout: "60%",
              plugins: { legend: { position: "bottom" as const, labels: { color: "#94a3b8", font: { size: 11 }, padding: 12 } } },
            }} />}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Anomaly Distribution</h3>
          <div style={{ height: 220 }}>
            {anomalyDist.length > 0 && <Bar data={anomalyBar} options={anomalyBarOpts} />}
          </div>
        </div>
      </div>

      {/* Resource Risk Scores Table */}
      {riskScores.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Resource Risk Scores</h3>
          <table className="data-table">
            <thead>
              <tr><th>Resource</th><th>Provider</th><th>Anomaly</th><th>Risk Score</th><th>Level</th></tr>
            </thead>
            <tbody>
              {riskScores.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{r.resource_id?.split("/").pop() || r.resource_id}</td>
                  <td><span className="badge" style={{ background: r.provider === "aws" ? "rgba(245,158,11,0.12)" : r.provider === "azure" ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.12)", color: r.provider === "aws" ? "#fbbf24" : r.provider === "azure" ? "#60a5fa" : "#f87171" }}>{r.provider}</span></td>
                  <td><span className="badge" style={{ background: `${ANOMALY_COLORS[r.anomaly_type] || "#64748b"}18`, color: ANOMALY_COLORS[r.anomaly_type] || "#94a3b8" }}>{r.anomaly_type?.replace(/_/g, " ")}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(100,116,139,0.15)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${r.risk_score || 0}%`,
                          background: (r.risk_score || 0) >= 60 ? "#ff4444" : (r.risk_score || 0) >= 30 ? "#ff8c00" : "#22cc66",
                        }} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{r.risk_score || 0}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.risk_level === "HIGH" ? "badge-critical" : r.risk_level === "MEDIUM" ? "badge-high" : "badge-low"}`}>
                      {r.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
