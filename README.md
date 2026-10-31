# SENTINEL AI — Autonomous Cybersecurity Platform

An enterprise-grade, autonomous generative-AI-powered cybersecurity frontend focused on security log telemetry correlation, brute-force attack detection, password spraying identification, AI-assisted incident investigation, and defensive response orchestration.

Designed with inspiration from CrowdStrike Falcon, Linear, Grafana, and Sentry.

---

## 🛡️ Architecture & Core Features

### 1. Command Center (`/`)
- **Key Telemetry Metrics**: Total events processed, active incidents, critical threats, brute-force attempts detected, defended IPs, and AI investigations completed.
- **Visualizations**: 24-hour authentication volume & attack surge area charts, failed vs. successful logon distributions, threat severity breakdowns, and high-risk RFC 5737 external vector monitors.
- **Deterministic Live Incident Feed**: Continuously evaluated security incidents with immediate drill-downs.

### 2. Live Logs Explorer (`/logs`)
- Filterable by log source (Linux SSH, Linux PAM, Windows Security, SAML SSO), outcome (Failure, Success, Blocked), severity, and IP address.
- Expandable raw syslog inspection, RFC 5424 CEF parsed fields, correlation group tracking, one-click copy, and full structured JSON inspector drawer.

### 3. Threat Detection Engine (`/detections`)
- Behavioral rule triggers: SSH brute force, low-and-slow password spraying, distributed credential stuffing, and geospatial drift.
- Inspect triggering heuristic conditions, supporting telemetry event references, confidence ratings, and associated playbooks.
- Configurable detection thresholds dialog.

### 4. Incident Investigation Workspace (`/incidents`)
- 3-panel investigation environment:
  - **Left**: Multi-faceted filtering by severity, status, and search query.
  - **Center**: Incident narrative, risk score (0–100), AI confidence rating, and chronological attack progression timeline with exact evidence IDs.
  - **Right**: AI investigation synthesis, evidence chains, MITRE ATT&CK mapping (`T1110.001`, `T1078.003`, `T1098`), and automated containment triggers.

### 5. Sentinel AI Analyst (`/analyst`)
- Cybersecurity investigation copilot with conversation history, preset security queries, structured technical responses, and referenced mock event IDs.
- Future-ready API abstraction client ready to connect to Python/FastAPI LLM endpoints.

### 6. Attack Progression Timeline (`/timeline`)
- Microsecond-ordered progression graph tracking an adversary from initial TCP handshake through credential exhaustion, unauthorized breach, detection, autonomous countermeasure, and verification.

### 7. Autonomous Response Center (`/response`, `/playbooks`, `/action-history`)
- Real-time simulated countermeasure executions: temporary firewall IP drops (`iptables DROP`), interactive SSH session termination (`kill -9 <PID>`), and gateway rate limiting.
- Playbook specifications with allowed execution scopes, pre-flight checks, and rollback strategies.
- Action history table with one-click simulated rollbacks.
- Global Emergency Kill Switch for autonomous defensive actions.

### 8. Administration (`/sources`, `/threat-intel`, `/audit`, `/settings`)
- **Log Sources**: Forwarder connection states, 24h event ingestion volumes, and error diagnostics.
- **Threat Intelligence**: RFC 5737 protected IP indicators, reputation scoring, and ASN classifications.
- **Audit Trail**: Immutable compliance log with structured JSON export.
- **Settings**: Heuristic threshold adjustments, emergency halt toggle, and FastAPI backend URL bindings.

---

## 🎨 Visual System & Design Direction

- **Dark-First Palette**:
  - Main Background: `#090B0F`
  - Sidebar: `#0D1016`
  - Primary Surface: `#121720`
  - Secondary Surface: `#171E28`
  - Borders: `#252D38`
  - Primary Text: `#E8EDF4`
  - Accent: `#E0A34A`
  - Critical: `#EF5350`
  - Warning: `#E5AD52`
  - Success: `#42B883`
  - Information: `#6DA9E8`
- **Typography**: Inter (UI) & JetBrains Mono (Telemetry/Code).
- **Product Honesty**: Persistent Simulation Mode indicator disclosing synthetic replay telemetry and safe RFC 5737 documentation IP ranges (`198.51.100.42`, `203.0.113.88`, `192.0.2.x`).

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run production build & typecheck
npm run build
```
