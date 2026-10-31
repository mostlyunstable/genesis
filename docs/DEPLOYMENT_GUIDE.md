# SENTINEL AI — Production & Lab Deployment Guide

**Document Version:** 1.0.0  
**Date:** October 31, 2026  
**Status:** PRODUCTION DEPLOYMENT SPECIFICATION

---

## 1. Quickstart: Local Standalone Development Mode

### 1.1. Backend Service (FastAPI)
```bash
# 1. Activate Python virtual environment
source backend/.venv/bin/activate

# 2. Run database migrations / seed
python -m backend.app.db.init_db

# 3. Start Uvicorn ASGI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The interactive OpenAPI documentation is immediately available at `http://localhost:8000/docs`.

### 1.2. Frontend Service (React + Vite)
```bash
# 1. Start development server
npm run dev

# 2. Build for production and preview
npm run build
npm run preview -- --port 4173
```
Access the SecOps Command Center at `http://localhost:5173`.

---

## 2. Docker Compose Production / Lab Stack

To run the complete isolated stack (PostgreSQL 16, Redis 7, FastAPI Backend, and Nginx Frontend):

```bash
# Build and start all services in the background
docker compose up -d --build

# Inspect service health and logs
docker compose ps
docker compose logs -f backend
```

### Port Assignments:
- **Frontend Console:** `http://localhost` (Port 80)
- **Backend API Gateway:** `http://localhost:8000` (Port 8000)
- **PostgreSQL Database:** `localhost:5432` (Port 5432)
- **Redis Streams:** `localhost:6379` (Port 6379)

---

## 3. Telemetry Forwarder Integration

Forwarders ship authentication logs by sending HTTP POST requests to `/api/v1/ingest/batch`:

```bash
curl -X POST http://localhost:8000/api/v1/ingest/batch \
  -H "Content-Type: application/json" \
  -H "X-Sentinel-Forwarder-Key: sentinel_fwd_live_9942a8b9e1" \
  -d '{
    "source": "linux_ssh",
    "logs": [
      {
        "timestamp": "2026-10-31T10:15:00Z",
        "raw": "Oct 31 10:15:00 bastion-01 sshd[12401]: Failed password for invalid user root from 198.51.100.42 port 41201 ssh2"
      }
    ]
  }'
```

---

## 4. Operational Runbook & Safety Protocols

1. **Emergency Kill Switch:**
   - In the event of unintended automated containment, invoke `/api/v1/response/emergency-toggle` with `{"enabled": false}` or click "EMERGENCY HALT" on the console navigation.
   - All SOAR playbook executions are immediately halted.
2. **Protected IP Safety:**
   - The Policy Engine strictly rejects countermeasure execution against internal DNS, gateways, domain controllers, or loopback interfaces (`127.0.0.0/8`, `169.254.0.0/16`, `10.240.0.1`, `10.240.0.5`).
3. **Auditing & Compliance:**
   - All policy decisions, detections, and defensive actions are permanently logged to the `audit_records` table and exportable to structured JSON from `/api/v1/audit`.
