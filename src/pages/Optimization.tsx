import { useEffect, useState } from "react";
import { Zap, CheckCircle, TrendingUp, DollarSign } from "lucide-react";
import { useCollector } from "../context/CollectorContext";

export function Optimization() {
  const { summary } = useCollector();
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/recommendations").then(r => r.json()).then(setRecommendations);
  }, []);

  const handleRemediate = async (id: number) => {
    await fetch(`/api/remediate/${id}`, { method: "POST" });
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: "completed" } : r));
  };

  const totalSavings = recommendations.filter(r => r.status === "completed").reduce((a, r) => a + (r.estimated_savings || 0), 0);
  const pendingSavings = summary?.savings_potential || recommendations.filter(r => r.status === "pending").reduce((a, r) => a + (r.estimated_savings || 0), 0);
  const pending = recommendations.filter(r => r.status === "pending");
  const completed = recommendations.filter(r => r.status === "completed");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Cost Optimization</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>AI-powered recommendations to reduce cloud waste</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card emerald p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(16,185,129,0.12)" }}>
              <DollarSign className="w-5 h-5" style={{ color: "#34d399" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Realized Savings</p>
              <p className="text-xl font-bold" style={{ color: "#34d399" }}>${totalSavings.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card amber p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(245,158,11,0.12)" }}>
              <TrendingUp className="w-5 h-5" style={{ color: "#fbbf24" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Pending Savings</p>
              <p className="text-xl font-bold" style={{ color: "#fbbf24" }}>${pendingSavings.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="stat-card blue p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ background: "rgba(59,130,246,0.12)" }}>
              <Zap className="w-5 h-5" style={{ color: "#60a5fa" }} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Recommendations</p>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{recommendations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Recommendations */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Pending Actions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pending.map(rec => (
              <div key={rec.id} className="glass-card p-5 animate-in">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: "rgba(99,102,241,0.12)" }}>
                      <Zap className="w-5 h-5" style={{ color: "#818cf8" }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{rec.action}</h3>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{rec.resource_name} · {rec.provider}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: "#34d399" }}>${(rec.estimated_savings || 0).toFixed(0)}</div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Est. Savings</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ background: "rgba(100,116,139,0.06)", border: "1px solid var(--border-glass)" }}>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{rec.anomaly_description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="badge" style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc" }}>
                      Confidence: {rec.confidence}%
                    </span>
                    <span className="badge" style={{ background: "rgba(100,116,139,0.1)", color: "var(--text-secondary)" }}>
                      {rec.anomaly_type}
                    </span>
                    {/* Confidence bar */}
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(100,116,139,0.15)" }}>
                        <div className="h-full rounded-full" style={{ width: `${rec.confidence}%`, background: rec.confidence > 80 ? "#10b981" : rec.confidence > 50 ? "#f59e0b" : "#f43f5e" }} />
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => handleRemediate(rec.id)} className="btn-primary w-full text-center">
                  Apply Fix
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Applied Optimizations</h2>
          <div className="glass-card overflow-hidden">
            <table className="data-table">
              <thead><tr><th>Action</th><th>Resource</th><th>Savings</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                {completed.map(rec => (
                  <tr key={rec.id}>
                    <td className="font-medium" style={{ color: "var(--text-primary)" }}>{rec.action}</td>
                    <td>{rec.resource_name}</td>
                    <td className="font-semibold" style={{ color: "#34d399" }}>${(rec.estimated_savings || 0).toFixed(0)}</td>
                    <td><span className="badge" style={{ background: "rgba(100,116,139,0.1)", color: "var(--text-secondary)" }}>{rec.anomaly_type}</span></td>
                    <td><span className="badge badge-low"><CheckCircle className="w-3 h-3" /> Applied</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recommendations.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Recommendations Yet</h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>The AI optimization agent is analyzing your infrastructure. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
