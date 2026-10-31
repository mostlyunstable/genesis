# SENTINEL AI — Comprehensive Reverse Engineering Report

**Document Version:** 1.0.0  
**Date:** October 31, 2026  
**Auditor:** Principal Software Architect & Application Security Specialist  
**Status:** VERIFIED BASELINE

---

## 1. Executive Summary

This report documents the reverse engineering inspection of the **SENTINEL AI** repository. SENTINEL AI is designed as an autonomous, generative-AI-assisted cybersecurity platform that detects, correlates, investigates, and responds to authentication attacks (SSH brute force, distributed password spraying, and compromised credential usage).

Prior to this engineering loop, the repository consisted exclusively of a React 18 / TypeScript / Tailwind CSS / Vite Single Page Application (SPA). The application relied entirely on in-memory mock datasets and client-side simulation algorithms. No backend server, database, message queue, or real-time event ingestion engine was present.

This document establishes the verified truth of the system before any architectural additions.

---

## 2. Repository Inventory & File Structure

```
genysis/
├── index.html                   # HTML entry point (references /src/main.tsx)
├── package.json                 # Frontend dependencies (React 18, Vite 6, Zustand, etc.)
├── package-lock.json            # Exact lockfile
├── postcss.config.js            # PostCSS configuration for Tailwind CSS
├── tailwind.config.js           # Design tokens, color palette, font definitions
├── tsconfig.json                # TypeScript compiler config (ES2020 target, bundler mode)
├── tsconfig.node.json           # Node TypeScript config for Vite
├── vite.config.ts               # Vite bundler config with path alias '@' -> './src'
├── test-verification.mjs        # Node.js route and module parity verification script
├── docs/                        # Architectural, baseline, and contract deliverables
└── src/
    ├── main.tsx                 # React DOM mount point (createRoot)
    ├── App.tsx                  # Root component (QueryClientProvider + RouterProvider)
    ├── types/
    │   └── index.ts             # Canonical TypeScript domain interfaces
    ├── app/
    │   ├── layouts/
    │   │   └── AppLayout.tsx    # Master application chrome (Sidebar, TopNav, Banner, Toasts)
    │   └── router/
    │       └── index.tsx        # React Router v6 browser router definition (14 routes)
    ├── components/
    │   ├── navigation/
    │   │   ├── GlobalSearchModal.tsx # Cmd+K fuzzy entity search dialog
    │   │   ├── Sidebar.tsx           # Navigation drawer with health monitors & badge counts
    │   │   └── TopNav.tsx            # Sticky header with breadcrumbs, UTC clock, alert bell
    │   └── ui/
    │       ├── Badge.tsx             # Semantic status and severity badges
    │       ├── Button.tsx            # Button component with primary/danger/outline variants
    │       ├── Card.tsx              # Surface containers with dark borders
    │       ├── DemoModeBanner.tsx    # Persistent RFC 5737 and simulation disclosure header
    │       ├── Input.tsx             # Styled text inputs and selects
    │       └── RiskScoreBadge.tsx    # 0-100 colored risk indicator with pulsing animations
    ├── features/
    │   ├── analyst/
    │   │   └── AIAnalystPage.tsx        # Interactive LLM SecOps chat interface
    │   ├── audit/
    │   │   └── AuditTrailPage.tsx       # Immutable audit log view and JSON exporter
    │   ├── dashboard/
    │   │   └── DashboardPage.tsx        # Executive telemetry metrics & Recharts volume graphs
    │   ├── detection/
    │   │   └── ThreatDetectionPage.tsx  # Rule triggers, threshold dialog, playbook triggers
    │   ├── incidents/
    │   │   └── IncidentsPage.tsx        # 3-pane incident investigation workspace
    │   ├── intelligence/
    │   │   ├── AttackIntelligencePage.tsx # Adversary campaign profiling & MITRE matrix
    │   │   └── ThreatIntelPage.tsx      # RFC 5737 threat indicator reputation browser
    │   ├── logs/
    │   │   └── LiveLogsPage.tsx         # Virtualized log explorer with raw syslog JSON drawer
    │   ├── response/
    │   │   ├── ActionHistoryPage.tsx    # Executed containment actions & rollback buttons
    │   │   ├── AutonomousResponsePage.tsx # SOAR response hub & Emergency Kill Switch
    │   │   └── PlaybooksPage.tsx        # Security playbook definitions and manual testers
    │   ├── settings/
    │   │   └── SettingsPage.tsx         # Heuristic thresholds, FastAPI URL target, reset switch
    │   ├── sources/
    │   │   └── LogSourcesPage.tsx       # Telemetry forwarders, port statuses, agent health
    │   └── timeline/
    │       └── AttackTimelinePage.tsx   # Microsecond-accurate incident breach chronology
    ├── services/
    │   ├── api/
    │   │   └── index.ts                 # SentinelApiClient contract interface and mock implementation
    │   └── mock/
    │       └── data.ts                  # Static mock entities (36 SSH logs, 18 SSO logs, incidents, rules)
    ├── stores/
    │   └── useSecurityStore.ts          # Central Zustand client state store
    └── styles/
        └── index.css                    # Tailwind directives and custom scrollbars
```

---

## 3. Detailed Subsystem Analysis

### 3.1. Client Routing & Entry (`src/main.tsx`, `src/App.tsx`, `src/app/router/index.tsx`)
- **Framework:** `react-router-dom` v6 (`createBrowserRouter`).
- **Entry Flow:**
  1. `index.html` loads `/src/main.tsx`.
  2. `main.tsx` mounts `<App />` into `#root` under `React.StrictMode`.
  3. `App.tsx` wraps `<RouterProvider router={router} />` inside TanStack `@tanstack/react-query` `QueryClientProvider`.
  4. `router` declares a root route with layout `AppLayout` and 14 nested child routes:
     - `/` (Command Center / Dashboard)
     - `/logs` (Live Logs Explorer)
     - `/detections` (Threat Detection Engine)
     - `/attack-intelligence` (Attack Intelligence)
     - `/incidents` (Incident Investigation Workspace)
     - `/analyst` (Sentinel AI Analyst)
     - `/timeline` (Attack Timeline)
     - `/response` (Autonomous Response Center)
     - `/playbooks` (Defensive Playbooks)
     - `/action-history` (Action Execution History)
     - `/sources` (Log Sources & Forwarders)
     - `/threat-intel` (Threat Intelligence)
     - `/audit` (Compliance & Audit Trail)
     - `/settings` (Platform Settings & Thresholds)
     - `*` (Catch-all redirecting to `/`)

### 3.2. Data Architecture & Type Definitions (`src/types/index.ts`)
The data model is well-structured and aligns closely with real-world SIEM/SOAR/EDR platforms:
- **`SecurityEvent`**: Represents normalized audit log events. Contains RFC 5424 timestamp, `source` (`linux_ssh`, `linux_auth`, `windows_security`, `app_auth`, `nginx_access`), `outcome` (`failure`, `success`, `blocked`, `challenged`), `severity`, `username`, `sourceIp`, `destinationIp`, `destinationPort`, `rawEvent`, and nested `parsedFields`.
- **`Detection`**: Behavioral heuristic match with `category` (`ssh_brute_force`, `password_spraying`, etc.), confidence score (0–100), risk score (0–100), triggering conditions, and supporting event ID array.
- **`Incident`**: Aggregated security alert linking multiple detections, event IDs, MITRE ATT&CK techniques, executive AI summary, and attack timeline nodes.
- **`ResponseAction`**: Execution record of a countermeasure (`simulated_success`, `rolled_back`), targeted asset/IP, playbook ID, verification status, and rollback flag.
- **`ResponsePlaybook`**: SOP definition specifying automated steps, required approval flags, allowed scopes, and rollback strategies.
- **`LogSource`**: Forwarder agent metadata (host, port, format, event throughput, status).
- **`ThreatIntelIndicator`**: IP reputation, ASN, threat categorization, MITRE techniques.
- **`AuditRecord`**: Structured compliance record logging policy decisions, response executions, and threshold changes.
- **`DetectionThresholdConfig`**: Dynamic parameters governing detection velocity (e.g., failed attempt counts, sliding window seconds).

### 3.3. State Management (`src/stores/useSecurityStore.ts`)
- **Library:** Zustand v5.
- **Behavior:**
  - Initializes state using hardcoded arrays from `src/services/mock/data.ts`.
  - Maintains UI state: `sidebarCollapsed`, `selectedIncidentId`, `notifications`, `autonomousResponseGlobalEnabled`.
  - Mutates mock arrays in memory: updates incident status, executes simulated playbooks, generates simulated audit entries, and manages notification toasts.
  - **Limitation:** All changes are lost upon page reload. No API calls are made across the network.

### 3.4. API Abstraction Layer (`src/services/api/index.ts`)
The codebase includes a defined interface `SentinelApiClient` that abstracts API operations:
- `events.list()`, `events.getById()`
- `detections.list()`, `detections.getById()`
- `incidents.list()`, `incidents.getById()`, `incidents.updateStatus()`
- `response.listPlaybooks()`, `response.listActions()`, `response.execute()`, `response.rollback()`
- `sources.list()`
- `threatIntel.list()`, `threatIntel.getByIp()`
- `audit.list()`
- `analyst.query(prompt, contextIncidentId)`

Currently, `sentinelApi` implements this interface as an adapter directly reading and mutating the Zustand store and returning deterministic regex-based replies for AI Analyst queries.

### 3.5. Threat Scenarios Encoded in Mock Data (`src/services/mock/data.ts`)
The mock dataset contains two concrete attack sequences utilizing RFC 5737 reserved test IPs:
1. **High-Velocity SSH Brute Force against Bastion-01:**
   - Attacker IP: `198.51.100.42`
   - Target Host: `bastion-01` (`10.240.10.15:22`)
   - 35 consecutive `SSH_AUTH_FAIL` events across unix usernames (`root`, `admin`, `devops`, etc.) with ~2.5s intervals.
   - Event #36: `SSH_AUTH_SUCCESS` for account `deploy` (`EVT-2026-SSH-036`) resulting in interactive shell session `sess_993429ab`.
   - Triggers Critical Incident `INC-2026-0042` and Playbook `PB-SSH-BRUTE-01`.
2. **Horizontal Password Spraying against SAML SSO:**
   - Attacker IP: `203.0.113.88`
   - Target Service: SAML SSO Gateway (`10.240.4.12:443`)
   - 18 unique corporate identities probed at 12s intervals.
   - Triggers High Incident `INC-2026-0041`.

---

## 4. Verification Matrix: Implemented vs. Simulated vs. Missing

| Subsystem / Feature | Status | Details |
|---|---|---|
| **Frontend UI Pages (14 routes)** | **REAL & WORKING** | Fully implemented React components with styled UI, charts, and responsive views |
| **Client-Side State** | **REAL & WORKING** | Zustand store managing UI filters, toasts, selection, and simulated mutations |
| **Build & Typecheck Pipeline** | **REAL & WORKING** | `npm run build` passes with zero errors; TypeScript types are strict |
| **API Client Interface** | **REAL SPECIFICATION** | `SentinelApiClient` defines the exact contract needed for the Python backend |
| **API Transport / Network** | **MOCKED** | Local client-side in-memory adapter only; no `fetch` or HTTP calls |
| **Backend Server** | **MISSING** | No FastAPI / Python application exists in the repo |
| **Database & Persistence** | **MISSING** | No PostgreSQL / SQLAlchemy / Alembic migration exists |
| **Log Ingestion Engine** | **MISSING** | No HTTP/Syslog ingestion endpoint or queue parsing |
| **Brute-Force Detection Engine** | **MISSING (Backend)** | Detections are hardcoded mock objects; no real-time sliding window engine |
| **AI Investigation Subsystem** | **MOCKED** | Regex-based deterministic responses in frontend; no backend LLM/RAG pipeline |
| **Policy Engine & SOAR Execution**| **MOCKED** | Dry-run mock actions appended to Zustand array; no real firewall/process execution |
| **Authentication & RBAC** | **MOCKED** | Static user profile (`secops_analyst@sentinel.ai`); no JWT or session tokens |
| **Real-time Streaming** | **MISSING** | No WebSocket, SSE, or Redis Streams event push |

---

## 5. Security & Safety Assessment

1. **RFC 5737 Compliance:** The mock data strictly employs documentation IPs (`198.51.100.0/24`, `203.0.113.0/24`, `192.0.2.0/24`) and RFC 1918 private subnets (`10.240.0.0/16`). No external production or third-party IPs are targeted.
2. **Defensive Response Safeguards:** The frontend prominently renders a Demo Mode banner indicating simulated telemetry. The Autonomous Response engine has an Emergency Kill Switch that toggles `autonomousResponseGlobalEnabled`.
3. **LLM Safety:** The AI Analyst currently only queries a mock client; it possesses zero privileged execution capabilities.

---

## 6. Conclusion & Transition to Phase 1/2 Deliverables

The frontend is complete, elegant, and functionally comprehensive as a user interface. The primary objective is now to build the Python 3.12+ FastAPI backend, establish the real PostgreSQL database, implement deterministic detection algorithms, create provider-independent AI investigations, enforce response policies, and integrate the frontend with live endpoints while preserving DEMO MODE fallback capability.
