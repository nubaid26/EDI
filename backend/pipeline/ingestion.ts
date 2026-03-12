import { db } from "../db.js";

/**
 * Data Ingestion Pipeline
 * Stages: Data Cleaning → Feature Engineering → Storage
 */
export function ingestMetrics(
  resourceId: string,
  cpu: number,
  gpu: number,
  mem: number,
  disk: number,
  netIn: number,
  netOut: number,
  cost: number
) {
  // Stage 1: Data Cleaning — clamp to valid ranges
  cpu = clamp(cpu, 0, 100);
  gpu = clamp(gpu, 0, 100);
  mem = clamp(mem, 0, 100);
  disk = clamp(disk, 0, 10000);
  netIn = clamp(netIn, 0, 100000);
  netOut = clamp(netOut, 0, 100000);
  cost = Math.max(0, cost);

  // Stage 2: Store raw metrics
  db.prepare(`
    INSERT INTO metrics (resource_id, cpu_utilization, gpu_utilization, memory_usage, disk_io, network_in, network_out, cost_per_hour)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(resourceId, cpu, gpu, mem, disk, netIn, netOut, cost);

  // Mirror hourly cost into billing so the dashboard works in simulator mode too.
  const resource = db.prepare(`
    SELECT service FROM resources WHERE id = ?
  `).get(resourceId) as { service?: string } | undefined;

  db.prepare(`
    INSERT INTO billing (resource_id, service, cost_per_hour, total_cost, data_transfer_gb, storage_gb)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    resourceId,
    resource?.service || "Unknown",
    cost,
    cost,
    Math.round(((netOut + netIn) / 1024) * 100) / 100,
    0,
  );

  // Stage 3: Feature Engineering — compute derived features
  const history = db.prepare(`
    SELECT cpu_utilization, gpu_utilization, memory_usage, network_out, cost_per_hour
    FROM metrics WHERE resource_id = ? ORDER BY timestamp DESC LIMIT 10
  `).all(resourceId) as any[];

  if (history.length < 3) return;

  const avgCpu = avg(history.map(h => h.cpu_utilization));
  const avgGpu = avg(history.map(h => h.gpu_utilization));
  const avgNet = avg(history.map(h => h.network_out));
  const avgCost = avg(history.map(h => h.cost_per_hour));
  const maxNet = Math.max(...history.map(h => h.network_out));

  // Derived features
  const idleRatio = avgCpu < 100 ? (100 - avgCpu) / 100 : 0;
  const costPerCpuHour = avgCpu > 0 ? avgCost / (avgCpu / 100) : avgCost * 100;
  const networkSpikeRatio = avgNet > 0 ? maxNet / avgNet : 0;
  const gpuUtilizationRatio = avgGpu / 100;

  // Cost growth rate: compare recent vs older
  const recentCost = avg(history.slice(0, Math.min(3, history.length)).map(h => h.cost_per_hour));
  const olderCost = avg(history.slice(-3).map(h => h.cost_per_hour));
  const costGrowthRate = olderCost > 0 ? (recentCost - olderCost) / olderCost : 0;

  const runtimeHours = history.length * (10 / 3600); // ~10s intervals

  db.prepare(`
    INSERT INTO features (resource_id, idle_ratio, cost_per_cpu_hour, network_spike_ratio, cost_growth_rate, runtime_hours, gpu_utilization_ratio)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(resourceId, idleRatio, costPerCpuHour, networkSpikeRatio, costGrowthRate, runtimeHours, gpuUtilizationRatio);

  // Periodic cleanup: purge old rows to prevent unbounded DB growth
  cleanupCounter++;
  if (cleanupCounter >= 50) {
    cleanupCounter = 0;
    db.prepare("DELETE FROM metrics WHERE timestamp < datetime('now', '-2 hours')").run();
    db.prepare("DELETE FROM billing WHERE timestamp < datetime('now', '-2 hours')").run();
    db.prepare("DELETE FROM features WHERE timestamp < datetime('now', '-2 hours')").run();
  }
}

let cleanupCounter = 0;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, isNaN(v) ? min : v));
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
