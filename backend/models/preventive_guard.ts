import { db } from "../db.js";

interface PreventiveAlert {
    resourceId: string;
    resourceName: string;
    currentUtilization: number;
    predictedIdleDuration: number;
    potentialWaste: number;
    message: string;
}

/**
 * Preventive Cost Guard — predicts cost leaks BEFORE they happen
 * by analyzing utilization trends and projecting future waste.
 */
export function runPreventiveGuard(): PreventiveAlert[] {
    const resources = db.prepare("SELECT id, name, cost_per_hour FROM resources").all() as any[];
    const alerts: PreventiveAlert[] = [];

    const insertAlert = db.prepare(`
    INSERT INTO alerts (anomaly_id, severity, channel, title, message)
    VALUES (NULL, ?, 'dashboard', ?, ?)
  `);

    // Check for duplicate preventive alerts (avoid spam)
    const recentPreventive = db.prepare(
        "SELECT COUNT(*) as count FROM alerts WHERE title LIKE '%Preventive%' AND timestamp > datetime('now', '-30 minutes')"
    ).get() as { count: number };
    if (recentPreventive.count > 5) return alerts;

    for (const res of resources) {
        const metrics = db.prepare(`
      SELECT cpu_utilization, gpu_utilization, cost_per_hour, timestamp
      FROM metrics WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 20
    `).all(res.id) as any[];

        if (metrics.length < 10) continue;

        const recentAvgCpu = avg(metrics.slice(0, 5).map(m => m.cpu_utilization));
        const olderAvgCpu = avg(metrics.slice(10, 20).map(m => m.cpu_utilization));
        const avgCost = avg(metrics.map(m => m.cost_per_hour));

        // Trend: if utilization is declining, project forward
        const cpuTrend = recentAvgCpu - olderAvgCpu; // negative = declining

        if (cpuTrend < -10 && recentAvgCpu < 15 && avgCost > 0.1) {
            // Predict how long it will stay idle based on current trend
            const predictedIdleHours = Math.min(48, Math.abs(recentAvgCpu / (cpuTrend / 5)) * 5); // rough projection
            const potentialWaste = predictedIdleHours * avgCost;

            const alert: PreventiveAlert = {
                resourceId: res.id,
                resourceName: res.name,
                currentUtilization: recentAvgCpu,
                predictedIdleDuration: Math.round(predictedIdleHours),
                potentialWaste: Math.round(potentialWaste * 100) / 100,
                message: `CPU trending down to ${recentAvgCpu.toFixed(1)}%. Predicted idle for ~${Math.round(predictedIdleHours)}h. Potential waste: $${potentialWaste.toFixed(2)}`
            };

            alerts.push(alert);

            insertAlert.run("warning", `Preventive: ${res.name}`, alert.message);
        }

        // GPU waste prediction
        const recentAvgGpu = avg(metrics.slice(0, 5).map(m => m.gpu_utilization));
        if (recentAvgGpu < 5 && res.cost_per_hour > 2) {
            const potentialWaste = 8 * res.cost_per_hour; // 8-hour projection
            const alert: PreventiveAlert = {
                resourceId: res.id,
                resourceName: res.name,
                currentUtilization: recentAvgGpu,
                predictedIdleDuration: 8,
                potentialWaste,
                message: `GPU idle (${recentAvgGpu.toFixed(1)}%). Predicted waste: $${potentialWaste.toFixed(2)} over next 8 hours`
            };
            alerts.push(alert);
            insertAlert.run("warning", `Preventive GPU: ${res.name}`, alert.message);
        }
    }

    return alerts;
}

function avg(arr: number[]): number {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
