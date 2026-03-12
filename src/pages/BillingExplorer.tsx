import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, ArrowUpRight, TrendingDown } from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler, Legend, ArcElement, BarElement,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend, ArcElement, BarElement);

export function BillingExplorer() {
  const [summary, setSummary] = useState<any>({});
  const [billing, setBilling] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/billing-summary").then(r => r.json()).then(setSummary);
    fetch("/api/billing-timeline").then(r => r.json()).catch(() => []).then(d => setBilling(Array.isArray(d) ? d : []));
  }, []);

  const providers = summary.byProvider || [];
  const topSpenders = summary.topSpenders || [];
  const byService = summary.byService || [];

  // Compute savings opportunities from top spenders
  const idleSavings = topSpenders.filter((r: any) => (r.instance_type || "").includes("gpu") || (r.instance_type || "").includes("g4")).reduce((s: number, r: any) => s + r.total_spend * 0.7, 0);
  const orphanedSavings = topSpenders.filter((r: any) => r.total_spend < 50).reduce((s: number, r: any) => s + r.total_spend, 0);
  const totalSavings = idleSavings + orphanedSavings;

  const chartOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1e293b", titleColor: "#f1f5f9", bodyColor: "#94a3b8" } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#475569", font: { size: 9 }, maxRotation: 45, maxTicksLimit: 10 } },
      y: { grid: { color: "rgba(100,116,139,0.08)" }, ticks: { color: "#475569", font: { size: 10 }, callback: (v: number) => `$${v}` } },
    },
  };

  const providerCostData = {
    labels: providers.map((p: any) => `${p.provider} ($${Math.round(p.total_cost)})`),
    datasets: [{
      data: providers.map((p: any) => p.total_cost),
      backgroundColor: ["#f59e0b", "#3b82f6", "#ef4444"],
      borderWidth: 0, hoverOffset: 8,
    }],
  };

  const serviceCostData = {
    labels: byService.map((s: any) => s.service),
    datasets: [{
      data: byService.map((s: any) => s.total_cost),
      backgroundColor: ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"],
      borderWidth: 0, borderRadius: 6,
    }],
  };

  // 30-day cost timeline from billing data
  const timelineData = {
    labels: billing.slice(-30).map((b: any) => b.date?.split("T")[0] || ""),
    datasets: [
      {
        label: "Daily Cost",
        data: billing.slice(-30).map((b: any) => b.daily_cost || b.cost_per_hour * 24 || 0),
        borderColor: "#f43f5e", backgroundColor: "rgba(244,63,94,0.06)",
        fill: true, tension: 0.3, pointRadius: 2, borderWidth: 2,
      },
      {
        label: "Baseline (no anomalies)",
        data: billing.slice(-30).map((b: any) => (b.daily_cost || b.cost_per_hour * 24 || 0) * 0.65),
        borderColor: "#22c55e", backgroundColor: "transparent",
        fill: false, tension: 0.3, pointRadius: 0, borderWidth: 1.5, borderDash: [5, 3],
      },
    ],
  };

  return (
    <div className="p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Billing Explorer</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Cloud spend analysis across all providers and services</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="stat-card amber p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: "rgba(245,158,11,0.12)" }}>
              <DollarSign className="w-4 h-4" style={{ color: "#fbbf24" }} />
            </div>
            <div><p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Total Spend</p>
              <p className="text-lg font-bold" style={{ color: "#fbbf24" }}>${(summary.totalSpend || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
          </div>
        </div>
        <div className="stat-card blue p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: "rgba(59,130,246,0.12)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "#60a5fa" }} />
            </div>
            <div><p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Resources Billed</p>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {providers.reduce((a: number, p: any) => a + (p.resource_count || 0), 0)}</p></div>
          </div>
        </div>
        <div className="stat-card rose p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: "rgba(244,63,94,0.12)" }}>
              <ArrowUpRight className="w-4 h-4" style={{ color: "#fb7185" }} />
            </div>
            <div><p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Data Transfer</p>
              <p className="text-lg font-bold" style={{ color: "#fb7185" }}>
                {providers.reduce((a: number, p: any) => a + (p.total_transfer_gb || 0), 0).toFixed(0)} GB</p></div>
          </div>
        </div>
        <div className="stat-card green p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl" style={{ background: "rgba(34,197,94,0.12)" }}>
              <TrendingDown className="w-4 h-4" style={{ color: "#22c55e" }} />
            </div>
            <div><p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "var(--text-muted)" }}>Savings Opportunity</p>
              <p className="text-lg font-bold" style={{ color: "#22c55e" }}>${Math.round(totalSavings).toLocaleString()}/mo</p></div>
          </div>
        </div>
      </div>

      {/* 30-Day Cost Timeline */}
      {billing.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>30-Day Cost Timeline</h3>
          <div style={{ height: 220 }}>
            <Line data={timelineData} options={{
              ...chartOpts,
              plugins: { ...chartOpts.plugins, legend: { display: true, position: "top" as const, labels: { color: "#94a3b8", font: { size: 10 }, padding: 12 } } },
            }} />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Cost by Provider</h3>
          <div style={{ height: 200 }} className="flex items-center justify-center">
            {providers.length > 0 && <Doughnut data={providerCostData} options={{
              responsive: true, maintainAspectRatio: false, cutout: "60%",
              plugins: { legend: { position: "bottom" as const, labels: { color: "#94a3b8", font: { size: 11 }, padding: 12 } } },
            }} />}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Cost by Service</h3>
          <div style={{ height: 200 }}>
            {byService.length > 0 && <Bar data={serviceCostData} options={chartOpts} />}
          </div>
        </div>
      </div>

      {/* Cost Optimization Summary */}
      {totalSavings > 0 && (
        <div className="glass-card p-5" style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#22c55e" }}>💰 Cost Optimization Summary</h3>
          <div className="space-y-2 text-sm">
            {idleSavings > 0 && <div className="flex justify-between"><span style={{ color: "var(--text-secondary)" }}>Idle GPUs</span><span className="font-bold" style={{ color: "#22c55e" }}>-${Math.round(idleSavings).toLocaleString()}/mo</span></div>}
            {orphanedSavings > 0 && <div className="flex justify-between"><span style={{ color: "var(--text-secondary)" }}>Orphaned Resources</span><span className="font-bold" style={{ color: "#22c55e" }}>-${Math.round(orphanedSavings).toLocaleString()}/mo</span></div>}
            <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--border-glass)" }}>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>Total Savings</span>
              <span className="font-bold text-lg" style={{ color: "#22c55e" }}>-${Math.round(totalSavings).toLocaleString()}/mo</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Spenders */}
      {topSpenders.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Top Spending Resources</h3>
          <table className="data-table">
            <thead>
              <tr><th>Resource</th><th>Provider</th><th>Instance Type</th><th>Total Spend</th><th>Waste (est.)</th><th>Action</th></tr>
            </thead>
            <tbody>
              {topSpenders.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="font-medium" style={{ color: "var(--text-primary)" }}>{r.resource_name}</td>
                  <td><span className="badge" style={{ background: r.provider === "aws" ? "rgba(245,158,11,0.12)" : r.provider === "azure" ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.12)", color: r.provider === "aws" ? "#fbbf24" : r.provider === "azure" ? "#60a5fa" : "#f87171" }}>{r.provider}</span></td>
                  <td className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.instance_type}</td>
                  <td className="font-semibold" style={{ color: "#fbbf24" }}>${r.total_spend?.toFixed(0)}</td>
                  <td className="font-semibold" style={{ color: "#f43f5e" }}>${Math.round(r.total_spend * 0.3)}</td>
                  <td><button className="text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer" style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}>Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
