"""
CloudGuard AI — Universal Collector API Routes
Provides all FastAPI endpoints for the Universal Collector.
"""

import os, tempfile, logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from collectors.universal_collector import (
    get_collector, UniversalCollector, CollectorMode
)

logger = logging.getLogger("cloudguard.routes")
router = APIRouter(prefix="/api/collector", tags=["Universal Collector"])


class LiveConnectRequest(BaseModel):
    role_arn: str
    external_id: str = "cloudguard"

class SwitchModeRequest(BaseModel):
    mode: str  # "synthetic" | "csv" | "live"


@router.get("/status")
async def get_status():
    """Current collector mode, last scan time, and summary stats."""
    c = get_collector()
    output = c.collect()
    return {
        "mode": output.mode,
        "generated_at": output.generated_at,
        "summary": output.summary,
        "data_quality": output.data_quality,
    }


@router.get("/resources")
async def get_resources(
    provider: Optional[str] = None,
    anomaly_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    """List normalized resources with optional filters and pagination."""
    output = get_collector().collect()
    resources = output.resources

    if provider:
        resources = [r for r in resources if r.get("provider") == provider]
    if anomaly_type:
        resources = [r for r in resources if r.get("anomaly_type") == anomaly_type]
    if risk_level:
        resources = [r for r in resources if r.get("risk_level") == risk_level.upper()]

    start = (page - 1) * limit
    return {
        "total": len(resources),
        "page": page,
        "limit": limit,
        "resources": resources[start:start + limit],
    }


@router.get("/metrics/{resource_id:path}")
async def get_metrics(resource_id: str):
    """Metric snapshots for one resource (last 24h)."""
    output = get_collector().collect()
    metrics = [m for m in output.metrics if m.get("resource_id") == resource_id]
    # Return last 168 points (7 days hourly)
    return {"resource_id": resource_id, "metrics": metrics[-168:]}


@router.get("/billing")
async def get_billing(days: int = Query(30, ge=1, le=365)):
    """Billing records with optional day filter."""
    output = get_collector().collect()
    return {"days": days, "records": output.billing}


@router.get("/api-logs")
async def get_api_logs(suspicious_only: bool = False):
    """API activity logs, optionally filtered to suspicious only."""
    output = get_collector().collect()
    logs = output.api_logs
    if suspicious_only:
        logs = [l for l in logs if l.get("is_suspicious")]
    return {"total": len(logs), "logs": logs[:500]}


@router.get("/orphaned")
async def get_orphaned():
    """Orphaned resource summary (volumes, IPs, snapshots, zombie LBs)."""
    return get_collector().collect().orphaned


@router.get("/summary")
async def get_summary():
    """High-level collector summary for dashboard stats."""
    return get_collector().collect().summary


@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Accept CSV upload, switch to CSV mode, return CollectorOutput."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only .csv files accepted")

    # Save uploaded file to temp directory
    content = await file.read()
    tmp = os.path.join(tempfile.gettempdir(), f"cloudguard_{file.filename}")
    with open(tmp, "wb") as f:
        f.write(content)

    c = get_collector()
    c.switch_mode(CollectorMode.CSV)
    c.load_csv(tmp)
    output = c.collect()

    return {
        "mode": output.mode,
        "summary": output.summary,
        "data_quality": output.data_quality,
        "resources_count": len(output.resources),
        "generated_at": output.generated_at,
    }


@router.post("/connect-live")
async def connect_live(req: LiveConnectRequest):
    """Connect to live AWS via IAM Role ARN."""
    if not req.role_arn.startswith("arn:aws:iam::"):
        raise HTTPException(400, "Invalid ARN format. Expected: arn:aws:iam::ACCOUNT:role/NAME")

    c = get_collector()
    c.set_credentials(req.role_arn, req.external_id)
    c.switch_mode(CollectorMode.LIVE)

    try:
        output = c.collect()
        return {
            "mode": output.mode,
            "summary": output.summary,
            "data_quality": output.data_quality,
            "generated_at": output.generated_at,
        }
    except Exception as e:
        raise HTTPException(502, f"Live connection failed: {str(e)}")


@router.post("/switch-mode")
async def switch_mode(req: SwitchModeRequest):
    """Switch collector mode and return fresh data."""
    mode_map = {
        "synthetic": CollectorMode.SYNTHETIC,
        "csv": CollectorMode.CSV,
        "live": CollectorMode.LIVE,
    }
    mode = mode_map.get(req.mode)
    if not mode:
        raise HTTPException(400, f"Invalid mode: {req.mode}. Use synthetic/csv/live")

    c = get_collector()
    c.switch_mode(mode)
    output = c.collect()

    return {
        "mode": output.mode,
        "summary": output.summary,
        "data_quality": output.data_quality,
        "resources_count": len(output.resources),
        "generated_at": output.generated_at,
    }


@router.get("/data-quality")
async def get_data_quality():
    """Data quality report for current dataset."""
    return get_collector().collect().data_quality
