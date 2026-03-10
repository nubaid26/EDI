import { db } from "../db.js";

interface Attribution {
    service: string;
    resourceId: string;
    resourceName: string;
    ownerTag: string;
    region: string;
    costPerHour: number;
    estimatedWaste: number;
}

/**
 * Cost Attribution Engine — identifies WHICH resource/owner/service caused a cost impact.
 * Financial Waste Estimator — calculates Idle Hours × Resource Cost.
 */
export function attributeCost(resourceId: string, anomalyType: string): Attribution {
    const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(resourceId) as any;
    const recentMetrics = db.prepare(
        "SELECT cpu_utilization, gpu_utilization, cost_per_hour FROM metrics WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 10"
    ).all(resourceId) as any[];

    const avgCpu = avg(recentMetrics.map(m => m.cpu_utilization));
    const avgCost = avg(recentMetrics.map(m => m.cost_per_hour));

    // Financial Waste = estimated idle hours/month × cost/hour
    let idleFraction: number;
    if (anomalyType === "Orphaned Resource") {
        idleFraction = 1.0; // 100% wasted
    } else if (anomalyType === "Idle Resource" || anomalyType === "GPU Idle") {
        idleFraction = Math.max(0, (100 - avgCpu) / 100);
    } else {
        idleFraction = avgCpu < 10 ? 0.9 : avgCpu < 30 ? 0.5 : 0.1;
    }

    const monthlyHours = 720;
    const estimatedWaste = idleFraction * avgCost * monthlyHours;

    return {
        service: resource?.service || "Unknown",
        resourceId,
        resourceName: resource?.name || resourceId,
        ownerTag: resource?.owner_tag || "Unknown",
        region: resource?.region || "Unknown",
        costPerHour: avgCost,
        estimatedWaste: Math.round(estimatedWaste * 100) / 100,
    };
}

/**
 * Get top cost-wasting resources across the platform
 */
export function getTopWasteResources(limit = 10): Attribution[] {
    const resources = db.prepare("SELECT id FROM resources").all() as { id: string }[];
    const results: Attribution[] = [];

    for (const res of resources) {
        const metrics = db.prepare(
            "SELECT cpu_utilization, cost_per_hour FROM metrics WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 5"
        ).all(res.id) as any[];

        if (metrics.length < 3) continue;

        const avgCpu = avg(metrics.map(m => m.cpu_utilization));
        const avgCost = avg(metrics.map(m => m.cost_per_hour));

        if (avgCpu < 20 && avgCost > 0.05) {
            results.push(attributeCost(res.id, avgCpu < 5 ? "Idle Resource" : "Over-provisioned"));
        }
    }

    return results.sort((a, b) => b.estimatedWaste - a.estimatedWaste).slice(0, limit);
}

function avg(arr: number[]): number {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
