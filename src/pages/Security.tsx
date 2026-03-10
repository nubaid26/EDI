import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, AlertOctagon, Eye } from "lucide-react";

export function Security() {
  const [threats, setThreats] = useState<any[]>([]);
  const [selectedThreat, setSelectedThreat] = useState<any>(null);

  useEffect(() => {
    const load = () => fetch("/api/anomalies").then(r => r.json()).then(data =>
      setThreats(data.filter((a: any) => a.type === "Resource Abuse" || a.type === "Infrastructure Behavior"))
    );
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  const abuseThreats = threats.filter(t => t.type === "Resource Abuse");
  const infraThreats = threats.filter(t => t.type === "Infrastructure Behavior");

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Security Threats</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Detect cryptomining, resource abuse, and suspicious infrastructure patterns</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card rose p-5">
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Total Threats</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#fb7185" }}>{threats.length}</p>
        </div>
        <div className="stat-card rose p-5">
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Resource Abuse</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#fb7185" }}>{abuseThreats.length}</p>
        </div>
        <div className="stat-card amber p-5">
          <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-muted)" }}>Infra Anomalies</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#fbbf24" }}>{infraThreats.length}</p>
        </div>
      </div>

      {/* Threat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {threats.map(threat => {
          let rootCause: any = null;
          try { rootCause = threat.root_cause ? JSON.parse(threat.root_cause) : null; } catch { }

          return (
            <div key={threat.id} className="glass-card p-5 animate-in relative overflow-hidden" style={{ borderLeft: `3px solid ${threat.type === "Resource Abuse" ? "#f43f5e" : "#f59e0b"}` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: threat.type === "Resource Abuse" ? "rgba(244,63,94,0.12)" : "rgba(245,158,11,0.12)" }}>
                  <AlertOctagon className="w-5 h-5" style={{ color: threat.type === "Resource Abuse" ? "#fb7185" : "#fbbf24" }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{threat.resource_name}</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{threat.provider} · {threat.service}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Threat Type</span>
                  <span className={`badge ${threat.type === "Resource Abuse" ? "badge-critical" : "badge-high"}`}>{threat.type}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Risk Score</span>
                  <span className="font-bold" style={{ color: "#fb7185" }}>{threat.score}/100</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Region</span>
                  <span style={{ color: "var(--text-secondary)" }}>{threat.region}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Detected</span>
                  <span style={{ color: "var(--text-secondary)" }}>{new Date(threat.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs mt-3 mb-4" style={{ color: "var(--text-secondary)" }}>{threat.description}</p>

              <div className="flex gap-2">
                <button className="btn-danger flex-1 text-center text-xs" onClick={() => setSelectedThreat(threat)}>
                  <span className="flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> Investigate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {threats.length === 0 && (
        <div className="glass-card p-12 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4" style={{ color: "#34d399" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Security Threats Detected</h3>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Your infrastructure is currently secure from known abuse patterns.</p>
        </div>
      )}

      {/* Investigation Modal */}
      {selectedThreat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg mx-4 p-6 rounded-2xl" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-glass)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Threat Investigation</h3>
              <button onClick={() => setSelectedThreat(null)} className="text-xs font-medium px-3 py-1 rounded-lg" style={{ background: "var(--bg-glass)", color: "var(--text-muted)" }}>Close</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg" style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.15)" }}>
                <p className="font-semibold text-xs uppercase tracking-wider mb-1" style={{ color: "#fb7185" }}>Threat Summary</p>
                <p style={{ color: "var(--text-secondary)" }}>{selectedThreat.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg" style={{ background: "var(--bg-glass)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Resource</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>{selectedThreat.resource_name}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "var(--bg-glass)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Risk Score</span>
                  <p className="font-bold mt-0.5" style={{ color: "#fb7185" }}>{selectedThreat.score}/100</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "var(--bg-glass)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Owner</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>{selectedThreat.attributed_owner || "Unknown"}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "var(--bg-glass)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Service</span>
                  <p className="font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>{selectedThreat.service}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="btn-danger flex-1 text-center">Isolate Resource</button>
                <button className="btn-primary flex-1 text-center">Acknowledge</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
