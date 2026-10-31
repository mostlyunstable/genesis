# SENTINEL AI — PHASE 3 IMPLEMENTATION PLAN
## Production Engineering & Enterprise Readiness Architecture

**Author:** Principal Backend Architect, Senior Python Engineer, Cybersecurity Engineer, DevOps Lead  
**Target Architecture:** Modular Monolith with Asynchronous Redis Workers & Scalable PostgreSQL Store  
**Status:** In Progress (Stage 1 Active)  

---

## 1. Engineering Principles & Objectives

1. **Production-Ready Data Plane:** Dual-database capability with PostgreSQL (`asyncpg`) as primary enterprise storage with connection pooling, transactional integrity, and health monitoring, while preserving SQLite WAL for isolated development.
2. **Persistent Asynchronous Processing:** Redis-backed job queues supporting exponential backoff, dead-letter queues, idempotent processing, and worker telemetry, replacing in-memory queues in production.
3. **Cryptographic Fingerprint Consistency:** Complete unification on SHA-256 for event deduplication and canonical audit hash chaining.
4. **Deterministic Threat Detection:** Multi-IP distributed brute force, horizontal spray, privilege escalation, and breach correlation operating 100% independently of generative AI.
5. **Grounded AI Security Architecture:** XML-bounded telemetry ingestion, hallucination stripping, rate-limit resilience, token metrics, and advisory-only privileges (no shell access).
6. **Defensive SOAR Orchestration:** Enrolled lab asset protection, strict CIDR exclusions, circuit breaker rate limits, action idempotency, and TTL expiration.
7. **Complete Immutability Chain:** SHA-256 hash chaining of audit events with previous-record verification and tamper detection.

---

## 2. Implementation Stages & Verification Gates

### Stage 1: Repository Audit & Architecture Validation
- Full codebase inspection, dependency inventory, and contract baseline.
- Establish `PHASE_3_IMPLEMENTATION_PLAN.md` and `PHASE_3_PROGRESS.md`.
- Gate: Baseline tests passing (58/58), environment dependencies enumerated.

### Stage 2: PostgreSQL Implementation & Verification
- Dual-engine async session factory (`backend/app/db/session.py`) with PostgreSQL connection pooling (`pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`).
- Alembic PostgreSQL dialect migration and verification tests.
- Connection retry logic, transactional rollback verification, and concurrent write safety tests.
- Deliverable: `docs/POSTGRESQL_VERIFICATION_REPORT.md`.

### Stage 3: Redis & Persistent Background Workers
- Redis connection manager with health probes and failover.
- Redis-backed persistent task worker with job categories (ingest, normalize, detect, incident, threat_intel, ai_investigate, notify).
- Dead-letter queue (DLQ), retry with exponential backoff, job status tracking, and graceful shutdown.
- Deliverable: `docs/REDIS_WORKER_REPORT.md`.

### Stage 4: Ingestion & Fingerprint Consistency
- Unification on SHA-256 for all event fingerprints (`EVT-2026-{sha256[:12]}`).
- Extended parser support: RFC 5424 Syslog, Okta authentication logs, Windows Event 4625/4624, Linux PAM, Linux SSH, JSON.
- Source authentication via `X-Sentinel-Forwarder-Key` and ingestion rate limiting.
- Gate: Deduplication, out-of-order handling, and schema validation tests.

### Stage 5: Deterministic Detection & Distributed Correlation
- Distributed multi-IP brute-force detection (`RULE-DISTRIB-003`) targeting single identities from $\ge 3$ distinct IPs.
- Suspicious privileged account activity and cross-asset authentication anomalies.
- Tunable sliding-window thresholds, MITRE ATT&CK mapping, positive and negative test cases.
- Deliverable: `docs/DETECTION_COVERAGE_REPORT.md`.

### Stage 6: Incident Intelligence Subsystem
- Automatic incident clustering, deduplication, and timeline construction.
- Deterministic, explainable risk scoring algorithm ($0-100$).
- Incident status lifecycle (`investigating`, `contained`, `resolved`, `false_positive`).
- Analyst assignment, incident comments, and resolution notes.

### Stage 7: AI Investigation & Threat Intelligence RAG
- Provider-independent AI investigator interface with Gemini API support and grounded local fallback.
- XML prompt injection boundaries and hallucinated event ID stripping.
- Structured threat intelligence indicators (IPs, domains, reputation, attribution, TTL).
- Security Knowledge Retrieval (RAG) over MITRE ATT&CK, Sigma rules, and defensive playbooks.
- Deliverable: `docs/AI_INTEGRATION_REPORT.md`.

### Stage 8: Policy-Controlled Response & Audit Integrity
- Canonical audit serialization and SHA-256 hash chaining (`previous_hash`, `record_hash`).
- Tamper detection validator traversing the hash chain.
- Enrolled lab asset verification, protected IP subnets, circuit breaker rate limits, and TTL expiration.
- Deliverable: `docs/RESPONSE_SECURITY_REPORT.md` and `docs/AUDIT_INTEGRITY_REPORT.md`.

### Stage 9: Complete API Contract & Real-Time Events
- Versioned `/api/v1` routers for all subsystems.
- Server-Sent Events (SSE) / WebSocket endpoint for real-time security telemetry streaming.
- Pagination, filtering, sorting, and OpenAPI schema compliance.

### Stage 10: Docker Deployment, Reliability & Hardening
- Multi-service `docker-compose.yml` (PostgreSQL, Redis, Backend, Frontend, Worker).
- Structured logging with correlation IDs, readiness/liveness health probes.
- Deliverable: `docs/DEPLOYMENT_VERIFICATION_REPORT.md` and `docs/FINAL_ENGINEERING_REPORT.md`.
