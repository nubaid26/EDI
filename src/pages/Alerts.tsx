import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, Zap, Info, ChevronDown, ChevronUp } from "lucide-react";

type Tab = "all" | "critical" | "high" | "medium";

export function Alerts() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/anomalies").then(r => r.json()).then(setAnomalies);
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  const filtered = anomalies.filter(a => {
    if (tab === "critical") return a.score > 95;
    if (tab === "high") return a.score > 80 && a.score <= 95;
    if (tab === "medium") return a.score <= 80;
    return true;
  });

  const getSeverity = (score: number) => {
    if (score > 95) return { label: "Critical", cls: "badge-critical", Icon: ShieldAlert };
    if (score > 80) return { label: "High", cls: "badge-high", Icon: AlertTriangle };
    return { label: "Medium", cls: "badge-medium", Icon: Zap };
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Active Alerts</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Real-time anomaly detection across all cloud providers</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "critical", "high", "medium"] as Tab[]).map(t => (
          <button key={t} className={`filter-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)} {t !== "all" && `(${anomalies.filter(a => t === "critical" ? a.score > 95 : t === "high" ? a.score > 80 && a.score <= 95 : a.score <= 80).length})`}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Severity</th><th>Resource</th><th>Type</th><th>Description</th><th>Est. Waste</th><th>Time</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const sev = getSeverity(a.score);
              const isExpanded = expanded === a.id;
              let rootCause: any = null;
              try { rootCause = a.root_cause ? JSON.parse(a.root_cause) : null; } catch { }

              return (
                <>
                  <tr key={a.id}>
                    <td><span className={`badge ${sev.cls}`}><sev.Icon className="w-3 h-3" />{sev.label}</span></td>
                    <td>
                      <div className="font-medium" style={{ color: "var(--text-primary)" }}>{a.resource_name}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{a.provider} · {a.service}</div>
                    </td>
                    <td><span className="badge" style={{ background: "rgba(100,116,139,0.1)", color: "var(--text-secondary)" }}>{a.type}</span></td>
                    <td style={{ maxWidth: 300 }}>
                      <div className="truncate text-xs" title={a.description}>{a.description}</div>
                    </td>
                    <td className="font-semibold" style={{ color: "#fb7185" }}>${(a.estimated_waste || 0).toFixed(0)}</td>
                    <td className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(a.timestamp).toLocaleString()}</td>
                    <td>
                      {rootCause && (
                        <button onClick={() => setExpanded(isExpanded ? null : a.id)} className="p-1 rounded hover:bg-white/5">
                          {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && rootCause && (
                    <tr key={`${a.id}-rca`}>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <div className="mx-4 mb-4 p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4" style={{ color: "#818cf8" }} />
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#818cf8" }}>Root Cause Analysis</span>
                          </div>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            <div><span style={{ color: "var(--text-muted)" }}>Service:</span> <span className="font-medium" style={{ color: "var(--text-primary)" }}>{rootCause.service}</span></div>
                            <div><span style={{ color: "var(--text-muted)" }}>Instance:</span> <span className="font-medium" style={{ color: "var(--text-primary)" }}>{rootCause.instanceType}</span></div>
                            <div><span style={{ color: "var(--text-muted)" }}>Region:</span> <span className="font-medium" style={{ color: "var(--text-primary)" }}>{rootCause.region}</span></div>
                            <div><span style={{ color: "var(--text-muted)" }}>Est. Waste:</span> <span className="font-semibold" style={{ color: "#fb7185" }}>${rootCause.estimatedWaste?.toFixed(0)}/mo</span></div>
                          </div>
                          <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>{rootCause.issue}</p>
                          {rootCause.evidence && (
                            <ul className="mt-2 space-y-1">
                              {rootCause.evidence.map((e: string, i: number) => (
                                <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-muted)" }}>
                                  <span style={{ color: "#818cf8" }}>•</span> {e}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>No alerts matching filter</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
