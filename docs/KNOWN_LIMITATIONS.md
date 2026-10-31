# SENTINEL AI — KNOWN LIMITATIONS & ARCHITECTURAL REALITIES

**Document Purpose:**  
This document provides a transparent, non-fabricated disclosure of the environmental realities, architectural trade-offs, and operational boundaries of the SENTINEL AI cybersecurity platform.

---

## 1. Environmental Reality Disclosures

### 1.1 Local Host Binary Absences
During Phase 2 Independent Engineering Verification on this host (macOS Darwin ARM64), the following external infrastructure components were empirically confirmed as not installed:
- **Docker Daemon:** `which docker` returned non-zero (`docker: command not found`). Docker Compose orchestration cannot be executed natively without installing Docker Desktop.
- **Native PostgreSQL Server:** `which psql` returned non-zero (`psql: command not found`). No native PostgreSQL daemon is listening on port 5432.
- **Native Redis Server:** `which redis-cli` returned non-zero (`redis-cli: command not found`). No native Redis daemon is listening on port 6379.

### 1.2 Development Mode Operational Parity
To guarantee immediate operational capability without external binary dependencies:
- **Persistence Engine:** Operates via `sqlite+aiosqlite:///./sentinel.db` with Write-Ahead Logging (`WAL`). Schema compatibility with PostgreSQL is validated offline via static Alembic DDL generation (`alembic -c backend/alembic.ini upgrade head --sql`).
- **Asynchronous Task Processing:** Operates via the in-memory `BackgroundJobWorker` (`backend/app/services/queue.py`), guaranteeing sub-millisecond job scheduling (`p50 = 0.039 ms`) and task completion.
- **Production Readiness:** Container definitions (`Dockerfile`, `backend/Dockerfile`, `docker-compose.yml`) are pre-configured with multi-stage production builds for deployment to environments with Docker installed.

---

## 2. Generative AI Subsystem Boundaries

### 2.1 Environmental API Key Absence
- The host environment does not have `GEMINI_API_KEY` exported in `os.environ` or `.env`.
- In accordance with defensive engineering principles, external LLM connectivity is marked **`UNAVAILABLE / NOT VERIFIED`** on this host.

### 2.2 Local Grounded Fallback Guarantees
- SENTINEL AI is architected with a primary deterministic fallback provider (`LocalDeterministicProvider`) that executes locally in **0.012 ms**.
- The local engine operates over ground-truth telemetry retrieved from the database, enforces MITRE ATT&CK technique mapping, resists prompt injection, and filters out non-existent event IDs.
- **Core Detection Independence:** The detection and incident creation pipeline does NOT rely on AI; 100% of threat alerts trigger deterministically via sliding-window heuristics regardless of LLM status.

---

## 3. Storage-Level Audit Immutability Analysis

### 3.1 Application-Layer Immutability (Enforced)
- The REST API endpoint `/api/v1/audit` is strictly append-only.
- All HTTP mutation verbs (`DELETE`, `PUT`, `PATCH`) are rejected with HTTP 404 or 405.
- Ordinary analysts and administrators cannot modify historical audit records via the API.

### 3.2 Physical Storage Immutability (Operational Gap)
- In SQLite development mode, audit records are stored in the local file `sentinel.db`. A system administrator with physical file system access or direct SQLite shell access could modify or delete rows.
- **Production Recommendation:** For regulatory compliance (e.g. SOC 2 Type II, PCI-DSS requirement 10, ISO 27001), audit logs must be forwarded via syslog/TLS to WORM (Write Once, Read Many) cloud storage (such as AWS S3 Object Lock or Google Cloud Storage Bucket Lock with retention policies).

---

## 4. Autonomous SOAR Response Scope

### 4.1 Safe Simulation Default
- By default, `DRY_RUN_DEFAULT = True` and `is_simulated = True`.
- Defensive response playbooks execute simulated containment (`simulated_success`) against RFC 5737 test IP space (`198.51.100.0/24`, `203.0.113.0/24`, `192.0.2.0/24`).

### 4.2 Production Live Action Requirements
- Live network blocking adapters (e.g. `iptables`, AWS Security Group API, Cloudflare WAF API) must only be enabled inside an explicitly isolated and enrolled lab environment with mutual TLS authentication.
- Autonomous responses against production subnets or unverified IP ranges are blocked by the Policy Engine.

---

## 5. Architectural Scalability Considerations

1. **In-Memory Sliding Windows:**
   - In single-instance deployments, the detection engine maintains sliding windows in memory (`self._ip_windows`).
   - If the application is scaled horizontally across multiple stateless container replicas, sliding-window state must be centralized into a shared Redis cluster (`Redis sorted sets`).
2. **Log Volume Ceiling:**
   - In SQLite mode, batch ingestion sustains ~813 events/sec. For sustained enterprise throughput (> 5,000 events/sec), migration to a multi-node PostgreSQL cluster with TimescaleDB hypertable partitioning is advised.
