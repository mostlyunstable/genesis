# SENTINEL AI — Real User Implementation Roadmap
**Architectural Blueprint & Implementation Plan for Real-User Directives**

---

## 1. Principles & Boundaries

1. **Preserve Real Operational Data Invariant**:
   - Zero mock data. All metrics, events, and detections must reflect real database tables.
   - Preserves RFC 5737 sandbox boundaries and policy engine safeguards.

2. **AI-First Experience**:
   - Elevate the **Security Copilot** to the primary focal point of the platform.
   - Enable users to communicate naturally, upload security data files, receive real analysis, and execute safe containment.

3. **Production Stability**:
   - Zero unhandled React crashes.
   - Zero blocking 401 errors for local demo analysts.

---

## 2. Implementation Work Packages

### Work Package 1: Session & Authentication Stability (P0)
- **Problem**: First-time users opening the app get `401 Unauthorized` on `/chat/conversations` because no token exists in `localStorage`.
- **Backend Fix (`backend/app/api/deps.py`)**:
  - In `get_current_user`: when `credentials` is missing and `settings.DEMO_MODE` is True, fall back to the seeded SecOps analyst user `USR-001` (`secops_analyst@sentinel.ai`).
  - Ensures local analysts can immediately interact with the chatbot, investigate incidents, and execute defensive actions.
- **Frontend Fix (`src/services/api/index.ts`)**:
  - Ensure client gracefully handles session tokens and connects to the backend without throwing authentication exceptions.

### Work Package 2: Chatbot Streaming & Text Rendering Fix (P0)
- **Problem**: All streamed messages render as blank empty boxes in the chat bubble.
- **Root Cause**: `backend/app/services/chat.py` emits SSE tokens as `{'delta': chunk}`, but `src/services/api/index.ts` checked `data.token`.
- **Fix**: Update `api/index.ts` to `data.delta || data.token || ''`.

### Work Package 3: AI Investigator Crash Safeguard (P0)
- **Problem**: `/investigator` crashes with `Cannot read properties of undefined (reading 'id')` when no incidents exist.
- **Fix**: Guard all `selectedIncident` property accesses with optional chaining; render a clean empty state when no incidents are present; update styling to consistent light botanical theme.

### Work Package 4: File Upload for Security Data / Log Analysis in Copilot (P1)
- **Capability Needed**: Allow analysts to upload `.log`, `.txt`, `.json`, `.csv`, `.syslog` files directly in the Copilot chat composer.
- **Backend Implementation**:
  - Add `POST /api/v1/chat/upload-logs` or integrate multipart upload in `/chat/conversations/{id}/upload`.
  - Parse uploaded lines with `NormalizerService.parse_log()`.
  - Ingest events into `security_events` table.
  - Run `DetectionEngine.evaluate()`.
  - Trigger immediate conversational summary in the chat thread detailing:
    - Number of events ingested and parsed.
    - Suspicious IPs identified.
    - Failed vs successful authentications.
    - Triggered detection alerts.
    - Recommended investigation queries.
- **Frontend Implementation**:
  - Add an attachment (paperclip) icon button in the chat input bar.
  - Support drag-and-drop onto the chat area.
  - Show upload progress and confirmation chip.

### Work Package 5: Conversational Intelligence & Multi-Turn Context (P1)
- **Intent Recognition in `backend/app/services/chat.py`**:
  - **Greeting / Overview** ("Hello, what can you do for me?"): Warm analyst welcome, capability outline, suggested queries.
  - **Cybersecurity Explanations** ("What is a brute-force attack..."): Clear explanation of attack mechanics and how SENTINEL detects it in logs.
  - **Multi-Turn Context Tracking**: Track last mentioned IP (`198.51.100.42`) or incident ID across conversation turns so questions like "Which accounts were affected?" and "Was there any successful login?" resolve against the prior topic.
  - **Investigation Reports**: Support `"Generate an investigation report"` to produce a formatted forensic incident brief.

### Work Package 6: Streamlined Navigation & Overview Direct Hand-off (P2)
- **Overview Search Bar**: Make the directive input bar on the main briefing screen navigate directly to `/copilot?q=...` and automatically start the conversation.
- **Sidebar Streamlining**: Simplify navigation into 6 focused areas, with Security Copilot prominently badged as the primary AI hub.
- **Incident Queue Hand-off**: Add a "Chat with Copilot" button to each incident card in `/incidents`.

---

## 3. Verification & Testing Plan

1. **Automated Unit Tests**:
   - Run backend test suite (`pytest`) to ensure zero regressions in analytics, auth, or ingest.
   - Run test scripts covering Scenario A, B, C, D, E, F.
2. **Browser End-to-End Verification**:
   - Test clean launch in fresh incognito browser context (no pre-set tokens).
   - Verify zero 401 errors on `/copilot`.
   - Verify Scenario A greeting.
   - Verify Scenario B cybersecurity explanation.
   - Upload sample SSH syslog file and verify ingestion + analysis report.
   - Verify Scenario D follow-ups with context memory.
   - Verify Scenario E autonomous investigation.
   - Verify Scenario F action proposal and dry-run execution.
   - Capture full screenshots of all working scenarios.
