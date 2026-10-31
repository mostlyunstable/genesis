# SENTINEL AI / GENYSIS — FRONTEND RECONSTRUCTION REPORT
**Executive Architecture, Structural Redesign & Visual Verification Documentation**
*Date: October 31, 2026 | Build Version: v2.5.0 Production*

---

## 1. Executive Summary & Objective

This document formalizes the complete architectural and visual reconstruction of the frontend for **SENTINEL AI** (branded as **GENYSIS**). The objective was not a superficial UI patch or incremental CSS adjustment, but a fundamental redesign of the entire presentation layer from first principles.

The previous dashboard suffered from:
- An oversized, generic conversational hero banner masquerading as an operations interface.
- Nested container inception (cards within cards within cards) that degraded information hierarchy and readability.
- Gratuitous gradients, neon blue/cyan halos, and decorative terminal emulators.
- Blurred product identity that oscillated between a generic SaaS admin template and a ChatGPT wrapper.

The reconstruction establishes a calm-under-pressure, high-density, professional cybersecurity operations platform organized around actual operational workflows.

---

## 2. Design System Architecture

### 2.1 Color Tokens & Visual Restraint
The design enforces a strict charcoal and obsidian monochromatic foundation with semantic, non-decorative signal colors:

| Token | Hex / Value | Semantic Role |
| :--- | :--- | :--- |
| `--canvas-base` | `#08090D` | Primary deep obsidian viewport canvas |
| `--canvas-shell` | `#0A0D14` | Sidebar and sticky top navigation container |
| `--surface-main` | `#10131B` | Primary operational panel and dossier surface |
| `--surface-elevated` | `#161B26` | Interactive hover, selected master-detail item |
| `--surface-sunken` | `#07080B` | Inset code drawers, raw log viewers, telemetry pills |
| `--border-subtle` | `#1C2230` | Hairline grid and container separation rules |
| `--border-strong` | `#2A3347` | Active container perimeter |
| `--signal-critical` | `#EF4444` | Confirmed adversary threat, brute-force exhaustion |
| `--signal-action` | `#F97316` | Operator action required, pending playbook approval |
| `--signal-telemetry` | `#38BDF8` | Technical telemetry stream, forwarder sync, MITRE mapping |
| `--signal-verified` | `#10B981` | Verified defense posture, deterministic probe success |

### 2.2 Typographic Hierarchy
- **Primary Structural Font**: `Inter` (Variable 400-900). Reserved for section headers, analytical narrative, finding summaries, and operational labels.
- **Monospace Telemetry Font**: `JetBrains Mono` (400-700). Applied strictly to IP addresses, port numbers, timestamps, PID process IDs, MITRE ATT&CK codes, cryptographic checksums, and syslog payloads.
- **Micro-Copy Scale**: High-density uppercase tracked labels (`text-[10px] font-mono font-bold tracking-[0.16em]`) provide immediate scannability without visual noise.

### 2.3 Elimination of Nested Box Inception
All multi-layer card nesting was eradicated:
- Replaced 4-card metric clusters with flat, integrated horizontal telemetry ribbons (`border-t border-[#1C2230]`).
- Master-detail layouts utilize full-bleed panels separated by hairline dividers rather than floating boxed cards.
- Expandable drawers (such as raw event telemetry and audit signatures) slide out flush within the parent row.

---

## 3. Application Shell & Operational Organization

The navigation shell was rebuilt from the ground up and reorganized around the 9 canonical cybersecurity operations modules:

```
GENYSIS OPERATIONAL ARCHITECTURE
│
├── 1. OPERATIONAL COMMAND
│   ├── Command Center (/)               [High-level operational overview & surveillance HUD]
│   ├── Threat Intelligence (/threats)   [Adversary IP tracking, reputation & MITRE mapping]
│   ├── Security Events (/events)        [High-density raw & normalized telemetry explorer]
│   └── Detection Engine (/detections)   [Behavioral heuristic triggers & velocity thresholds]
│
├── 2. INTELLIGENCE & INVESTIGATION
│   ├── Incidents (/incidents)           [Correlated multi-signal incident investigation & lifecycle]
│   └── AI Investigator (/investigator)  [Evidence governance: Confirmed evidence vs AI hypotheses]
│
└── 3. DEFENSE & GOVERNANCE
    ├── Response Operations (/response)  [Policy playbooks, dry-run sandbox & rollback log]
    ├── Audit Trail (/audit)             [Cryptographic immutable ledger & JSON export]
    └── System Configuration (/settings) [Ingestion thresholds, killswitch & backend targets]
```

---

## 4. Reconstructed Screen Architecture

### 4.1 Command Center (`/`)
- **Top Surveillance HUD**: Real-time status displaying active telemetry volume (8.42M events/24h), online forwarder sensors (5 connected), critical detections count, and policy engine state (`ARMED Lab Mode`).
- **Urgent Operator Action Required**: Prominent amber alert ribbon displaying playbook countermeasure `PB-SSH-BRUTE-01` awaiting sign-off, targeting adversary `198.51.100.42` on `bastion-01:22`. Includes one-click dry-run simulation.
- **Active Incidents Stream**: Master overview of active multi-stage incidents with risk scores, timestamps, and target identities.
- **Live Ingestion Telemetry**: Real-time streaming events showing source IP, destination port, username, outcome badge, and log forwarder.
- **AI Investigator Status Card**: Working hypothesis, 98% confidence score, and confirmed evidence anchors.
- **Forwarder Topology**: Ingestion health and processed counts across Linux SSH, Linux PAM, Windows AD, and SAML SSO.

### 4.2 AI Investigator (`/investigator`)
- **Strict Evidence Governance**: Explicit visual separation between:
  - `CONFIRMED EVIDENCE` (Emerald green badge, cryptographic facts from sshd/auditd/syslog).
  - `AI HYPOTHESIS` (Cyber blue badge, inferential deductions with confidence scores).
- **Sub-Tab Navigation**:
  1. *Confirmed Evidence vs Hypotheses* (forensic artifacts table).
  2. *Attack Trajectory* (chronological sequence of observed phases).
  3. *MITRE ATT&CK Mapping* (tactics, technique IDs, and direct knowledge base links).
  4. *Raw Event Telemetry* (syslog and parsed telemetry).
- **Policy Recommendation**: Clearly labeled `RECOMMENDED BY AI (NOT YET EXECUTED)`, requiring human sign-off with deterministic dry-run verification.

### 4.3 Detection Engine (`/detections`)
- **Velocity Rule Headers**: Active threshold rules (`SSH Brute Velocity >= 10 in 60s`, `SAML Spray >= 5 users in 120s`, `Distributed Ingress >= 3 IPs`).
- **Mathematical Trigger Evaluation**: Displays exact boolean and velocity conditions evaluated per detection.
- **Lifecycle Management**: Direct status transitions (`OPEN`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `FALSE_POSITIVE`).

### 4.4 Threat Intelligence (`/threats`)
- **Adversary Database**: Indicator list with dynamic reputation score badges (`0-100`).
- **Deep Forensic Profile**: Autonomous behavioral profiling, first/last seen timestamps, country geolocation, ASN routing info, and linked incident references.

### 4.5 Incidents (`/incidents`)
- **Lifecycle Control**: Full incident queue with status filtering (`ALL`, `ACTIVE`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`).
- **Root-Cause Analysis**: Deep dossier detailing adversary entry point, lateral movement assessment, risk score, and assigned defense playbooks.

### 4.6 Response Operations (`/response`)
- **Emergency Defense Killswitch**: One-click global toggle to halt all autonomous response actions immediately.
- **Playbook Catalog**: Pre-approved defense routines (`PB-SSH-BRUTE-01`, `PB-SPRAY-DEFENSE-02`) with allowed scope, response steps, and automated rollback strategies.
- **Deterministic Dry-Run Console**: Target input with simulated command execution verified against RFC 5737 sandbox bounds.
- **Rollback Log**: Historical audit trail with one-click action rollback.

### 4.7 Security Events (`/events`)
- **High-Density Explorer**: Raw and normalized telemetry stream with search across IPs, accounts, and payloads.
- **Event Inspection Drawer**: One-click expandable drawer displaying full raw RFC 5424 syslog payload and parsed JSON attributes.

### 4.8 Cryptographic Audit Trail (`/audit`)
- **Immutable Log Stream**: Categorized records (`DETECTION`, `AI_INVESTIGATION`, `POLICY_DECISION`, `RESPONSE_EXECUTION`, `CONFIG_CHANGE`).
- **Cryptographic Signature Viewer**: Expandable JSON payload drawer with one-click JSON export.

### 4.9 System Configuration (`/settings`)
- **Engine Tuning**: Sliders for SSH velocity windows, SAML spray unique identity thresholds, and distributed IP triggers.
- **Backend Verification**: Fast ping verification to FastAPI orchestrator and mock baseline reset.

---

## 5. Verification & Quality Gates

### 5.1 Compilation & Static Analysis
- **TypeScript Strict Mode**: Zero compilation errors (`tsc`).
- **Vite Production Bundler**: Zero build warnings, assets bundled into optimized vendor chunks (`1.23s` build time).

### 5.2 Automated Architecture Quality Gates (`test-verification.mjs`)
- `[PASS]` All 26 design files and components verified.
- `[PASS]` All 9 canonical operations routes match 1:1 between router and navigation.
- `[PASS]` Command Center operational structure verified.
- `[PASS]` AI Investigator evidence governance and distinction verified.
- `[PASS]` 100% Quality Gates Passed.

### 5.3 Backend Safety & Data Integrity (`pytest backend/tests`)
- `[PASS]` 80/80 backend test suites passed cleanly in 16.21s:
  - `test_adversarial.py` (injection & tampering defenses)
  - `test_detection.py` (velocity heuristics)
  - `test_phase2_response_safety.py` (sandbox boundary enforcement)
  - `test_phase3_postgresql.py` & `test_phase3_redis.py` (persistence & caching)

---

## 6. Captured Browser Screenshots

Actual headless browser screenshots captured from the running application (`http://127.0.0.1:5173/`):

| Screen | Viewport | Output Path |
| :--- | :--- | :--- |
| **Command Center** | Desktop (1440×900) | `docs/screenshots/command-center-desktop.png` |
| **Command Center** | Mobile (390×844) | `docs/screenshots/command-center-mobile.png` |
| **AI Investigator** | Desktop (1440×900) | `docs/screenshots/ai-investigator-desktop.png` |
| **Threat Intelligence** | Desktop (1440×900) | `docs/screenshots/threat-intelligence-desktop.png` |
| **Detection Engine** | Desktop (1440×900) | `docs/screenshots/detection-engine-desktop.png` |
| **Incidents** | Desktop (1440×900) | `docs/screenshots/incidents-desktop.png` |
| **Response Operations** | Desktop (1440×900) | `docs/screenshots/response-operations-desktop.png` |
| **Security Events** | Desktop (1440×900) | `docs/screenshots/security-events-desktop.png` |
| **Cryptographic Audit Trail** | Desktop (1440×900) | `docs/screenshots/audit-trail-desktop.png` |
| **System Configuration** | Desktop (1440×900) | `docs/screenshots/system-configuration-desktop.png` |

---

## 7. Preserved Backend API & Functional Integrations

The complete backend architecture was preserved without modification:
1. **FastAPI Endpoints**: `/api/v1/events`, `/api/v1/detections`, `/api/v1/incidents`, `/api/v1/response`, `/api/v1/audit`, `/api/v1/analyst`, `/api/v1/settings`.
2. **Deterministic Dry-Run Boundary**: All automated playbook executions evaluate against RFC 5737 benchmark documentation ranges (`198.51.100.0/24`, `203.0.113.0/24`), ensuring zero unauthorized real-world packet transmission.
3. **Zustand Security Store**: Full reactivity, optimistic status updates, and notification dispatch preserved.
