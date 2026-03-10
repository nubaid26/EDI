import { db } from "../db.js";
import { ingestMetrics } from "../pipeline/ingestion.js";

// Resource behavior profiles for realistic simulation
const PROFILES: Record<string, () => { cpu: number; gpu: number; mem: number; disk: number; netIn: number; netOut: number; cost: number }> = {
  // Normal healthy workloads
  normal: () => ({
    cpu: 30 + Math.random() * 40,
    gpu: 0,
    mem: 40 + Math.random() * 30,
    disk: 10 + Math.random() * 50,
    netIn: 50 + Math.random() * 200,
    netOut: 50 + Math.random() * 200,
    cost: 0.5 + Math.random() * 2,
  }),
  // Idle resource — low everything, still costing money
  idle: () => ({
    cpu: Math.random() * 3,
    gpu: 0,
    mem: 5 + Math.random() * 8,
    disk: Math.random() * 2,
    netIn: Math.random() * 5,
    netOut: Math.random() * 5,
    cost: 1.2,
  }),
  // Cryptomining — sustained high CPU + high outbound
  cryptomining: () => ({
    cpu: 92 + Math.random() * 8,
    gpu: Math.random() > 0.5 ? 85 + Math.random() * 15 : 0,
    mem: 70 + Math.random() * 20,
    disk: Math.random() * 10,
    netIn: Math.random() * 100,
    netOut: 4000 + Math.random() * 6000,
    cost: 2.8,
  }),
  // Cost spike — sudden billing anomaly
  costSpike: () => ({
    cpu: 40 + Math.random() * 30,
    gpu: 0,
    mem: 50 + Math.random() * 20,
    disk: 20 + Math.random() * 30,
    netIn: 100 + Math.random() * 500,
    netOut: 100 + Math.random() * 500,
    cost: 20 + Math.random() * 15,
  }),
  // GPU idle — GPU instance barely used
  gpuIdle: () => ({
    cpu: 5 + Math.random() * 10,
    gpu: Math.random() * 3,
    mem: 15 + Math.random() * 10,
    disk: Math.random() * 5,
    netIn: Math.random() * 20,
    netOut: Math.random() * 20,
    cost: 3.5,
  }),
  // Orphaned — zero activity, minimal cost
  orphaned: () => ({
    cpu: 0, gpu: 0, mem: 0, disk: 0, netIn: 0, netOut: 0,
    cost: 0.08,
  }),
  // Over-provisioned — low utilization on expensive instance
  overProvisioned: () => ({
    cpu: 8 + Math.random() * 12,
    gpu: 0,
    mem: 10 + Math.random() * 15,
    disk: 5 + Math.random() * 10,
    netIn: 20 + Math.random() * 50,
    netOut: 20 + Math.random() * 50,
    cost: 1.92,
  }),
};

// Map resources to their behavior profiles with anomaly probability
const RESOURCE_BEHAVIORS: Record<string, { profile: string; anomalyProfile?: string; anomalyChance: number }> = {
  "i-0abcd1234efgh5678": { profile: "normal", anomalyProfile: "cryptomining", anomalyChance: 0.2 },
  "i-0987654321abcdef0": { profile: "normal", anomalyChance: 0 },
  "i-0deadbeef12345678": { profile: "idle", anomalyChance: 0 },
  "i-0aaa111122223333": { profile: "normal", anomalyProfile: "costSpike", anomalyChance: 0.1 },
  "vol-0abc123def456789": { profile: "orphaned", anomalyChance: 0 },
  "elb-prod-legacy-001": { profile: "orphaned", anomalyChance: 0 },
  "snap-0aabbcc1122334455": { profile: "orphaned", anomalyChance: 0 },
  "aks-agentpool-12345678-vmss000000": { profile: "overProvisioned", anomalyChance: 0 },
  "aks-agentpool-12345678-vmss000001": { profile: "normal", anomalyChance: 0 },
  "vm-analytics-prod-01": { profile: "normal", anomalyProfile: "costSpike", anomalyChance: 0.1 },
  "disk-unattached-001": { profile: "orphaned", anomalyChance: 0 },
  "gce-instance-abc1": { profile: "normal", anomalyProfile: "costSpike", anomalyChance: 0.1 },
  "gce-instance-gpu1": { profile: "gpuIdle", anomalyChance: 0 },
  "gce-instance-idle1": { profile: "idle", anomalyChance: 0 },
  "gcs-bucket-logs": { profile: "orphaned", anomalyChance: 0 },
};

export function startSimulator() {
  console.log("Starting CloudGuard Data Simulator...");

  const generateMetrics = () => {
    const resources = db.prepare("SELECT id FROM resources").all() as { id: string }[];

    db.transaction(() => {
      for (const res of resources) {
        const behavior = RESOURCE_BEHAVIORS[res.id] || { profile: "normal", anomalyChance: 0 };
        const useAnomaly = behavior.anomalyProfile && Math.random() < behavior.anomalyChance;
        const profileKey = useAnomaly ? behavior.anomalyProfile! : behavior.profile;
        const gen = PROFILES[profileKey] || PROFILES.normal;
        const m = gen();

        ingestMetrics(res.id, m.cpu, m.gpu, m.mem, m.disk, m.netIn, m.netOut, m.cost);
      }
    })();
  };

  // Generate 5 initial batches for history
  for (let i = 0; i < 5; i++) generateMetrics();

  setInterval(generateMetrics, 10000);
}
