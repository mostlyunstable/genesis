# SENTINEL AI — CYBERSECURITY AI KNOWLEDGE & TRAINING REPORT

**Document ID:** `docs/SENTINEL_AI_TRAINING_REPORT.md`  
**System Module:** Intelligence Orchestration, Model Grounding & Tool Synthesis  
**Version:** v3.5 Enterprise (CyberKnowledgeEngine & Grounded Question Answering)  
**Author:** Principal Software Architect, Cybersecurity Systems Engineer, and AI Lead  
**Audit Scope:** End-to-end documentation of multi-cycle dataset knowledge integration, architectural training strategy, RAG knowledge retrieval, expanded backend tools, CyberKnowledgeEngine, and elimination of irrelevant fallback answers.

---

## 1. EXECUTIVE SUMMARY & CONTINUOUS TRAINING PHILOSOPHY

The primary objective of SENTINEL AI is to provide an autonomous, context-aware cybersecurity analyst assistant. Rather than relying on generic large language model (LLM) weights wrapped in cosmetic system prompts, SENTINEL AI grounds its intelligence in empirical cybersecurity telemetry, verified threat intelligence, deterministic feature extraction, and bounded tool execution.

### The Engineering Rationale: Tool-Augmented Orchestration Over Weight Fine-Tuning
A conventional but fundamentally flawed approach in AI security engineering is attempting to fine-tune generative language models directly on raw network flows (e.g., CSV tabular rows) or massive authentication event logs (e.g., 100 GB LANL auth streams). Our engineering audit identified critical failure modes in direct LLM weight tuning for cybersecurity operations:
1. **Loss of Numerical Precision & Arithmetic Hallucination:** Generative decoder models tokenize numbers as subword fragments. They cannot perform reliable threshold checks (e.g., evaluating whether flow velocity exceeds $500\text{ packets/s}$ or calculating exact Kerberos ticket renewal intervals). In SOC environments, a hallucinated IP address or packet count invalidates an entire forensic chain of custody.
2. **Catastrophic Forgetting of Linguistic Nuance:** Training on millions of repetitive tabular log lines causes severe degradation of natural language comprehension, instruction-following fidelity, and structured JSON output generation.
3. **Staleness and Compute Inefficiency:** Re-training weights to incorporate new IOCs or log formats requires expensive GPU cluster cycles. In contrast, threat intelligence and network topology change continuously.

### The Multi-Modal Deterministic Architecture
SENTINEL AI resolves this challenge through **Deterministic Tool-Augmented Orchestration**:
- **Generative AI Role:** Natural language understanding, dialogue state management, intent classification, multi-turn context tracking, hypothesis formulation, and synthesis of technical explanations.
- **Backend Tool Role:** High-speed, deterministic parsing, mathematical metric computation, statistical threshold checking, graph-based lateral movement analysis, and correlation with MITRE ATT&CK taxonomy.
- **RAG Role:** Rapid vector retrieval of grounded threat dossiers, protocol RFC definitions, mitigation playbooks, and forensic baselines.

```
+-------------------------------------------------------------------------------------------------+
|                                SENTINEL AI INTELLIGENCE ARCHITECTURE                            |
+-------------------------------------------------------------------------------------------------+
|                                                                                                 |
|   +-------------------+      Natural Dialogue      +-----------------------------------------+  |
|   |   Security User   | <=======================> |       SENTINEL AI Chatbot Engine        |  |
|   +-------------------+                           |  (ChatCopilotService + Streaming SSE)   |  |
|                                                    +-----------------------------------------+  |
|                                                                 |            |                  |
|                                Intent & Context Routing         |            | Grounded Context |
|                                                                 v            v                  |
|                                +-----------------------------------+    +--------------------+  |
|                                |    CybersecurityToolRegistry      |    |   Grounded RAG     |  |
|                                |   - Network Analysis (CIC-IDS)    |    |   Knowledge Base   |  |
|                                |   - Phishing & Header Analyzer    |    | - MITRE ATT&CK     |  |
|                                |   - LANL Auth & Lateral Movement  |    | - Protocol Specs   |  |
|                                |   - System Logs (Loghub / HDFS)   |    | - Sigma Rules      |  |
|                                |   - Web Attack Analyzer (WAF)     |    | - Defensive PBs    |  |
|                                |   - DNS Tunneling / Exfil Tool    |    +--------------------+  |
|                                |   - Active Directory Kerberos     |                            |
|                                |   - Multi-Stage Kill Chain Fuser  |                            |
|                                |   - Dataset Overview & Schemas    |                            |
|                                +-----------------------------------+                            |
|                                                  |                                              |
|                                                  v                                              |
|                                +-----------------------------------+                            |
|                                | Deterministic Security Telemetry  |                            |
|                                |   - data/cic_ids2017/             |                            |
|                                |   - data/phishing/                |                            |
|                                |   - data/lanl/                    |                            |
|                                |   - data/loghub/                  |                            |
|                                |   - data/web_attacks/             |                            |
|                                |   - data/dns/                     |                            |
|                                |   - data/kerberos/                |                            |
|                                +-----------------------------------+                            |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. COMPREHENSIVE KNOWLEDGE DOMAINS INCORPORATED

### 2.1 Network Intrusion & Transport Security (CIC-IDS2017)
- **Volumetric vs Asymmetric Floods:** Volumetric floods (DoS Hulk, UDP amplification) saturate physical link bandwidth with $>25,000\text{ pkts/s}$. Low-and-slow DoS Slowloris exhausts application thread pools (`MaxRequestWorkers`) by holding persistent HTTP connections open with partial headers at long inter-arrival intervals (`Flow IAT Mean` $>5,000,000\ \mu\text{s}$) with minimal bandwidth footprint.
- **TCP Flag Signatures:** SYN without ACK asymmetry, unsolicited RST injection, FIN scans, and half-open state table exhaustion.
- **Kernel Mitigations:** SYN cookies (`tcp_syncookies=1`), TCP backlog queue tuning (`net.ipv4.tcp_max_syn_backlog`), and boundary rate limiting.

### 2.2 Phishing & Email Gateway Telemetry
- **Protocol Alignment:** Rigorous tripartite verification across SPF, DKIM, and DMARC.
- **Lexical URL Forensics:** Detection of bare IP addresses in hyperlinks (`http://192.168.1.100/login`), typosquatted subdomains (`portal.chase.com.evilcorp.xyz`), and high character entropy.
- **Social Engineering Cues:** Coercion keywords, artificial deadlines, and unauthorized wire transfer lures.

### 2.3 Active Directory & Enterprise Kerberos Telemetry (LANL `cyber1`)
- **Kerberoasting (MITRE T1558.003):** Authenticated domain accounts requesting TGS service tickets for registered Service Principal Names (SPNs) with legacy `0x17` (`RC4-HMAC-MD5`) encryption for offline cracking via Hashcat/John the Ripper.
- **AS-REP Roasting (MITRE T1558.004):** Adversaries requesting TGTs for accounts with `DONT_REQ_PREAUTH` disabled (Event ID 4768 Pre-Auth Type 0), returning encrypted session keys crackable offline without failed logon traces.
- **Lateral Movement & Jump Host Pivoting:** Adversaries establishing a beachhead (e.g. `C17693`), harvesting NTLM credentials, and pivoting to internal targets (`C728`, `C1173`, `C294`) via SMB / Windows Admin Shares (`T1021.002`).

### 2.4 Web Application & Cloud Metadata Security
- **SQL Injection (MITRE T1190):** In-band (Union/Error), Inferential (Boolean/Time-based blind), and Out-of-band injection. Elimination via Parameterized Queries and Prepared Statements (strict parser separation of code and data).
- **Cloud Metadata SSRF & IMDSv2:** Exploitation of unauthenticated link-local requests (`169.254.169.254`) under IMDSv1. Mitigation via IMDSv2 session tokens (`X-aws-ec2-metadata-token`) and strict network hop limit of 1.

### 2.5 Covert Channels, DNS Tunneling & C2 Beaconing
- **Shannon Entropy Detection (MITRE T1048.003):** Calculation of character randomness over domain query subdomains:
  $$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
  Natural domains exhibit $H \approx 2.0 - 3.2$; encrypted exfiltration payloads exhibit $H \ge 3.8$, coupled with anomalous subdomain lengths ($>35$ chars) and TXT record volume.
- **C2 Beaconing Jitter (MITRE T1071.001):** Evaluation of statistical inter-arrival time variance and JA3/JA4 TLS client handshake fingerprints.

### 2.6 Zero Trust Architecture (NIST SP 800-207)
- **Foundational Pillars:** 'Never Trust, Always Verify', Assume Breach, Explicit Verification, Least Privilege Access (JIT/JEA), and Microsegmentation.

---

## 3. DATA TELEMETRY STORAGE STRUCTURE

Local representative telemetry sets are maintained under `data/`:

```
data/
├── cic_ids2017/
│   └── cic_ids2017_sample.csv       # Bi-directional flow records (DoS Hulk, Slowloris, PortScan, Benign)
├── phishing/
│   └── phishing_emails_sample.csv   # Corporate mail captures (SPF/DKIM pass/fail, URL lures)
├── lanl/
│   ├── auth_sample.csv              # Multi-source AD authentication events
│   └── redteam_sample.csv           # Ground-truth Red Team compromise actions (C17693 -> C728/C1173)
├── loghub/
│   ├── OpenSSH/                     # OpenSSH daemon logs, structured CSV, and Drain templates
│   ├── Linux/                       # Linux syslog and PAM authentication records
│   └── HDFS/                        # Distributed storage block replication logs
├── web_attacks/
│   └── web_attacks_sample.log       # WAF access logs (SQLi, XSS, Path Traversal, Cloud SSRF)
├── dns/
│   └── dns_queries_sample.csv       # DNS query log with Shannon entropy scores (exfil.darkops.io)
└── kerberos/
    └── kerberos_tickets_sample.csv  # Windows Security Event 4768/4769 Kerberos ticket requests
```

---

## 4. COMPLETE BACKEND TOOL INVENTORY (`CybersecurityToolRegistry`)

Implemented in [`backend/app/services/chat_tools.py`](file:///Users/mayankkumar/genysis/backend/app/services/chat_tools.py):

| Tool Identifier | Domain | Technical Responsibility |
| :--- | :--- | :--- |
| `analyze_network_traffic_dataset` | Network NetFlow | Evaluates flow rates, detects volumetric DoS Hulk ($>25\text{k pkts/s}$), low-and-slow Slowloris on port 80, and PortScan sweeps. |
| `analyze_phishing_dataset` | Mail Gateway | Audits SPF/DKIM validation status, flags IP-in-URL hyperlinks, identifies brand spoofing, and computes urgency scores. |
| `analyze_lanl_cyber_events` | AD Auth Graph | Traces initial breach computer (`C17693`), maps lateral pivot hops (`C728`, `C1173`, `C294`), and detects domain account reuse. |
| `analyze_system_log_dataset` | Host & Storage Logs | Mines OpenSSH, Linux PAM, and HDFS templates via Drain; flags dictionary probing and block replication anomalies. |
| `analyze_web_attack_dataset` | Web / WAF Logs | Ingests web server access logs; detects SQL Injection (Union/Boolean), XSS (`<script>`), Path Traversal (`../../etc/passwd`), and SSRF (`169.254.169.254`). |
| `analyze_dns_exfiltration` | DNS Covert Channels | Applies Shannon entropy scoring ($H \ge 3.8$) to query labels; flags base64 exfiltration over TXT records and compromised client IPs. |
| `analyze_ad_kerberos_telemetry` | Windows Active Directory | Audits Events 4768 & 4769; identifies Kerberoasting via RC4 (`0x17`) downgrade on SPNs and AS-REP Roasting on accounts with pre-auth disabled. |
| `correlate_kill_chain` | Multi-Source Fusion | Reconstructs complete 6-stage Cyber Kill Chain: Phishing $\to$ Execution $\to$ Kerberoasting $\to$ Lateral Movement $\to$ C2 $\to$ DNS Exfiltration. |
| `get_dataset_overview` | Knowledge / Schema | Returns full schemas, volumetric scales, feature sets, attack classes, and use cases for all 8 supported benchmark datasets. |

---

## 5. HARDENED CONVERSATIONAL SYNTHESIS & ADVERSARIAL RESILIENCE

Located in [`backend/app/services/chat.py`](file:///Users/mayankkumar/genysis/backend/app/services/chat.py):

1. **Low-Friction Greetings:** Clean, professional welcome without excessive filler.
2. **Concise Definitions & Operational Examples:** Immediate technical distinction with real-world attack scenarios.
3. **Deep Technical Mechanics:** Protocol-level precision across TCP handshakes, Kerberos ticket cryptography, Shannon entropy, and cloud metadata defense.
4. **Adversarial & Jailbreak Resistance:** Strictly declines instruction overrides, malware generation requests, or policy bypass attempts with explicit PolicyEngine citation.
5. **Context-Aware Multi-Turn Forensics:** Tracks entities across multiple turns; resolves relative references (*"second suspicious event"*) to concrete flow metrics.
6. **Anti-Hallucination Attribution Guard:** Strictly separates observable technical IOCs from geopolitical nation-state attribution, outlining specific forensic requirements needed to confirm actor identity.

---

## 6. CYBERKNOWLEDGEENGINE & ELIMINATION OF IRRELEVANT ANSWERS

### The Root Cause of Irrelevant Answers
Previously, queries that did not match hard-coded intent expressions defaulted to a generic system overview block (`Environment Status: ONLINE`). If a user asked standard questions like *"What is an ARP spoofing attack?"*, *"How does stateful packet inspection work?"*, or *"Explain the difference between symmetric and asymmetric encryption"*, the assistant provided an irrelevant status reply.

### The Resolution: CyberKnowledgeEngine
Implemented in [`backend/app/services/cyber_knowledge.py`](file:///Users/mayankkumar/genysis/backend/app/services/cyber_knowledge.py), the `CyberKnowledgeEngine` provides an indexed repository of deep technical dossiers across:
- **Network Layer Security**: ARP poisoning & DAI, SPI firewalls, DNS cache poisoning & tunneling, port scanning techniques (-sS, -sT, -sU, XMAS), TCP 3-way handshake mechanics.
- **Web Application Security (OWASP Top 10)**: SQL Injection (in-band, blind, OAST) and parameterized queries, Cross-Site Scripting (Stored, Reflected, DOM) & CSP, CSRF & SameSite attributes, SSRF & IMDSv2, Path Traversal & LFI.
- **Identity & Active Directory**: Kerberoasting (TGS RC4 downgrade & gMSA), AS-REP Roasting (DONT_REQ_PREAUTH), Pass-the-Hash & Pass-the-Ticket, Golden/Silver tickets, MFA bypasses & FIDO2.
- **Malware & Threats**: Ransomware mechanics & `vssadmin` shadow copy deletion, C2 beaconing & jitter, LOLBins (`certutil`, `powershell -enc`), rootkits (DKOM).
- **Security Operations & Forensics**: SIEM vs EDR, NIST SP 800-61 / SANS PICERL incident response lifecycle, threat hunting (IOCs vs IOAs), Order of Volatility in digital forensics.
- **Cryptography**: Symmetric vs Asymmetric algorithms, Argon2id vs deprecated MD5/SHA-1 password hashing, PKI & certificate revocation.
- **Zero Trust & Cloud**: NIST SP 800-207 pillars, AWS IAM & CloudTrail, Docker socket abuse (`/var/run/docker.sock`), and Kubernetes RBAC.

All user queries now receive articulate, domain-expert answers grounded in protocol RFCs and MITRE ATT&CK mappings.
