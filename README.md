# SENTINEL AI — Autonomous Security Intelligence

**Design Philosophy:** Minimalist Product Architecture × Autonomous Security Intelligence  
**Environment:** Ingestion & Defensive Verification Sandbox (RFC 5737)  
**Version:** 2.0.0  

Sentinel is an autonomous security intelligence system. It continuously correlates security events, identifies threats, investigates suspicious activity, evaluates evidence, assesses risk, and executes policy-approved defensive countermeasures.

---

## Architecture & Visual Discipline

Sentinel v2.0 is built on visual restraint, precise typography, and disciplined information hierarchy:

- **Primary Canvas**: Warm background (`#FAFAF8`), subtle borders (`#E9E6E0`), clean elevated surfaces (`#FFFFFF`), and brand orange (`#F15A24` and soft `#FFF0E8`) accents.
- **Dark Workspace**: Elevated dark surfaces (`#101113`, `#181A1D`, `#202328`) with high-contrast neutral typography (`#F4F4F2`).
- **Autonomous Core**: The AI assistant serves as the primary operational surface (`/`), supported by progressive disclosure across telemetry streams, detections, and investigations.
- **Operational Precision**: Every defensive countermeasure is governed by an explicit pipeline: `RECOMMENDED` -> `POLICY APPROVED` -> `DRY RUN` (default) -> `EXECUTING` -> `VERIFIED` -> `ROLLED BACK`.
- **Honest Telemetry Disclosure**: All simulated brute-force, password-spraying, and privilege-escalation events adhere to reserved RFC 5737 test ranges (`198.51.100.0/24`, `203.0.113.0/24`).

---

## Operational Workspaces

### 1. Assistant (`/`)
- Headline: *"Know what happened. Understand what happens next."*
- Supporting copy: *"Sentinel correlates security events, investigates emerging threats and coordinates defensive action — with evidence at every step."*
- Investigative workflows:
  - Investigate an IP address
  - Trace authentication failures
  - Examine a security event
  - Review active incidents
- Structured analytical responses featuring evidence attribution, calculated confidence scores, MITRE ATT&CK technique mapping, and policy dry-run execution.

### 2. Investigations (`/investigations`)
- Progressive disclosure of correlated incident sequences.
- Chronological attack timelines, technical evidence references, and automated countermeasure dry runs.

### 3. Security Activity (`/activity`)
- Raw and normalized event telemetry observed across Linux SSH, Linux PAM, Windows AD, and SAML SSO forwarders.
- Expandable raw syslog payloads and parsed event fields.

### 4. Threats & Incidents (`/threats`, `/incidents`)
- Behavioral anomaly detections, heuristic threshold matches, and multi-stage incident chronologies.

### 5. Autonomous Response (`/response`)
- Governance interface managing defensive playbooks and policy evaluations.
- Action history with verification status and single-click administrative rollback.
- Global Emergency Defense Halt switch.

### 6. Telemetry Forwarders & Configuration (`/integrations`, `/settings`)
- Forwarder status, ingestion health, detection velocity thresholds, and FastAPI backend orchestrator endpoints.

---

## Technical Stack

- **Runtime & Bundler**: Vite 5, React 18, TypeScript (strict mode)
- **Styling**: Tailwind CSS, PostCSS, Lucide React icons
- **State Management**: Zustand with persistent simulation storage
- **Backend Protocol**: REST / FastAPI orchestration target (`http://localhost:8000`)

---

## Local Development

```bash
# Install dependencies
npm install

# Start Vite development server (port 5173)
npm run dev

# Run TypeScript typecheck and production build
npm run build
```
