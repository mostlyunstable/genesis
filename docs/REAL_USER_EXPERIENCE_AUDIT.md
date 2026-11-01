# SENTINEL AI — Real User Experience Audit
**Evaluator Profile:** Independent First-Time User, Cybersecurity Operations Analyst & Product Critic  
**Application Tested:** SENTINEL AI Autonomous Cybersecurity Intelligence Platform  
**Testing Modality:** Live Browser Execution (Chromium via Puppeteer, 1440px / 1280px / 768px / 390px, Network Inspection, Console Logging)  
**Date of Audit:** November 1, 2026  
**Primary User Expectation:**  
*"I want to use an autonomous generative-AI cybersecurity chatbot to communicate with an AI security analyst, provide security data, analyze logs, investigate threats, and understand what is happening in my system."*

---

## Executive Scorecard

| Dimension | Rating | Status | Summary |
|---|---|---|---|
| **First Impression & Clarity** | **4 / 10** | Needs Restructuring | Looks like a traditional SIEM dashboard; does not communicate an AI-first chatbot product. |
| **Conversational Intelligence** | **2 / 10** | Critical Defects | Blocked by missing auth by default; token stream parsing bug rendered blank messages; hardcoded keyword heuristics instead of true conversational intelligence. |
| **Data Ingestion & Log Upload** | **1 / 10** | Missing Capability | Zero file-upload controls in Copilot; users cannot upload log files through the chat interface. |
| **Autonomous Threat Investigation** | **6 / 10** | Partially Functional | Underlying tools can query database events, but investigator page crashed on load and Copilot returned rigid canned blocks. |
| **Response Actions & Human-in-Loop** | **7 / 10** | Verified Working | Action proposal cards and dry-run policy engine work well when reached via authenticated test scripts. |
| **UI Polish & Visual Hierarchy** | **7.5 / 10** | Good Foundation | Clean botanical palette (#F7F7F2 / #54765C), but marred by page crashes, pink error banners, and 12 redundant sidebar items. |

---

# PHASE 1 — FIRST IMPRESSION

When opening the running application at `http://127.0.0.1:5173`, the user lands on `/` (**"Intelligence Briefing"**).

### 1. Can I immediately understand what SENTINEL AI does?
**Partially.** The page presents a hero masthead: *"Every signal. One truth. Real-time autonomous cybersecurity intelligence backed by live telemetry."* While the copy is crisp, it reads like an enterprise marketing landing page or an operations dashboard rather than an interactive AI security system.

### 2. Is it obvious that this is an autonomous AI cybersecurity chatbot?
**No.** There is no visible chat window, avatar, or interactive conversational agent on the landing screen. An analyst looking for an AI partner to talk to would see KPI cards (`16 Telemetry Ingested`, `2 Behavioral Detections`, `1 Active Correlated Incident`, `0 Actions Taken`), a telemetry table, and a sensor status list. It resembles Datadog or Wazuh rather than an AI agent.

### 3. Is the chatbot the main attraction or does it feel like an ordinary dashboard?
**It feels like an ordinary dashboard.** The chatbot (**"Security Copilot"**) is hidden in the sidebar navigation as item #2. A user has to hunt for it.

### 4. Do I understand what I am supposed to do first?
**No.** The prominent call to action on the overview is an input field: `"Direct Sentinel: 'Investigate IP 198.51.100.42', 'Assess lateral exposure'..."` with an `"Investigate"` button. When a user types a prompt and clicks "Investigate", it does not start a conversation; it sets a 350ms timer and hard-navigates to `/investigator`, which immediately crashes with an unhandled exception.

### 5. Is the interface intimidating, cluttered, confusing, or unnecessarily complicated?
**Somewhat intimidating.** The sidebar has **12 distinct navigation destinations** grouped into three arbitrary categories (*Intelligence*, *Knowledge & Assets*, *Defense & Governance*). An analyst does not know whether an investigation belongs in *Intelligence Briefing*, *Security Copilot*, *AI Investigator*, *Incidents Queue*, or *Detection Engine*.

### 6. Does the product feel professional and trustworthy?
**Visually yes, functionally no.** The editorial typography (serif display paired with clean monospaced telemetry) and botanical olive palette (`#54765C`) look distinctive and high-end. However, as soon as a user navigates to `/copilot` and sees a bright pink banner reading `Missing Bearer authorization header`, or visits `/investigator` and gets a white React error stack trace, trust drops immediately.

### 7. Does the interface communicate intelligence and autonomy?
**Only superficially.** The badge says `DEFENSE ARMED` and `AUTONOMOUS SECURITY POSTURE: BASELINE SECURE`, but because the AI cannot be conversed with out of the box without manual token injection, the autonomy feels like a static facade.

### 8. Are there too many metrics, cards, navigation items, or unnecessary visual elements?
**Yes.** 12 navigation links is at least 5 too many for an AI-first product. The split between *Security Copilot* and *AI Investigator* creates cognitive confusion. The *Assets & Topology* view merely shows 3 forwarders that are already listed on the overview page.

### 9. Does anything look generic, unfinished, redundant, or out of place?
- The "Direct Sentinel" input field on Overview is a fake redirect.
- The AI Investigator page still contains old dark-mode styles (`bg-[#10131B]`) and hardcoded mock artifact arrays (`EV-01`, `EV-02`, `EV-03`).
- The Security Copilot is completely broken for unauthenticated users.

---

# PHASE 2 — EXPLORE THE ENTIRE APPLICATION

| Page Route | Purpose & Problem Solved | Real Analyst Value | Redundancy / Conflict with Chatbot | Recommendation |
|---|---|---|---|---|
| **`/` Overview / Command Center** | High-level operational briefing of ingested events, active incidents, and sensor health. | High: Gives immediate situational awareness of live threats. | "Direct Sentinel" prompt bar is fake; does not pass query to chatbot. | **IMPROVE**: Keep briefing metrics, but make the search bar directly hand off queries to Security Copilot. |
| **`/copilot` Security Copilot** | Primary conversational AI workspace for investigations, log analysis, and safe containment. | Critical: This is the core product the user came to use. | Currently inaccessible out-of-the-box due to missing Bearer token; lacks log upload input. | **IMPROVE (P0)**: Auto-initialize analyst session, add file uploader, fix streaming bug. |
| **`/investigator` AI Investigator** | Forensic incident evidence breakdown and attack trajectory synthesis. | Medium: Deep incident inspection. | Crashes immediately on `selectedIncident.id` when no incident is explicitly selected; heavily duplicates Copilot evidence drawer. | **MERGE / SIMPLIFY**: Embed incident forensic dossiers directly inside Incidents and Copilot Evidence Drawer; eliminate standalone crashy page. |
| **`/events` Security Events** | Raw and normalized RFC 5424 security log stream with filtering by source and outcome. | High: Essential for analysts to inspect raw ground truth. | Does not distract; provides crucial grounding verification. | **KEEP**: Clean, functional, and fast. |
| **`/incidents` Incidents Queue** | Prioritized queue of correlated multi-source incidents with risk scores and status updates. | High: Core operational workflow for triage. | Complements the chatbot; gives a structured queue. | **KEEP**: Add direct "Investigate with Copilot" button to each incident card. |
| **`/threats` Threat Intelligence** | IP reputation lookup, ASN data, and threat actor feeds. | Medium: Useful for manual IP lookups. | Can easily be queried via Copilot (`"Look up threat intel for 198.51.100.42"`). | **SIMPLIFY**: Keep as reference tool, but make indicators clickable to trigger Copilot investigations. |
| **`/detection` Detection Engine** | Displays triggered detection rules and heuristic threshold configuration. | Medium: Useful for detection engineers. | Threshold tuning overlaps with Settings. | **MERGE**: Keep rule detections feed; consolidate threshold sliders into System Settings. |
| **`/response` Response Center** | Catalog of SOAR playbooks and history of autonomous actions. | High: Critical for auditable containment. | Essential governance companion to AI actions. | **KEEP**: Add direct link to Copilot action confirmation history. |
| **`/audit` Audit Trail** | Cryptographically chained SHA-256 tamper-evident ledger of all events and actions. | High: Critical for compliance and forensic integrity. | Unique capability that sets SENTINEL apart from toys. | **KEEP**: Chain verification works cleanly. |
| **`/settings` System Settings** | Backend orchestrator URL, forwarder keys, and threshold configurations. | Necessary administrative screen. | Standard utility. | **KEEP**. |
| **`/assets` Assets & Topology** | Discovered infrastructure nodes. | Low: Displays static forwarder items. | Redundant with Overview sensors card. | **REMOVE / MERGE**: Merge sensor health into Overview and Settings. |
| **`/mitre` MITRE ATT&CK Matrix** | 14-tactic Enterprise ATT&CK matrix mapping observed detections. | Medium: Good for visual reporting. | Useful reference, but static when detections are sparse. | **KEEP / SECONDARY**: Keep accessible via navigation or Copilot grounding links. |

---

# PHASE 3 — CHATBOT USER SCENARIOS & RESULTS

### Scenario A — First Conversation
- **User Prompt**: `"Hello, what can you do for me?"`
- **First-Time Unauthenticated User Result**: **FAILED (401 Unauthorized)**. The request to `POST /api/v1/chat/conversations` failed with `401 Unauthorized` (`Missing Bearer authorization header`). A pink error banner appeared; zero messages were posted.
- **Authenticated User Result**: **POOR / UNNATURAL**. The streaming engine executed, but due to a client-side property mismatch (`data.token` vs `data.delta`), the message text rendered as blank whitespace in the chat bubble. Furthermore, the backend logic did not recognize "Hello" as a greeting; it checked `get_incidents()`, saw `INC-2026-991B`, and generated a canned incident status report instead of introducing itself as an AI assistant.
- **Verdict**: Critical failure.

### Scenario B — Cybersecurity Concept Question
- **User Prompt**: `"What is a brute-force attack, and how can you detect one in my logs?"`
- **Result**: **FAILED / RIGID MATCHING**. Because the prompt contained the substring `"brute"` and `"attack"`, the backend bypassed general explanation and jumped straight into querying detections for IP `198.51.100.42`. It did not explain the conceptual mechanics of a brute-force attack, nor did it explain how log thresholds (e.g. PAM failure velocity) detect it.
- **Verdict**: Unsatisfactory. The bot acts like a keyword router rather than a reasoning security analyst.

### Scenario C — Upload Security Data
- **User Action**: Search the interface for a file upload or log attachment button to provide raw syslog or JSON logs to the chatbot.
- **Result**: **NOT IMPLEMENTED / MISSING FEATURE**.
  - `input[type="file"]` count in DOM: **0**.
  - Upload or attach button in chat composer: **0**.
  - A user who wants to "provide security data and analyze logs" has no way to drag and drop or upload a log file in the chat interface. Logs can only be sent via external curl commands to `/api/v1/ingest/batch`.
- **Verdict**: Critical gap between user expectation and product capability.

### Scenario D — Follow-up Investigation
- **User Prompt Flow**:
  1. `"Investigate the suspicious IP you found."`
  2. `"Which accounts were affected?"`
  3. `"Was there any successful login?"`
  4. `"Generate an investigation report."`
- **Result**: **PARTIALLY WORKING / WEAK CONTEXT MEMORY**.
  - Step 1: Retrieved IP `198.51.100.42` and displayed 15 events.
  - Step 2: Because the backend parses keywords independently on each turn without passing conversational history to a generative LLM, `"Which accounts were affected?"` did not inherit the IP context from Step 1; it triggered a general health query!
  - Step 3: Required explicitly mentioning the IP again (`"Was there any successful login for 198.51.100.42?"`).
- **Verdict**: Lacks true multi-turn conversational context memory.

### Scenario E — Autonomous Capabilities
- **User Prompt**: `"Investigate the latest suspicious activity in my environment."`
- **Result**: **VERIFIED WORKING (Backend Tools)**.
  - The system triggered real database queries: `get_incidents(status='active')`, `query_security_events(source_ip='198.51.100.42')`, `lookup_threat_intel('198.51.100.42')`.
  - It mapped MITRE ATT&CK technique `T1110.001` and `T1021.004`.
  - It generated real clickable evidence chips in the UI (`EVT-2026-...`, `198.51.100.42`).
  - Clicking an evidence chip opened the Contextual Security Evidence drawer on the right side.
- **Verdict**: Genuine backend grounding works, but the text rendering bug concealed the narrative explanation.

### Scenario F — Response Actions & Containment
- **User Prompt**: `"Can you block the suspicious IP?"`
- **Result**: **VERIFIED WORKING (Human-in-the-Loop Safe Containment)**.
  - The system evaluated `PolicyEngine.is_target_protected('198.51.100.42')`.
  - Verified target was outside RFC 5737 protected exclusion zones.
  - Emitted an `ActionProposalCard` with details:
    - Countermeasure: `iptables drop`
    - Target: `198.51.100.42`
    - Playbook: `PB-SSH-BRUTE-01`
    - Governance: `Human-in-the-Loop Gate`
    - Buttons: `[Authorize & Execute]` and `[Reject Countermeasure]`
  - Clicking `Authorize & Execute` prompted for confirmation, called `/api/v1/chat/actions/confirm`, executed the defensive dry-run action, and appended a tamper-evident audit log record.
- **Verdict**: Excellent implementation of safety guardrails. Never executes disruptive actions without authorization.

---

# PHASE 4 — TEST THE DASHBOARD AS A USER

Opening the dashboard as a SOC analyst starting their morning shift:

### Can I answer these questions quickly?
1. **What is happening in my environment?**  
   *Yes.* The 4-step ribbon immediately communicates `16 Telemetry Ingested (24h)`, `2 Behavioral Detections`, `1 Active Correlated Incident`, and `0 Actions Taken`.
2. **Are there active threats?**  
   *Yes.* The "Priority Correlated Incidents" card clearly highlights `INC-2026-991B`: *"Focused Privileged Account Brute Force on 'root' from 198.51.100.42"* with Risk Score `95/100`.
3. **What requires my attention?**  
   *Yes.* The high-severity incident badge and the uncontained threat status make the priority obvious.
4. **What has the AI investigated?**  
   *Partially.* The "AI Investigation Reasoning" card shows a hypothesis box (*"Automated credential probing against exposed authentication interfaces"*), but does not show what the Copilot has conversed about.
5. **What should I investigate next?**  
   *Unclear.* The user has to manually figure out whether to click "Open Investigation Dossier", "All Incidents", or navigate to Copilot.
6. **Can I ask the AI to explain an incident?**  
   *No direct shortcut.* Clicking on an incident takes the user to the Incidents table, not to a Copilot chat investigating that incident.
7. **Can I upload new data?**  
   *No.* There is no data ingestion trigger on the dashboard other than a button that navigates to forwarder settings.
8. **Can I initiate an investigation?**  
   *No.* The prominent "Direct Sentinel" input bar is non-functional (it navigates to a broken page).

---

# PHASE 5 — BROKEN FUNCTIONALITY AUDIT

### 1. `AIInvestigatorPage` Crash (CRITICAL)
- **Error**: `TypeError: Cannot read properties of undefined (reading 'id')` at `AIInvestigatorPage.tsx:183:37`.
- **Cause**: Line 48: `const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];` followed by `value={selectedIncident.id}` on line 183. When `incidents` is empty (or during initial load), `selectedIncident` is undefined, immediately crashing React.
- **Impact**: Entire `/investigator` route fails to render; displays React Router ErrorBoundary.

### 2. Missing Bearer Token on Fresh Launch (CRITICAL)
- **Error**: `401 Unauthorized` (`{"code": "UNAUTHENTICATED", "message": "Missing Bearer authorization header"}`).
- **Cause**: All `/api/v1/chat/...` endpoints require `get_current_user`. But a new user opening the browser has no token stored in `localStorage.sentinel_auth_token`, and the app does not feature a login screen or automatic session initializer for local demo mode.
- **Impact**: Security Copilot is completely unusable out of the box.

### 3. Client Streaming Token Drop (CRITICAL)
- **Error**: Assistant messages render with zero text body in chat bubbles.
- **Cause**: `src/services/api/index.ts` line 257 checks `data.token || ''`. But `backend/app/services/chat.py` line 584 yields `{'delta': chunk}`. Because `data.token` is undefined, `onToken` appends empty strings, resulting in an empty assistant message.
- **Impact**: All responses appear as blank boxes with evidence chips only.

### 4. Fake Search Navigation on Overview
- **Issue**: Overview input `"Direct Sentinel: 'Investigate IP...'"` has a dummy `setTimeout(350)` that redirects to `/investigator` without preserving or forwarding the prompt.
- **Impact**: Misleads the user; appears broken.

### 5. Missing File Upload Capability in Chat
- **Issue**: There is no file input, drag-and-drop zone, or attachment icon anywhere in `SecurityCopilotPage.tsx`.
- **Impact**: Violates the user's core expectation to provide security data and analyze log files.

---

# PHASE 6 — VISUAL & RESPONSIVE AUDIT

- **1440px Desktop**: The 3-column layout in Copilot (Conversation History, Chat Thread, Evidence Drawer) fits well. However, when the Evidence Drawer is open, the center chat area narrows significantly.
- **1280px Laptop**: Left sidebar (80px collapsed or 240px expanded) plus 320px Copilot history plus 320px Evidence drawer leaves only ~400px for chat messages. Evidence drawer should default to overlay/slide-over on laptop screens.
- **768px Tablet**: Left history panel collapses appropriately, but toggle button is subtle.
- **390px Mobile**: The top header pills wrap awkwardly. The input bar at bottom stays fixed, but quick prompt chips overflow horizontally with no visible scroll indicator.

---

# PHASE 7 — DECIDE WHAT SHOULD CHANGE

### 1. KEEP
- **Telemetry Ribbon & Live Telemetry Stream**: Clear, honest, and directly tied to real database counts.
- **Incidents Queue**: Highly readable, actionable severity badges and status transitions.
- **Cryptographic Audit Trail**: Exceptional tamper-evidence verification feature.
- **Human-in-the-Loop Action Approval Cards**: Clean, safe, and transparent containment workflow.
- **Botanical Light Theme System**: Distinctive aesthetic (`#F7F7F2` canvas, `#54765C` accent, `#20251F` typography).

### 2. IMPROVE
- **Security Copilot Streaming & Rendering**: Fix token/delta property mismatch so text renders cleanly.
- **Conversational Intelligence**: Add natural language intent recognition:
  - Greet and guide users on "Hello" prompts.
  - Explain cybersecurity concepts (brute-force, password spraying, lateral movement).
  - Multi-turn context memory (carry over identified IPs and accounts across turns).
- **Session Authentication**: Seamlessly authenticate local analyst sessions in demo mode so users are never blocked by 401 errors.
- **Overview Directive Bar**: Wire the search bar directly to `/copilot?q=...` so submitting a query opens Copilot and executes the prompt.
- **Evidence Drawer**: Default to floating slide-over drawer to maximize chat reading space.

### 3. REMOVE / CONSOLIDATE
- **Remove Standalone `/investigator` Route**: Merge its incident timeline and forensic breakdown into the `/incidents` detail view and the Copilot Evidence Drawer. Eliminate the duplicate, buggy page.
- **Consolidate Sidebar Navigation**: Reduce 12 sidebar items to **6 clear operational workspaces**:
  1. **Copilot AI** (Primary Workspace)
  2. **Briefing** (`/` Overview)
  3. **Incidents** (`/incidents`)
  4. **Telemetry Stream** (`/events`)
  5. **Response & SOAR** (`/response`)
  6. **Governance & Audit** (`/audit` + `/settings`)

### 4. ADD
- **Direct Log File Upload in Copilot**: Add a paperclip / upload button in the chat input bar. Allow uploading `.log`, `.txt`, `.json`, `.csv`, `.syslog` files.
- **Automated Log Analysis Pipeline**: When a log file is uploaded:
  1. Ingest and parse entries into normalized events.
  2. Evaluate detection rules against parsed events.
  3. Generate an immediate AI forensic briefing in chat summarizing findings, attacker IPs, affected accounts, and recommended actions.
- **"Investigate with Copilot" Quick Actions**: Add one-click Copilot investigation shortcuts on Incident cards, Event rows, and Threat Intel records.

---

# PHASE 8 — PRIORITIZED ACTION PLAN

| Priority | Component | Issue | User Impact | Required Fix |
|---|---|---|---|---|
| **P0** | `backend/app/api/deps.py` & `src/services/api/index.ts` | 401 Unauthorized blocks all Copilot chat creation | First-time user cannot use chatbot at all | Provide seamless default analyst session in demo mode |
| **P0** | `src/services/api/index.ts` | Property mismatch: checks `data.token`, backend sends `data.delta` | Assistant replies render as blank bubbles | Update stream reader: `data.delta \|\| data.token \|\| ''` |
| **P0** | `src/features/investigator/AIInvestigatorPage.tsx` | Crash: `Cannot read properties of undefined (reading 'id')` | Page crashes completely | Safeguard against null/empty incidents array |
| **P1** | `SecurityCopilotPage.tsx` & Backend | No file upload capability for security data | User cannot provide logs to the AI for analysis | Add log file uploader button + backend log ingestion parser |
| **P1** | `backend/app/services/chat.py` | Rigid keyword matching causes unnatural responses to greetings and questions | Bot behaves like a broken query tool, not an AI analyst | Add conversational intent router (greetings, explanations, investigations) |
| **P1** | `OverviewPage.tsx` | "Direct Sentinel" prompt bar redirects to broken page | Misleading search input | Connect form submission directly to Security Copilot with query |
| **P2** | `Sidebar.tsx` | 12 navigation items create confusion and cognitive overload | Cluttered SIEM feel; chatbot feels buried | Streamline to 6 core workspaces; highlight Copilot AI as primary |
| **P2** | `IncidentsPage.tsx` | No direct way to investigate an incident with the AI | Disconnected triage workflow | Add "Investigate with Copilot" button to incident items |
| **P3** | `SecurityCopilotPage.tsx` | Evidence drawer squashes center chat on laptop screens | Narrow reading column | Make evidence panel a slide-over sheet on smaller viewports |
