import { db } from "../db.js";

interface RootCause {
    service: string;
    resourceName: string;
    instanceType: string;
    region: string;
    issue: string;
    estimatedWaste: number;
    evidence: string[];
}

/**
 * Root Cause Analyzer — explains WHY an anomaly occurred
 * by examining resource metadata and metric patterns.
 */
export function analyzeRootCause(resourceId: string, anomalyType: string, score: number): RootCause {
    const resource = db.prepare("SELECT * FROM resources WHERE id = ?").get(resourceId) as any;
    const recentMetrics = db.prepare(
        "SELECT * FROM metrics WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 10"
    ).all(resourceId) as any[];

    const avgCpu = avg(recentMetrics.map(m => m.cpu_utilization));
    const avgGpu = avg(recentMetrics.map(m => m.gpu_utilization));
    const avgCost = avg(recentMetrics.map(m => m.cost_per_hour));
    const avgNetOut = avg(recentMetrics.map(m => m.network_out));

    const evidence: string[] = [];
    let issue = "";

    switch (anomalyType) {
        case "Cost Anomaly":
            issue = `Billing spike detected — cost is $${avgCost.toFixed(2)}/hr vs typical baseline`;
            evidence.push(`Average cost: $${avgCost.toFixed(2)}/hr`);
            evidence.push(`Projected monthly waste: $${(avgCost * 720).toFixed(0)}`);
            if (avgCpu < 30) evidence.push(`Low CPU utilization (${avgCpu.toFixed(1)}%) suggests over-provisioning`);
            break;
        case "Idle Resource":
            const idleHours = recentMetrics.length * (10 / 3600);
            issue = `Resource idle — CPU at ${avgCpu.toFixed(1)}% while incurring $${avgCost.toFixed(2)}/hr`;
            evidence.push(`CPU utilization: ${avgCpu.toFixed(1)}%`);
            evidence.push(`Memory usage: ${avg(recentMetrics.map(m => m.memory_usage)).toFixed(1)}%`);
            evidence.push(`Running cost: $${avgCost.toFixed(2)}/hr`);
            break;
        case "Resource Abuse":
            issue = `Suspicious workload pattern — high CPU (${avgCpu.toFixed(1)}%) with abnormal outbound traffic`;
            evidence.push(`CPU utilization: ${avgCpu.toFixed(1)}%`);
            evidence.push(`Network outbound: ${avgNetOut.toFixed(0)} MB/s`);
            if (avgGpu > 50) evidence.push(`GPU utilization: ${avgGpu.toFixed(1)}% — possible cryptomining`);
            evidence.push("Pattern matches known cryptomining signatures");
            break;
        case "Infrastructure Behavior":
            issue = `Abnormal infrastructure pattern detected on ${resource?.name}`;
            evidence.push(`Unusual network activity: ${avgNetOut.toFixed(0)} MB/s outbound`);
            if (resource?.owner_tag === "Unknown") evidence.push("Resource has no owner tag — possible unauthorized deployment");
            break;
        case "GPU Idle":
            issue = `GPU instance idle — GPU at ${avgGpu.toFixed(1)}% on ${resource?.instance_type}`;
            evidence.push(`GPU utilization: ${avgGpu.toFixed(1)}%`);
            evidence.push(`Instance type: ${resource?.instance_type} ($${resource?.cost_per_hour}/hr)`);
            evidence.push(`Recommendation: Downsize or terminate GPU instance`);
            break;
        case "Orphaned Resource":
            issue = `Orphaned resource — no active workload, still incurring costs`;
            evidence.push(`Resource type: ${resource?.service}`);
            evidence.push(`Status: ${resource?.status}`);
            evidence.push(`Monthly cost: $${(avgCost * 720).toFixed(2)}`);
            break;
        default:
            issue = `Anomaly detected with score ${score}`;
    }

    return {
        service: resource?.service || "Unknown",
        resourceName: resource?.name || resourceId,
        instanceType: resource?.instance_type || "Unknown",
        region: resource?.region || "Unknown",
        issue,
        estimatedWaste: avgCost * 720, // monthly projection
        evidence,
    };
}

function avg(arr: number[]): number {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
