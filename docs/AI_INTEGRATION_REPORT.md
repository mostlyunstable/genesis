# SENTINEL AI — AI INVESTIGATION & THREAT INTELLIGENCE RAG REPORT

## Executive Summary

SENTINEL AI incorporates an AI-powered threat investigation engine designed for SecOps analysts. This system adheres to strict defense-in-depth principles:
1. **Detection Independence**: Detections are 100% deterministic and do not rely on generative AI.
2. **Grounding Verification & Hallucination Stripping**: Every referenced security event ID and IP address cited by an AI provider is programmatically verified against ground-truth database records. Unverified or hallucinated identifiers are stripped prior to response delivery.
3. **Advisory-Only Privilege Boundary**: The LLM engine is strictly advisory. It cannot execute shell commands, alter database states, or authorize SOAR response actions without human analyst authorization.
4. **Prompt Injection Boundaries**: Telemetry records and raw log content are sanitized and enclosed within strict XML tag boundaries (`<telemetry_dataset>`, `<security_knowledge_rag>`) with explicit model system instructions prohibiting instruction-following from log payloads.
5. **Dual-Provider Architecture with Graceful Degradation**: Production utilizes Google Gemini (`gemini-2.5-flash`), seamlessly and automatically degrading to an offline deterministic analyst engine (`LocalDeterministicProvider`) if external APIs are unreachable, unconfigured, or rate-limited.
6. **Cybersecurity Knowledge Base RAG**: Integrated retrieval-augmented generation grounded in structured MITRE ATT&CK techniques, Sigma detection rules, and defensive playbooks.

---

## 1. System Architecture

```
                                  +------------------------------+
                                  |    Analyst Prompt / Query    |
                                  +--------------+---------------+
                                                 |
                                                 v
                                  +------------------------------+
                                  |   AIInvestigatorService      |
                                  +-------+--------------+-------+
                                          |              |
                      +-------------------+              +--------------------+
                      v                                                       v
         +--------------------------+                           +--------------------------+
         | Context Telemetry (DB)   |                           | Knowledge Base (RAG)     |
         | - SecurityEventModel     |                           | - MITRE ATT&CK           |
         | - IncidentModel          |                           | - Sigma Rules            |
         +------------+-------------+                           | - Defensive Playbooks    |
                      |                                         +-------------+------------+
                      +-------------------+              +--------------------+
                                          |              |
                                          v              v
                                  +------------------------------+
                                  |    XML Prompt Construction   |
                                  |  - Sanitized Log Context     |
                                  |  - Bounded XML Tags          |
                                  +--------------+---------------+
                                                 |
                     +---------------------------+---------------------------+
                     | (If GEMINI_API_KEY)                                   | (Fallback / Offline)
                     v                                                       v
        +--------------------------+                           +--------------------------+
        |   GeminiProvider         |                           | LocalDeterministic       |
        |   (gemini-2.5-flash)     |                           | Provider (Offline)       |
        +------------+-------------+                           +-------------+------------+
                     |                                                       |
                     +---------------------------+---------------------------+
                                                 |
                                                 v
                                  +------------------------------+
                                  | Grounding & Hallucination    |
                                  | Stripping Verification       |
                                  +--------------+---------------+
                                                 |
                                                 v
                                  +------------------------------+
                                  | AnalystQueryResponse         |
                                  | (Advisory Only)              |
                                  +------------------------------+
```

---

## 2. RAG Knowledge Base Specifications

The RAG subsystem (`backend/app/services/threat_intel.py`) maintains curated, structured cybersecurity knowledge across three primary domains:

| Knowledge Source | Identifiers | Description | Mitigations & Actions |
|---|---|---|---|
| **MITRE ATT&CK** | `T1110.001` | Password Guessing (SSH/Auth) | Lockout thresholds, IP rate limits, MFA |
| **MITRE ATT&CK** | `T1110.003` | Password Spraying (SSO/AD) | Strong password policies, smart lockout |
| **MITRE ATT&CK** | `T1078.003` | Local Accounts Compromise | Disable default accounts, LAPS enforcement |
| **MITRE ATT&CK** | `T1078.002` | Domain Accounts Abuse | Tiered admin model, dedicated jump boxes |
| **MITRE ATT&CK** | `T1021.004` | Remote Services (SSH Lateral) | Internal segmentation, key-only SSH |
| **Sigma Rules** | `SIGMA-SSH-VELOCITY` | High Velocity SSH Failures | Count $\ge 10$ in $120\text{s}$ |
| **Sigma Rules** | `SIGMA-AUTH-SPRAY` | Horizontal User Spray | Unique users $\ge 5$ in $300\text{s}$ |
| **Sigma Rules** | `SIGMA-PRIV-TARGET` | Privileged Account Targeting | Target in (`root`, `admin`) $\ge 5$ fails |
| **Playbooks** | `PB-SSH-BRUTE-01` | SSH Neutralization Playbook | Perimeter iptables DROP, SIGKILL sessions |
| **Playbooks** | `PB-SPRAY-DEFENSE-02` | Password Spray Defense | Reverse-proxy WAF rate limits, MFA challenge |
| **Playbooks** | `PB-LATERAL-CONTAIN-03`| Lateral Isolation Playbook | Quarantine VLAN, Kerberos TGT ticket revocation |

---

## 3. Threat Intelligence Indicator Subsystem

`ThreatIntelligenceService` provides programmatic lifecycle management for threat indicators:
- **Reputation Scoring**: 0–100 numerical threat rating.
- **Confidence Rating**: 0–100 mathematical confidence metric.
- **TTL Enforced Expiration**: Default 7-day expiration window (`timedelta(days=7)`). Stale indicators are automatically filtered out during IP reputation lookups.
- **Database Persistence**: Backed by `ThreatIntelModel` with full PostgreSQL schema indexes.

---

## 4. Verification Evidence

The test suite `backend/tests/test_phase3_ai_rag.py` verified all capabilities:

```
backend/tests/test_phase3_ai_rag.py::test_rag_knowledge_retriever_mitre_and_playbooks PASSED [ 20%]
backend/tests/test_phase3_ai_rag.py::test_threat_intel_indicator_registration_and_ttl PASSED [ 40%]
backend/tests/test_ai_analyst_rag_grounding_and_token_metrics PASSED                 [ 60%]
backend/tests/test_ai_analyst_hallucination_stripping_and_grounding PASSED          [ 80%]
backend/tests/test_ai_analyst_graceful_provider_degradation PASSED                  [100%]
```

Key verified properties:
1. **Zero Hallucinated IDs**: When an LLM was injected with fabricated event IDs (`EVT-HALLUCINATED-999`), the grounding validator verified `EVT-REAL-001` and stripped `EVT-HALLUCINATED-999` completely.
2. **Token Telemetry Tracked**: `promptTokens`, `completionTokens`, and `totalTokens` are returned in all queries.
3. **Prompt Injection Ineffective**: XML escaping prevents untrusted telemetry logs from modifying system execution paths.
4. **Resilient Fallback**: Simulated network failure of the external LLM provider gracefully and instantly degraded to the local deterministic engine without error.
