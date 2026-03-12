# CloudGuard AI

**AI-Powered Multi-Cloud Cost Leakage, Resource Abuse Detection & Optimization Platform**

CloudGuard AI is a production-grade multi-cloud observability, FinOps optimization, and security intelligence platform. It detects, explains, predicts, and optimizes cloud infrastructure inefficiencies and security threats across **AWS**, **Azure**, and **GCP**.

---

## Features

| Capability | Description |
|-----------|-------------|
| **AI Anomaly Detection** | 4 ML models (Prophet, Isolation Forest, XGBoost, DBSCAN) detect cost anomalies, idle resources, cryptomining, and infrastructure abuse |
| **Signal Fusion Engine** | Combines all model outputs into a unified risk score (0–100) |
| **Root Cause Analysis** | Explains _why_ anomalies occurred with metric evidence |
| **Cost Attribution** | Identifies which resource/owner/service caused a cost spike |
| **Financial Waste Estimator** | Calculates idle hours × resource cost = estimated waste |
| **Preventive Cost Guard** | Predicts cost leaks _before_ they happen via trend analysis |
| **AI Optimization Agent** | Gemini-powered recommendations with confidence scores |
| **Auto-Remediation** | One-click remediation: stop, resize, or terminate resources |
| **Multi-Cloud Support** | Collectors for AWS CloudWatch, Azure Monitor, GCP Cloud Monitoring |
| **Synthetic Data Engine** | V2.0 simulator generating realistic cloud scenarios |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TailwindCSS 4, Chart.js, Lucide Icons |
| Backend | Node.js, Express, TypeScript, SQLite (better-sqlite3) |
| AI/ML | Python, FastAPI, scikit-learn, Prophet, XGBoost |
| AI Agent | Google Gemini API (optimization recommendations) |
| Deployment | Docker, docker-compose |

---

## Project Structure

```
├── backend/
│   ├── api/routes.ts              # REST API endpoints
│   ├── db.ts                      # SQLite schema + seed data
│   ├── models/
│   │   ├── detector.ts            # 4-model AI detection engine
│   │   ├── root_cause.ts          # Root cause analyzer
│   │   ├── cost_attribution.ts    # Cost attribution + waste estimator
│   │   └── preventive_guard.ts    # Preventive cost guard
│   ├── pipeline/
│   │   ├── ingestion.ts           # Data cleaning + feature engineering
│   │   └── v2_loader.ts           # V2 CSV data loader
│   ├── collectors/simulator.ts    # Real-time data simulator
│   ├── fusion_engine/scorer.ts    # Signal fusion risk scoring
│   └── optimization_agent/optimizer.ts  # Gemini AI optimizer
├── src/
│   ├── App.tsx                    # React router + layout
│   ├── pages/                     # 8 dashboard pages
│   ├── components/                # Sidebar, DataSourceSelector
│   └── context/                   # CollectorContext
├── python_services/
│   ├── collectors/                # AWS, Azure, GCP collectors
│   ├── ml_engine/                 # FastAPI ML service (Prophet/IF/XGB/DBSCAN)
│   └── generate_training_data.py  # Synthetic training data generator
├── Synthetic Engine (v2.0)/       # V2 cloud simulator + CSV datasets
├── docker/                        # Dockerfiles + docker-compose
├── configs/config.yaml            # Model configuration
└── server.ts                      # Express + Vite dev server
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- npm

### Run locally
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Set up Gemini AI (optional, for AI recommendations)
1. Get a [Gemini API key](https://ai.google.dev/)
2. Set `GEMINI_API_KEY` in `.env`

### Run with Docker
```bash
cd docker
docker-compose up --build
```

---

## Dashboard Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Live CPU/cost charts, risk gauge, provider breakdown, anomaly distribution, risk scores |
| **Alerts** | Real-time alerts with severity filtering, root cause detail, remediation actions |
| **Resource Explorer** | All resources with anomaly types, cost, metrics drawer, orphaned detection |
| **Cost Optimization** | AI recommendations with confidence, estimated savings, one-click remediation |
| **Billing Explorer** | 30-day cost timeline, provider/service cost breakdown, top spenders |
| **Security Threats** | Cryptomining detection, infrastructure abuse analysis, investigation modal |
| **API Activity** | CloudTrail-style log viewer, attacker fingerprinting, suspicious activity |
| **Settings** | Detection thresholds, auto-remediation config, display preferences |

---

## AI Detection Models

| Model | Algorithm | Detects |
|-------|-----------|---------|
| Model 1 | Prophet Time Series | Cost anomalies / billing spikes |
| Model 2 | Isolation Forest | Idle resources / abnormal behavior |
| Model 3 | XGBoost Classifier | Cryptomining / resource abuse |
| Model 4 | DBSCAN Clustering | Infrastructure behavior anomalies |

### Risk Score Formula
```
Final Score = 0.4 × Cost + 0.3 × Resource + 0.2 × Behavior + 0.1 × Abuse
```

---

## Data Sources

| Mode | Description |
|------|-------------|
| **SYNTHETIC** | V2.0 Synthetic Cloud Reality Engine — 15 resources, 7 behavior profiles |
| **CSV** | Upload AWS CUR, CloudWatch, Azure, or GCP export CSVs |
| **LIVE** | Connect to real AWS/Azure/GCP accounts via IAM roles |

---

## License

Private — CloudGuard AI
