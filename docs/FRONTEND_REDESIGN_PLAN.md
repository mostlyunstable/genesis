# SENTINEL AI — Frontend Redesign Specification & Implementation Plan
**Design Philosophy:** MetaMask-Inspired Minimalism × Autonomous AI Security  
**Version:** 2.0.0  
**Date:** October 31, 2026  

---

## 1. Executive Summary & Problem Diagnosis

### The Flaw of Version 1.0
The initial frontend resembled a generic enterprise cybersecurity dashboard: dense statistical grids, dark glowing telemetry cards, charts crammed onto the home page, and a heavy 15-item navigation structure. It looked like an administrative monitoring console rather than what Sentinel AI truly is: **an autonomous, intelligent AI security partner**.

### The Version 2.0 Vision
SENTINEL AI v2.0 pivots completely to a **minimal, confident, AI-native experience** inspired by the approachable clarity, iconic branding, and visual restraint of **MetaMask** (`metamask.io`):
1. **The AI Assistant is the Hero & Default Landing Page (`/`)**: Users enter directly into an intelligent, conversational cybersecurity intelligence environment.
2. **Warm, High-Contrast Light Theme as Primary**: Warm minimalist canvas (`#FAFAF8`, `#F3F2EE`, `#FFFFFF`, `#171717`) anchored by the iconic **Brand Orange** (`#F15A24` and soft `#FFF0E8`), with optional Dark Workspace mode (`#101113`, `#181A1D`).
3. **Restrained 8-Item Navigation Shell**:
   - **Primary**: Assistant (`/`), Investigations (`/investigations`), Activity (`/activity`)
   - **Security**: Threats (`/threats`), Incidents (`/incidents`), Response (`/response`)
   - **System**: Integrations (`/integrations`), Settings (`/settings`)
4. **Structured AI Investigation Responses**: Inline, readable findings with evidence references, confidence scores, MITRE ATT&CK tags, and autonomous action approvals without messy nested card clutter.
5. **Product Honesty & Precision**: Persistent demo disclosure, clear differentiation between `RECOMMENDED`, `POLICY APPROVED`, `DRY RUN`, `EXECUTING`, `VERIFIED`, and `ROLLED BACK`.

---

## 2. Color Palette & Design Tokens

### Light Canvas (Primary Product Experience)
- **Main Canvas Background:** `#FAFAF8` (Warm stone/paper)
- **Secondary / Surface Tint:** `#F3F2EE`
- **Primary Surfaces:** `#FFFFFF`
- **Subtle Borders:** `#E9E6E0`
- **Hover Surfaces:** `#ECEAE4`
- **Primary Text:** `#171717` (High-contrast neutral)
- **Secondary Text:** `#77736D` (Muted warm gray)
- **Subtle / Meta Text:** `#A5A19A`
- **Brand Orange (Hero Accent):** `#F15A24`
- **Brand Soft Orange:** `#FFF0E8`
- **Brand Deep Orange:** `#D94512`
- **Critical / Security Threat:** `#D94B45` (Soft red `#FDF2F2` bg)
- **Success / Verified:** `#258A62` (Soft green `#F0FDF4` bg)
- **Information / Telemetry:** `#4F7FC1` (Soft blue `#F0F6FF` bg)

### Dark Workspace (Optional Toggle)
- **Canvas Background:** `#101113`
- **Surface:** `#181A1D`
- **Elevated Surface:** `#202328`
- **Border:** `#2B2F36`
- **Primary Text:** `#F4F4F2`
- **Secondary Text:** `#999DA4`
- **Brand Accent:** `#FF6938`

---

## 3. Brand Identity: The Sentinel Beacon

A memorable geometric mark:
- An abstract geometric hexagon/perimeter beacon enclosing an intelligent focal point in `#F15A24`.
- Wordmark: **SENTINEL** in clean bold sans-serif with **AI** pill badge.
- Status indicator: Subtle pulsing emerald beacon for `MONITORING` and amber for `INVESTIGATING`.

---

## 4. Route Map & Component Hierarchy

```
/                       -> SentinelAssistantPage (The Hero AI Workspace)
/investigations         -> InvestigationsPage (Clean list & progressive disclosure detail)
/activity               -> SecurityActivityPage (Real-time telemetry event stream)
/threats                -> ThreatsPage (Heuristic detections & behavioral rules)
/incidents              -> IncidentsPage (Correlated incidents with attack timeline)
/response               -> ResponseCenterPage (Autonomous countermeasures & dry runs)
/integrations           -> IntegrationsPage (Log forwarders & source connectors)
/settings               -> SettingsPage (Theme, emergency halt, detection thresholds)
```

---

## 5. Implementation Phases

1. **Phase 1: Design Tokens & Tailwind Configuration**: Update `tailwind.config.js` with `#FAFAF8` warm palette, brand orange `#F15A24`, and typography tokens.
2. **Phase 2: App Layout & Sidebar Shell**: Rebuild `Sidebar.tsx` and `AppLayout.tsx` with minimal 8-item navigation, iconic Sentinel Beacon, and theme toggle.
3. **Phase 3: The Hero AI Assistant (`/`)**: Build `SentinelAssistantPage.tsx` with hero greeting, prompt chips, premium composer, and structured investigation outputs.
4. **Phase 4: Investigations & Activity**: Implement minimal `InvestigationsPage.tsx` and `SecurityActivityPage.tsx`.
5. **Phase 5: Threats, Incidents & Autonomous Response**: Implement `ThreatsPage.tsx`, `IncidentsPage.tsx`, and `ResponseCenterPage.tsx` with explicit action states (`DRY RUN`, `RECOMMENDED`, `VERIFIED`).
6. **Phase 6: Integrations, Settings & Audit**: Build `IntegrationsPage.tsx` and `SettingsPage.tsx`.
7. **Phase 7: Build, Test & Visual Verification**: Verify TypeScript build, verify all routes, test interaction states, and capture screenshots.
