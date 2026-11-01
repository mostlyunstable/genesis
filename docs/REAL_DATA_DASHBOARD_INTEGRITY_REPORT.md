# SENTINEL AI — Real Data Only: Dashboard Integrity Overhaul Report
**Comprehensive Audit & Architectural Deliverable**
**Core Principle: Empty but honest is better than populated with lies.**

---

## 1. Executive Summary

Every instance of mock, fake, hardcoded, simulated, placeholder, and frontend-invented operational data has been systematically removed from the SENTINEL AI dashboard. 

The entire dashboard presentation layer is now directly coupled to the actual state of the backend database:
- **Default State**: A fresh installation displays genuine empty states ("0 events ingested", "No incidents detected", "Technique mapping will appear when detections are available").
- **Real-Time Synchronisation**: When telemetry is ingested via `/api/v1/ingest/batch`, the backend parses and normalizes logs, triggers detection rules, updates SQLite tables, and the dashboard automatically reflects the updated metrics via `/api/v1/analytics/overview`.
- **Zero Mock Data in Production**: All mock arrays (`INITIAL_EVENTS`, `INITIAL_INCIDENTS`, `INITIAL_DETECTIONS`, `AUTH_VOLUME_DATA`, `CORP_ASSETS`, hardcoded `8.42M`, hardcoded `INC-2026-0042`, `Math.random()`) were purged from production execution paths.
- **5-State Architecture**: All widgets support Loading, Successful Data, Clean Empty, API Error, and Stale Data states with last-sync timestamps.

---

## 2. List of Removed Mock-Data Sources

1. **`src/services/mock/data.ts` Imports**:
   - Completely decoupled from `useSecurityStore.ts` and `api/index.ts`.
   - Purged `INITIAL_EVENTS` (1,280,000 synthetic events).
   - Purged `INITIAL_INCIDENTS` (fake incident objects with invented AI summaries).
   - Purged `INITIAL_DETECTIONS` (fake brute-force anomalies).
   - Purged `INITIAL_ACTIONS` (synthetic response log).
   - Purged `INITIAL_AUDIT_RECORDS` (static audit entries).

2. **Hardcoded Metric Figures**:
   - Removed hardcoded `8.42M` telemetry metric in Overview telemetry ribbon and Sidebar indicator.
   - Removed hardcoded `35 failed attempts` and `0.38 attempts/sec` in Overview working hypothesis card.
   - Replaced all static KPI counters with real backend aggregations (`SELECT count(*)`).

3. **Fallback Objects & Fake Identifiers**:
   - Removed fallback incident object `INC-2026-0042` with target `198.51.100.42` in `OverviewPage.tsx`.
   - Removed hardcoded evidence artifacts (`EV-01`, `EV-02`, `EV-03`, `HY-01`, `HY-02`) in `AIInvestigatorPage.tsx`. Evidence is now derived directly from persisted incident telemetry and AI summaries.
   - Removed hardcoded enterprise assets array (`CORP_ASSETS`) in `AssetsPage.tsx`. Assets are now derived from active forwarder log sources and observed endpoints.
   - Removed hardcoded active MITRE technique mapping in `MitreMatrixPage.tsx`. Techniques are now mapped dynamically only when observed in actual detections or incidents.
   - Removed static chart dataset `AUTH_VOLUME_DATA` in `DashboardPage.tsx`.
   - Removed hardcoded event ID `EVT-2026-SSH-036` expansion in `SecurityEventsPage.tsx`.
   - Removed hardcoded audit record `AUD-2026-1049` in `AuditTrailPage.tsx`.

4. **Synthetic Generators & Fallback Switches**:
   - Removed `Math.random()` from `useSecurityStore.ts` (replaced with deterministic timestamps and standard UUID generation).
   - Removed `liveBackendMode` local storage switch in `src/services/api/index.ts`. The API client now connects directly to the real FastAPI backend on every call.
   - Removed silent error swallows that fell back to mock data or substituted fake "HEALTHY" statuses when backend checks failed.

---

## 3. Backend Endpoints & Database Mapping

| Dashboard Widget / Feature | Backend API Endpoint | Database Table(s) | Aggregation & Query Logic |
|---|---|---|---|
| **Total Ingested Events** | `GET /api/v1/analytics/overview` | `security_events` | `SELECT count(id) FROM security_events` |
| **Events Over Time Timeline** | `GET /api/v1/analytics/events-timeline?window=24h` | `security_events` | Chronological bucketing within requested window (`1h`, `24h`, `7d`, `30d`) |
| **Active Incidents** | `GET /api/v1/analytics/overview` | `incidents` | `SELECT count(id) FROM incidents WHERE status IN ('active', 'investigating', 'open')` |
| **Open Investigations** | `GET /api/v1/analytics/overview` | `incidents` | `SELECT count(id) FROM incidents WHERE status = 'investigating'` |
| **Resolved Incidents** | `GET /api/v1/analytics/overview` | `incidents` | `SELECT count(id) FROM incidents WHERE status IN ('resolved', 'contained', 'closed')` |
| **Incident Severity Breakdown** | `GET /api/v1/analytics/overview` | `incidents` | `SELECT severity, count(id) FROM incidents GROUP BY severity` |
| **Confirmed Detections** | `GET /api/v1/analytics/overview` | `detections` | `SELECT count(id) FROM detections` |
| **Critical Detections** | `GET /api/v1/analytics/overview` | `detections` | `SELECT count(id) FROM detections WHERE severity = 'critical'` |
| **MITRE Technique Distribution** | `GET /api/v1/analytics/overview` | `incidents`, `detections` | Extracted from persisted `mitre_attack` JSON arrays; reports technique IDs and occurrence counts |
| **Response Actions Summary** | `GET /api/v1/analytics/overview` | `response_actions` | `SELECT status, count(id) FROM response_actions GROUP BY status` |
| **System & Engine Health** | `GET /api/v1/analytics/overview` | `log_sources`, `settings` | Live `SELECT 1` latency probe, active forwarders count, and autonomous defense toggle status |
| **Live Telemetry Stream** | `GET /api/v1/events?limit=...` | `security_events` | Paginated, filtered query ordered by `timestamp DESC` |
| **Incident Command Queue** | `GET /api/v1/incidents` | `incidents` | Full incident records with timeline, evidence, and assigned playbooks |
| **Incident Status Update** | `PATCH /api/v1/incidents/{id}/status` | `incidents` | Lifecycle transition with validation and audit timeline entry |
| **SOAR Playbooks & Actions** | `GET /api/v1/response/playbooks`, `/actions` | `response_playbooks`, `response_actions` | Real playbook definitions and persisted execution history |
| **Cryptographic Audit Trail** | `GET /api/v1/audit`, `/audit/verify` | `audit_records` | SHA-256 block hash chaining validation across all journal records |

---

## 4. UI 5-State Architecture

Every dashboard widget and page now supports all 5 operational states:

1. **Loading State**: Subtle pulsing skeleton placeholders indicate ongoing network synchronization.
2. **Successful Data State**: Real persisted records are rendered with accurate metrics, risk scores, and badges.
3. **Clean Empty State**: Intentional, reassuring empty states when no activity has occurred:
   - *Overview*: "No events ingested yet" · "0 Active Incidents (Secure)" · "No actions taken"
   - *Incidents*: "No incidents detected. No threat clusters meet escalation thresholds."
   - *Telemetry*: "Waiting for incoming security telemetry. Forward Syslog or JSON logs to /api/v1/ingest/batch."
   - *MITRE ATT&CK*: "Technique mapping will appear when detections are available."
   - *Investigator*: "No Active Investigations. Ingest security telemetry to initiate real-time AI reasoning."
4. **API Error State**: If the backend is unreachable, a persistent warning banner alerts the user:
   `Backend Telemetry Unavailable: Failed to fetch metrics from backend. Ensure FastAPI backend server is running on http://127.0.0.1:8000.` with a direct "Retry Connection" button.
5. **Stale Data State**: If network synchronization fails after previous successful fetches, the UI displays:
   `Showing stale cached data from [time]. Synchronizing with backend...` with a "Refresh Now" trigger.

---

## 5. Verification Results

### 5.1 Automated Unit & Integration Tests
- **Analytics Tests (`backend/tests/test_analytics.py`)**:
  - `test_fresh_empty_database_metrics`: **PASSED** (all metrics return 0s and empty lists).
  - `test_insert_actual_security_events`: **PASSED** (totalEvents increments to 2, eventsOverTime timeline creates buckets).
  - `test_insert_actual_incidents_and_severity_distribution`: **PASSED** (activeIncidents updates to 2, critical=1, warning=1, MITRE distribution maps techniques).
  - `test_change_incident_status_metrics_transition`: **PASSED** (activeIncidents transitions 1 -> 0, resolvedIncidents transitions 0 -> 1).
  - `test_date_filters_and_time_windows`: **PASSED** (1h, 24h, 7d, 30d, all windows return valid data).
- **Full Backend Suite**: **93 passed**, 11 deselected (Postgres/Redis services), **0 failed** (18.72s).
- **Frontend Production Build**: `npm run build` succeeds in **1.04s** with **0 TypeScript errors**.

### 5.2 Live Database Ingestion Verification
Executed `scripts/test_live_ingest_and_verify.py` against running FastAPI backend on `http://127.0.0.1:8000`:
- Ingested 16 real RFC 5424 SSH authentication events.
- Response: `202 ACCEPTED` (`normalizedCount: 16`).
- Detection engine evaluated rules:
  - Generated 2 real detections: `ssh_brute_force` and `privilege_targeting`.
  - Correlated 1 real high-severity Incident.
  - Automatically mapped MITRE ATT&CK techniques `T1110.001` and `T1078.002`.
- Overview endpoint `/api/v1/analytics/overview` accurately reported:
  - `totalEvents: 16`
  - `activeIncidents: 1`
  - `incidentSeverityDistribution: {"high": 1}`
  - `totalDetections: 2`
  - `mitreTechniqueDistribution`: 2 mapped techniques.

### 5.3 Screenshot Evidence
Full desktop screenshots captured with Puppeteer:
- **Empty Database State**: Archived in [`docs/screenshots/empty-db/`](file:///Users/mayankkumar/genysis/docs/screenshots/empty-db/)
  - `command-center-desktop.png` (0 events, 0 incidents, empty states)
  - `security-events-desktop.png` ("Waiting for incoming security telemetry")
  - `incidents-desktop.png` ("No incidents detected")
  - `ai-investigator-desktop.png` ("No Active Investigations")
  - `detection-engine-desktop.png` ("No detections generated")
  - `threat-intelligence-desktop.png`
  - `response-operations-desktop.png`
  - `audit-trail-desktop.png`
  - `system-configuration-desktop.png`
- **Populated Database State**: Archived in [`docs/screenshots/populated-db/`](file:///Users/mayankkumar/genysis/docs/screenshots/populated-db/)
  - Captures the exact dashboard state after ingesting 16 real security events with correlated incidents, live timeline, and active telemetry stream.

---

## 6. Files Changed

1. **Backend Schemas & API**:
   - [`backend/app/schemas/analytics.py`](file:///Users/mayankkumar/genysis/backend/app/schemas/analytics.py) *(New)*: Pydantic schemas for overview metrics and timelines.
   - [`backend/app/api/v1/analytics.py`](file:///Users/mayankkumar/genysis/backend/app/api/v1/analytics.py) *(New)*: Real database aggregations for events, incidents, severities, MITRE, and health.
   - [`backend/app/api/v1/router.py`](file:///Users/mayankkumar/genysis/backend/app/api/v1/router.py): Mounted `/analytics` endpoint.
   - [`backend/app/schemas/incident.py`](file:///Users/mayankkumar/genysis/backend/app/schemas/incident.py): Made AISummarySchema fields optional with defaults to prevent validation crashes.
   - [`backend/tests/test_analytics.py`](file:///Users/mayankkumar/genysis/backend/tests/test_analytics.py) *(New)*: Automated test suite for empty database, ingestion, status changes, and time windows.

2. **Frontend API & Stores**:
   - [`src/types/index.ts`](file:///Users/mayankkumar/genysis/src/types/index.ts): Added `OverviewMetrics`, `EventsTimelinePoint`, `MitreTechniqueCount`, and `SystemHealthSummary`.
   - [`src/services/api/index.ts`](file:///Users/mayankkumar/genysis/src/services/api/index.ts): Reconstructed as a 100% real backend client; removed `liveBackendMode` and all mock fallbacks.
   - [`src/stores/useSecurityStore.ts`](file:///Users/mayankkumar/genysis/src/stores/useSecurityStore.ts): Initialized all collections to empty `[]`; added `overviewMetrics`, `error`, `isStale`, `lastUpdated`, and backend fetch actions.

3. **Frontend Pages & Components**:
   - [`src/features/overview/OverviewPage.tsx`](file:///Users/mayankkumar/genysis/src/features/overview/OverviewPage.tsx): Rebuilt with real data, 5-state handling, zero fake KPIs, polished empty states, and dynamic incident queues.
   - [`src/features/incidents/IncidentsPage.tsx`](file:///Users/mayankkumar/genysis/src/features/incidents/IncidentsPage.tsx): Connected to real incidents with backend status patching and empty states.
   - [`src/features/events/SecurityEventsPage.tsx`](file:///Users/mayankkumar/genysis/src/features/events/SecurityEventsPage.tsx): Real server-side filtered stream with raw RFC 5424 inspection and empty state.
   - [`src/features/threats/ThreatsPage.tsx`](file:///Users/mayankkumar/genysis/src/features/threats/ThreatsPage.tsx): Connected to `/api/v1/threat-intel` with empty state.
   - [`src/features/investigator/AIInvestigatorPage.tsx`](file:///Users/mayankkumar/genysis/src/features/investigator/AIInvestigatorPage.tsx): Evidence and hypotheses dynamically derived from database incident.
   - [`src/features/mitre/MitreMatrixPage.tsx`](file:///Users/mayankkumar/genysis/src/features/mitre/MitreMatrixPage.tsx): Dynamic technique mapping based on real observed detections.
   - [`src/features/assets/AssetsPage.tsx`](file:///Users/mayankkumar/genysis/src/features/assets/AssetsPage.tsx): Topology derived from registered forwarders and observed host telemetry.
   - [`src/features/detection/DetectionEnginePage.tsx`](file:///Users/mayankkumar/genysis/src/features/detection/DetectionEnginePage.tsx): Connected to real detections and thresholds.
   - [`src/features/response/AutonomousResponsePage.tsx`](file:///Users/mayankkumar/genysis/src/features/response/AutonomousResponsePage.tsx): Real playbooks and response action history ledger.
   - [`src/features/audit/AuditTrailPage.tsx`](file:///Users/mayankkumar/genysis/src/features/audit/AuditTrailPage.tsx): Real cryptographic verification and log entries.
   - [`src/features/settings/SettingsPage.tsx`](file:///Users/mayankkumar/genysis/src/features/settings/SettingsPage.tsx): Real threshold persistence; removed mock reset buttons.
   - [`src/features/integrations/IntegrationsPage.tsx`](file:///Users/mayankkumar/genysis/src/features/integrations/IntegrationsPage.tsx): Connected to live `/api/v1/sources`.
   - [`src/components/navigation/Sidebar.tsx`](file:///Users/mayankkumar/genysis/src/components/navigation/Sidebar.tsx): Real sensor and event count indicators.
   - [`src/features/command-center/CommandCenterPage.tsx`](file:///Users/mayankkumar/genysis/src/features/command-center/CommandCenterPage.tsx) & [`src/features/dashboard/DashboardPage.tsx`](file:///Users/mayankkumar/genysis/src/features/dashboard/DashboardPage.tsx): Replaced legacy mock components with clean wrappers around `OverviewPage`.
