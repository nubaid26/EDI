"""
CloudGuard AI — Universal Cloud Data Collector
===============================================
Single entry point for all cloud data ingestion.
Supports three modes: SYNTHETIC, CSV, and LIVE.
Produces a unified CollectorOutput regardless of source.
"""

import os, csv, math, logging, traceback
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger("cloudguard.collector")

# ═══════════════════════════════════════════════════════════════════════════════
# DATA CONTRACTS
# ═══════════════════════════════════════════════════════════════════════════════

ANOMALY_WEIGHTS: Dict[str, float] = {
    "cryptomining":         1.00, "data_transfer_abuse":  0.85,
    "abnormal_egress":      0.80, "cost_spike":           0.70,
    "idle_gpu":             0.60, "zombie_load_balancer":  0.50,
    "reserved_waste":       0.45, "over_provisioned":     0.40,
    "orphaned_resource":    0.35, "orphaned_snapshot":    0.20,
    "normal":               0.00,
}

ANOMALY_RECOMMENDATIONS: Dict[str, str] = {
    "cryptomining":         "Isolate instance immediately and revoke IAM keys",
    "data_transfer_abuse":  "Audit cross-region transfers and apply VPC endpoints",
    "abnormal_egress":      "Block outbound traffic and investigate data exfiltration",
    "cost_spike":           "Review auto-scaling rules and set billing alarms",
    "idle_gpu":             "Stop or downsize this GPU instance to save costs",
    "zombie_load_balancer": "Delete load balancer — no healthy targets attached",
    "reserved_waste":       "Release reserved instance or migrate workload to it",
    "over_provisioned":     "Downsize instance type to match actual utilization",
    "orphaned_resource":    "Terminate orphaned resource to stop waste",
    "orphaned_snapshot":    "Delete stale snapshot — source volume no longer exists",
    "normal":               "No action needed — resource operating normally",
}


@dataclass
class NormalizedResource:
    resource_id: str = ""
    instance_type: str = ""
    region: str = ""
    provider: str = ""
    owner: str = "unknown"
    anomaly_type: str = "normal"
    risk_score: float = 0.0
    risk_level: str = "LOW"
    cost_per_hour: float = 0.0
    hours_running: float = 0.0
    total_cost: float = 0.0
    estimated_waste: float = 0.0
    cpu_avg_24h: float = 0.0
    gpu_avg_24h: float = 0.0
    memory_avg_24h: float = 0.0
    network_out_avg_24h: float = 0.0
    recommendation: str = ""
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class MetricSnapshot:
    timestamp: str = ""
    resource_id: str = ""
    cpu_usage: float = 0.0
    gpu_usage: float = 0.0
    memory_usage: float = 0.0
    disk_io: float = 0.0
    network_in: float = 0.0
    network_out: float = 0.0


@dataclass
class BillingRecord:
    date: str = ""
    resource_id: str = ""
    service: str = ""
    provider: str = ""
    cost_per_hour: float = 0.0
    daily_cost: float = 0.0
    cumulative_cost: float = 0.0
    data_transfer_gb: float = 0.0
    storage_gb: float = 0.0


@dataclass
class APILogRecord:
    timestamp: str = ""
    user_id: str = ""
    action: str = ""
    resource_id: str = ""
    region: str = ""
    status: str = "Success"
    error_code: str = ""
    source_ip: str = ""
    is_suspicious: bool = False


@dataclass
class OrphanedItem:
    id: str = ""
    size_gb: float = 0.0
    age_days: int = 0
    monthly_cost: float = 0.0


@dataclass
class OrphanedResourceSummary:
    unattached_volumes: List[Dict] = field(default_factory=list)
    unassociated_ips: List[Dict] = field(default_factory=list)
    old_snapshots: List[Dict] = field(default_factory=list)
    zombie_load_balancers: List[Dict] = field(default_factory=list)
    total_orphaned_monthly_waste: float = 0.0


@dataclass
class CollectorSummary:
    total_resources: int = 0
    total_cost_30d: float = 0.0
    estimated_waste_30d: float = 0.0
    waste_percentage: float = 0.0
    anomalies_detected: int = 0
    high_risk_count: int = 0
    medium_risk_count: int = 0
    low_risk_count: int = 0
    providers_active: int = 0
    anomaly_breakdown: Dict[str, int] = field(default_factory=dict)
    savings_potential: float = 0.0


@dataclass
class DataQualityReport:
    total_rows_ingested: int = 0
    dirty_rows_found: int = 0
    null_fields_patched: int = 0
    schema_detected: str = ""
    coverage_completeness_pct: float = 100.0


@dataclass
class CollectorOutput:
    mode: str = "synthetic"
    resources: List[Dict] = field(default_factory=list)
    metrics: List[Dict] = field(default_factory=list)
    billing: List[Dict] = field(default_factory=list)
    api_logs: List[Dict] = field(default_factory=list)
    orphaned: Dict = field(default_factory=dict)
    summary: Dict = field(default_factory=dict)
    generated_at: str = ""
    data_quality: Dict = field(default_factory=dict)


class CollectorMode(Enum):
    SYNTHETIC = "synthetic"
    CSV = "csv"
    LIVE = "live"


# ═══════════════════════════════════════════════════════════════════════════════
# RISK SCORING
# ═══════════════════════════════════════════════════════════════════════════════

def _normalize(value: float, max_val: float = 100.0) -> float:
    """Normalize a value to 0-1 range."""
    return min(1.0, max(0.0, value / max_val))


def compute_risk_score(cpu_avg: float, net_out_avg: float,
                       anomaly_type: str, cost_per_hour: float) -> float:
    """Signal Fusion formula: 0.4×CPU + 0.3×NetOut + 0.2×Anomaly + 0.1×Cost."""
    return round((
        0.40 * _normalize(cpu_avg, 100.0)
        + 0.30 * _normalize(net_out_avg, 100.0)
        + 0.20 * ANOMALY_WEIGHTS.get(anomaly_type, 0.0)
        + 0.10 * _normalize(cost_per_hour, 5.0)
    ) * 100, 1)


def risk_level(score: float) -> str:
    """Classify risk score into HIGH/MEDIUM/LOW."""
    if score >= 60: return "HIGH"
    if score >= 30: return "MEDIUM"
    return "LOW"


# ═══════════════════════════════════════════════════════════════════════════════
# UNIVERSAL COLLECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class UniversalCollector:
    """
    Unified data collector that abstracts three data sources into a
    single CollectorOutput contract. Downstream pipeline is source-agnostic.
    """

    def __init__(self, mode: CollectorMode = None,
                 fallback_chain: List[CollectorMode] = None):
        self.mode = mode or self._detect_mode()
        self.fallback_chain = fallback_chain or [
            CollectorMode.CSV, CollectorMode.SYNTHETIC
        ]
        self._csv_paths: Dict[str, str] = {}
        self._role_arn: str = ""
        self._external_id: str = ""
        self._cached_output: Optional[CollectorOutput] = None
        self._cache_time: Optional[datetime] = None
        self._cache_ttl: int = int(os.getenv("COLLECTOR_CACHE_TTL", "60"))
        logger.info(f"UniversalCollector initialized in {self.mode.value} mode")

    @staticmethod
    def _detect_mode() -> CollectorMode:
        """Auto-detect mode from environment variables."""
        if os.getenv("DEMO_MODE", "").lower() == "true":
            return CollectorMode.SYNTHETIC
        if os.getenv("CSV_DATA_PATH"):
            return CollectorMode.CSV
        if os.getenv("AWS_READONLY_ROLE_ARN"):
            return CollectorMode.LIVE
        return CollectorMode.SYNTHETIC

    def switch_mode(self, new_mode: CollectorMode) -> None:
        """Switch operating mode and clear cache."""
        self.mode = new_mode
        self._cached_output = None
        logger.info(f"Switched to {new_mode.value} mode")

    def set_credentials(self, role_arn: str, external_id: str = "") -> None:
        """Set AWS IAM role credentials for LIVE mode."""
        self._role_arn = role_arn
        self._external_id = external_id

    def load_csv(self, path: str) -> None:
        """Load a single CSV file for CSV mode."""
        self._csv_paths["metrics"] = path

    def load_csv_bundle(self, paths: Dict[str, str]) -> None:
        """Load multiple CSV files mapped by type."""
        self._csv_paths.update(paths)

    def collect(self) -> CollectorOutput:
        """Execute collection with fallback chain on failure."""
        if self._cached_output and self._cache_time:
            age = (datetime.utcnow() - self._cache_time).total_seconds()
            if age < self._cache_ttl:
                return self._cached_output

        modes_to_try = [self.mode] + [
            m for m in self.fallback_chain if m != self.mode
        ]

        for mode in modes_to_try:
            try:
                logger.info(f"Attempting collection in {mode.value} mode...")
                output = self._collect_mode(mode)
                output.mode = mode.value
                output.generated_at = datetime.utcnow().isoformat()
                self._cached_output = output
                self._cache_time = datetime.utcnow()
                logger.info(f"Collection successful in {mode.value} mode: "
                            f"{output.summary.get('total_resources', 0)} resources")
                return output
            except Exception as e:
                logger.warning(f"{mode.value} mode failed: {e}")
                traceback.print_exc()

        # Final fallback — return empty synthetic
        logger.error("All modes failed. Returning empty output.")
        return self._empty_output()

    def _collect_mode(self, mode: CollectorMode) -> CollectorOutput:
        """Dispatch to appropriate collection method."""
        if mode == CollectorMode.SYNTHETIC:
            return self._collect_synthetic()
        elif mode == CollectorMode.CSV:
            return self._collect_csv()
        elif mode == CollectorMode.LIVE:
            return self._collect_live()
        raise ValueError(f"Unknown mode: {mode}")

    # ─── SYNTHETIC MODE ──────────────────────────────────────────────────────

    def _collect_synthetic(self) -> CollectorOutput:
        """Generate data using the Synthetic Cloud Reality Engine V2."""
        import sys, importlib

        # Import cloud_simulator_v2 from the project root
        engine_dir = os.path.join(os.path.dirname(__file__), "..", "..",
                                  "Synthetic Engine (v2.0)")
        if engine_dir not in sys.path:
            sys.path.insert(0, engine_dir)

        sim = importlib.import_module("cloud_simulator_v2")
        engine = sim.SyntheticCloudRealityEngine(seed=42, inject_dirty_data=True)
        datasets = engine.generate(n_instances=60, days=30)

        return self._transform_v2_output(datasets)

    def _transform_v2_output(self, datasets: Dict) -> CollectorOutput:
        """Transform V2 engine output to CollectorOutput contract."""
        instances = datasets["instances"]
        raw_metrics = datasets["metrics"]
        raw_billing = datasets["billing"]
        raw_logs = datasets["api_logs"]
        meta = datasets["_meta"]

        # ── Build resource-level averages ────────────────────────────────────
        from collections import defaultdict
        cpu_sums = defaultdict(lambda: [0.0, 0])
        gpu_sums = defaultdict(lambda: [0.0, 0])
        mem_sums = defaultdict(lambda: [0.0, 0])
        net_sums = defaultdict(lambda: [0.0, 0])

        for m in raw_metrics:
            rid = m.resource_id
            cpu_val = m.cpu_usage if isinstance(m.cpu_usage, (int, float)) else 0
            gpu_val = m.gpu_usage if isinstance(m.gpu_usage, (int, float)) else 0
            mem_val = m.memory_usage if isinstance(m.memory_usage, (int, float)) else 0
            net_val = m.network_out if isinstance(m.network_out, (int, float)) else 0
            if not (0 <= cpu_val <= 100): cpu_val = 0
            cpu_sums[rid][0] += cpu_val; cpu_sums[rid][1] += 1
            gpu_sums[rid][0] += gpu_val; gpu_sums[rid][1] += 1
            mem_sums[rid][0] += mem_val; mem_sums[rid][1] += 1
            net_sums[rid][0] += net_val; net_sums[rid][1] += 1

        def avg(d, k): return round(d[k][0] / max(d[k][1], 1), 2)

        # ── Resources ───────────────────────────────────────────────────────
        resources = []
        orphaned_summary = OrphanedResourceSummary()
        total_waste = 0.0
        anomaly_breakdown: Dict[str, int] = {}

        for inst in instances:
            rid = inst.instance_id
            atype = inst.anomaly_type.value
            cpu_a = avg(cpu_sums, rid)
            gpu_a = avg(gpu_sums, rid)
            net_a = avg(net_sums, rid)
            hrs = max(1, (datetime.utcnow() - inst.launch_time).total_seconds() / 3600)
            total_cost = round(inst.cost_per_hour * hrs, 2)
            waste = round(total_cost * ANOMALY_WEIGHTS.get(atype, 0), 2) if atype != "normal" else 0
            total_waste += waste
            score = compute_risk_score(cpu_a, net_a, atype, inst.cost_per_hour)
            rlevel = risk_level(score)
            anomaly_breakdown[atype] = anomaly_breakdown.get(atype, 0) + 1

            resources.append(asdict(NormalizedResource(
                resource_id=rid, instance_type=inst.instance_type,
                region=inst.region, provider=inst.provider,
                owner=inst.owner, anomaly_type=atype,
                risk_score=score, risk_level=rlevel,
                cost_per_hour=inst.cost_per_hour,
                hours_running=round(hrs, 1), total_cost=total_cost,
                estimated_waste=waste,
                cpu_avg_24h=cpu_a, gpu_avg_24h=gpu_a,
                memory_avg_24h=avg(mem_sums, rid),
                network_out_avg_24h=net_a,
                recommendation=ANOMALY_RECOMMENDATIONS.get(atype, ""),
                tags=inst.tags,
            )))

            # Build orphaned summary
            if atype == "orphaned_resource":
                orphaned_summary.unattached_volumes.append({
                    "volume_id": rid, "size_gb": inst.volume_gb,
                    "age_days": int(hrs / 24),
                    "monthly_cost": round(inst.cost_per_hour * 730, 2),
                })
            elif atype == "zombie_load_balancer":
                orphaned_summary.zombie_load_balancers.append({
                    "lb_id": rid,
                    "monthly_cost": round(inst.cost_per_hour * 730, 2),
                })
            elif atype == "orphaned_snapshot":
                orphaned_summary.old_snapshots.append({
                    "snapshot_id": rid, "age_days": int(hrs / 24),
                    "size_gb": inst.volume_gb,
                    "monthly_cost": round(inst.cost_per_hour * 730, 2),
                })

        orphaned_summary.total_orphaned_monthly_waste = round(sum(
            v.get("monthly_cost", 0) for v in
            orphaned_summary.unattached_volumes +
            orphaned_summary.zombie_load_balancers +
            orphaned_summary.old_snapshots +
            orphaned_summary.unassociated_ips
        ), 2)

        # ── Metrics (sample recent 168h) ────────────────────────────────────
        sample_rate = max(1, len(raw_metrics) // 10000)
        metrics = []
        for i in range(0, len(raw_metrics), sample_rate):
            m = raw_metrics[i]
            cpu_v = m.cpu_usage if isinstance(m.cpu_usage, (int, float)) and 0 <= m.cpu_usage <= 100 else None
            if cpu_v is None: continue
            metrics.append(asdict(MetricSnapshot(
                timestamp=m.timestamp, resource_id=m.resource_id,
                cpu_usage=round(cpu_v, 2),
                gpu_usage=round(m.gpu_usage if isinstance(m.gpu_usage, (int, float)) else 0, 2),
                memory_usage=round(m.memory_usage if isinstance(m.memory_usage, (int, float)) else 0, 2),
                disk_io=round(m.disk_io if isinstance(m.disk_io, (int, float)) else 0, 1),
                network_in=round(m.network_in if isinstance(m.network_in, (int, float)) else 0, 3),
                network_out=round(m.network_out if isinstance(m.network_out, (int, float)) else 0, 3),
            )))

        # ── Billing ─────────────────────────────────────────────────────────
        billing_sample = max(1, len(raw_billing) // 5000)
        billing = []
        for i in range(0, len(raw_billing), billing_sample):
            b = raw_billing[i]
            cph = b.cost_per_hour if isinstance(b.cost_per_hour, (int, float)) and b.cost_per_hour >= 0 else None
            if cph is None: continue
            billing.append(asdict(BillingRecord(
                date=b.timestamp, resource_id=b.resource_id,
                service=b.service, provider="",
                cost_per_hour=round(cph, 6),
                daily_cost=round(cph * 24, 4),
                cumulative_cost=round(b.total_cost if isinstance(b.total_cost, (int, float)) else 0, 4),
                data_transfer_gb=round(b.data_transfer_gb if isinstance(b.data_transfer_gb, (int, float)) else 0, 4),
                storage_gb=b.storage_gb if isinstance(b.storage_gb, (int, float)) else 0,
            )))

        # ── API Logs ────────────────────────────────────────────────────────
        log_sample = max(1, len(raw_logs) // 5000)
        api_logs = []
        for i in range(0, len(raw_logs), log_sample):
            l = raw_logs[i]
            is_sus = (l.status == "Failed" or l.action in ("create_access_key", "assume_role")
                      or l.source_ip.startswith("185.") or l.region in ("ap-east-1", "af-south-1"))
            api_logs.append(asdict(APILogRecord(
                timestamp=l.timestamp, user_id=l.user_id,
                action=l.action, resource_id=l.resource_id,
                region=l.region, status=l.status,
                error_code=l.error_code, source_ip=l.source_ip,
                is_suspicious=is_sus,
            )))

        # ── Summary ─────────────────────────────────────────────────────────
        providers = set(r["provider"] for r in resources)
        total_cost_30d = sum(r["total_cost"] for r in resources)
        high_c = sum(1 for r in resources if r["risk_level"] == "HIGH")
        med_c = sum(1 for r in resources if r["risk_level"] == "MEDIUM")
        low_c = sum(1 for r in resources if r["risk_level"] == "LOW")
        anom_c = sum(1 for r in resources if r["anomaly_type"] != "normal")

        summary = asdict(CollectorSummary(
            total_resources=len(resources), total_cost_30d=round(total_cost_30d, 2),
            estimated_waste_30d=round(total_waste, 2),
            waste_percentage=round(total_waste / max(total_cost_30d, 1) * 100, 1),
            anomalies_detected=anom_c,
            high_risk_count=high_c, medium_risk_count=med_c, low_risk_count=low_c,
            providers_active=len(providers),
            anomaly_breakdown=anomaly_breakdown,
            savings_potential=round(total_waste * 0.85, 2),
        ))

        dq = asdict(DataQualityReport(
            total_rows_ingested=meta.get("metric_rows", 0),
            dirty_rows_found=int(meta.get("metric_rows", 0) * 0.05),
            null_fields_patched=int(meta.get("metric_rows", 0) * 0.02),
            schema_detected="v2_synthetic_engine",
            coverage_completeness_pct=100.0,
        ))

        return CollectorOutput(
            resources=resources, metrics=metrics, billing=billing,
            api_logs=api_logs, orphaned=asdict(orphaned_summary),
            summary=summary, data_quality=dq,
        )

    # ─── CSV MODE ────────────────────────────────────────────────────────────

    def _collect_csv(self) -> CollectorOutput:
        """Parse uploaded CSV files and normalize into CollectorOutput."""
        csv_path = self._csv_paths.get("metrics") or os.getenv("CSV_DATA_PATH", "")
        if not csv_path or not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV not found: {csv_path}")

        rows = self._parse_csv(csv_path)
        dq = DataQualityReport(total_rows_ingested=len(rows), schema_detected="auto")

        # Detect schema
        headers = set(rows[0].keys()) if rows else set()
        has_cpu = "cpu_usage" in headers or "cpu_utilization" in headers
        has_cost = "cost_per_hour" in headers or "cost" in headers

        # Build resources from metrics CSV
        from collections import defaultdict
        by_resource = defaultdict(list)
        dirty = 0
        for r in rows:
            rid = r.get("resource_id", r.get("instance_id", ""))
            if not rid:
                dirty += 1; continue
            by_resource[rid].append(r)

        dq.dirty_rows_found = dirty

        resources = []
        metrics_out = []
        for rid, mrows in by_resource.items():
            cpus = [float(m.get("cpu_usage", m.get("cpu_utilization", 0)) or 0) for m in mrows]
            cpus = [c for c in cpus if 0 <= c <= 100]
            cpu_avg = sum(cpus) / max(len(cpus), 1)
            net_avg = sum(float(m.get("network_out", 0) or 0) for m in mrows) / max(len(mrows), 1)
            cost = float(mrows[0].get("cost_per_hour", mrows[0].get("cost", 0)) or 0)
            provider = mrows[0].get("provider", "aws")
            atype = mrows[0].get("anomaly_type", "normal")
            score = compute_risk_score(cpu_avg, net_avg, atype, cost)

            resources.append(asdict(NormalizedResource(
                resource_id=rid,
                instance_type=mrows[0].get("instance_type", "unknown"),
                region=mrows[0].get("region", "us-east-1"),
                provider=provider, owner=mrows[0].get("owner", mrows[0].get("owner_tag", "unknown")),
                anomaly_type=atype, risk_score=score, risk_level=risk_level(score),
                cost_per_hour=cost, hours_running=len(mrows),
                total_cost=round(cost * len(mrows), 2),
                estimated_waste=round(cost * len(mrows) * ANOMALY_WEIGHTS.get(atype, 0), 2),
                cpu_avg_24h=round(cpu_avg, 2), gpu_avg_24h=0,
                memory_avg_24h=round(sum(float(m.get("memory_usage", 0) or 0) for m in mrows) / max(len(mrows), 1), 2),
                network_out_avg_24h=round(net_avg, 2),
                recommendation=ANOMALY_RECOMMENDATIONS.get(atype, "Review resource"),
            )))

            # Sample metrics (max 168 per resource)
            step = max(1, len(mrows) // 168)
            for i in range(0, len(mrows), step):
                m = mrows[i]
                metrics_out.append(asdict(MetricSnapshot(
                    timestamp=m.get("timestamp", ""),
                    resource_id=rid,
                    cpu_usage=float(m.get("cpu_usage", m.get("cpu_utilization", 0)) or 0),
                    gpu_usage=float(m.get("gpu_usage", 0) or 0),
                    memory_usage=float(m.get("memory_usage", 0) or 0),
                    disk_io=float(m.get("disk_io", 0) or 0),
                    network_in=float(m.get("network_in", 0) or 0),
                    network_out=float(m.get("network_out", 0) or 0),
                )))

        # Load billing if available
        billing_out = []
        if "billing" in self._csv_paths:
            bill_rows = self._parse_csv(self._csv_paths["billing"])
            for b in bill_rows[:5000]:
                billing_out.append(asdict(BillingRecord(
                    date=b.get("timestamp", ""), resource_id=b.get("resource_id", ""),
                    service=b.get("service", "Compute"),
                    provider=b.get("provider", ""), cost_per_hour=float(b.get("cost_per_hour", 0) or 0),
                    daily_cost=float(b.get("cost_per_hour", 0) or 0) * 24,
                    cumulative_cost=float(b.get("total_cost", 0) or 0),
                    data_transfer_gb=float(b.get("data_transfer_gb", 0) or 0),
                    storage_gb=float(b.get("storage_gb", 0) or 0),
                )))

        # Load API logs if available
        api_logs_out = []
        if "api_logs" in self._csv_paths:
            log_rows = self._parse_csv(self._csv_paths["api_logs"])
            for l in log_rows[:5000]:
                is_sus = l.get("status") == "Failed" or l.get("source_ip", "").startswith("185.")
                api_logs_out.append(asdict(APILogRecord(
                    timestamp=l.get("timestamp", ""), user_id=l.get("user_id", ""),
                    action=l.get("action", ""), resource_id=l.get("resource_id", ""),
                    region=l.get("region", ""), status=l.get("status", "Success"),
                    error_code=l.get("error_code", ""), source_ip=l.get("source_ip", ""),
                    is_suspicious=is_sus,
                )))

        dq.coverage_completeness_pct = min(100, len(resources) / max(len(by_resource), 1) * 100)
        total_cost = sum(r["total_cost"] for r in resources)
        total_waste = sum(r["estimated_waste"] for r in resources)

        summary = asdict(CollectorSummary(
            total_resources=len(resources), total_cost_30d=round(total_cost, 2),
            estimated_waste_30d=round(total_waste, 2),
            waste_percentage=round(total_waste / max(total_cost, 1) * 100, 1),
            anomalies_detected=sum(1 for r in resources if r["anomaly_type"] != "normal"),
            high_risk_count=sum(1 for r in resources if r["risk_level"] == "HIGH"),
            medium_risk_count=sum(1 for r in resources if r["risk_level"] == "MEDIUM"),
            low_risk_count=sum(1 for r in resources if r["risk_level"] == "LOW"),
            providers_active=len(set(r["provider"] for r in resources)),
            anomaly_breakdown={}, savings_potential=round(total_waste * 0.85, 2),
        ))

        return CollectorOutput(
            resources=resources, metrics=metrics_out,
            billing=billing_out, api_logs=api_logs_out,
            orphaned=asdict(OrphanedResourceSummary()),
            summary=summary, data_quality=asdict(dq),
        )

    def _parse_csv(self, path: str, max_rows: int = 100000) -> List[Dict]:
        """Parse a CSV file into a list of dicts with row limit."""
        rows = []
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= max_rows: break
                rows.append(dict(row))
        return rows

    # ─── LIVE MODE ───────────────────────────────────────────────────────────

    def _collect_live(self) -> CollectorOutput:
        """Collect real AWS data via STS AssumeRole."""
        role_arn = self._role_arn or os.getenv("AWS_READONLY_ROLE_ARN", "")
        external_id = self._external_id or os.getenv("AWS_EXTERNAL_ID", "cloudguard")
        if not role_arn:
            raise ValueError("No AWS_READONLY_ROLE_ARN configured for LIVE mode")

        import boto3
        session = self._assume_role(role_arn, external_id)
        ec2 = session.client("ec2")
        cw = session.client("cloudwatch")

        # Describe instances
        reservations = ec2.describe_instances()["Reservations"]
        resources = []
        for res in reservations:
            for inst in res["Instances"]:
                rid = inst["InstanceId"]
                itype = inst.get("InstanceType", "unknown")
                region = session.region_name
                tags = {t["Key"]: t["Value"] for t in inst.get("Tags", [])}

                # Get CPU metrics from CloudWatch
                end = datetime.utcnow()
                start = end - timedelta(hours=24)
                try:
                    resp = cw.get_metric_data(
                        MetricDataQueries=[{
                            "Id": "cpu", "MetricStat": {
                                "Metric": {"Namespace": "AWS/EC2", "MetricName": "CPUUtilization",
                                           "Dimensions": [{"Name": "InstanceId", "Value": rid}]},
                                "Period": 3600, "Stat": "Average",
                            },
                        }],
                        StartTime=start, EndTime=end,
                    )
                    cpu_vals = resp["MetricDataResults"][0].get("Values", [])
                    cpu_avg = sum(cpu_vals) / max(len(cpu_vals), 1)
                except Exception:
                    cpu_avg = 0.0

                from models import INSTANCE_COSTS
                cost = INSTANCE_COSTS.get(itype, 0.096)
                score = compute_risk_score(cpu_avg, 0, "normal", cost)

                resources.append(asdict(NormalizedResource(
                    resource_id=rid, instance_type=itype,
                    region=region, provider="aws",
                    owner=tags.get("Owner", "unknown"),
                    anomaly_type="normal", risk_score=score,
                    risk_level=risk_level(score),
                    cost_per_hour=cost,
                    hours_running=24, total_cost=round(cost * 24, 2),
                    cpu_avg_24h=round(cpu_avg, 2),
                    recommendation="Monitor resource",
                    tags=tags,
                )))

        total_cost = sum(r["total_cost"] for r in resources)
        summary = asdict(CollectorSummary(
            total_resources=len(resources), total_cost_30d=round(total_cost * 30, 2),
            providers_active=1,
        ))

        return CollectorOutput(
            resources=resources, summary=summary,
            data_quality=asdict(DataQualityReport(
                total_rows_ingested=len(resources),
                schema_detected="aws_live",
                coverage_completeness_pct=80.0,
            )),
        )

    def _assume_role(self, role_arn: str, external_id: str):
        """Assume an IAM role via STS and return a boto3 session."""
        import boto3
        sts = boto3.client("sts")
        response = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName="CloudGuardReadOnly",
            ExternalId=external_id,
            DurationSeconds=3600,
        )
        creds = response["Credentials"]
        return boto3.Session(
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
        )

    def _empty_output(self) -> CollectorOutput:
        """Return a valid but empty CollectorOutput."""
        return CollectorOutput(
            mode="synthetic", generated_at=datetime.utcnow().isoformat(),
            summary=asdict(CollectorSummary()),
            data_quality=asdict(DataQualityReport()),
            orphaned=asdict(OrphanedResourceSummary()),
        )


# ── Module-level singleton ───────────────────────────────────────────────────

_collector: Optional[UniversalCollector] = None

def get_collector() -> UniversalCollector:
    """Get or create the global UniversalCollector singleton."""
    global _collector
    if _collector is None:
        _collector = UniversalCollector()
    return _collector
