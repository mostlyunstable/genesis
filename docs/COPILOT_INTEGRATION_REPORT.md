# SENTINEL AI — SECURITY COPILOT INTEGRATION REPORT
## Autonomous Conversational Security Analyst & Threat Investigation Engine

---

### Executive Summary

The **SENTINEL AI Security Copilot** (`/copilot`) has been engineered and integrated into the primary platform architecture. Rather than introducing a disconnected generic LLM wrapper, the Security Copilot directly hooks into the existing deterministic detection engine, security telemetry ingestion pipeline, incident correlation workspace, threat intelligence RAG knowledge base, and autonomous response orchestration service.

All interactions operate under strict **cybersecurity safety guardrails**:
1. **Read-Only Default:** Autonomous investigations and telemetry queries are read-only; defensive countermeasures (such as host containment or IP drops) are staged as proposals and require explicit human-in-the-loop authorization.
2. **PolicyEngine Protected CIDR Exclusions:** Defense policies enforce hard boundaries rejecting attempts to isolate local loopback (`127.0.0.0/8`), internal gateway, DNS, and management subnets (`10.240.0.0/24`).
3. **Zero-Hallucination Grounding:** Assistant narrative outputs are strictly grounded against persisted database records, verified threat intel indicators, and MITRE ATT&CK techniques. Queries for nonexistent records explicitly report lack of telemetry rather than fabricating synthetic data.
4. **Physical & Cryptographic Audit Trails:** Every authorized defensive countermeasure is cryptographically signed and recorded in the append-only audit ledger.

---

### High-Density Architectural Overview

```mermaid
flowchart TD
    subgraph UI["Frontend Workspace (React 18 + Vite + Tailwind)"]
        Nav["Sidebar (/copilot)"] --> CopilotView["Security Copilot (3-Column Layout)"]
        CopilotView --> ColLeft["Left: Investigation History & Search"]
        CopilotView --> ColCenter["Center: Stream Workspace & Action Cards"]
        CopilotView --> ColRight["Right: Contextual Security Evidence Drawer"]
    end

    subgraph API["FastAPI Security Gateway (/api/v1/chat)"]
        AuthDep["JWT & Role Authorization (deps.py)"] --> ChatRouter["Chat Router"]
        ChatRouter --> StreamEP["POST /conversations/{id}/stream (SSE)"]
        ChatRouter --> SyncEP["POST /conversations/{id}/messages"]
        ChatRouter --> ConfirmEP["POST /actions/confirm"]
        ChatRouter --> ConvCRUD["CRUD /conversations"]
    end

    subgraph Service["Copilot Intelligence Engine (chat.py)"]
        Pipeline["Multi-Step Investigation Pipeline"]
        Pipeline --> Step1["1. Query Intent & Identifier Extraction"]
        Pipeline --> Step2["2. Controlled Tool Execution (ChatTools)"]
        Pipeline --> Step3["3. Telemetry & Incident Correlation"]
        Pipeline --> Step4["4. MITRE ATT&CK & Playbook RAG"]
        Pipeline --> Step5["5. PolicyEngine Guardrail Evaluation"]
        Pipeline --> Step6["6. Synthesize & Stream Chunks"]
    end

    subgraph DB["Persistence & Infrastructure Layer"]
        Postgres[("PostgreSQL 16: chat_conversations & chat_messages")]
        Redis[("Redis 8: Telemetry Stream & Job Queue")]
        AuditLedger[("Cryptographic Audit Ledger")]
        PolicyEngine["PolicyEngine (Protected CIDRs)"]
    end

    CopilotView <-->|SSE Stream & JSON API| API
    API --> Service
    Service --> DB
```

---

### End-to-End Investigation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as SecOps Analyst
    participant UI as Security Copilot UI
    participant API as FastAPI Gateway
    participant Engine as ChatCopilotService
    participant Tools as ChatTools
    participant DB as PostgreSQL 16
    participant Policy as PolicyEngine

    Analyst->>UI: Inputs query: "Investigate incident INC-COPILOT-001"
    UI->>API: POST /api/v1/chat/conversations/{id}/stream
    API->>Engine: process_message_stream(conv, query, db)
    Engine->>UI: event: step ("understanding")
    Engine->>Tools: get_incidents(incident_id="INC-COPILOT-001")
    Tools->>DB: SELECT * FROM incidents WHERE id = ...
    DB-->>Tools: Grounded Incident Record
    Engine->>Tools: query_security_events(source_ip="198.51.100.42")
    Tools->>DB: SELECT * FROM security_events WHERE source_ip = ...
    DB-->>Tools: Telemetry Events
    Engine->>UI: event: step ("correlating")
    Engine->>UI: event: step ("mapping - MITRE T1110.001")
    Engine->>Policy: is_target_protected("198.51.100.42")
    Policy-->>Engine: False (Target Allowed)
    Engine->>UI: event: evidence (References: INC-001, EVT-001, T1110.001)
    Engine->>UI: event: actions (Proposed: PB-SSH-BRUTE-01 DROP)
    Engine->>UI: event: token (Streamed Markdown Tokens)
    Engine->>UI: event: done (Message Persisted)
    UI-->>Analyst: Renders complete grounded report & Action Card
    Analyst->>UI: Clicks "Authorize & Execute"
    UI->>API: POST /api/v1/chat/actions/confirm {confirmed: true}
    API->>DB: Insert into response_actions & append-only audit_records
    API-->>UI: 200 OK {status: "EXECUTED", actionId: "ACT-xxx"}
    UI-->>Analyst: Updates Action Card to "Executed & Verified"
```

---

### Core Engineering Deliverables

#### 1. Database Schema & Alembic Migration
- **Tables Created:**
  - `chat_conversations`: Holds multi-turn investigation sessions with cascade deletion, title, pinning flag, user isolation (`user_id`), and contextual metadata.
  - `chat_messages`: Holds individual conversation turns (`user`, `assistant`, `system`), token counts, tool execution records, grounded evidence references, and proposed action structures.
- **Migration Script:** `backend/alembic/versions/9c2d1e4f5a6b_add_chat_copilot_tables.py` applied online against live PostgreSQL 16.

#### 2. Controlled Backend Tools (`ChatTools`)
The LLM has zero direct shell or unbounded SQL access. Telemetry retrieval occurs through bounded, typed asynchronous methods:
- `query_security_events`: Bounded queries by source, outcome, username, and IP addresses (max 50 rows).
- `get_incidents`: Bounded queries by status, severity, and incident ID.
- `get_detections`: Retrieval of deterministic rule engine detections.
- `lookup_threat_intel`: Real-time indicator lookup with reputation scoring and ASN telemetry.
- `get_system_health`: Real-time forwarder counts, ingestion volume, and autonomous response global status.

#### 3. Real-Time Server-Sent Events (SSE) Streaming
The `/stream` endpoint streams chunked HTTP responses using Server-Sent Events with structured event dispatching:
- `event: handshake`: Confirms stream initialization and session ID.
- `event: step`: Broadcasts live progress through the 6 stages of autonomous threat analysis.
- `event: evidence`: Emits grounded entity references for immediate UI drawer population.
- `event: actions`: Emits defensive containment proposals evaluated against PolicyEngine.
- `event: token`: Incremental text chunks streamed directly to the terminal view.
- `event: done`: Signals message finalization, token consumption count, and DB commit.

#### 4. Frontend 3-Column Light-Theme Workspace
- **Left Column:** New investigation creation, live search filtering, pinned vs recent groupings, inline title editing, and deletion with confirmation dialog.
- **Center Column:** Live investigation thread, real-time stage progress bar (`InvestigationStepsIndicator`), Markdown rendering with syntax highlighting and code copy (`MarkdownRenderer`), clickable evidence reference pills, and safe response proposal cards (`ActionProposalCard`).
- **Right Column:** Collapsible Contextual Security Evidence Drawer (`EvidenceDetailPanel`) displaying ground-truth provenance, telemetry timestamps, and MITRE ATT&CK technique details.
- **Visual Palette:** Strict adherence to the platform's botanical green and warm off-white design system (`#FFFEFA`, `#26796C`, `#142C29`, `#192622`).

---

### Verification & Quality Gate Results

| Test Category | Command / Harness | Target | Result |
| :--- | :--- | :--- | :--- |
| **Backend Integration Suite** | `pytest backend/tests/test_chat_copilot.py` | Chat CRUD, SSE streaming, grounding, action confirmation, policy blocking, user isolation | **6 passed in 4.04s (100%)** |
| **Full Backend Test Suite** | `pytest backend/tests/` | All 26 test suites (Adversarial, Detection, Ingestion, RAG, Audit Chain, Postgres, Redis, Analytics) | **104 passed in 18.87s (100%)** |
| **Frontend Reconstruction Gates** | `node test-verification.mjs` | 26 design files, 9 canonical routes, Command Center presentation, AI Investigator governance | **All quality gates passed (100%)** |
| **Frontend Production Build** | `npm run build` | TypeScript `tsc` type checking and Vite bundle optimization | **0 errors, built in 1.04s** |
| **End-to-End Headless Verification** | `node verify-copilot-e2e.mjs` | Puppeteer browser automation validating UI rendering, streaming response, and evidence drawer | **Screenshots captured and verified** |

---

### Headless Verification Visualizations

````carousel
![Security Copilot Workspace](/Users/mayankkumar/.gemini/antigravity/brain/532a2d7d-c795-467e-bd3a-0fcf398d48d0/copilot-workspace-empty.png)
<!-- slide -->
![Active Grounded Investigation Stream](/Users/mayankkumar/.gemini/antigravity/brain/532a2d7d-c795-467e-bd3a-0fcf398d48d0/copilot-investigation-active.png)
<!-- slide -->
![Contextual Security Evidence Drawer](/Users/mayankkumar/.gemini/antigravity/brain/532a2d7d-c795-467e-bd3a-0fcf398d48d0/copilot-evidence-drawer.png)
````

---

### Operational Verification Summary
- **Primary Route:** `/copilot` (`Security Copilot`)
- **Backend API Base:** `/api/v1/chat/`
- **Supported Action Playbooks:** `PB-SSH-BRUTE-01`, `PB-SPRAY-CONTAIN-01`
- **Protected Subnet Guardrails:** `127.0.0.0/8`, `10.240.0.0/24`, Default Gateway, DNS Root
- **Security Audit Status:** Append-only cryptographic hash chain intact.
