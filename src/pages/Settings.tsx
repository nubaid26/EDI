import { useState } from "react";
import { useCollector } from "../context/CollectorContext";
import { Settings as SettingsIcon, Save, TestTube } from "lucide-react";

export function Settings() {
  const { mode } = useCollector();
  const [cpuThreshold, setCpuThreshold] = useState(80);
  const [wasteThreshold, setWasteThreshold] = useState(100);
  const [gpuIdleHours, setGpuIdleHours] = useState(4);
  const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");
  const [currency, setCurrency] = useState("USD");
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [autoRemediation, setAutoRemediation] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Configure detection thresholds, notifications, and display preferences</p>
        </div>
        <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer"
          style={{ background: saved ? "#22c55e" : "var(--gradient-primary)" }}>
          <Save className="w-4 h-4" /> {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Data Source Config */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <SettingsIcon className="w-4 h-4" /> Data Source Configuration
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {(["synthetic", "csv", "live"] as const).map(m => (
            <div key={m} className="p-3 rounded-xl text-center" style={{
              background: mode === m ? "rgba(99,102,241,0.12)" : "var(--bg-glass)",
              border: mode === m ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--border-glass)",
            }}>
              <p className="text-xs font-bold uppercase" style={{ color: mode === m ? "#a5b4fc" : "var(--text-muted)" }}>{m}</p>
              {mode === m && <span className="text-[10px]" style={{ color: "#22c55e" }}>● Active</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Alert Thresholds */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Alert Thresholds</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1"><label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>CPU Alert Threshold</label>
              <span className="text-xs font-mono" style={{ color: "#a5b4fc" }}>{cpuThreshold}%</span></div>
            <input type="range" min={0} max={100} value={cpuThreshold} onChange={e => setCpuThreshold(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ background: "var(--bg-glass)" }} />
          </div>
          <div>
            <div className="flex justify-between mb-1"><label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Waste Alert Threshold ($/mo)</label>
              <span className="text-xs font-mono" style={{ color: "#a5b4fc" }}>${wasteThreshold}</span></div>
            <input type="range" min={10} max={5000} step={10} value={wasteThreshold} onChange={e => setWasteThreshold(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ background: "var(--bg-glass)" }} />
          </div>
          <div>
            <div className="flex justify-between mb-1"><label className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>GPU Idle Threshold (hours)</label>
              <span className="text-xs font-mono" style={{ color: "#a5b4fc" }}>{gpuIdleHours}h</span></div>
            <input type="range" min={1} max={24} value={gpuIdleHours} onChange={e => setGpuIdleHours(+e.target.value)}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer" style={{ background: "var(--bg-glass)" }} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--text-muted)" }}>Cryptomining Detection Sensitivity</label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map(s => (
                <button key={s} onClick={() => setSensitivity(s)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  style={{
                    background: sensitivity === s ? "rgba(99,102,241,0.15)" : "var(--bg-glass)",
                    color: sensitivity === s ? "#a5b4fc" : "var(--text-muted)",
                    border: sensitivity === s ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--border-glass)",
                  }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Remediation */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Auto-Remediation</h3>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Enable auto-remediation</span>
          <button onClick={() => setAutoRemediation(!autoRemediation)}
            className="w-10 h-5 rounded-full relative cursor-pointer transition-all"
            style={{ background: autoRemediation ? "#6366f1" : "var(--bg-glass)" }}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: autoRemediation ? 22 : 2 }} />
          </button>
        </div>
        {autoRemediation && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Require approval before action</span>
              <button onClick={() => setRequireApproval(!requireApproval)}
                className="w-10 h-5 rounded-full relative cursor-pointer transition-all"
                style={{ background: requireApproval ? "#6366f1" : "var(--bg-glass)" }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: requireApproval ? 22 : 2 }} />
              </button>
            </div>
            <p className="text-[11px] flex items-center gap-1" style={{ color: "#fbbf24" }}>
              ⚠ Auto-remediation will stop/resize resources based on AI recommendations
            </p>
          </>
        )}
      </div>

      {/* Display Preferences */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Display Preferences</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)", color: "var(--text-primary)" }}>
              {["USD", "EUR", "GBP", "INR"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Refresh Interval</label>
            <select value={refreshInterval} onChange={e => setRefreshInterval(+e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)", color: "var(--text-primary)" }}>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
