import { db } from "../db.js";

interface RiskResult {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Signal Fusion Engine — combines outputs from all detection models
 * Formula: 0.4 × Cost + 0.3 × Resource + 0.2 × Behavior + 0.1 × Abuse
 */
export function calculateRiskScore(resourceId: string): number {
  const anomalies = db.prepare(`
    SELECT type, score FROM anomalies
    WHERE resource_id = ? AND timestamp > datetime('now', '-1 hour')
  `).all(resourceId) as { type: string; score: number }[];

  let costScore = 0, resourceScore = 0, behaviorScore = 0, abuseScore = 0;

  for (const a of anomalies) {
    switch (a.type) {
      case "Cost Anomaly": costScore = Math.max(costScore, a.score); break;
      case "Idle Resource":
      case "GPU Idle":
      case "Orphaned Resource": resourceScore = Math.max(resourceScore, a.score); break;
      case "Infrastructure Behavior": behaviorScore = Math.max(behaviorScore, a.score); break;
      case "Resource Abuse": abuseScore = Math.max(abuseScore, a.score); break;
    }
  }

  const finalScore = 0.4 * costScore + 0.3 * resourceScore + 0.2 * behaviorScore + 0.1 * abuseScore;
  return Math.min(100, Math.round(finalScore));
}

/**
 * Get risk result with level classification
 */
export function getRiskResult(resourceId: string): RiskResult {
  const score = calculateRiskScore(resourceId);
  const level = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
  return { score, level };
}

/**
 * Get risk scores for all resources
 */
export function getAllRiskScores(): Array<{ resourceId: string; resourceName: string; provider: string; score: number; level: string }> {
  const resources = db.prepare("SELECT id, name, provider FROM resources").all() as any[];
  return resources.map(r => {
    const { score, level } = getRiskResult(r.id);
    return { resourceId: r.id, resourceName: r.name, provider: r.provider, score, level };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
}
