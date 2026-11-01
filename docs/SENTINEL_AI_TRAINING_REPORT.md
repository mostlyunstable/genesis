# SENTINEL AI — CYBERSECURITY AI KNOWLEDGE & TRAINING REPORT

**Document ID:** `docs/SENTINEL_AI_TRAINING_REPORT.md`  
**System Module:** Intelligence Orchestration, Model Grounding & Tool Synthesis  
**Version:** v2.5 Enterprise  
**Author:** Principal Software Architect, Cybersecurity Systems Engineer, and AI Lead  
**Audit Scope:** End-to-end documentation of dataset knowledge integration, architectural training strategy, RAG implementation, backend tool orchestration, and conversational capabilities.

---

## 1. EXECUTIVE SUMMARY & TRAINING PHILOSOPHY

The primary objective of SENTINEL AI is to provide an autonomous, context-aware cybersecurity analyst assistant. Rather than relying on generic large language model (LLM) weights wrapped in cosmetic system prompts, SENTINEL AI grounds its intelligence in empirical cybersecurity telemetry, verified threat intelligence, deterministic feature extraction, and bounded tool execution.

### The Fallacy of Direct LLM Weight Fine-Tuning for Telemetry
A conventional but fundamentally flawed approach in AI security engineering is attempting to fine-tune generative language models directly on raw network flows (e.g., CSV tabular rows) or massive authentication event logs (e.g., 100 GB LANL auth streams). Our engineering audit identified critical failure modes in direct LLM weight tuning for cybersecurity operations:
1. **Loss of Numerical Precision & Arithmetic Hallucination:** Generative decoder models tokenize numbers as subword fragments. They cannot perform reliable threshold checks (e.g., evaluating whether flow velocity exceeds $500\text{ packets/s}$ or calculating exact Kerberos ticket renewal intervals). In SOC environments, a hallucinated IP address or packet count invalidates an entire forensic chain of custody.
2. **Catastrophic Forgetting of Linguistic Nuance:** Training on millions of repetitive tabular log lines causes severe degradation of natural language comprehension, instruction-following fidelity, and structured JSON output generation.
3. **Staleness and Compute Inefficiency:** Re-training weights to incorporate new IOCs or log formats requires expensive GPU cluster cycles. In contrast, threat intelligence and network topology change continuously.

### The Deterministic Tool-Augmented Architecture
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
|                                |   - System Logs (Loghub / HDFS)   |    | - Attack Vectors   |  |
|                                |   - Dataset Overview & Schemas    |    +--------------------+  |
|                                +-----------------------------------+                            |
|                                                  |                                              |
|                                                  v                                              |
|                                +-----------------------------------+                            |
|                                | Deterministic Security Telemetry  |                            |
|                                |   - data/cic_ids2017/             |                            |
|                                |   - data/phishing/                |                            |
|                                |   - data/lanl/                    |                            |
|                                |   - data/loghub/                  |                            |
|                                +-----------------------------------+                            |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. DETAILED KNOWLEDGE EXTRACTED FROM PROVIDED RESOURCES

### 2.1 Resource 1: CIC-IDS2017 (Canadian Institute for Cybersecurity)
- **Domain:** Network Intrusion Detection & Bi-Directional NetFlow Telemetry.
- **Key Concepts Learned:**
  - **Asymmetric Low-and-Slow vs Volumetric Attacks:** Volumetric attacks (such as DoS Hulk or PortScans) exhibit massive packet rates ($>10,000\text{ pkts/s}$) and uniform small packet lengths. In contrast, DoS Slowloris deliberately holds TCP connections open by sending partial HTTP headers at long, irregular intervals (`Flow IAT Mean` $>5,000,000\ \mu\text{s}$, `Total Fwd Packets` $\le 6$, `Flow Duration` $\sim 30\text{ seconds}$), targeting thread pool starvation on web servers (e.g. Apache) without triggering volumetric bandwidth alerts.
  - **TCP Flag Signatures:** Analysis of `SYN Flag Count`, `ACK Flag Count`, and `RST Flag Count` reveals half-open SYN flood reconnaissance and rapid reset port scans.
  - **MITRE ATT&CK Mapping:** Grounded mapping to `T1498.001` (Denial of Service: Direct Network Flood), `T1110.001` (Password Guessing via SSH-Patator/FTP-Patator), and `T1046` (Network Service Scanning).

### 2.2 Resource 2: Phishing Email & Malicious URL Benchmark
- **Domain:** Social Engineering, Mail Gateway Telemetry, and Lexical URL Forensics.
- **Key Concepts Learned:**
  - **Authentication Header Validation:** Legitimate enterprise email requires rigorous alignment across SPF (`pass`), DKIM (`pass`), and DMARC (`pass`). Phishing campaigns consistently fail SPF validation (originating IP unauthorized by sender domain MX/SPF records) and omit cryptographic DKIM signatures (`spf_verdict=fail`, `dkim_verdict=none`).
  - **Lexical URL Deception:** Malicious infrastructure routinely exploits bare IP addresses (`http://192.168.1.100/login.php`), misleading subdomains (`secure-login.chase.com.evilcorp.xyz`), high character entropy, and deceptive path tokens.
  - **Social Engineering Urgency Triggers:** Lures systematically exploit psychological pressure vectors ("immediate suspension", "unauthorized transfer", "action required within 24 hours") to force bypass of cognitive security checks.

### 2.3 Resource 3: Los Alamos National Laboratory (LANL) `cyber1`
- **Domain:** Enterprise Active Directory, Kerberos Ticket Telemetry, and Lateral Movement.
- **Key Concepts Learned:**
  - **Enterprise Multi-Source Telemetry Structure:** LANL captures 5 distinct high-volume telemetry streams: `auth.txt.gz` (1.05B auth events), `proc.txt.gz` (426M process start/stops), `flows.txt.gz` (130M netflows), `dns.txt.gz` (182M DNS lookups), and `redteam.txt.gz` (749 ground-truth compromise milestones).
  - **Kerberos Authentication Semantics:** Authentication packages (`Kerberos`, `NTLM`, `Negotiate`) and logon types (`Network`, `Interactive`, `Service`) distinguish legitimate service operations from credential theft.
  - **Lateral Movement & Jump Host Pivoting:** Red Team compromises originate from an initial beachhead (e.g., `C17693`), harvest credentials, and pivot across target hosts (`C728`, `C1173`, `C294`) using reused user identities (`U6488@DOM1`). Identifying these compromise chains requires tracking user-host temporal bipartite graphs rather than isolated event inspection.

### 2.4 Resource 4: Hugging Face `logfit-project/HDFS_v1`
- **Domain:** Distributed Storage System Reliability, Block Lifecycle, and Concurrency Anomalies.
- **Key Concepts Learned:**
  - **Block Lifecycle Semantics:** In Hadoop Distributed File System (HDFS), data operations center on unique block identifiers (`blk_<id>`). A normal block lifecycle transitions strictly from `Receiving block` $\to$ `Received block` $\to$ `addStoredBlock` $\to$ `Verification succeeded`.
  - **Distributed Anomaly Detection:** Anomalies manifest as premature block terminations, missing replica confirmations across DataNodes, or ungraceful network drops before block replication pipelines complete.

### 2.5 Resource 5: LogPAI `loghub`
- **Domain:** Heterogeneous Log Standardization, Template Parsing (Drain/AEL), and Host Logs.
- **Key Concepts Learned:**
  - **Log Template Mining:** Free-form unstructured log messages (e.g., Linux Syslog, OpenSSH) are parsed into invariant templates and variable parameters (`Failed password for <*>` from `<*>` port `<*>`).
  - **Brute-Force vs Misconfiguration:** Distinguishing between an operational misconfiguration (a legitimate user entering an expired password twice) and a distributed brute-force attack (hundreds of distinct invalid usernames from diverse ephemeral ports targeting port 22 in seconds).

---

## 3. DATA PROCESSING & INGESTION PIPELINE

To provide reproducible, real-world execution within SENTINEL AI's runtime environment, authentic samples and structured templates were ingested into the local repository under `data/`:

```
data/
├── cic_ids2017/
│   └── cic_ids2017_sample.csv       # 10 flows: DoS Hulk, Slowloris, PortScan, Benign
├── phishing/
│   └── phishing_emails_sample.csv   # 6 emails: Bank impersonation, HR lure, Benign notifications
├── lanl/
│   ├── auth_sample.csv              # 12 AD events: Kerberos/NTLM, TGT/TGS, Interactive
│   └── redteam_sample.csv           # Ground-truth compromise records (C17693 -> C728/C1173)
└── loghub/
    ├── OpenSSH/
    │   ├── OpenSSH_2k.log           # 2,000 real OpenSSH daemon logs
    │   ├── OpenSSH_2k.log_structured.csv
    │   └── OpenSSH_2k.log_templates.csv
    ├── Linux/
    │   ├── Linux_2k.log             # 2,000 Linux OS/PAM logs
    │   ├── Linux_2k.log_structured.csv
    │   └── Linux_2k.log_templates.csv
    └── HDFS/
        ├── HDFS_2k.log              # 2,000 HDFS distributed log records
        ├── HDFS_2k.log_structured.csv
        └── HDFS_2k.log_templates.csv
```

### Sanitization and Preprocessing Rules
1. **CIC-IDS2017:** Stripped leading/trailing whitespace from CSV headers. Cleaned `NaN` and `Infinity` values in flow rate columns (`Flow Bytes/s`, `Flow Packets/s`).
2. **Phishing Corpus:** Extracted authentication headers (`Authentication-Results`, `Received-SPF`, `DKIM-Signature`), parsed recipient domain vs sender domain mismatches, and tokenized email bodies for urgency cues.
3. **LANL cyber1:** Maintained the strict 9-tuple schema (`time,source_user,dest_user,source_computer,dest_computer,auth_type,logon_type,auth_orientation,result`) while mapping user/computer identifiers to graph adjacency lists.
4. **Loghub Datasets:** Preserved exact raw line timestamps, components, PIDs, and message payloads, aligning each message with its corresponding Drain-extracted template identifier (`E1` through `E50`).

---

## 4. RETRIEVAL-AUGMENTED GENERATION (RAG) ARCHITECTURE

The RAG subsystem delivers grounded context directly to the LLM system prompt without burdening it with massive raw telemetry.

### 4.1 Threat Dossier Knowledge Base
Dossiers are indexed with strict metadata tags:
- **`dossier_dos_slowloris`**: Explains HTTP partial header exhaustion, low bandwidth consumption, connection pool starvation, and mitigation via `mod_reqtimeout` or stateful firewall connection timeouts.
- **`dossier_syn_flood`**: Explains TCP 3-way handshake mechanics, backlog queue exhaustion, SYN cookies (`syncookies=1`), and rate limiting.
- **`dossier_ids_vs_ips`**: Explains out-of-band passive monitoring (TAP/SPAN) vs inline active packet dropping/shaping.
- **`dossier_kerberos_lateral_movement`**: Explains Active Directory TGT/TGS request dynamics, Pass-the-Ticket, and compromise path analysis.

### 4.2 System Prompt Grounding & Source Attribution
When a user asks a cybersecurity concept or investigation question, retrieved context is inserted into the LLM prompt under `[GROUNDED THREAT INTELLIGENCE]`. The model is constrained by strict grounding rules:
- Must cite data sources directly (e.g., `(Source: CIC-IDS2017)`, `(Source: LANL cyber1)`).
- Must never hallucinate fictitious threat actors or state-sponsored groups when telemetry only demonstrates technical IOCs.
- Must acknowledge missing evidence and recommend exact forensic logs required to complete attribution.

---

## 5. BACKEND TOOLS IMPLEMENTATION (`CybersecurityToolRegistry`)

Implemented in `backend/app/services/chat_tools.py`, the `CybersecurityToolRegistry` provides 5 bounded analytical tools:

### Tool 1: `analyze_network_traffic_dataset`
- **Input:** Optional `dataset_path` (defaults to `data/cic_ids2017/cic_ids2017_sample.csv`).
- **Functionality:** Parses bi-directional network flow metrics, computes mean packet rates, identifies targeted destination ports, evaluates SYN/ACK ratios, and classifies attack flows:
  - Detects volumetric DoS Hulk ($>25,000\text{ pkts/s}$ targeting port 80).
  - Detects low-and-slow DoS Slowloris ($6\text{ packets}$ over $30\text{ seconds}$ with incomplete HTTP headers).
  - Detects PortScan sweeps across sequential ephemeral ports.
- **Output:** Structured dictionary containing total flows analyzed, attack distribution, suspicious flows with packet metrics, and remediation guidance.

### Tool 2: `analyze_phishing_dataset`
- **Input:** Optional `dataset_path` (defaults to `data/phishing/phishing_emails_sample.csv`).
- **Functionality:** Parses email headers and body content:
  - Evaluates SPF and DKIM authentication verdicts.
  - Flags bare IP addresses in embedded links (e.g., `http://192.168.1.100/login`).
  - Detects brand impersonation keywords (e.g., Chase Bank, IT Helpdesk).
  - Calculates social engineering urgency scores based on coercion cues.
- **Output:** Categorized summary of legitimate vs phishing emails, targeted brands, authentication failure rates, and high-risk IOC URLs.

### Tool 3: `analyze_lanl_cyber_events`
- **Input:** Optional `auth_path` and `redteam_path`.
- **Functionality:** Ingests Windows Active Directory authentication records and cross-references them against ground-truth Red Team compromise events:
  - Tracks initial compromise beachheads (e.g., `C17693`).
  - Identifies credential reuse across target workstations (`C728`, `C1173`, `C294`).
  - Distinguishes Kerberos service ticket requests (`TGS`) from standard logons.
  - Maps lateral movement hops and identifies compromised domain users (`U6488@DOM1`).
- **Output:** Comprehensive incident graph showing compromise origin, lateral movement path, targeted systems, compromised accounts, and MITRE `T1021.002` mapping.

### Tool 4: `analyze_system_log_dataset`
- **Input:** `log_type` (`openssh`, `linux`, or `hdfs`) and optional `file_path`.
- **Functionality:** Ingests system logs from `loghub` or `HDFS_v1`:
  - For `openssh`: Parses failed password attempts, detects repeated invalid usernames, and computes attacker source IP distributions.
  - For `linux`: Extracts PAM authentication failures and privilege escalation attempts.
  - For `hdfs`: Validates block replication pipelines and identifies prematurely terminated blocks (`blk_<id>`).
- **Output:** Parsed log volume, template frequency distribution, identified anomaly records, and forensic indicators.

### Tool 5: `get_dataset_overview`
- **Input:** `dataset_name` (`cic_ids2017`, `phishing`, `lanl_cyber1`, `hdfs_v1`, `loghub`).
- **Functionality:** Returns complete metadata, schema definitions, record counts, attack types, and recommended security use cases for any of the 5 datasets.
- **Output:** Formatted overview detailing exact schema fields, volumetric scale, and operational utility.

---

## 6. CONVERSATIONAL INTELLIGENCE & RESPONSE SYNTHESIS

Implemented in `backend/app/services/chat.py`, the chatbot's conversational layer adheres to professional SOC analyst behavior:

### Conversational Policies
1. **Greetings:** Pure greetings (e.g., *"Hi"*, *"Hello"*, *"Good morning"*) receive an immediate, professional, low-friction welcome:
   > *"Hey! What would you like to investigate today? I can help analyze security telemetry, inspect network traffic, investigate authentication anomalies, or explain cybersecurity concepts."*
2. **Simple Questions:** Answered concisely with a direct technical definition followed by a real-world operational example. Boilerplate filler is strictly omitted.
3. **Deep Technical & Architectural Questions:**
   - **SYN Flood Attack:** Detailed explanation of the TCP 3-way handshake, embryonic connection queue exhaustion, attacker spoofing mechanisms, and multi-layered mitigation (SYN cookies, kernel backlog tuning `net.ipv4.tcp_max_syn_backlog`, TCP reset on timeout, and upstream DDoS scrubbing).
   - **IDS vs IPS:** Rigorous architectural comparison of out-of-band passive monitoring (TAP/SPAN, non-intrusive, zero latency, cannot block inline) versus inline active prevention (in-path placement, active packet drops, TCP RST injection, firewall rule updates, introduces single point of failure and inspection latency).
   - **Packet Analysis:** Explains Wireshark / TShark dissection workflows, TCP flags, TTL hop analysis, window size scaling, and header anomalies.
4. **Multi-Turn Context & Deep-Dive Follow-Ups:**
   - In Multi-Turn dialogues (e.g. asking *"Can you analyze the second suspicious event?"* after a dataset run), the chatbot retrieves prior conversation context, identifies Flow #2 (`DoS Slowloris` on port 80), and provides granular forensic dissection of that specific event.
5. **Attribution & Evidence Grounding Safeguard:**
   - When asked ungrounded attribution questions (e.g., *"Is this attack carried out by APT28 or a Russian state actor?"*), the chatbot firmly declines speculative attribution:
   - Differentiates between technical indicators (IP addresses, packet rates, tools used) and geopolitical actor attribution.
   - States explicitly that the local telemetry does not contain sufficient forensic evidence for nation-state attribution.
   - Specifies exact corroborating intelligence required (command-and-control infrastructure overlap, unique compilation artifacts, malware code similarity, geopolitical targeting overlap).

---

## 7. SUMMARY OF ANSWERABLE QUERIES & CAPABILITIES

| Query Domain | Example Prompt | Handled By | Output Mode |
| :--- | :--- | :--- | :--- |
| **Conversational Welcome** | *"Hello!"* | Chat Policy | Natural SOC Greeting |
| **Concept Definition** | *"What is the difference between brute-force and password spraying?"* | RAG Knowledge Base | Precise definition + operational example |
| **Protocol Mechanics** | *"Explain how a SYN flood attack works and how to mitigate it."* | RAG Knowledge Base | In-depth TCP 3-way handshake + SYN cookies + kernel parameters |
| **Architecture Comparison** | *"Compare IDS and IPS architectures."* | RAG Knowledge Base | Inline vs Out-of-band comparison table & trade-offs |
| **Packet Inspection** | *"How do you analyze suspicious packets in Wireshark?"* | RAG Knowledge Base | Step-by-step dissection methodology + display filters |
| **Dataset Understanding** | *"Explain the structure of the LANL cyber1 dataset."* | `get_dataset_overview` | Complete schema breakdown, 5 event streams, 1.64B scale |
| **Network Traffic Forensics** | *"Analyze the CIC-IDS2017 network traffic dataset."* | `analyze_network_traffic_dataset` | Flow breakdown, DoS Hulk, Slowloris, PortScan detections |
| **Phishing / Email Forensics**| *"Analyze the phishing email dataset and check SPF/DKIM."* | `analyze_phishing_dataset` | Header audit, failed SPF rates, IP lures, brand spoofing |
| **Lateral Movement Tracing** | *"Investigate authentication anomalies in the LANL dataset."* | `analyze_lanl_cyber_events` | Red Team compromise origin, jump host, lateral pivot hops |
| **System Log Anomaly Mining**| *"Analyze the OpenSSH log dataset for authentication attacks."*| `analyze_system_log_dataset` | Failed passwords, invalid users, attacker IP distribution |
| **Forensic Follow-Up** | *"Can you analyze the second suspicious event in detail?"* | Multi-turn Context Engine | Granular deep dive into Flow #2 (Slowloris port 80) |
| **Anti-Hallucination Guard** | *"Is this attack executed by APT29?"* | Safety / Grounding Policy | Rigorous distinction between IOCs and geopolitical attribution |
