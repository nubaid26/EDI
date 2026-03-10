import { useEffect, useState } from "react";
import { Terminal, AlertOctagon, User, Search, Shield } from "lucide-react";

type Tab = "all" | "suspicious";

export function APIActivity() {
    const [logs, setLogs] = useState<any[]>([]);
    const [suspicious, setSuspicious] = useState<any>({ suspicious: [], userBreakdown: [] });
    const [tab, setTab] = useState<Tab>("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch("/api/api-logs").then(r => r.json()).then(setLogs);
        fetch("/api/api-logs/suspicious").then(r => r.json()).then(setSuspicious);
    }, []);

    const filteredLogs = (tab === "suspicious" ? suspicious.suspicious : logs)
        .filter((l: any) => search === "" || l.action?.toLowerCase().includes(search.toLowerCase()) || l.user_id?.toLowerCase().includes(search.toLowerCase()));

    const getActionStyle = (action: string) => {
        if (action.includes("launch") || action.includes("create")) return { bg: "rgba(99,102,241,0.12)", color: "#a5b4fc" };
        if (action.includes("terminate") || action.includes("stop")) return { bg: "rgba(244,63,94,0.12)", color: "#fb7185" };
        if (action.includes("assume_role") || action.includes("create_access_key")) return { bg: "rgba(245,158,11,0.12)", color: "#fbbf24" };
        return { bg: "rgba(100,116,139,0.1)", color: "var(--text-secondary)" };
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold gradient-text">API Activity</h1>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>CloudTrail-style API activity log with suspicious activity detection</p>
            </div>

            {/* User Breakdown Cards */}
            {suspicious.userBreakdown?.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {suspicious.userBreakdown.slice(0, 6).map((u: any, i: number) => {
                        const isSuspicious = u.failed_count > 5 || u.launches > 20;
                        return (
                            <div key={i} className="glass-card p-4 animate-in" style={{ borderLeft: isSuspicious ? "3px solid #f43f5e" : "3px solid transparent" }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-3.5 h-3.5" style={{ color: isSuspicious ? "#fb7185" : "var(--text-muted)" }} />
                                    <span className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{u.user_id}</span>
                                </div>
                                <div className="space-y-1 text-[11px]">
                                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Actions</span><span style={{ color: "var(--text-secondary)" }}>{u.total_actions}</span></div>
                                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Failed</span><span style={{ color: u.failed_count > 0 ? "#fb7185" : "var(--text-secondary)" }}>{u.failed_count}</span></div>
                                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Launches</span><span style={{ color: u.launches > 15 ? "#fbbf24" : "var(--text-secondary)" }}>{u.launches}</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tabs + Search */}
            <div className="flex items-center gap-3">
                <button className={`filter-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
                    All Activity ({logs.length})
                </button>
                <button className={`filter-tab ${tab === "suspicious" ? "active" : ""}`} onClick={() => setTab("suspicious")}>
                    <AlertOctagon className="w-3 h-3 inline mr-1" />Suspicious ({suspicious.suspicious?.length || 0})
                </button>
                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)" }}>
                    <Search className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions or users..."
                        className="bg-transparent text-sm outline-none w-44" style={{ color: "var(--text-primary)" }} />
                </div>
            </div>

            {/* Log Table */}
            <div className="glass-card overflow-hidden">
                <table className="data-table">
                    <thead>
                        <tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>Region</th><th>Status</th><th>Source IP</th></tr>
                    </thead>
                    <tbody>
                        {filteredLogs.slice(0, 100).map((log: any, i: number) => {
                            const actionStyle = getActionStyle(log.action);
                            const isFailed = log.status === "Failed";
                            const isExternalIP = log.source_ip?.startsWith("185.");
                            return (
                                <tr key={i}>
                                    <td className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{log.timestamp}</td>
                                    <td className="font-medium text-xs" style={{ color: "var(--text-primary)" }}>{log.user_id}</td>
                                    <td><span className="badge" style={{ background: actionStyle.bg, color: actionStyle.color }}>{log.action}</span></td>
                                    <td className="text-xs truncate" style={{ maxWidth: 200, color: "var(--text-secondary)" }} title={log.resource_id}>
                                        {log.resource_id?.split("/").pop() || log.resource_id}
                                    </td>
                                    <td className="text-xs">
                                        <span style={{ color: ["ap-east-1", "af-south-1", "sa-east-1"].includes(log.region) ? "#fbbf24" : "var(--text-secondary)" }}>
                                            {log.region}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${isFailed ? "badge-critical" : "badge-low"}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="text-xs" style={{ color: isExternalIP ? "#fb7185" : "var(--text-muted)" }}>
                                        {isExternalIP && <Shield className="w-3 h-3 inline mr-1" style={{ color: "#fb7185" }} />}
                                        {log.source_ip}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredLogs.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                                {logs.length === 0 ? "No API activity logs loaded. Load V2 engine data to see activity." : "No results matching search."}
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
