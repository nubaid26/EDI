import React, { useState, useRef } from "react";
import { useCollector, CollectorMode } from "../context/CollectorContext";
import { Activity, Upload, Cloud, RefreshCw, AlertTriangle } from "lucide-react";

const MODES: { key: CollectorMode; label: string; icon: typeof Activity }[] = [
  { key: "synthetic", label: "SYNTHETIC", icon: Activity },
  { key: "csv", label: "CSV UPLOAD", icon: Upload },
  { key: "live", label: "LIVE CLOUD", icon: Cloud },
];

export function DataSourceSelector() {
  const { mode, switchMode, summary, dataQuality, lastScan, resourceCount, loading, refresh, uploadCSV } = useCollector();
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [roleArn, setRoleArn] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleModeClick = (m: CollectorMode) => {
    if (m === "csv") { setShowCSVModal(true); return; }
    if (m === "live") { setShowLiveModal(true); return; }
    switchMode(m);
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    await uploadCSV(csvFile);
    setShowCSVModal(false);
    setCsvFile(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) setCsvFile(file);
  };

  const timeSince = lastScan ? (() => {
    const mins = Math.round((Date.now() - new Date(lastScan).getTime()) / 60000);
    return mins < 1 ? "just now" : `${mins}min ago`;
  })() : "—";

  const dirtyPct = dataQuality && dataQuality.total_rows_ingested > 0
    ? Math.round((dataQuality.dirty_rows_found / dataQuality.total_rows_ingested) * 100) : 0;

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-3 rounded-2xl mb-4" style={{
        background: "var(--bg-glass)", border: "1px solid var(--border-glass)",
        backdropFilter: "blur(12px)",
      }}>
        <span className="text-[11px] font-bold uppercase tracking-widest mr-1" style={{ color: "var(--text-muted)" }}>
          Data Source
        </span>

        {MODES.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => handleModeClick(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: mode === key ? "rgba(99,102,241,0.18)" : "transparent",
              color: mode === key ? "#a5b4fc" : "var(--text-muted)",
              border: mode === key ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
            }}>
            {mode === key && <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />}
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}

        <span className="ml-auto text-[11px]" style={{ color: "var(--text-muted)" }}>
          Engine v2.0 · {resourceCount} resources · Last scan {timeSince}
        </span>

        {dirtyPct > 0 && (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg font-semibold"
            style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>
            <AlertTriangle className="w-3 h-3" /> {dirtyPct}% dirty data patched
          </span>
        )}

        <button onClick={refresh} disabled={loading}
          className="p-1.5 rounded-lg transition-all duration-200 cursor-pointer" title="Rescan"
          style={{ background: "rgba(100,116,139,0.1)", color: "var(--text-muted)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* CSV Upload Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowCSVModal(false)}>
          <div className="w-[500px] rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-glass)" }}>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Upload Cloud Data CSV</h3>
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${dragActive ? "scale-[1.02]" : ""}`}
              style={{ borderColor: dragActive ? "#6366f1" : "var(--border-glass)", background: dragActive ? "rgba(99,102,241,0.05)" : "transparent" }}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}>
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {csvFile ? csvFile.name : "Drop CSV here or click to browse"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Supports: AWS CUR, CloudWatch, Azure, GCP exports
              </p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { if (e.target.files?.[0]) setCsvFile(e.target.files[0]); }} />
            </div>
            {csvFile && (
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(99,102,241,0.08)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{csvFile.name} ({(csvFile.size / 1024).toFixed(0)} KB)</span>
                <button onClick={handleCSVUpload}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer"
                  style={{ background: "var(--gradient-primary)" }}>
                  Load Data
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Cloud Modal */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowLiveModal(false)}>
          <div className="w-[500px] rounded-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-glass)" }}>
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Connect Live Cloud</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>AWS Role ARN</label>
                <input value={roleArn} onChange={e => setRoleArn(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/CloudGuardReadOnly"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)", color: "var(--text-primary)" }} />
              </div>
              <details className="text-xs" style={{ color: "var(--text-muted)" }}>
                <summary className="cursor-pointer font-semibold" style={{ color: "#a5b4fc" }}>How to get these →</summary>
                <pre className="mt-2 p-3 rounded-xl overflow-x-auto text-[10px]" style={{ background: "rgba(0,0,0,0.3)" }}>{`# Terraform — paste into your AWS account:
resource "aws_iam_role" "cloudguard_readonly" {
  name = "CloudGuardReadOnly"
  assume_role_policy = jsonencode({
    Statement = [{
      Effect = "Allow"
      Principal = { AWS = "arn:aws:iam::YOUR_CLOUDGUARD_ACCOUNT:root" }
      Action = "sts:AssumeRole"
      Condition = { StringEquals = { "sts:ExternalId" = "cloudguard" } }
    }]
  })
}
resource "aws_iam_role_policy_attachment" "readonly" {
  role       = aws_iam_role.cloudguard_readonly.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}`}</pre>
              </details>
            </div>
            <button onClick={() => { switchMode("live"); setShowLiveModal(false); }}
              disabled={!roleArn.startsWith("arn:aws:iam::")}
              className="w-full py-2 rounded-xl text-sm font-bold text-white cursor-pointer disabled:opacity-30"
              style={{ background: "var(--gradient-primary)" }}>
              Connect
            </button>
          </div>
        </div>
      )}
    </>
  );
}
