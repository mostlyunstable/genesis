# GENYSIS AI — Autonomous Security Intelligence
**Design Philosophy:** MetaMask-Inspired Minimalism × Autonomous AI Security  
**Version:** 2.0.0  

GENYSIS AI is an autonomous generative-AI-powered cybersecurity analyst. It continuously monitors security events, identifies threats, investigates suspicious activity, correlates evidence, assesses risk, and executes policy-approved defensive dry runs.

---

## 🦊 Design Philosophy & Aesthetics

GENYSIS AI v2.0 takes inspiration from the visual restraint, clean typography, iconic branding, and approachable product presentation of **MetaMask** (`metamask.io`):
- **AI-First Hero Workspace**: The central AI assistant is the default home screen (`/`), not an analytical dashboard grid.
- **Warm Canvas Light Theme**: Natural warm background (`#FAFAF8`), subtle borders (`#E9E6E0`), pure white elevated surfaces, and recognizable **Brand Orange** (`#F15A24` and soft `#FFF0E8`) accents.
- **Iconic Genysis Hexagonal Emblem**: A protective perimeter mark enclosing an intelligent observation point in brand orange.
- **Restrained 8-Item Navigation**:
  - **Primary**: Assistant (`/`), Investigations (`/investigations`), Activity (`/activity`)
  - **Security**: Threats (`/threats`), Incidents (`/incidents`), Response (`/response`)
  - **System**: Integrations (`/integrations`), Settings (`/settings`)
- **Product Honesty**: Clear distinction between `RECOMMENDED`, `POLICY APPROVED`, `DRY RUN` (default), `EXECUTING`, `VERIFIED`, and `ROLLED BACK`.

---

## 🛡️ Core Experiences

### 1. Genysis Assistant (`/`)
- Central AI workspace featuring the greeting *"Your security operations, under intelligent watch."*
- Interactive suggested prompt chips:
  - *Investigate recent SSH attacks*
  - *Analyze authentication failures*
  - *Show active security incidents*
  - *Explain suspicious login activity*
- Premium composer with log attachment control, shortcut helpers, and loading state.
- Structured analytical responses with evidence attribution, risk ratings, MITRE ATT&CK mapping, and defensive dry-run execution.

### 2. Security Investigations (`/investigations`)
- Progressive disclosure investigation list with risk scores and correlated event counts.
- Dedicated detail view with chronological attack timeline, AI analytical synthesis, and one-click countermeasure dry run.

### 3. Security Activity (`/activity`)
- Clean real-time telemetry stream across Linux SSH, Linux PAM, Windows AD, and SAML SSO with expandable syslog payloads and parsed CEF attributes.

### 4. Threats & Incidents (`/threats`, `/incidents`)
- Minimalist behavioral anomaly cards and incident narratives prioritizing clarity over metric overload.

### 5. Autonomous Response (`/response`)
- Governance interface managing defensive playbooks (*SSH Brute Force*, *Password Spraying*, *Suspicious Login*, *Compromised Account*, *Repeated Escalation*).
- Action history table with one-click simulated rollbacks and global Emergency Halt switch.

### 6. Integrations & Settings (`/integrations`, `/settings`)
- Forwarder connection telemetry, theme toggle (Warm Canvas / Dark Workspace), velocity thresholds, and FastAPI backend URL bindings.

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
