from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
from models import CloudGuardMLEngine

app = FastAPI(title="CloudGuard AI ML Engine", version="1.0.0")
ml_engine = CloudGuardMLEngine()


class TimeSeriesData(BaseModel):
    ds: str
    y: float

class ResourceMetrics(BaseModel):
    cpu_utilization: float
    memory_usage: float
    network_in: float
    network_out: float

class InfraEvent(BaseModel):
    region_code: float
    instance_count: float
    api_call_rate: float
    timestamp_hour: float


@app.post("/api/v1/detect/cost")
async def detect_cost_anomaly(data: List[TimeSeriesData]):
    """Model 1: Cost Anomaly Detection (Prophet)"""
    df = pd.DataFrame([d.dict() for d in data])
    df['ds'] = pd.to_datetime(df['ds'])

    results = ml_engine.detect_cost_anomaly(df)
    if results is None:
        raise HTTPException(status_code=400, detail="Insufficient data for Prophet forecasting")

    anomalies = results[results['is_anomaly'] == True]
    return {"anomalies_detected": len(anomalies), "details": anomalies[['ds', 'y', 'yhat_upper']].to_dict(orient="records")}


@app.post("/api/v1/detect/behavior")
async def detect_resource_behavior(metrics: List[ResourceMetrics]):
    """Model 2: Resource Behavior Detection (Isolation Forest)"""
    features = np.array([[m.cpu_utilization, m.memory_usage, m.network_in, m.network_out] for m in metrics])
    predictions = ml_engine.detect_resource_behavior(features)
    anomalies = [i for i, p in enumerate(predictions) if p == -1]
    return {"anomalies_detected": len(anomalies), "anomaly_indices": anomalies}


@app.post("/api/v1/detect/abuse")
async def detect_abuse(metrics: List[ResourceMetrics]):
    """Model 3: Resource Abuse Detection (XGBoost)"""
    features = np.array([[m.cpu_utilization, m.memory_usage, m.network_in, m.network_out] for m in metrics])
    probabilities = ml_engine.detect_abuse(features)
    anomalies = [i for i, p in enumerate(probabilities) if p > 0.90]
    return {"anomalies_detected": len(anomalies), "abuse_probabilities": probabilities.tolist()}


@app.post("/api/v1/detect/infrastructure")
async def detect_infrastructure_behavior(events: List[InfraEvent]):
    """Model 4: Infrastructure Behavior Detection (DBSCAN)"""
    features = np.array([[e.region_code, e.instance_count, e.api_call_rate, e.timestamp_hour] for e in events])
    labels = ml_engine.detect_infrastructure_behavior(features)
    anomalies = [i for i, l in enumerate(labels) if l == -1]
    return {
        "anomalies_detected": len(anomalies),
        "anomaly_indices": anomalies,
        "cluster_labels": labels.tolist(),
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CloudGuard ML Engine", "models": ["prophet", "isolation_forest", "xgboost", "dbscan"]}
