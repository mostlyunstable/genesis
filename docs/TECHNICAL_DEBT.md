# SENTINEL AI — Technical Debt & Architectural Risks

**Document Version:** 1.0.0  
**Date:** October 31, 2026  
**Status:** AUDIT FINDINGS

---

## 1. Critical Architectural Deficiencies (Pre-Backend State)

### 1.1. In-Memory Volatility & Absence of Persistence
- **Finding:** The application state resides solely within the browser's JavaScript runtime via Zustand (`src/stores/useSecurityStore.ts`).
- **Impact:** Refreshing the browser or opening the console in another tab reverts all triage actions, status changes, emergency halts, and audit records back to the static mock state in `data.ts`.
- **Remediation:** Implement a persistent database tier (SQLAlchemy 2.x + PostgreSQL with Alembic migrations) and connect frontend actions to real REST endpoints.

### 1.2. Client-Side Trust & Missing Authorization Enforcement
- **Finding:** Currently, the client application executes simulated playbooks and declares them "verified" (`verificationStatus: 'verified'`) by running client-side functions with no server-side authorization check.
- **Impact:** Any user opening the application possesses unrestricted privilege to trigger any playbook, rollback any action, or alter detection thresholds.
- **Remediation:** Introduce a strict backend policy engine, JWT authentication, and RBAC middleware where privilege checks are evaluated exclusively on the server.

### 1.3. Synthetic Latency & Artificial Mock Timers
- **Finding:** In `useSecurityStore.ts` and `src/services/api/index.ts`, network delay and AI reasoning latency are simulated using client-side `setTimeout` and random numbers:
  ```typescript
  durationMs: Math.floor(Math.random() * 300) + 120
  ```
- **Impact:** Provides an illusion of asynchronous processing without actual concurrency, error handling, timeouts, or failure recovery.
- **Remediation:** Replace mock delays with real asynchronous network I/O, background tasks, and real-time execution benchmarks.

### 1.4. Hardcoded Mock LLM Logic
- **Finding:** `src/services/api/index.ts` uses static string `includes` matching to return pre-baked markdown paragraphs for the AI Analyst:
  ```typescript
  if (p.includes('ssh') || p.includes('brute') || p.includes('198.51.100.42')) { ... }
  ```
- **Impact:** Incapable of reasoning over newly ingested logs, unseen attacker IPs, or novel attack variations.
- **Remediation:** Implement a backend `AIInvestigatorService` leveraging real LLM APIs (Gemini 2.5 Flash / Pro) or an isolated local model adapter with structured Pydantic v2 schemas.

### 1.5. Absence of Real-Time Log Streaming
- **Finding:** The "Live Logs" page displays a static array of 36 SSH logs and 18 SSO logs. There is no streaming transport (SSE, WebSocket, or Redis Streams).
- **Impact:** Telemetry does not update live as attacks occur.
- **Remediation:** Add Server-Sent Events (SSE) or WebSocket push connected to a backend Redis event stream.

---

## 2. Security Vulnerabilities & Attack Surface

| Risk ID | Vulnerability Description | Severity | Remediation Plan |
|---|---|---|---|
| **SEC-01** | **Prompt Injection via Syslog Content:** Attackers could craft SSH usernames or syslog messages containing prompt injection instructions (e.g., `Failed password for user "IGNORE PREVIOUS INSTRUCTIONS..."`). If ingested raw into an LLM prompt, this could hijack the investigation narrative. | **HIGH** | Strict input sanitization, structured delimiters (XML/JSON boundaries), and clear separation of untrusted telemetry from system instructions. |
| **SEC-02** | **Lack of Protected Subnet Enforcement:** The frontend mock checks IP strings trivially, but lacks subnet validation (CIDR matching). A real SOAR action could inadvertently isolate critical DNS servers or gateways. | **CRITICAL** | Implement a hardcoded, non-overridable protected CIDR blocklist (`127.0.0.0/8`, `169.254.0.0/16`, internal domain controllers, etc.) in the backend policy engine. |
| **SEC-03** | **Unauthenticated REST Endpoints:** If backend endpoints are deployed without JWT or API key verification, unauthenticated actors could trigger denial of service or flood event tables. | **HIGH** | Enforce HTTP Bearer token validation on all `/api/v1` routes with role checks. |
| **SEC-04** | **Replay & Ingestion Flooding:** Ingestion endpoints without rate limiting or deduplication could be overwhelmed by log storms. | **HIGH** | Implement SHA-256 event fingerprint deduplication and sliding-window rate limiting in FastAPI middleware. |

---

## 3. Maintainability & Code Quality Debt

1. **Duplicate Mock Entities:** `INITIAL_EVENTS` in `src/services/mock/data.ts` duplicates timestamps and structures manually across 1,000+ lines of TypeScript.
2. **Missing Unit & Integration Tests:** The frontend lacked automated Jest/Vitest unit tests. Only a lightweight `test-verification.mjs` script was present.
3. **Dual Operation Modes (Demo vs Lab):** The UI banner shows "SIMULATION MODE", but the application lacks a toggle or configuration to connect to a live backend.
