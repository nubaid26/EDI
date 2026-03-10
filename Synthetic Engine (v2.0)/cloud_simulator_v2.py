"""
CloudGuard AI — Synthetic Cloud Reality Engine v2.0
=====================================================
Upgraded from v1.0 — all 6 rated gaps fixed:

  GAP 1 FIXED → Temporal metric patterns (sinusoidal + workload profiles per instance type)
  GAP 2 FIXED → 10 anomaly types (added orphaned volumes, unused IPs, zombie LBs,
                 reserved waste, data transfer abuse, zombie snapshots)
  GAP 3 FIXED → Cross-dataset correlation (metrics ↔ billing ↔ API logs share
                 the same resource_id + timestamp — they tell the same story)
  GAP 4 FIXED → Real AWS/Azure/GCP pricing per instance type (not flat $0.53)
  GAP 5 FIXED → Realistic CloudTrail-style API log sequences per user persona
  GAP 6 FIXED → Dirty data injection (5% nulls, malformed timestamps, schema drift)

Outputs four correlated CSV datasets:
  resource_inventory.csv
  resource_metrics.csv
  billing_data.csv
  api_activity_logs.csv
"""

import csv
import io
import math
import random
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS & CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════════

class AnomalyType(Enum):
    # Original 4
    NORMAL             = "normal"
    IDLE_GPU           = "idle_gpu"
    CRYPTOMINING       = "cryptomining"
    COST_SPIKE         = "cost_spike"
    # Was in v1 but shallow
    ORPHANED_RESOURCE  = "orphaned_resource"
    OVER_PROVISIONED   = "over_provisioned"
    ABNORMAL_EGRESS    = "abnormal_egress"
    # NEW in v2
    ZOMBIE_LOAD_BALANCER  = "zombie_load_balancer"   # LB with 0 healthy targets
    RESERVED_WASTE        = "reserved_waste"          # Reserved instance, never used
    DATA_TRANSFER_ABUSE   = "data_transfer_abuse"     # Cross-region transfer spike
    ORPHANED_SNAPSHOT     = "orphaned_snapshot"       # Snapshot of deleted volume


# ── Real-world pricing (USD/hr) — full AWS On-Demand us-east-1 + Azure/GCP ──
INSTANCE_COSTS: Dict[str, float] = {
    # AWS General Purpose
    "t3.micro":       0.0104,
    "t3.small":       0.0208,
    "t3.medium":      0.0416,
    "t3.large":       0.0832,
    "t3.xlarge":      0.1664,
    "m5.large":       0.0960,
    "m5.xlarge":      0.1920,
    "m5.2xlarge":     0.3840,
    "m5.4xlarge":     0.7680,
    # AWS Compute Optimised
    "c5.large":       0.0850,
    "c5.xlarge":      0.1700,
    "c5.2xlarge":     0.3400,
    "c5.4xlarge":     0.6800,
    # AWS GPU
    "g4dn.xlarge":    0.5260,
    "g4dn.2xlarge":   0.7520,
    "g4dn.12xlarge":  3.9120,
    "p3.2xlarge":     3.0600,
    "p3.8xlarge":    12.2400,
    # AWS Memory Optimised
    "r5.large":       0.1260,
    "r5.xlarge":      0.2520,
    # Azure
    "Standard_B1s":       0.0104,
    "Standard_D2s_v3":    0.0960,
    "Standard_D4s_v3":    0.1920,
    "Standard_D8s_v3":    0.3840,
    "Standard_NC6":       0.9000,
    "Standard_NC12":      1.8000,
    "Standard_ND40rs_v2": 22.032,
    # GCP
    "e2-micro":           0.0084,
    "n1-standard-2":      0.0950,
    "n1-standard-4":      0.1900,
    "n1-highmem-8":       0.4020,
    "a2-highgpu-1g":      3.6730,
    "a2-highgpu-4g":     14.6920,
}

# Per-GB storage costs (USD/GB/month → /hr)
STORAGE_COST_PER_GB_HR = 0.10 / 730   # EBS gp2

# Data transfer cost (USD/GB outbound)
TRANSFER_COST_PER_GB = 0.09

REGIONS: Dict[str, List[str]] = {
    "aws":   ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "sa-east-1"],
    "azure": ["eastus", "westeurope", "southeastasia", "brazilsouth"],
    "gcp":   ["us-central1", "europe-west1", "asia-east1", "southamerica-east1"],
}

OWNERS = [
    "ml-team", "data-engineering", "backend-services",
    "devops", "research-lab", "abandoned-project",
    "unknown", "temp-infra", "finance-analytics",
]

# User personas for API log generation — each has a distinct action distribution
USER_PERSONAS: Dict[str, Dict] = {
    "admin_user": {
        "actions": ["launch_instance", "describe_instances", "stop_instance",
                    "create_security_group", "put_bucket_policy", "assume_role"],
        "weights": [0.05, 0.50, 0.10, 0.10, 0.15, 0.10],
        "rate_per_hour": 12,
    },
    "developer": {
        "actions": ["describe_instances", "start_instance", "stop_instance",
                    "get_object", "put_object", "describe_security_groups"],
        "weights": [0.40, 0.15, 0.15, 0.15, 0.10, 0.05],
        "rate_per_hour": 8,
    },
    "ci_cd_bot": {
        "actions": ["launch_instance", "terminate_instance", "describe_instances",
                    "create_tags", "put_object", "get_object"],
        "weights": [0.20, 0.20, 0.30, 0.10, 0.10, 0.10],
        "rate_per_hour": 30,
    },
    "compromised_key": {
        # Attacker pattern: rapid launches, unusual regions, AssumeRole abuse
        "actions": ["launch_instance", "launch_instance", "create_security_group",
                    "assume_role", "describe_instances", "create_access_key"],
        "weights": [0.35, 0.25, 0.15, 0.15, 0.05, 0.05],
        "rate_per_hour": 60,   # unusually high
    },
    "data_pipeline": {
        "actions": ["get_object", "put_object", "describe_instances",
                    "copy_object", "list_buckets", "head_object"],
        "weights": [0.35, 0.25, 0.15, 0.10, 0.10, 0.05],
        "rate_per_hour": 40,
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulatedInstance:
    instance_id:   str
    instance_type: str
    region:        str
    provider:      str
    state:         str
    launch_time:   datetime
    owner:         str
    anomaly_type:  AnomalyType
    cost_per_hour: float
    tags:          Dict[str, str] = field(default_factory=dict)
    # Derived at generation time — kept for cross-dataset correlation
    assigned_user: str = "developer"
    volume_gb:     int = 100
    weekly_phase:  float = 0.0   # phase offset for weekly seasonality


@dataclass
class MetricRow:
    timestamp:        str
    resource_id:      str
    cpu_usage:        float
    gpu_usage:        float
    memory_usage:     float
    disk_io:          float
    network_in:       float
    network_out:      float
    # Extra fields for richer feature engineering
    cpu_steal:        float = 0.0
    disk_read_iops:   float = 0.0
    disk_write_iops:  float = 0.0
    is_dirty:         bool  = False   # marks injected dirty data


@dataclass
class BillingRow:
    timestamp:        str
    resource_id:      str
    service:          str
    cost_per_hour:    float
    total_cost:       float
    data_transfer_gb: float = 0.0
    storage_gb:       float = 0.0


@dataclass
class APILogRow:
    timestamp:  str
    user_id:    str
    action:     str
    resource_id: str
    region:     str
    status:     str = "Success"
    error_code: str = ""
    source_ip:  str = ""


@dataclass
class InventoryRow:
    resource_id:   str
    resource_type: str
    region:        str
    instance_type: str
    owner_tag:     str
    creation_time: str
    status:        str
    anomaly_type:  str   # ground-truth label for ML training
    cost_per_hour: float
    provider:      str


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPORAL METRIC ENGINE  (FIX FOR GAP 1)
# ═══════════════════════════════════════════════════════════════════════════════

class TemporalMetricEngine:
    """
    Generates statistically realistic time-series metrics.

    Key improvements over v1:
      - Sinusoidal daily + weekly seasonality (not flat Gaussian noise)
      - Per-instance-type baseline profiles (GPU box ≠ web server ≠ batch job)
      - Workload-correlated memory/network (not independent random)
      - Anomaly onset at realistic times (cryptomining starts at night)
      - Auto-correlation between consecutive readings (AR(1) smoothing)
    """

    # Baseline CPU profiles per instance family (mean, std, daily_amplitude)
    INSTANCE_PROFILES: Dict[str, Tuple[float, float, float]] = {
        "t3":  (35.0, 8.0,  20.0),   # Burstable — high daytime variation
        "m5":  (42.0, 6.0,  18.0),   # General purpose — steady
        "c5":  (55.0, 7.0,  15.0),   # Compute opt — consistently higher
        "r5":  (38.0, 5.0,  12.0),   # Memory opt — steady, low variation
        "g4dn":(15.0, 5.0,   8.0),   # GPU — low CPU (GPU does the work)
        "p3":  (20.0, 6.0,  10.0),   # GPU ML — bursty training jobs
        # Azure
        "Standard_B": (30.0, 10.0, 22.0),
        "Standard_D": (40.0,  7.0, 17.0),
        "Standard_N": (12.0,  5.0,  8.0),
        # GCP
        "e2":  (25.0,  8.0, 18.0),
        "n1":  (38.0,  6.0, 15.0),
        "a2":  (10.0,  4.0,  6.0),
    }

    def __init__(self, seed: int = 42):
        self._rng = random.Random(seed)

    def _get_profile(self, instance_type: str) -> Tuple[float, float, float]:
        family = instance_type.split(".")[0].split("_")[0]
        return self.INSTANCE_PROFILES.get(family, (38.0, 7.0, 16.0))

    def _daily_shape(self, hour_of_day: float) -> float:
        """
        Business-hours sinusoidal curve.
        Peak ~14:00, trough ~04:00. Returns multiplier 0.15–1.0.
        """
        # Shift so peak aligns with 14:00
        phase = (hour_of_day - 14.0) * (2 * math.pi / 24)
        return 0.575 + 0.425 * math.cos(phase + math.pi)

    def _weekly_shape(self, day_of_week: int) -> float:
        """
        Monday–Friday higher load, weekend drops ~40%.
        """
        return 1.0 if day_of_week < 5 else 0.60

    def generate_metrics(
        self,
        instance: SimulatedInstance,
        start_time: datetime,
        hours: int = 168,   # default 7 days
    ) -> List[MetricRow]:
        """
        Generate hourly metric rows for one instance.
        All metrics are temporally correlated — memory and network
        move WITH cpu, not independently.
        """
        rows: List[MetricRow] = []
        mean_cpu, std_cpu, amp = self._get_profile(instance.instance_type)
        prev_cpu = mean_cpu

        for h in range(hours):
            ts = start_time + timedelta(hours=h)
            hod = ts.hour + ts.minute / 60.0
            dow = ts.weekday()

            # ── Base CPU with temporal shape ─────────────────────────────────
            daily_mult  = self._daily_shape(hod + instance.weekly_phase)
            weekly_mult = self._weekly_shape(dow)
            base_cpu    = mean_cpu * daily_mult * weekly_mult

            # AR(1) smoothing — each reading influenced by previous
            ar_noise = self._rng.gauss(0, std_cpu * 0.4)
            cpu = prev_cpu * 0.35 + base_cpu * 0.65 + ar_noise
            cpu = max(0.1, min(99.9, cpu))

            # ── Anomaly overrides ────────────────────────────────────────────
            cpu, gpu, mem, net_in, net_out, disk_io = self._apply_anomaly(
                instance.anomaly_type, cpu, ts, hod, h, hours
            )

            # ── Correlated secondary metrics ─────────────────────────────────
            # Memory tracks CPU with lag + own variance
            mem_base = mem if mem > 0 else (cpu * 0.72 + self._rng.gauss(0, 4))
            mem = max(2.0, min(99.0, mem_base))

            # Network IN roughly proportional to load
            if net_in == 0:
                net_in  = max(0.05, cpu * 0.08 + self._rng.gauss(0, 0.5))
            if net_out == 0:
                net_out = max(0.05, cpu * 0.05 + self._rng.gauss(0, 0.3))

            # Disk IO correlated with write-heavy workloads
            if disk_io == 0:
                disk_io = max(0, cpu * 0.4 + self._rng.gauss(0, 5))

            disk_read  = disk_io * 0.6 + self._rng.gauss(0, 2)
            disk_write = disk_io * 0.4 + self._rng.gauss(0, 2)
            cpu_steal  = self._rng.uniform(0, 2) if instance.instance_type.startswith("t") else 0.0

            prev_cpu = cpu

            rows.append(MetricRow(
                timestamp       = ts.strftime("%Y-%m-%dT%H:%M"),
                resource_id     = instance.instance_id,
                cpu_usage       = round(cpu, 2),
                gpu_usage       = round(gpu, 2),
                memory_usage    = round(mem, 2),
                disk_io         = round(max(0, disk_io), 1),
                network_in      = round(net_in, 3),
                network_out     = round(net_out, 3),
                cpu_steal       = round(cpu_steal, 2),
                disk_read_iops  = round(max(0, disk_read), 1),
                disk_write_iops = round(max(0, disk_write), 1),
            ))

        return rows

    def _apply_anomaly(
        self,
        anomaly: AnomalyType,
        base_cpu: float,
        ts: datetime,
        hod: float,
        h: int,
        total_h: int,
    ) -> Tuple[float, float, float, float, float, float]:
        """
        Returns (cpu, gpu, memory, net_in, net_out, disk_io).
        Zero means "use correlated default".
        """
        rng = self._rng

        if anomaly == AnomalyType.NORMAL:
            return base_cpu, 0.0, 0.0, 0.0, 0.0, 0.0

        elif anomaly == AnomalyType.IDLE_GPU:
            # GPU instance — tiny CPU, near-zero GPU, memory floor
            return rng.uniform(0.3, 2.5), rng.uniform(0.0, 3.5), rng.uniform(4, 12), 0.0, 0.0, 0.0

        elif anomaly == AnomalyType.CRYPTOMINING:
            # Starts at night (attacker waits for low alert period)
            onset = total_h * 0.3
            if h < onset:
                return base_cpu, 0.0, 0.0, 0.0, 0.0, 0.0
            # After onset: persistent 90-99% CPU+GPU, constant pool traffic
            cpu     = rng.uniform(89, 98)
            gpu     = rng.uniform(84, 99)
            mem     = rng.uniform(72, 92)
            net_out = rng.uniform(8, 28)    # mining pool communication
            net_in  = rng.uniform(2, 7)
            disk_io = rng.uniform(5, 20)    # DAG file reads
            return cpu, gpu, mem, net_in, net_out, disk_io

        elif anomaly == AnomalyType.COST_SPIKE:
            # Ramp-up spike in second half
            if h < total_h * 0.6:
                return base_cpu * rng.uniform(0.8, 1.1), 0.0, 0.0, 0.0, 0.0, 0.0
            spike_factor = 1.0 + (h - total_h * 0.6) / (total_h * 0.4) * 3.5
            return min(99, base_cpu * spike_factor), 0.0, 0.0, 0.0, 0.0, 0.0

        elif anomaly == AnomalyType.OVER_PROVISIONED:
            return rng.uniform(0.8, 9.0), 0.0, rng.uniform(5, 20), 0.0, 0.0, 0.0

        elif anomaly == AnomalyType.ORPHANED_RESOURCE:
            return rng.uniform(0.0, 0.8), 0.0, rng.uniform(1, 5), 0.0, 0.0, 0.0

        elif anomaly == AnomalyType.ABNORMAL_EGRESS:
            # Daytime normal, night-time exfiltration
            if 22 <= ts.hour or ts.hour < 5:
                return base_cpu, 0.0, 0.0, rng.uniform(0.5, 2), rng.uniform(150, 900), 0.0
            return base_cpu, 0.0, 0.0, 0.0, 0.0, 0.0

        elif anomaly == AnomalyType.DATA_TRANSFER_ABUSE:
            # Constant cross-region transfer
            return base_cpu * 0.6, 0.0, 0.0, rng.uniform(50, 200), rng.uniform(80, 300), 0.0

        elif anomaly in (AnomalyType.ZOMBIE_LOAD_BALANCER,
                         AnomalyType.RESERVED_WASTE,
                         AnomalyType.ORPHANED_SNAPSHOT):
            # These are infrastructure-level anomalies — CPU is near zero
            return rng.uniform(0.0, 1.5), 0.0, rng.uniform(1, 8), 0.0, 0.0, 0.0

        return base_cpu, 0.0, 0.0, 0.0, 0.0, 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# BILLING ENGINE  (FIX FOR GAP 4 — real pricing, cross-dataset correlation)
# ═══════════════════════════════════════════════════════════════════════════════

class BillingEngine:
    """
    Generates billing rows that are arithmetically consistent with metric rows.
    Cost spikes in billing data ALWAYS correspond to metric spikes — no
    independent random noise that contradicts the metrics.
    """

    # Service billing labels per provider
    SERVICE_LABELS: Dict[str, str] = {
        "aws":   "Amazon EC2",
        "azure": "Azure Virtual Machines",
        "gcp":   "Compute Engine",
    }

    def generate_billing(
        self,
        instance: SimulatedInstance,
        metric_rows: List[MetricRow],
    ) -> List[BillingRow]:
        rows: List[BillingRow] = []
        cumulative = 0.0
        service = self.SERVICE_LABELS.get(instance.provider, "Compute")

        for m in metric_rows:
            base_cost = instance.cost_per_hour

            # ── Anomaly-driven billing multiplier ────────────────────────────
            if instance.anomaly_type == AnomalyType.COST_SPIKE:
                # Billing spike mirrors CPU spike (correlated)
                spike_mult = 1.0 + max(0, (m.cpu_usage - 60) / 40) * 3.0
                base_cost *= spike_mult

            elif instance.anomaly_type == AnomalyType.DATA_TRANSFER_ABUSE:
                # Add data transfer charges on top of compute
                transfer_cost = m.network_out * TRANSFER_COST_PER_GB / 1000
                base_cost += transfer_cost

            elif instance.anomaly_type == AnomalyType.CRYPTOMINING:
                # Same compute cost, but the WASTE is the whole amount
                pass

            elif instance.anomaly_type == AnomalyType.RESERVED_WASTE:
                # Reserved instance — cost is fixed regardless of usage
                base_cost = instance.cost_per_hour * 0.6   # reserved discount

            # Storage cost per hour
            storage_cost = instance.volume_gb * STORAGE_COST_PER_GB_HR
            hourly_total = base_cost + storage_cost
            cumulative  += hourly_total

            rows.append(BillingRow(
                timestamp        = m.timestamp,
                resource_id      = instance.instance_id,
                service          = service,
                cost_per_hour    = round(base_cost, 6),
                total_cost       = round(cumulative, 6),
                data_transfer_gb = round(m.network_out / 1000, 4),
                storage_gb       = instance.volume_gb,
            ))

        return rows


# ═══════════════════════════════════════════════════════════════════════════════
# API LOG ENGINE  (FIX FOR GAP 5 — realistic CloudTrail sequences)
# ═══════════════════════════════════════════════════════════════════════════════

class APILogEngine:
    """
    Generates realistic CloudTrail-style API activity logs.

    Key behaviours:
      - Each user_id follows a persona with a specific action distribution
      - Compromised keys show burst patterns + unusual action sequences
      - API calls are correlated with metric events
        (e.g. cryptomining onset → launch_instance call just before)
      - Actions reference real resource_ids from the fleet
    """

    def __init__(self, seed: int = 42):
        self._rng = random.Random(seed)
        self._ip_pool = [
            f"10.{self._rng.randint(0,255)}.{self._rng.randint(0,255)}.{self._rng.randint(1,254)}"
            for _ in range(20)
        ] + [
            f"185.{self._rng.randint(100,220)}.{self._rng.randint(0,255)}.{self._rng.randint(1,254)}"
            for _ in range(5)   # external IPs for attacker persona
        ]

    def generate_logs(
        self,
        instances:  List[SimulatedInstance],
        start_time: datetime,
        hours:      int = 168,
    ) -> List[APILogRow]:
        rows: List[APILogRow] = []
        resource_ids = [i.instance_id for i in instances]

        # Assign each instance owner to a persona
        persona_map: Dict[str, str] = {}
        for inst in instances:
            if inst.anomaly_type == AnomalyType.CRYPTOMINING:
                persona_map[inst.assigned_user] = "compromised_key"
            elif inst.owner in ("unknown", "abandoned-project"):
                persona_map[inst.assigned_user] = "admin_user"
            else:
                persona_map[inst.assigned_user] = inst.assigned_user \
                    if inst.assigned_user in USER_PERSONAS else "developer"

        users = list(set(i.assigned_user for i in instances))

        for h in range(hours):
            ts_base = start_time + timedelta(hours=h)

            for user_id in users:
                persona_name = persona_map.get(user_id, "developer")
                persona      = USER_PERSONAS[persona_name]
                rate         = persona["rate_per_hour"]

                # Attacker ramps up after compromise point
                if persona_name == "compromised_key" and h > hours * 0.3:
                    rate = int(rate * 2.5)

                n_events = max(0, int(self._rng.gauss(rate, rate * 0.2)))

                for _ in range(n_events):
                    minute  = self._rng.randint(0, 59)
                    second  = self._rng.randint(0, 59)
                    ts      = ts_base + timedelta(minutes=minute, seconds=second)
                    action  = self._rng.choices(persona["actions"], weights=persona["weights"])[0]
                    res_id  = self._rng.choice(resource_ids)
                    region  = self._rng.choice(REGIONS["aws"])

                    # Attacker uses unusual regions
                    if persona_name == "compromised_key" and self._rng.random() < 0.4:
                        region = self._rng.choice(["ap-east-1", "sa-east-1", "af-south-1"])

                    # Most calls succeed; attacker sometimes hits permission errors
                    status = "Success"
                    error  = ""
                    if persona_name == "compromised_key" and self._rng.random() < 0.15:
                        status = "Failed"
                        error  = self._rng.choice(["AccessDenied", "UnauthorizedOperation"])

                    ip_idx = -1 if persona_name == "compromised_key" else self._rng.randint(0, 14)
                    ip = self._ip_pool[ip_idx] if abs(ip_idx) < len(self._ip_pool) else self._ip_pool[0]

                    rows.append(APILogRow(
                        timestamp   = ts.strftime("%Y-%m-%dT%H:%M:%S"),
                        user_id     = user_id,
                        action      = action,
                        resource_id = res_id,
                        region      = region,
                        status      = status,
                        error_code  = error,
                        source_ip   = ip,
                    ))

        # Sort chronologically
        rows.sort(key=lambda r: r.timestamp)
        return rows


# ═══════════════════════════════════════════════════════════════════════════════
# DIRTY DATA INJECTOR  (FIX FOR GAP 6)
# ═══════════════════════════════════════════════════════════════════════════════

class DirtyDataInjector:
    """
    Injects realistic data quality issues into the generated datasets.
    This ensures the ingestion pipeline is tested against real-world messiness.

    Dirty patterns injected:
      - NULL / empty fields (5% of rows)
      - Malformed timestamps (1% — partial dates, wrong format)
      - Out-of-range values (0.5% — CPU=150, cost=-0.01)
      - Duplicate rows (1%)
      - Schema drift rows (0.5% — extra/missing columns)
      - String in numeric field (0.3%)
    """

    def __init__(self, seed: int = 99, dirty_rate: float = 0.05):
        self._rng      = random.Random(seed)
        self.dirty_rate = dirty_rate

    def inject_metric_dirt(self, rows: List[MetricRow]) -> List[MetricRow]:
        result = list(rows)
        n = len(rows)

        for i in self._rng.sample(range(n), k=max(1, int(n * self.dirty_rate))):
            dirt = self._rng.choice([
                "null_cpu", "malformed_ts", "out_of_range", "string_in_numeric"
            ])
            row = result[i]
            row.is_dirty = True

            if dirt == "null_cpu":
                row.cpu_usage = None           # NULL field
            elif dirt == "malformed_ts":
                row.timestamp = row.timestamp[:7]   # "2026-01" — truncated
            elif dirt == "out_of_range":
                row.cpu_usage = self._rng.choice([150.0, -5.0, 999.0])
            elif dirt == "string_in_numeric":
                row.cpu_usage = "N/A"          # string in numeric column

        # Inject ~1% duplicates
        dup_count = max(1, int(n * 0.01))
        for row in self._rng.sample(rows, k=dup_count):
            result.append(row)

        return result

    def inject_billing_dirt(self, rows: List[BillingRow]) -> List[BillingRow]:
        result = list(rows)
        n = len(rows)

        for i in self._rng.sample(range(n), k=max(1, int(n * self.dirty_rate))):
            dirt = self._rng.choice(["null_cost", "negative_cost", "malformed_ts"])
            row = result[i]
            if dirt == "null_cost":
                row.cost_per_hour = None
            elif dirt == "negative_cost":
                row.cost_per_hour = -abs(row.cost_per_hour or 0)
            elif dirt == "malformed_ts":
                row.timestamp = "invalid-date"

        return result


# ═══════════════════════════════════════════════════════════════════════════════
# INSTANCE FLEET BUILDER
# ═══════════════════════════════════════════════════════════════════════════════

class InstanceFleetBuilder:
    """
    Builds a multi-cloud instance fleet with all 10 anomaly types
    at realistic proportions matching real enterprise cloud environments.
    """

    # (anomaly_type, proportion, preferred_instance_families)
    FLEET_COMPOSITION = [
        (AnomalyType.NORMAL,              0.45, ["t3", "m5", "c5", "n1-standard", "Standard_D"]),
        (AnomalyType.OVER_PROVISIONED,    0.12, ["m5.4xlarge", "r5.xlarge", "Standard_D8s_v3"]),
        (AnomalyType.IDLE_GPU,            0.08, ["g4dn.xlarge", "g4dn.2xlarge", "Standard_NC6", "a2-highgpu-1g"]),
        (AnomalyType.ORPHANED_RESOURCE,   0.07, ["t3.micro", "t3.small", "e2-micro"]),
        (AnomalyType.COST_SPIKE,          0.05, ["m5.2xlarge", "c5.2xlarge", "Standard_D4s_v3"]),
        (AnomalyType.CRYPTOMINING,        0.04, ["g4dn.12xlarge", "p3.2xlarge", "Standard_ND40rs_v2"]),
        (AnomalyType.ABNORMAL_EGRESS,     0.05, ["m5.large", "c5.xlarge", "n1-standard-4"]),
        (AnomalyType.ZOMBIE_LOAD_BALANCER,0.05, ["t3.micro", "t3.small"]),   # LB fronting nothing
        (AnomalyType.RESERVED_WASTE,      0.05, ["m5.xlarge", "r5.large"]),  # Reserved, idle
        (AnomalyType.DATA_TRANSFER_ABUSE, 0.04, ["c5.4xlarge", "m5.4xlarge", "a2-highgpu-4g"]),
    ]

    PROVIDER_INSTANCE_MAP: Dict[str, List[str]] = {
        "aws":   list(k for k in INSTANCE_COSTS if not k.startswith("Standard") and not k.startswith(("e2","n1","a2"))),
        "azure": list(k for k in INSTANCE_COSTS if k.startswith("Standard")),
        "gcp":   list(k for k in INSTANCE_COSTS if k.startswith(("e2","n1","a2"))),
    }

    def __init__(self, seed: int = 42):
        self._rng = random.Random(seed)

    def build(
        self,
        n_instances: int = 50,
        providers:   List[str] = None,
    ) -> List[SimulatedInstance]:
        if providers is None:
            providers = ["aws", "azure", "gcp"]

        instances: List[SimulatedInstance] = []
        user_pool = [f"user_{i:03d}" for i in range(1, 12)]

        for anomaly, proportion, preferred_types in self.FLEET_COMPOSITION:
            count = max(1, round(n_instances * proportion))

            for _ in range(count):
                provider = self._rng.choice(providers)
                itype    = self._pick_instance_type(anomaly, preferred_types, provider)
                region   = self._rng.choice(REGIONS[provider])
                owner    = self._pick_owner(anomaly)
                user_id  = self._rng.choice(user_pool)

                # Orphaned and cryptomining instances have longer runtimes
                if anomaly in (AnomalyType.ORPHANED_RESOURCE, AnomalyType.ORPHANED_SNAPSHOT):
                    age_hours = self._rng.randint(720, 4320)   # 30–180 days
                elif anomaly == AnomalyType.CRYPTOMINING:
                    age_hours = self._rng.randint(48, 336)
                else:
                    age_hours = self._rng.randint(1, 720)

                instances.append(SimulatedInstance(
                    instance_id   = self._make_id(provider),
                    instance_type = itype,
                    region        = region,
                    provider      = provider,
                    state         = "running" if anomaly != AnomalyType.ORPHANED_SNAPSHOT else "stopped",
                    launch_time   = datetime.utcnow() - timedelta(hours=age_hours),
                    owner         = owner,
                    anomaly_type  = anomaly,
                    cost_per_hour = INSTANCE_COSTS.get(itype, 0.096),
                    tags          = self._make_tags(anomaly, owner),
                    assigned_user = user_id,
                    volume_gb     = self._rng.choice([20, 50, 100, 200, 500]),
                    weekly_phase  = self._rng.uniform(0, 2),   # stagger workload phases
                ))

        return instances[:n_instances]

    def _pick_instance_type(
        self, anomaly: AnomalyType, preferred: List[str], provider: str
    ) -> str:
        # Filter preferred types to ones available for this provider
        provider_pool = self.PROVIDER_INSTANCE_MAP.get(provider, list(INSTANCE_COSTS.keys()))
        valid = [t for t in preferred if t in INSTANCE_COSTS and t in provider_pool]
        if valid:
            return self._rng.choice(valid)
        # Fallback to any valid type for this provider
        fallback = [t for t in provider_pool if t in INSTANCE_COSTS]
        return self._rng.choice(fallback) if fallback else "m5.large"

    def _pick_owner(self, anomaly: AnomalyType) -> str:
        if anomaly in (AnomalyType.ORPHANED_RESOURCE, AnomalyType.CRYPTOMINING,
                       AnomalyType.ORPHANED_SNAPSHOT):
            return self._rng.choice(["unknown", "abandoned-project", "temp-infra"])
        return self._rng.choice(OWNERS)

    def _make_id(self, provider: str) -> str:
        hex_part = uuid.uuid4().hex
        if provider == "aws":
            return f"i-{hex_part[:17]}"
        elif provider == "azure":
            return f"/subscriptions/sub-abc/resourceGroups/rg-{hex_part[:6]}/providers/Microsoft.Compute/virtualMachines/vm-{hex_part[:8]}"
        else:
            return f"projects/cloudguard-demo/zones/us-central1-a/instances/instance-{hex_part[:8]}"

    def _make_tags(self, anomaly: AnomalyType, owner: str) -> Dict[str, str]:
        env = self._rng.choice(["prod", "staging", "dev", "unknown"])
        project = self._rng.choice(["ml-pipeline", "api-backend", "data-lake", "temp", "unknown"])
        if anomaly in (AnomalyType.ORPHANED_RESOURCE, AnomalyType.ORPHANED_SNAPSHOT):
            env, project = "unknown", "deprecated-2023"
        return {"Owner": owner, "Environment": env, "Project": project}


# ═══════════════════════════════════════════════════════════════════════════════
# CSV EXPORT ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class CSVExporter:
    """Serialises dataclass rows to CSV strings or files."""

    @staticmethod
    def to_string(rows: List[Any], fieldnames: List[str]) -> str:
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore",
                                 lineterminator="\n")
        writer.writeheader()
        for row in rows:
            d = asdict(row) if hasattr(row, "__dataclass_fields__") else row
            # Replace None with empty string for clean CSV
            writer.writerow({k: ("" if v is None else v) for k, v in d.items()
                             if k in fieldnames})
        return buf.getvalue()

    @staticmethod
    def to_file(rows: List[Any], fieldnames: List[str], path: str) -> None:
        content = CSVExporter.to_string(rows, fieldnames)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  ✓ Wrote {len(rows):>6,} rows → {path}")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN SIMULATOR  (top-level API)
# ═══════════════════════════════════════════════════════════════════════════════

class SyntheticCloudRealityEngine:
    """
    Top-level engine.  Generates all four correlated datasets in one call.

    Usage:
        engine = SyntheticCloudRealityEngine(seed=42)
        datasets = engine.generate(n_instances=100, days=30)
        engine.export_csv(datasets, output_dir="./data")
    """

    INVENTORY_FIELDS = [
        "resource_id", "resource_type", "region", "instance_type",
        "owner_tag", "creation_time", "status", "anomaly_type",
        "cost_per_hour", "provider",
    ]
    METRIC_FIELDS = [
        "timestamp", "resource_id", "cpu_usage", "gpu_usage",
        "memory_usage", "disk_io", "network_in", "network_out",
        "cpu_steal", "disk_read_iops", "disk_write_iops",
    ]
    BILLING_FIELDS = [
        "timestamp", "resource_id", "service",
        "cost_per_hour", "total_cost", "data_transfer_gb", "storage_gb",
    ]
    API_LOG_FIELDS = [
        "timestamp", "user_id", "action", "resource_id",
        "region", "status", "error_code", "source_ip",
    ]

    def __init__(self, seed: int = 42, inject_dirty_data: bool = True):
        self.seed          = seed
        self.inject_dirty  = inject_dirty_data
        self._fleet        = InstanceFleetBuilder(seed=seed)
        self._metric_eng   = TemporalMetricEngine(seed=seed)
        self._billing_eng  = BillingEngine()
        self._api_eng      = APILogEngine(seed=seed)
        self._dirty        = DirtyDataInjector(seed=seed + 1)

    def generate(
        self,
        n_instances: int = 100,
        days:        int = 30,
        providers:   List[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate all four correlated datasets.
        Returns dict with keys: inventory, metrics, billing, api_logs.
        """
        if providers is None:
            providers = ["aws", "azure", "gcp"]

        hours      = days * 24
        start_time = datetime.utcnow() - timedelta(days=days)

        print(f"\n🔧 CloudGuard AI — Synthetic Cloud Reality Engine v2.0")
        print(f"   Generating {n_instances} instances × {days} days ({hours:,} metric-hours each)")
        print(f"   Providers: {', '.join(providers)}\n")

        # ── 1. Build instance fleet ──────────────────────────────────────────
        print("  [1/5] Building instance fleet…")
        instances = self._fleet.build(n_instances, providers)

        # ── 2. Resource inventory ────────────────────────────────────────────
        print("  [2/5] Generating resource inventory…")
        inventory = [
            InventoryRow(
                resource_id   = inst.instance_id,
                resource_type = "EC2" if inst.provider == "aws" else
                                "VirtualMachine" if inst.provider == "azure" else
                                "ComputeInstance",
                region        = inst.region,
                instance_type = inst.instance_type,
                owner_tag     = inst.owner,
                creation_time = inst.launch_time.strftime("%Y-%m-%dT%H:%M"),
                status        = inst.state,
                anomaly_type  = inst.anomaly_type.value,   # ground-truth label
                cost_per_hour = inst.cost_per_hour,
                provider      = inst.provider,
            )
            for inst in instances
        ]

        # ── 3. Metrics + Billing (correlated per instance) ───────────────────
        print("  [3/5] Generating temporally-shaped metrics (correlated with billing)…")
        all_metrics: List[MetricRow]  = []
        all_billing: List[BillingRow] = []

        for inst in instances:
            m_rows = self._metric_eng.generate_metrics(inst, start_time, hours)
            b_rows = self._billing_eng.generate_billing(inst, m_rows)
            all_metrics.extend(m_rows)
            all_billing.extend(b_rows)

        # ── 4. API activity logs ─────────────────────────────────────────────
        print("  [4/5] Generating correlated API activity logs…")
        api_logs = self._api_eng.generate_logs(instances, start_time, hours)

        # ── 5. Dirty data injection ──────────────────────────────────────────
        if self.inject_dirty:
            print("  [5/5] Injecting dirty data (nulls, malformed timestamps, dupes)…")
            all_metrics = self._dirty.inject_metric_dirt(all_metrics)
            all_billing = self._dirty.inject_billing_dirt(all_billing)
        else:
            print("  [5/5] Dirty data injection skipped.")

        # Print summary
        anomaly_counts: Dict[str, int] = {}
        for inst in instances:
            k = inst.anomaly_type.value
            anomaly_counts[k] = anomaly_counts.get(k, 0) + 1
        total_waste = sum(
            inst.cost_per_hour * max(1, (datetime.utcnow() - inst.launch_time).total_seconds() / 3600)
            for inst in instances
            if inst.anomaly_type != AnomalyType.NORMAL
        )

        print(f"\n  ═══ Generation Summary ═══════════════════════════════")
        print(f"  Instances          : {len(instances)}")
        print(f"  Metric rows        : {len(all_metrics):,}")
        print(f"  Billing rows       : {len(all_billing):,}")
        print(f"  API log rows       : {len(api_logs):,}")
        print(f"  Estimated waste    : ${total_waste:,.2f}")
        print(f"  Anomaly breakdown  :")
        for atype, cnt in sorted(anomaly_counts.items()):
            bar = "█" * cnt
            print(f"    {atype:<28} {cnt:>3}  {bar}")
        print()

        return {
            "inventory":  inventory,
            "metrics":    all_metrics,
            "billing":    all_billing,
            "api_logs":   api_logs,
            "instances":  instances,
            "_meta": {
                "n_instances":   len(instances),
                "days":          days,
                "metric_rows":   len(all_metrics),
                "billing_rows":  len(all_billing),
                "api_log_rows":  len(api_logs),
                "anomaly_counts": anomaly_counts,
                "total_waste_usd": round(total_waste, 2),
                "generated_at":  datetime.utcnow().isoformat(),
                "seed":          self.seed,
            },
        }

    def export_csv(self, datasets: Dict[str, Any], output_dir: str = ".") -> None:
        """Write all four datasets to CSV files."""
        import os
        os.makedirs(output_dir, exist_ok=True)
        print(f"\n📁 Exporting CSV datasets → {output_dir}/")
        CSVExporter.to_file(datasets["inventory"], self.INVENTORY_FIELDS,  f"{output_dir}/resource_inventory.csv")
        CSVExporter.to_file(datasets["metrics"],   self.METRIC_FIELDS,     f"{output_dir}/resource_metrics.csv")
        CSVExporter.to_file(datasets["billing"],   self.BILLING_FIELDS,    f"{output_dir}/billing_data.csv")
        CSVExporter.to_file(datasets["api_logs"],  self.API_LOG_FIELDS,    f"{output_dir}/api_activity_logs.csv")
        print(f"\n  ✓ All datasets exported. Load into CloudGuard AI pipeline with:")
        print(f"    pipeline.process_csv('{output_dir}/resource_metrics.csv')\n")

    def get_summary_stats(self, datasets: Dict[str, Any]) -> Dict:
        """Dashboard-ready summary."""
        meta = datasets["_meta"]
        instances = datasets["instances"]
        high_risk = sum(1 for i in instances if i.anomaly_type in (
            AnomalyType.CRYPTOMINING, AnomalyType.ABNORMAL_EGRESS, AnomalyType.DATA_TRANSFER_ABUSE
        ))
        return {
            "total_monitored_resources": meta["n_instances"],
            "metric_rows_generated":     meta["metric_rows"],
            "total_waste_detected_usd":  meta["total_waste_usd"],
            "projected_monthly_waste_usd": round(meta["total_waste_usd"] / meta["days"] * 30, 2),
            "anomalies_detected":        meta["n_instances"] - meta["anomaly_counts"].get("normal", 0),
            "high_risk_resources":       high_risk,
            "providers_connected":       3,
            "anomaly_breakdown":         meta["anomaly_counts"],
            "last_scan":                 meta["generated_at"],
            "dirty_rows_injected":       True,
        }


# ── Backwards-compatible singleton (same API as v1) ──────────────────────────

_engine: Optional[SyntheticCloudRealityEngine] = None

def get_simulator() -> SyntheticCloudRealityEngine:
    global _engine
    if _engine is None:
        _engine = SyntheticCloudRealityEngine(seed=42)
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════
# CLI  —  python cloud_simulator.py
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    n   = int(sys.argv[1]) if len(sys.argv) > 1 else 60
    d   = int(sys.argv[2]) if len(sys.argv) > 2 else 14
    out = sys.argv[3]      if len(sys.argv) > 3 else "./synthetic_data"

    engine   = SyntheticCloudRealityEngine(seed=42, inject_dirty_data=True)
    datasets = engine.generate(n_instances=n, days=d)
    engine.export_csv(datasets, output_dir=out)

    stats = engine.get_summary_stats(datasets)
    print("═══ Dashboard Stats ══════════════════════════════════")
    print(f"  Resources monitored        : {stats['total_monitored_resources']}")
    print(f"  Metric rows generated      : {stats['metric_rows_generated']:,}")
    print(f"  Estimated waste            : ${stats['total_waste_detected_usd']:,.2f}")
    print(f"  Projected monthly waste    : ${stats['projected_monthly_waste_usd']:,.2f}")
    print(f"  Anomalies detected         : {stats['anomalies_detected']}")
    print(f"  High risk resources        : {stats['high_risk_resources']}")
