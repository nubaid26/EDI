import express from "express";
import { db } from "../db.js";
import { getTopWasteResources } from "../models/cost_attribution.js";

const router = express.Router();

function toUiAnomalyType(type?: string | null): string {
  switch ((type || "").toLowerCase()) {
    case "cost anomaly":
      return "cost_spike";
    case "idle resource":
      return "idle_gpu";
    case "resource abuse":
      return "cryptomining";
    case "infrastructure behavior":
      return "abnormal_egress";
    case "gpu idle":
      return "idle_gpu";
    case "orphaned resource":
      return "orphaned_resource";
    default:
      return (type || "normal").toLowerCase().replace(/\s+/g, "_");
  }
}

// === Dashboard Stats ===
router.get("/dashboard-stats", (_req, res) => {
  try {
    const totalResources = (db.prepare("SELECT COUNT(*) as c FROM resources").get() as any).c;
    const totalAnomalies = (db.prepare("SELECT COUNT(*) as c FROM anomalies").get() as any).c;
    const totalWaste = (db.prepare("SELECT COALESCE(SUM(estimated_waste), 0) as t FROM anomalies").get() as any).t;
    const totalSavings = (db.prepare("SELECT COALESCE(SUM(estimated_savings), 0) as t FROM recommendations WHERE status = 'completed'").get() as any).t;
    const pendingRecs = (db.prepare("SELECT COUNT(*) as c FROM recommendations WHERE status = 'pending'").get() as any).c;
    const activeAlerts = (db.prepare("SELECT COUNT(*) as c FROM alerts WHERE acknowledged = 0").get() as any).c;

    // Risk score = weighted by high-risk anomalies
    const highRisk = (db.prepare("SELECT COUNT(*) as c FROM anomalies WHERE score > 80 AND timestamp > datetime('now', '-1 hour')").get() as any).c;
    const riskScore = Math.min(100, Math.round((highRisk / Math.max(totalResources, 1)) * 200));

    // Provider breakdown
    const providers = db.prepare(
      "SELECT provider, COUNT(*) as count FROM resources GROUP BY provider"
    ).all();

    // Anomaly type distribution
    const anomalyTypes = db.prepare(
      "SELECT type, COUNT(*) as count FROM anomalies GROUP BY type ORDER BY count DESC"
    ).all();

    res.json({
      totalResources, totalAnomalies, totalWaste, totalSavings,
      pendingRecommendations: pendingRecs, activeAlerts, riskScore,
      providerBreakdown: providers, anomalyTypeDistribution: anomalyTypes,
    });
  } catch (err) {
    console.error("[API] /dashboard-stats error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// === Resources ===
router.get("/resources", (_req, res) => {
  try {
    const resources = db.prepare(`
      SELECT
        r.*,
        (
          SELECT a.type
          FROM anomalies a
          WHERE a.resource_id = r.id
          ORDER BY a.timestamp DESC, a.id DESC
          LIMIT 1
        ) AS latest_anomaly_type,
        (
          SELECT a.estimated_waste
          FROM anomalies a
          WHERE a.resource_id = r.id
          ORDER BY a.timestamp DESC, a.id DESC
          LIMIT 1
        ) AS estimated_waste
      FROM resources r
      ORDER BY r.provider, r.name
    `).all() as any[];

    res.json(resources.map((resource) => ({
      ...resource,
      anomaly_type: toUiAnomalyType(resource.latest_anomaly_type),
    })));
  } catch (err) {
    console.error("[API] /resources error:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

// === Dashboard support: CPU metrics sample ===
// BUG FIX: This static route MUST be registered BEFORE the parameterized /metrics/:resourceId
router.get("/metrics/sample", (_req, res) => {
  try {
    const metrics = db.prepare(
      "SELECT * FROM metrics ORDER BY timestamp DESC LIMIT 50"
    ).all();
    res.json(metrics.reverse());
  } catch (err) {
    console.error("[API] /metrics/sample error:", err);
    res.status(500).json({ error: "Failed to fetch metrics sample" });
  }
});

// === Metrics for a resource ===
router.get("/metrics/:resourceId", (req, res) => {
  try {
    const metrics = db.prepare(
      "SELECT * FROM metrics WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 50"
    ).all(req.params.resourceId);
    res.json(metrics);
  } catch (err) {
    console.error("[API] /metrics/:resourceId error:", err);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// === Features for a resource ===
router.get("/features/:resourceId", (req, res) => {
  try {
    const features = db.prepare(
      "SELECT * FROM features WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 20"
    ).all(req.params.resourceId);
    res.json(features);
  } catch (err) {
    console.error("[API] /features/:resourceId error:", err);
    res.status(500).json({ error: "Failed to fetch features" });
  }
});

// === Anomalies ===
router.get("/anomalies", (_req, res) => {
  try {
    const anomalies = db.prepare(`
      SELECT a.*, r.name as resource_name, r.provider, r.service, r.instance_type, r.region
      FROM anomalies a JOIN resources r ON a.resource_id = r.id
      ORDER BY a.timestamp DESC LIMIT 100
    `).all();
    res.json(anomalies);
  } catch (err) {
    console.error("[API] /anomalies error:", err);
    res.status(500).json({ error: "Failed to fetch anomalies" });
  }
});

// === Root Cause for specific anomaly ===
router.get("/root-cause/:anomalyId", (req, res) => {
  try {
    const anomaly = db.prepare("SELECT root_cause FROM anomalies WHERE id = ?").get(req.params.anomalyId) as any;
    if (!anomaly?.root_cause) return res.json(null);
    try {
      res.json(JSON.parse(anomaly.root_cause));
    } catch {
      res.json({ raw: anomaly.root_cause });
    }
  } catch (err) {
    console.error("[API] /root-cause/:anomalyId error:", err);
    res.status(500).json({ error: "Failed to fetch root cause" });
  }
});

// === Alerts ===
router.get("/alerts", (_req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT
        al.*,
        a.type as anomaly_type,
        a.score,
        a.resource_id,
        a.estimated_waste,
        r.name as resource_name,
        r.provider,
        r.service
      FROM alerts al
      LEFT JOIN anomalies a ON al.anomaly_id = a.id
      LEFT JOIN resources r ON a.resource_id = r.id
      ORDER BY al.timestamp DESC LIMIT 100
    `).all() as any[];

    res.json(alerts.map((alert) => ({
      ...alert,
      anomaly_type: toUiAnomalyType(alert.anomaly_type),
    })));
  } catch (err) {
    console.error("[API] /alerts error:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

const acknowledgeAlert = (req: express.Request, res: express.Response) => {
  try {
    db.prepare("UPDATE alerts SET acknowledged = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("[API] /alerts/:id/acknowledge error:", err);
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
};

router.post("/alerts/:id/acknowledge", acknowledgeAlert);
router.patch("/alerts/:id/acknowledge", acknowledgeAlert);

// === Provider Cost Breakdown ===
router.get("/provider-breakdown", (_req, res) => {
  try {
    const breakdown = db.prepare(`
      SELECT r.provider,
        COUNT(DISTINCT r.id) as resource_count,
        COALESCE(SUM(m.cost_per_hour), 0) as total_cost
      FROM resources r
      LEFT JOIN (
        SELECT resource_id, cost_per_hour FROM metrics
        WHERE timestamp > datetime('now', '-1 hour')
      ) m ON r.id = m.resource_id
      GROUP BY r.provider
    `).all();
    res.json(breakdown);
  } catch (err) {
    console.error("[API] /provider-breakdown error:", err);
    res.status(500).json({ error: "Failed to fetch provider breakdown" });
  }
});

// === Top Waste Resources ===
router.get("/top-waste", (_req, res) => {
  try {
    res.json(getTopWasteResources());
  } catch (err) {
    console.error("[API] /top-waste error:", err);
    res.status(500).json({ error: "Failed to fetch top waste resources" });
  }
});

// === Recommendations ===
router.get("/recommendations", (_req, res) => {
  try {
    const recommendations = db.prepare(`
      SELECT rec.*, a.type as anomaly_type, a.description as anomaly_description,
             a.score as anomaly_score, r.name as resource_name, r.provider, r.service
      FROM recommendations rec
      JOIN anomalies a ON rec.anomaly_id = a.id
      JOIN resources r ON a.resource_id = r.id
      ORDER BY rec.timestamp DESC LIMIT 100
    `).all();
    res.json(recommendations);
  } catch (err) {
    console.error("[API] /recommendations error:", err);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// === Remediation ===
router.post("/remediate/:recommendationId", (req, res) => {
  try {
    db.prepare("UPDATE recommendations SET status = 'completed' WHERE id = ?").run(req.params.recommendationId);
    res.json({ success: true, message: "Remediation applied successfully" });
  } catch (err) {
    console.error("[API] /remediate/:recommendationId error:", err);
    res.status(500).json({ error: "Failed to apply remediation" });
  }
});

// === Preventive Alerts ===
router.get("/preventive-alerts", (_req, res) => {
  try {
    const alerts = db.prepare(
      "SELECT * FROM alerts WHERE title LIKE '%Preventive%' ORDER BY timestamp DESC LIMIT 50"
    ).all();
    res.json(alerts);
  } catch (err) {
    console.error("[API] /preventive-alerts error:", err);
    res.status(500).json({ error: "Failed to fetch preventive alerts" });
  }
});

// === Cloud Accounts ===
router.get("/cloud-accounts", (_req, res) => {
  try {
    res.json(db.prepare("SELECT * FROM cloud_accounts").all());
  } catch (err) {
    console.error("[API] /cloud-accounts error:", err);
    res.status(500).json({ error: "Failed to fetch cloud accounts" });
  }
});

// === Billing Timeline for a resource ===
router.get("/billing/:resourceId", (req, res) => {
  try {
    const billing = db.prepare(
      "SELECT * FROM billing WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 200"
    ).all(req.params.resourceId);
    res.json(billing);
  } catch (err) {
    console.error("[API] /billing/:resourceId error:", err);
    res.status(500).json({ error: "Failed to fetch billing data" });
  }
});

// === Billing Summary by provider/service ===
router.get("/billing-summary", (_req, res) => {
  try {
    const byProvider = db.prepare(`
      SELECT r.provider,
        COUNT(DISTINCT b.resource_id) as resource_count,
        COALESCE(SUM(b.cost_per_hour), 0) as total_cost,
        COALESCE(SUM(b.data_transfer_gb), 0) as total_transfer_gb
      FROM billing b
      JOIN resources r ON b.resource_id = r.id
      GROUP BY r.provider
    `).all();

    const byService = db.prepare(`
      SELECT service, COUNT(*) as rows, COALESCE(SUM(cost_per_hour), 0) as total_cost
      FROM billing GROUP BY service ORDER BY total_cost DESC
    `).all();

    const topSpenders = db.prepare(`
      SELECT b.resource_id, r.name as resource_name, r.provider, r.instance_type,
        COALESCE(SUM(b.cost_per_hour), 0) as total_spend,
        MAX(b.total_cost) as cumulative_cost
      FROM billing b
      JOIN resources r ON b.resource_id = r.id
      GROUP BY b.resource_id
      ORDER BY total_spend DESC LIMIT 15
    `).all();

    const totalSpend = db.prepare("SELECT COALESCE(SUM(cost_per_hour), 0) as t FROM billing").get() as any;

    res.json({ byProvider, byService, topSpenders, totalSpend: totalSpend.t });
  } catch (err) {
    console.error("[API] /billing-summary error:", err);
    res.status(500).json({ error: "Failed to fetch billing summary" });
  }
});

// === API Activity Logs ===
router.get("/api-logs", (_req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM api_logs ORDER BY timestamp DESC LIMIT 200
    `).all();
    res.json(logs);
  } catch (err) {
    console.error("[API] /api-logs error:", err);
    res.status(500).json({ error: "Failed to fetch API logs" });
  }
});

// === Suspicious API Activity ===
router.get("/api-logs/suspicious", (_req, res) => {
  try {
    const suspicious = db.prepare(`
      SELECT * FROM api_logs
      WHERE status = 'Failed'
         OR action IN ('create_access_key', 'assume_role')
         OR region IN ('ap-east-1', 'af-south-1')
         OR source_ip LIKE '185.%'
      ORDER BY timestamp DESC LIMIT 100
    `).all();

    const userBreakdown = db.prepare(`
      SELECT user_id, COUNT(*) as total_actions,
        SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN action = 'launch_instance' THEN 1 ELSE 0 END) as launches
      FROM api_logs GROUP BY user_id ORDER BY failed_count DESC
    `).all();

    res.json({ suspicious, userBreakdown });
  } catch (err) {
    console.error("[API] /api-logs/suspicious error:", err);
    res.status(500).json({ error: "Failed to fetch suspicious API activity" });
  }
});

// === Dashboard support: Cost timeline ===
router.get("/cost-timeline", (_req, res) => {
  try {
    const costs = db.prepare(`
      SELECT timestamp, COALESCE(SUM(cost_per_hour), 0) as total_cost
      FROM billing GROUP BY timestamp ORDER BY timestamp DESC LIMIT 50
    `).all();
    res.json(costs.reverse());
  } catch (err) {
    console.error("[API] /cost-timeline error:", err);
    res.status(500).json({ error: "Failed to fetch cost timeline" });
  }
});

// === Dashboard support: Risk scores table ===
router.get("/risk-scores", (_req, res) => {
  try {
    const resources = db.prepare(`
      SELECT r.id as resource_id, r.provider, r.name, r.instance_type,
        r.cost_per_hour, r.status
      FROM resources r ORDER BY r.cost_per_hour DESC LIMIT 15
    `).all() as any[];

    // Compute risk scores from latest metrics
    const results = resources.map(r => {
      const latest = db.prepare(
        "SELECT AVG(cpu_utilization) as cpu, AVG(network_out) as net FROM metrics WHERE resource_id = ?"
      ).get(r.resource_id) as any;

      const cpu_avg = latest?.cpu || 0;
      const net_avg = latest?.net || 0;
      const latestAnomaly = db.prepare(
        "SELECT type FROM anomalies WHERE resource_id = ? ORDER BY timestamp DESC, id DESC LIMIT 1"
      ).get(r.resource_id) as { type?: string } | undefined;
      const anomalyType = latestAnomaly?.type
        ? toUiAnomalyType(latestAnomaly.type)
        : cpu_avg > 90
          ? "cryptomining"
          : cpu_avg < 5
            ? "idle_gpu"
            : r.status === "available"
              ? "orphaned_resource"
              : "normal";
      const weights: Record<string, number> = { cryptomining: 1, idle_gpu: 0.6, orphaned_resource: 0.35, normal: 0 };
      const risk_score = Math.round((0.4 * (cpu_avg / 100) + 0.3 * Math.min(net_avg / 100, 1) + 0.2 * (weights[anomalyType] || 0) + 0.1 * Math.min(r.cost_per_hour / 5, 1)) * 100);
      const risk_level = risk_score >= 60 ? "HIGH" : risk_score >= 30 ? "MEDIUM" : "LOW";

      return { ...r, anomaly_type: anomalyType, risk_score, risk_level };
    });

    results.sort((a, b) => b.risk_score - a.risk_score);
    res.json(results);
  } catch (err) {
    console.error("[API] /risk-scores error:", err);
    res.status(500).json({ error: "Failed to fetch risk scores" });
  }
});

// === Billing timeline for 30-day chart ===
router.get("/billing-timeline", (_req, res) => {
  try {
    const timeline = db.prepare(`
      SELECT substr(timestamp, 1, 10) as date,
        SUM(cost_per_hour) as daily_cost,
        MAX(total_cost) as cumulative_cost
      FROM billing
      GROUP BY substr(timestamp, 1, 10)
      ORDER BY date ASC
      LIMIT 30
    `).all();
    res.json(timeline);
  } catch (err) {
    console.error("[API] /billing-timeline error:", err);
    res.status(500).json({ error: "Failed to fetch billing timeline" });
  }
});

export default router;
