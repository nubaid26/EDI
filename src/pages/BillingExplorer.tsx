import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, ArrowUpRight } from "lucide-react";
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Filler, Legend, ArcElement, BarElement,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend, ArcElement, BarElement);

export function BillingExplorer() {
    const [summary, setSummary] = useState<any>({});

    useEffect(() => {
        fetch("/api/billing-summary").then(r => r.json()).then(setSummary);
    }, []);

    const providers = summary.byProvider || [];
    const topSpenders = summary.topSpenders || [];
    const byService = summary.byService || [];

    const chartOpts: any = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1e293b", titleColor: "#f1f5f9", bodyColor: "#94a3b8" } },
        scales: {
            x: { grid: { display: false }, ticks: { color: "#475569", font: { size: 10 }, maxRotation: 45 } },
            y: { grid: { color: "rgba(100,116,139,0.1)" }, ticks: { color: "#475569", font: { size: 10 } } },
        },
    };

    const providerCostData = {
        labels: providers.map((p: any) => p.provider),
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
            backgroundColor: ["#6366f1", "#f43f5e", "#10b981"],
            borderWidth: 0, borderRadius: 6,
        }],
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold gradient-text">Billing Explorer</h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Cloud spend analysis across all providers and services</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="stat-card amber p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: "rgba(245,158,11,0.12)" }}>
                            <DollarSign className="w-5 h-5" style={{ color: "#fbbf24" }} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Total Spend</p>
                            <p className="text-xl font-bold" style={{ color: "#fbbf24" }}>${(summary.totalSpend || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="stat-card blue p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: "rgba(59,130,246,0.12)" }}>
                            <TrendingUp className="w-5 h-5" style={{ color: "#60a5fa" }} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Resources Billed</p>
                            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                                {providers.reduce((a: number, p: any) => a + (p.resource_count || 0), 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="stat-card rose p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl" style={{ background: "rgba(244,63,94,0.12)" }}>
                            <ArrowUpRight className="w-5 h-5" style={{ color: "#fb7185" }} />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Data Transfer</p>
                            <p className="text-xl font-bold" style={{ color: "#fb7185" }}>
                                {providers.reduce((a: number, p: any) => a + (p.total_transfer_gb || 0), 0).toFixed(1)} GB
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Cost by Provider</h3>
                    <div style={{ height: 220 }} className="flex items-center justify-center">
                        {providers.length > 0 && (
                            <Doughnut data={providerCostData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" as const, labels: { color: "#94a3b8", font: { size: 11 }, padding: 16 } } }, cutout: "60%" }} />
                        )}
                    </div>
                </div>
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Cost by Service</h3>
                    <div style={{ height: 220 }}>
                        {byService.length > 0 && (
                            <Bar data={serviceCostData} options={chartOpts} />
                        )}
                    </div>
                </div>
            </div>

            {/* Top Spenders */}
            {topSpenders.length > 0 && (
                <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Top Spending Resources</h3>
                    <table className="data-table">
                        <thead>
                            <tr><th>Resource</th><th>Provider</th><th>Instance Type</th><th>Total Spend</th><th>Cumulative</th></tr>
                        </thead>
                        <tbody>
                            {topSpenders.map((r: any, i: number) => (
                                <tr key={i}>
                                    <td className="font-medium" style={{ color: "var(--text-primary)" }}>{r.resource_name}</td>
                                    <td><span className="badge" style={{ background: r.provider === "aws" ? "rgba(245,158,11,0.12)" : r.provider === "azure" ? "rgba(59,130,246,0.12)" : "rgba(239,68,68,0.12)", color: r.provider === "aws" ? "#fbbf24" : r.provider === "azure" ? "#60a5fa" : "#f87171" }}>{r.provider}</span></td>
                                    <td className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.instance_type}</td>
                                    <td className="font-semibold" style={{ color: "#fbbf24" }}>${r.total_spend?.toFixed(2)}</td>
                                    <td style={{ color: "var(--text-secondary)" }}>${r.cumulative_cost?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {topSpenders.length === 0 && (
                <div className="glass-card p-12 text-center">
                    <DollarSign className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Billing Data Yet</h3>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Billing data will appear once the V2 Synthetic Engine data is loaded.</p>
                </div>
            )}
        </div>
    );
}
