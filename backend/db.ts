import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "cloudguard.db");
export const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

export function setupDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'viewer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cloud_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      account_id TEXT,
      alias TEXT,
      status TEXT DEFAULT 'connected',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      service TEXT NOT NULL,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      instance_type TEXT,
      owner_tag TEXT,
      cost_per_hour REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id TEXT NOT NULL,
      cpu_utilization REAL,
      gpu_utilization REAL,
      memory_usage REAL,
      disk_io REAL,
      network_in REAL,
      network_out REAL,
      cost_per_hour REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(resource_id) REFERENCES resources(id)
    );

    CREATE TABLE IF NOT EXISTS features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id TEXT NOT NULL,
      idle_ratio REAL,
      cost_per_cpu_hour REAL,
      network_spike_ratio REAL,
      cost_growth_rate REAL,
      runtime_hours REAL,
      gpu_utilization_ratio REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(resource_id) REFERENCES resources(id)
    );

    CREATE TABLE IF NOT EXISTS anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id TEXT NOT NULL,
      type TEXT NOT NULL,
      score REAL NOT NULL,
      risk_level TEXT,
      description TEXT,
      root_cause TEXT,
      attributed_service TEXT,
      attributed_owner TEXT,
      estimated_waste REAL DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(resource_id) REFERENCES resources(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anomaly_id INTEGER,
      severity TEXT NOT NULL,
      channel TEXT DEFAULT 'dashboard',
      title TEXT NOT NULL,
      message TEXT,
      acknowledged INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(anomaly_id) REFERENCES anomalies(id)
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anomaly_id INTEGER,
      action TEXT NOT NULL,
      estimated_savings REAL DEFAULT 0,
      confidence REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(anomaly_id) REFERENCES anomalies(id)
    );

    CREATE TABLE IF NOT EXISTS billing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id TEXT NOT NULL,
      service TEXT,
      cost_per_hour REAL,
      total_cost REAL,
      data_transfer_gb REAL DEFAULT 0,
      storage_gb REAL DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(resource_id) REFERENCES resources(id)
    );

    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_id TEXT,
      region TEXT,
      status TEXT DEFAULT 'Success',
      error_code TEXT DEFAULT '',
      source_ip TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_billing_resource ON billing(resource_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_api_logs_action ON api_logs(action, status);
    CREATE INDEX IF NOT EXISTS idx_metrics_resource ON metrics(resource_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_features_resource ON features(resource_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_anomalies_resource ON anomalies(resource_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, timestamp);
  `);

  seedData();
}

function seedData() {
  const count = db.prepare("SELECT COUNT(*) as count FROM resources").get() as { count: number };
  if (count.count > 0) return;

  // Seed cloud accounts
  const insertAccount = db.prepare("INSERT INTO cloud_accounts (provider, account_id, alias) VALUES (?, ?, ?)");
  insertAccount.run("AWS", "123456789012", "Production");
  insertAccount.run("Azure", "sub-abc-123", "Enterprise");
  insertAccount.run("GCP", "cloudguard-prod", "Analytics");

  // Seed users
  const insertUser = db.prepare("INSERT INTO users (email, name, role) VALUES (?, ?, ?)");
  insertUser.run("admin@cloudguard.ai", "Admin User", "admin");
  insertUser.run("devops@cloudguard.ai", "DevOps Engineer", "editor");

  // Seed 15+ resources across providers
  const insertResource = db.prepare(
    "INSERT INTO resources (id, provider, service, name, region, status, instance_type, owner_tag, cost_per_hour) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const resources = [
    // AWS Resources
    ["i-0abcd1234efgh5678", "aws", "EC2", "ml-training-node", "us-east-1", "running", "g4dn.xlarge", "ML Team", 2.80],
    ["i-0987654321abcdef0", "aws", "EC2", "web-server-prod", "us-west-2", "running", "t3.large", "Platform Team", 0.42],
    ["i-0deadbeef12345678", "aws", "EC2", "forgotten-dev-box", "eu-west-1", "running", "m5.xlarge", "Dev Team", 1.20],
    ["i-0aaa111122223333", "aws", "EC2", "batch-processor", "us-east-1", "running", "c5.2xlarge", "Data Team", 1.70],
    ["vol-0abc123def456789", "aws", "EBS", "orphaned-volume", "us-east-1", "available", "gp3", "Unknown", 0.08],
    ["elb-prod-legacy-001", "aws", "ELB", "legacy-load-balancer", "us-west-2", "active", "classic", "Platform Team", 0.25],
    ["snap-0aabbcc1122334455", "aws", "EBS Snapshot", "outdated-snapshot", "us-east-1", "completed", "snapshot", "Ops Team", 0.05],
    // Azure Resources
    ["aks-agentpool-12345678-vmss000000", "azure", "AKS", "k8s-node-1", "eastus", "running", "Standard_D4s_v3", "K8s Team", 1.92],
    ["aks-agentpool-12345678-vmss000001", "azure", "AKS", "k8s-node-2", "eastus", "running", "Standard_D4s_v3", "K8s Team", 1.92],
    ["vm-analytics-prod-01", "azure", "VM", "analytics-server", "westeurope", "running", "Standard_E4s_v3", "Analytics Team", 1.52],
    ["disk-unattached-001", "azure", "Managed Disk", "unattached-disk", "eastus", "unattached", "Premium_SSD", "Unknown", 0.15],
    // GCP Resources
    ["gce-instance-abc1", "gcp", "Compute Engine", "data-pipeline-worker", "us-central1", "running", "n1-standard-4", "Data Team", 1.90],
    ["gce-instance-gpu1", "gcp", "Compute Engine", "gpu-inference-node", "us-west1", "running", "n1-standard-8-t4", "AI Team", 3.50],
    ["gce-instance-idle1", "gcp", "Compute Engine", "idle-staging-vm", "europe-west1", "running", "e2-standard-2", "Dev Team", 0.67],
    ["gcs-bucket-logs", "gcp", "Cloud Storage", "old-log-bucket", "us-central1", "active", "standard", "Ops Team", 0.02],
  ];

  db.transaction(() => {
    for (const res of resources) {
      insertResource.run(...res);
    }
  })();
}
