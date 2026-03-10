import express from "express";
import { db } from "../db.js";
import { getAllRiskScores } from "../fusion_engine/scorer.js";
import { getTopWasteResources } from "../models/cost_attribution.js";

const router = express.Router();

// === Dashboard Stats ===
router.get("/dashboard-stats", (_req, res) => {
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
});

// === Resources ===
router.get("/resources", (_req, res) => {
  const resources = db.prepare("SELECT * FROM resources ORDER BY provider, name").all();
  res.json(resources);
});

// === Metrics for a resource ===
router.get("/metrics/:resourceId", (req, res) => {
  const metrics = db.prepare(
    "SELECT * FROM metrics WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 50"
  ).all(req.params.resourceId);
  res.json(metrics);
});

// === Features for a resource ===
router.get("/features/:resourceId", (req, res) => {
  const features = db.prepare(
    "SELECT * FROM features WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 20"
  ).all(req.params.resourceId);
  res.json(features);
});

// === Anomalies ===
router.get("/anomalies", (_req, res) => {
  const anomalies = db.prepare(`
    SELECT a.*, r.name as resource_name, r.provider, r.service, r.instance_type, r.region
    FROM anomalies a JOIN resources r ON a.resource_id = r.id
    ORDER BY a.timestamp DESC LIMIT 100
  `).all();
  res.json(anomalies);
});

// === Root Cause for specific anomaly ===
router.get("/root-cause/:anomalyId", (req, res) => {
  const anomaly = db.prepare("SELECT root_cause FROM anomalies WHERE id = ?").get(req.params.anomalyId) as any;
  if (!anomaly?.root_cause) return res.json(null);
  try {
    res.json(JSON.parse(anomaly.root_cause));
  } catch {
    res.json({ raw: anomaly.root_cause });
  }
});

// === Alerts ===
router.get("/alerts", (_req, res) => {
  const alerts = db.prepare(`
    SELECT al.*, a.type as anomaly_type, a.score, a.resource_id, r.name as resource_name, r.provider, r.service
    FROM alerts al
    LEFT JOIN anomalies a ON al.anomaly_id = a.id
    LEFT JOIN resources r ON a.resource_id = r.id
    ORDER BY al.timestamp DESC LIMIT 100
  `).all();
  res.json(alerts);
});

router.post("/alerts/:id/acknowledge", (req, res) => {
  db.prepare("UPDATE alerts SET acknowledged = 1 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// === Risk Scores ===
router.get("/risk-scores", (_req, res) => {
  res.json(getAllRiskScores());
});

// === Cost Timeline (last N metrics aggregated) ===
router.get("/cost-timeline", (_req, res) => {
  const timeline = db.prepare(`
    SELECT
      strftime('%Y-%m-%d %H:%M', timestamp, 'localtime') as period,
      SUM(cost_per_hour) as total_cost,
      AVG(cpu_utilization) as avg_cpu,
      COUNT(DISTINCT resource_id) as resource_count
    FROM metrics
    GROUP BY strftime('%Y-%m-%d %H:%M', timestamp)
    ORDER BY period DESC LIMIT 30
  `).all();
  res.json(timeline.reverse());
});

// === Provider Cost Breakdown ===
router.get("/provider-breakdown", (_req, res) => {
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
});

// === Top Waste Resources ===
router.get("/top-waste", (_req, res) => {
  res.json(getTopWasteResources());
});

// === Recommendations ===
router.get("/recommendations", (_req, res) => {
  const recommendations = db.prepare(`
    SELECT rec.*, a.type as anomaly_type, a.description as anomaly_description,
           a.score as anomaly_score, r.name as resource_name, r.provider, r.service
    FROM recommendations rec
    JOIN anomalies a ON rec.anomaly_id = a.id
    JOIN resources r ON a.resource_id = r.id
    ORDER BY rec.timestamp DESC LIMIT 100
  `).all();
  res.json(recommendations);
});

// === Remediation ===
router.post("/remediate/:recommendationId", (req, res) => {
  db.prepare("UPDATE recommendations SET status = 'completed' WHERE id = ?").run(req.params.recommendationId);
  res.json({ success: true, message: "Remediation applied successfully" });
});

// === Preventive Alerts ===
router.get("/preventive-alerts", (_req, res) => {
  const alerts = db.prepare(
    "SELECT * FROM alerts WHERE title LIKE '%Preventive%' ORDER BY timestamp DESC LIMIT 50"
  ).all();
  res.json(alerts);
});

// === Cloud Accounts ===
router.get("/cloud-accounts", (_req, res) => {
  res.json(db.prepare("SELECT * FROM cloud_accounts").all());
});

// === Billing Timeline for a resource ===
router.get("/billing/:resourceId", (req, res) => {
  const billing = db.prepare(
    "SELECT * FROM billing WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 200"
  ).all(req.params.resourceId);
  res.json(billing);
});

// === Billing Summary by provider/service ===
router.get("/billing-summary", (_req, res) => {
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
});

// === API Activity Logs ===
router.get("/api-logs", (_req, res) => {
  const logs = db.prepare(`
    SELECT * FROM api_logs ORDER BY timestamp DESC LIMIT 200
  `).all();
  res.json(logs);
});

// === Suspicious API Activity ===
router.get("/api-logs/suspicious", (_req, res) => {
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
});

export default router;

