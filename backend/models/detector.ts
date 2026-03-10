import { db } from "../db.js";
import { calculateRiskScore } from "../fusion_engine/scorer.js";
import { analyzeRootCause } from "./root_cause.js";
import { attributeCost } from "./cost_attribution.js";

/**
 * CloudGuard AI Detection Engine — runs all 4 detection models
 * Model 1: Cost Anomaly (threshold-based Prophet simulation)
 * Model 2: Resource Behavior / Idle Detection (Isolation Forest simulation)
 * Model 3: Resource Abuse / Cryptomining (XGBoost simulation)
 * Model 4: Infrastructure Behavior (DBSCAN simulation)
 * + GPU Idle Detection
 * + Orphaned Resource Detection
 */
export function runDetection() {
  console.log("Running CloudGuard AI Detection Engine...");

  const resources = db.prepare("SELECT * FROM resources").all() as any[];

  const insertAnomaly = db.prepare(`
    INSERT INTO anomalies (resource_id, type, score, risk_level, description, root_cause, attributed_service, attributed_owner, estimated_waste)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAlert = db.prepare(`
    INSERT INTO alerts (anomaly_id, severity, channel, title, message) VALUES (?, ?, 'dashboard', ?, ?)
  `);

  const hasRecentAnomaly = (resourceId: string, type: string): boolean => {
    const row = db.prepare(
      "SELECT COUNT(*) as c FROM anomalies WHERE resource_id = ? AND type = ? AND timestamp > datetime('now', '-1 hour')"
    ).get(resourceId, type) as { c: number };
    return row.c > 0;
  };

  db.transaction(() => {
    for (const res of resources) {
      const metrics = db.prepare(
        "SELECT * FROM metrics WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 10"
      ).all(res.id) as any[];

      if (metrics.length < 5) continue;

      const avgCpu = avg(metrics.map(m => m.cpu_utilization));
      const avgGpu = avg(metrics.map(m => m.gpu_utilization));
      const avgNetOut = avg(metrics.map(m => m.network_out));
      const avgCost = avg(metrics.map(m => m.cost_per_hour));
      const avgMem = avg(metrics.map(m => m.memory_usage));
      const maxCost = Math.max(...metrics.map(m => m.cost_per_hour));

      // --- Model 1: Cost Anomaly Detection ---
      if (avgCost > 12 && !hasRecentAnomaly(res.id, "Cost Anomaly")) {
        const score = Math.min(100, 60 + (avgCost - 12) * 3);
        const rca = analyzeRootCause(res.id, "Cost Anomaly", score);
        const attr = attributeCost(res.id, "Cost Anomaly");
        const riskLevel = score > 60 ? "HIGH" : score > 30 ? "MEDIUM" : "LOW";

        const info = insertAnomaly.run(
          res.id, "Cost Anomaly", score, riskLevel,
          `Billing spike on ${res.name}: $${avgCost.toFixed(2)}/hr (max $${maxCost.toFixed(2)}/hr)`,
          JSON.stringify(rca), attr.service, attr.ownerTag, attr.estimatedWaste
        );
        insertAlert.run(info.lastInsertRowid, riskLevel === "HIGH" ? "critical" : "high", `Cost Anomaly: ${res.name}`,
          `Cost spike detected: $${avgCost.toFixed(2)}/hr. Est. monthly waste: $${attr.estimatedWaste.toFixed(0)}`);
      }

      // --- Model 2: Idle Resource Detection ---
      if (avgCpu < 5 && avgCost > 0.1 && !hasRecentAnomaly(res.id, "Idle Resource")) {
        const score = Math.min(100, 70 + (5 - avgCpu) * 5);
        const rca = analyzeRootCause(res.id, "Idle Resource", score);
        const attr = attributeCost(res.id, "Idle Resource");
        const riskLevel = score > 60 ? "HIGH" : "MEDIUM";

        const info = insertAnomaly.run(
          res.id, "Idle Resource", score, riskLevel,
          `${res.name} idle — CPU ${avgCpu.toFixed(1)}%, costing $${avgCost.toFixed(2)}/hr`,
          JSON.stringify(rca), attr.service, attr.ownerTag, attr.estimatedWaste
        );
        insertAlert.run(info.lastInsertRowid, "high", `Idle Resource: ${res.name}`,
          `CPU at ${avgCpu.toFixed(1)}%. Est. monthly waste: $${attr.estimatedWaste.toFixed(0)}`);
      }

      // --- Model 3: Resource Abuse / Cryptomining ---
      if (avgCpu > 90 && avgNetOut > 3500 && !hasRecentAnomaly(res.id, "Resource Abuse")) {
        const score = Math.min(100, 85 + (avgNetOut / 1000));
        const rca = analyzeRootCause(res.id, "Resource Abuse", score);
        const attr = attributeCost(res.id, "Resource Abuse");
        const riskLevel = "HIGH";

        const info = insertAnomaly.run(
          res.id, "Resource Abuse", score, riskLevel,
          `Cryptomining pattern on ${res.name}: CPU ${avgCpu.toFixed(1)}%, net out ${avgNetOut.toFixed(0)} MB/s`,
          JSON.stringify(rca), attr.service, attr.ownerTag, avgCost * 168 // weekly
        );
        insertAlert.run(info.lastInsertRowid, "critical", `Security Threat: ${res.name}`,
          `Possible cryptomining detected. CPU ${avgCpu.toFixed(1)}%, outbound ${avgNetOut.toFixed(0)} MB/s`);
      }

      // --- Model 4: Infrastructure Behavior ---
      if (avgNetOut > 500 && res.owner_tag === "Unknown" && !hasRecentAnomaly(res.id, "Infrastructure Behavior")) {
        const score = 65 + Math.random() * 15;
        const rca = analyzeRootCause(res.id, "Infrastructure Behavior", score);
        const attr = attributeCost(res.id, "Infrastructure Behavior");

        const info = insertAnomaly.run(
          res.id, "Infrastructure Behavior", score, "MEDIUM",
          `Abnormal infra pattern on ${res.name} — untagged resource with unusual network activity`,
          JSON.stringify(rca), attr.service, attr.ownerTag, 0
        );
        insertAlert.run(info.lastInsertRowid, "medium", `Infra Anomaly: ${res.name}`,
          `Untagged resource with unusual activity detected`);
      }

      // --- GPU Idle Detection ---
      if (avgGpu < 5 && res.cost_per_hour > 2 && !hasRecentAnomaly(res.id, "GPU Idle")) {
        const score = 80;
        const rca = analyzeRootCause(res.id, "GPU Idle", score);
        const attr = attributeCost(res.id, "GPU Idle");

        const info = insertAnomaly.run(
          res.id, "GPU Idle", score, "HIGH",
          `GPU idle on ${res.name} (${res.instance_type}) — GPU at ${avgGpu.toFixed(1)}%, costing $${res.cost_per_hour}/hr`,
          JSON.stringify(rca), attr.service, attr.ownerTag, attr.estimatedWaste
        );
        insertAlert.run(info.lastInsertRowid, "high", `GPU Idle: ${res.name}`,
          `GPU at ${avgGpu.toFixed(1)}% on $${res.cost_per_hour}/hr instance. Monthly waste: $${attr.estimatedWaste.toFixed(0)}`);
      }

      // --- Orphaned Resource Detection ---
      if (avgCpu === 0 && avgMem === 0 && avgCost > 0 && !hasRecentAnomaly(res.id, "Orphaned Resource")) {
        const rca = analyzeRootCause(res.id, "Orphaned Resource", 75);
        const attr = attributeCost(res.id, "Orphaned Resource");

        const info = insertAnomaly.run(
          res.id, "Orphaned Resource", 75, "MEDIUM",
          `Orphaned ${res.service}: ${res.name} — zero utilization, costing $${(avgCost * 720).toFixed(2)}/month`,
          JSON.stringify(rca), attr.service, attr.ownerTag, attr.estimatedWaste
        );
        insertAlert.run(info.lastInsertRowid, "medium", `Orphaned: ${res.name}`,
          `Zero utilization. Monthly cost: $${(avgCost * 720).toFixed(2)}`);
      }

      // Calculate fused risk score
      const fusedScore = calculateRiskScore(res.id);
      if (fusedScore > 0) {
        console.log(`[CloudGuard] ${res.name} Risk: ${fusedScore}/100`);
      }
    }
  })();
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
