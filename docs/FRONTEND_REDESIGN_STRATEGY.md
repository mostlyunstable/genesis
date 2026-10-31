# SENTINEL AI — Frontend Redesign Strategy & Product Architecture

**Document Version:** 3.0.0-ENTERPRISE  
**Date:** October 31, 2026  
**Status:** Approved Architectural Blueprint  
**Authors:** Creative Director, Principal Product Designer, Senior Frontend Architect, Design Systems Engineer

---

## 1. Executive Summary & Problem Diagnosis

### 1.1 The Failure of the Previous Paradigm
The previous interface evolved into an operational anti-pattern:
- An oversized, centered marketing-style hero banner ("Know what happened. Understand what happens next.") that made the product resemble a B2B SaaS landing page rather than a mission-critical cybersecurity operations cockpit.
- A general chatbot pattern (a large chat composer centered in empty space) that trivialized autonomous AI into a conversational gimmick.
- Inconsistent box-in-box nesting with microscopic typography, cluttered borders, and decorative terminal windows.
- Unfocused information density: analysts could not glance at the screen and immediately ascertain system status, active threats, ongoing investigations, or actions awaiting policy approval.

### 1.2 The New Product Mandate
SENTINEL AI is an **autonomous cybersecurity intelligence and operations platform**. It continuously executes four interrelated operational loops:
1. **OBSERVE**: Continuous multi-stream ingestion and normalization (Linux SSH, PAM, Windows AD Kerberos, SAML SSO, Network flow).
2. **DETECT**: Heuristic and behavioral threshold anomaly correlation (Brute force, horizontal spraying, session compromise).
3. **INVESTIGATE**: Autonomous evidence clustering, attack progression reconstruction, MITRE ATT&CK mapping, and structured root-cause synthesis.
4. **RESPOND**: Policy-governed defensive countermeasure recommendation, dry-run simulation, lab-mode execution, verification, and rollback.

---

## 2. Visual Direction & Aesthetic Philosophy

### 2.1 Aesthetic Identity: "Calm Under Pressure"
Enterprise security analysts work in high-stress, information-dense environments. The interface must project:
- **Precision**: Pixel-crisp geometry, refined hair-line borders (`1px`), zero ambiguous states.
- **Restraint**: Zero gratuitous glowing effects, zero distracting neon gradients, zero decorative animations.
- **Authority**: High-contrast, mathematically structured typography scale (Geist / Inter paired with JetBrains Mono for telemetry).
- **Legibility**: Deep obsidian foundation (`#090C12`) with calibrated tonal layers (`#0E131F`, `#141C2B`, `#1A2438`) that reduce eye fatigue during 12-hour SOC shifts.

### 2.2 Color System & Semantic Intent

Color is an operational signal, never a decoration:

| Token | Hex Value | Semantic Purpose |
| :--- | :--- | :--- |
| `surface-0` (Base) | `#07090E` | Root canvas, deepest level |
| `surface-1` (Panels) | `#0D111A` | Nav sidebar, topbar, primary layout containers |
| `surface-2` (Cards) | `#121722` | Cards, table containers, operational modules |
| `surface-3` (Elevated) | `#182030` | Hover states, active tabs, modal dialogues, input fields |
| `border-subtle` | `#1A2232` | Standard card dividers, table borders |
| `border-active` | `#28364F` | Focused inputs, active selections, highlighted entities |
| **Signal: Adversary / Critical** | `#EF4444` | Confirmed compromises, active attacker IPs, severity CRITICAL |
| **Signal: Warning / Elevated** | `#F59E0B` | Suspicious anomalies, velocity threshold breaches, severity HIGH |
| **Signal: Verified / Operational** | `#10B981` | Mitigated threats, verified probes, system HEALTHY |
| **Signal: Intelligence / Observe** | `#3B82F6` | Telemetry forwarders, MITRE codes, investigation references |
| **Signal: Action / Countermeasure**| `#F97316` | Action required, pending policy sign-off, dry-run triggers |
| `text-primary` | `#F8FAFC` | Primary labels, headlines, values |
| `text-secondary` | `#94A3B8` | Descriptions, readable body, evidence synthesis |
| `text-muted` | `#64748B` | Column headers, timestamps, RFC annotations |

---

## 3. Redefined Information Architecture

The navigation is restructured around the analyst's mental model and workflow urgency:

```
[SENTINEL AI HEADER] — Global Status • Ingestion Velocity • Emergency Halt • Global Command (⌘K)
│
├── 1. INTELLIGENCE WORKSPACE (/)
│    ├── Operational Triage Matrix (Observe • Detect • Investigate • Respond)
│    ├── Pending Action Approvals (High-Priority Countermeasure Sign-off)
│    ├── Active Incident Chronologies
│    └── Structured Investigation Query Bar (Targeted Autonomous Inquiries)
│
├── 2. INVESTIGATIONS (/investigations)
│    ├── Master-Detail Investigation Dossier
│    ├── Attack Progression Timeline (Initial Access → Credential Access → Execution)
│    ├── MITRE ATT&CK Matrix Footprint
│    └── Policy Dry-Run Verification Engine
│
├── 3. THREAT INTELLIGENCE (/threats)
│    ├── Correlated Behavioral Detections & Heuristic Rule Matches
│    └── Global Adversary IP Reputation & Intelligence Feeds
│
├── 4. SECURITY ACTIVITY (/activity)
│    ├── Dense, High-Throughput Event Telemetry Explorer
│    ├── Granular Multi-Source Filter Toolbar (SSH, PAM, Kerberos, SAML)
│    └── Expandable Syslog & Parsed CEF Inspector
│
├── 5. RESPONSE CENTER (/response)
│    ├── Automated Countermeasure Playbooks & Policy Scope
│    ├── Verification Audit Log & Deterministic Proof Telemetry
│    └── One-Click Emergency Halt & Rollback Orchestration
│
├── 6. FORWARDERS & ASSETS (/integrations)
│    ├── Log Source Collectors, Agent Status, & Ingest Latency
│    └── RFC 5737 Telemetry Simulation Harness
│
└── 7. CONFIGURATION (/settings)
     ├── Velocity Detection Thresholds (Brute Force, Spraying Windows)
     ├── Backend Orchestration Targets (FastAPI REST Binding)
     └── Cryptographic Audit Ledger (/audit)
```

---

## 4. Component Architecture & Reusability

To maintain a unified design system, components follow strict atomic contracts:

1. **`Surface` & `Panel`**:
   - Replaces ad-hoc cards with a standardized border radius (`rounded-lg` / `rounded-xl`), standardized padding (`p-4` / `p-6`), and zero redundant inner borders.
2. **`MetricCallout`**:
   - Standardized three-tier data presentation: Small uppercase kicker (`text-[10px] font-mono text-muted`), prominent bold numeric metric (`text-xl font-mono text-white`), and status delta.
3. **`StatusPill` & `SeverityBadge`**:
   - Monospace typography with distinct background opacity (`15%`) and border (`30%`).
4. **`EventRow`**:
   - Clean tabular display optimized for scanning hundreds of telemetry records without pagination stutter.
5. **`ActionApprovalBanner`**:
   - Prominent notification strip displayed when an autonomous countermeasure requires human-in-the-loop validation.

---

## 5. Elimination of Decorative Fluff

- **Zero Giant Hero Banners**: The workspace opens directly to the operational triage deck.
- **Zero Simulated Glowing Effects**: Replaced with clean 1px borders and high-contrast typography.
- **Zero Monotone Text**: Strict typographical scale separating Display (24px-32px), Headings (16px-18px), Lead Copy (14px), Data Values (13px mono), and Metadata (11px mono).
- **Honest System Disclosure**: Unambiguous indication of deterministic RFC 5737 sandbox data vs. live FastAPI production telemetry.

---

## 6. Implementation Roadmap

1. **Tokens & Base Layout**: Update CSS variables, Tailwind configuration, and AppLayout shell.
2. **Intelligence Workspace (`/`)**: Build the operational command cockpit.
3. **Investigations (`/investigations`)**: Build the full dossier view with attack stages and MITRE links.
4. **Security Activity (`/activity`)**: Implement dense, tabular telemetry explorer.
5. **Response Center (`/response`)**: Rebuild playbook governance and rollback audit log.
6. **Threat Intelligence (`/threats`)**: Implement indicator explorer and adversary profiles.
7. **Forwarders & Settings (`/integrations`, `/settings`)**: Complete collector health and velocity controls.
8. **Verification**: Run complete TypeScript typechecks, production builds, and end-to-end integration tests.
