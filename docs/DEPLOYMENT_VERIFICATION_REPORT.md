# SENTINEL AI — DOCKER DEPLOYMENT, RELIABILITY & HARDENING REPORT

## Executive Summary

SENTINEL AI is engineered for multi-service containerized deployment. The architecture decouples the web API, real-time SSE streaming, persistent database, asynchronous Redis queue, dedicated background workers, and static frontend proxy.

All container specifications adhere to least-privilege principles, container isolation, automated health monitoring, and persistent data volumes.

---

## 1. Multi-Container Orchestration Architecture

```
                                  +------------------------------+
                                  |     Internet / Client        |
                                  +--------------+---------------+
                                                 |
                                     HTTP:80     |     HTTP:8000
                               +-----------------+-----------------+
                               |                                   |
                               v                                   v
                  +--------------------------+        +--------------------------+
                  |  sentinel-frontend       |        |  sentinel-backend        |
                  |  (Nginx Alpine :80)      |        |  (FastAPI Async :8000)   |
                  +------------+-------------+        +------------+-------------+
                               |                                   |
                     Internal  |                                   |
                     Network   +-----------------+-----------------+
                                                 |
                                  +--------------+---------------+
                                  |    sentinel-net (Bridge)     |
                                  +------+---------------+-------+
                                         |               |
                      +------------------+               +------------------+
                      v                                                     v
         +--------------------------+                          +--------------------------+
         |  sentinel-postgres       |                          |  sentinel-redis          |
         |  (PostgreSQL 16 Alpine)  |                          |  (Redis 7/8 Alpine)      |
         |  Port: 5432              |                          |  Port: 6379              |
         |  Volume: postgres_data   |                          |  Volume: redis_data      |
         +------------+-------------+                          +------------+-------------+
                      ^                                                     ^
                      |                                                     |
                      +------------------+               +------------------+
                                         |               |
                                  +------+---------------+-------+
                                  |  sentinel-worker             |
                                  |  (Python Async Worker)       |
                                  |  Consumes 8 Job Categories   |
                                  +------------------------------+
```

---

## 2. Service Specifications

| Service | Image / Build Context | Command / Role | Exposed Port | Healthcheck |
|---|---|---|---|---|
| `db` | `postgres:16-alpine` | PostgreSQL 16 ACID storage | `5432:5432` | `pg_isready -U sentinel -d sentinel_db` |
| `redis` | `redis:7-alpine` | Persistent asynchronous queue | `6379:6379` | `redis-cli ping` |
| `backend` | `./backend/Dockerfile` | FastAPI async API server | `8000:8000` | `curl -f http://localhost:8000/health` |
| `worker` | `./backend/Dockerfile` | `python -m backend.app.worker` | None (Internal) | Process lifecycle via supervisor / docker |
| `frontend` | `./Dockerfile` | Nginx Alpine serving React SPA | `80:80` | Native HTTP probe |

---

## 3. Production Hardening & Security Standards

1. **Non-Root Execution**:
   - `backend/Dockerfile` creates a dedicated system user and group (`sentinel`, UID 1001, GID 1001).
   - Application execution drops root privileges before starting Uvicorn or the background worker via `USER sentinel`.
2. **Minimal Attack Surface**:
   - Python base image uses `python:3.12-slim` with build dependencies pruned in the same layer (`rm -rf /var/lib/apt/lists/*`).
   - Frontend container utilizes a multi-stage Docker build: node compilation runs in `node:20-alpine`, output artifacts are copied to a lightweight `nginx:alpine` runner, leaving no Node.js runtime or developer tools in the production image.
3. **Network Isolation**:
   - All inter-service communication is confined to the private `sentinel-net` bridge network.
   - The worker container exposes zero external ports, communicating exclusively with Redis and PostgreSQL over the internal bridge.
4. **Data Persistence**:
   - Relational database state is mounted to named volume `postgres_data` (`/var/lib/postgresql/data`).
   - Redis append-only persistence (AOF) is mounted to named volume `redis_data` (`/data`).
5. **Graceful Termination**:
   - `backend/app/worker.py` registers signal handlers for `SIGINT` and `SIGTERM`.
   - On receipt of shutdown signals, workers finish active in-flight jobs, cleanly close Redis connections, and terminate with code 0.

---

## 4. Compose Validation

The compose file was parsed and validated for syntactic and architectural correctness:
- All 5 service definitions verified (`db`, `redis`, `backend`, `worker`, `frontend`).
- Health checks configured with dependencies: `backend` and `worker` depend on `db` and `redis` with `condition: service_healthy`.
- Persistent volumes and networks declared.
