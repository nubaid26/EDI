import { useState, useEffect } from "react";
import { Key, Bell, Shield, Database, Cloud } from "lucide-react";

type SettingsTab = "integrations" | "notifications" | "security" | "data";

export function Settings() {
  const [tab, setTab] = useState<SettingsTab>("integrations");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState({ email: true, slack: false, dashboard: true });
  const [retention, setRetention] = useState("90");

  useEffect(() => {
    fetch("/api/cloud-accounts").then(r => r.json()).then(setAccounts);
  }, []);

  const tabs = [
    { id: "integrations" as const, label: "Cloud Integrations", icon: Key },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "security" as const, label: "Security Policies", icon: Shield },
    { id: "data" as const, label: "Data Retention", icon: Database },
  ];

  const providerStyle = (p: string) => {
    if (p === "AWS") return { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", label: "AWS" };
    if (p === "Azure") return { bg: "rgba(59,130,246,0.12)", color: "#60a5fa", label: "AZ" };
    return { bg: "rgba(239,68,68,0.12)", color: "#f87171", label: "GCP" };
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Platform Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Configure cloud integrations, notifications, and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="space-y-1">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: tab === t.id ? "rgba(99,102,241,0.12)" : "transparent",
                  color: tab === t.id ? "#a5b4fc" : "var(--text-muted)",
                }}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-4">
          {tab === "integrations" && (
            <>
              <div className="glass-card p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Cloud Provider Integrations</h2>
                <div className="space-y-3">
                  {accounts.map(acc => {
                    const ps = providerStyle(acc.provider);
                    return (
                      <div key={acc.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: ps.bg, color: ps.color }}>
                            {ps.label}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{acc.provider === "AWS" ? "Amazon Web Services" : acc.provider === "Azure" ? "Microsoft Azure" : "Google Cloud Platform"}</h4>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Account: {acc.account_id} · {acc.alias}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="badge badge-low">Connected</span>
                          <button className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-glass)", color: "var(--text-secondary)", border: "1px solid var(--border-glass)" }}>Configure</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card p-5">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Gemini AI Configuration</h2>
                <div className="flex gap-3">
                  <input type="password" value="••••••••••••••••••••••••" readOnly
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)", color: "var(--text-muted)" }} />
                  <button className="btn-primary">Update</button>
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Required for Optimization Agent and anomaly explanation features.</p>
              </div>
            </>
          )}

          {tab === "notifications" && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Notification Channels</h2>
              <div className="space-y-4">
                {[
                  { key: "dashboard" as const, label: "Dashboard Notifications", desc: "Show alerts in the CloudGuard dashboard" },
                  { key: "email" as const, label: "Email Alerts", desc: "Send critical alerts via email" },
                  { key: "slack" as const, label: "Slack Integration", desc: "Post alerts to a Slack channel" },
                ].map(ch => (
                  <div key={ch.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
                    <div>
                      <h4 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{ch.label}</h4>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ch.desc}</p>
                    </div>
                    <button onClick={() => setNotifications(prev => ({ ...prev, [ch.key]: !prev[ch.key] }))}
                      className="w-11 h-6 rounded-full transition-colors relative"
                      style={{ background: notifications[ch.key] ? "#6366f1" : "rgba(100,116,139,0.3)" }}>
                      <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
                        style={{ left: notifications[ch.key] ? 22 : 2 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Security Policies</h2>
              <div className="space-y-3 text-sm">
                <div className="p-4 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
                  <h4 className="font-medium" style={{ color: "var(--text-primary)" }}>Authentication</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>OAuth 2.0 with cloud provider SSO support</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
                  <h4 className="font-medium" style={{ color: "var(--text-primary)" }}>API Key Protection</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>All API keys encrypted at rest. Rotated every 90 days.</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
                  <h4 className="font-medium" style={{ color: "var(--text-primary)" }}>Role-Based Access Control</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Admin, Editor, Viewer roles with granular permissions</p>
                </div>
              </div>
            </div>
          )}

          {tab === "data" && (
            <div className="glass-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Data Retention Policy</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Metrics retention (days)</label>
                  <select value={retention} onChange={e => setRetention(e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)", color: "var(--text-primary)" }}>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Anomaly and alert data is retained indefinitely. Metrics data older than the retention period will be automatically purged.
                </p>
                <button className="btn-primary">Save Changes</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
