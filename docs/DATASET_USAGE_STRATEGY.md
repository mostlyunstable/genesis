# SENTINEL AI — DATASET USAGE STRATEGY

**Document ID:** `docs/DATASET_USAGE_STRATEGY.md`  
**System Module:** Intelligence Orchestration & Architecture  
**Version:** v2.5 Enterprise  
**Author:** Principal Software Architect & AI Systems Lead  
**Scope:** Strategy and operational allocation for all five cybersecurity data resources.

---

## EXECUTIVE STRATEGY OVERVIEW

A common pitfall in AI cybersecurity systems is treating every dataset as generic LLM pretraining or fine-tuning text. Feeding tabular network flows or massive multi-gigabyte server logs directly into an LLM's context window or training loss produces severe hallucinations, computational inefficiency, and loss of mathematical precision.

SENTINEL AI adopts a **Hybrid Tripartite Strategy**:
1. **Retrieval-Augmented Generation (RAG):** For conceptual knowledge, attack taxonomy, threat intelligence, and protocol specifications.
2. **Deterministic & Statistical Structured Analysis (Backend Tools):** For high-throughput tabular telemetry, network flow metrics, and event log parsing.
3. **Dedicated Held-Out Evaluation Suites:** For objective benchmarking of the chatbot's reasoning, tool execution, and zero-hallucination accuracy.

```
+-----------------------------------------------------------------------------------+
|                        SENTINEL AI MULTI-MODAL DATA ROUTING                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [RESOURCE 1: CIC-IDS2017]      ---> Structured Analysis & Detection Pipeline     |
|                                       - Flow velocity & threshold tools           |
|                                       - Reserved evaluation attack scenarios      |
|                                                                                   |
|  [RESOURCE 2: Phishing & URLs]   ---> RAG Threat Intel & Header Analysis Tool      |
|                                       - Knowledge base chunking & embeddings      |
|                                       - Deterministic SPF/DKIM & brand heuristics |
|                                                                                   |
|  [RESOURCE 3: LANL cyber1]       ---> Graph Telemetry & Lateral Movement Analysis  |
|                                       - Authentication anomaly detection tool     |
|                                       - Red Team pivot evaluation benchmark       |
|                                                                                   |
|  [RESOURCE 4: HDFS_v1 Logfit]    ---> Distributed Anomaly Analysis Pipeline        |
|                                       - Block-level sequence verification tool    |
|                                       - Labeled anomaly evaluation test cases     |
|                                                                                   |
|  [RESOURCE 5: LogPAI loghub]     ---> Log Ingestion Templates & Parser Engine      |
|                                       - Template regex rules (Drain/AEL mining)   |
|                                       - OpenSSH & Linux brute-force test ground   |
+-----------------------------------------------------------------------------------+
```

---

## 1. APPROACH A: RETRIEVAL-AUGMENTED GENERATION (RAG)

### 1.1 Content Allocation & Sources
The RAG pipeline ingests structured threat intelligence, attack descriptions, and mitigation strategies derived from:
- **Resource 2 (Phishing Dataset):** Domain impersonation patterns, social engineering tactics, SPF/DKIM/DMARC protocol validation semantics, and spear-phishing anatomy.
- **Resource 1 (CIC-IDS2017):** MITRE ATT&CK mappings for network attacks:
  - DoS Slowloris $\to$ `T1498.001` (Network Denial of Service)
  - SSH-Patator / FTP-Patator $\to$ `T1110.001` (Brute Force: Password Guessing)
  - PortScan $\to$ `T1046` (Network Service Discovery)
  - Web Attack SQLi $\to$ `T1190` (Exploit Public-Facing Application)
- **Resource 3 (LANL cyber1):** Active Directory Kerberos ticket architecture (`TGS`/`TGT`), Pass-the-Hash / Pass-the-Ticket concepts (`T1550.002`), and lateral movement mechanics (`T1021.002`).
- **Resource 5 (Loghub):** System log anatomy, Syslog RFC 5424 PRI calculation, and Linux PAM authentication failure states.

### 1.2 Ingestion, Chunking & Embedding Pipeline
1. **Document Normalization:** Threat intelligence documents are formatted as structured markdown dossiers with frontmatter metadata:
   ```yaml
   category: "network_attack"
   source: "CIC-IDS2017"
   mitre_technique: "T1498.001"
   tags: ["dos", "slowloris", "http_headers"]
   ```
2. **Chunking Strategy:** Semantic chunking preserving complete defensive playbooks, protocol diagrams, and detection rules (chunk size: 500–800 tokens, 10% overlap).
3. **Embedding Generation:** Vectorized via compact, local embeddings (`sentence-transformers/all-MiniLM-L6-v2` or cosine-similarity keyword index) stored in memory / vector storage with metadata filtering.
4. **Grounded Synthesis:** Retrieved context is injected into the LLM system prompt under `[GROUNDED THREAT INTELLIGENCE]` with mandatory source attribution (`(Source: CIC-IDS2017)`, `(Source: LANL cyber1)`).

---

## 2. APPROACH B: SUPERVISED FINE-TUNING FEASIBILITY EVALUATION

### 2.1 Feasibility Assessment & Decision

| Metric | Evaluation | Verdict |
| :--- | :--- | :--- |
| **Data Nature** | Tabular Netflows (CIC-IDS2017), Gzip event streams (LANL: 100 GB), and Raw Parquet logs (HDFS: 11M lines). | **Unsuitable for direct LLM weight tuning.** Tabular numbers induce catastrophic forgetting in generative text models. |
| **Compute & Hardware** | Full parameter or LoRA tuning on 1.6 billion events requires multi-node GPU clusters (A100/H100) and days of compute. | **Economically & architecturally unjustified** when deterministic tools achieve $100\%$ accuracy in $<1\text{ ms}$. |
| **Accuracy & Explainability** | Fine-tuned LLMs hallucinate IP addresses, ports, and packet counts with non-zero probability. SOC environments demand 100% deterministic mathematical accuracy. | **Deterministic Tool Calling is strictly superior.** |
| **License Compliance** | LANL cyber1 and HDFS datasets have academic/research-only stipulations. | Proprietary model distillation would raise licensing ambiguities. |

### 2.2 Decision: Tool-Augmented Orchestration Over Weight Fine-Tuning
Rather than baking volatile telemetry into static model weights, SENTINEL AI employs **Tool-Augmented Orchestration**:
- The generative AI model remains an agile orchestrator and communicator.
- Deterministic backend tools execute the actual feature calculation, threshold checks, and classification.
- This guarantees zero hallucination, instant adaptability to new data, and complete explainability.

---

## 3. APPROACH C: STRUCTURED CYBERSECURITY ANALYSIS (BACKEND TOOLS)

The core analytical power of SENTINEL AI is implemented in dedicated backend tools in `CybersecurityToolRegistry`:

### 3.1 Network Traffic Analysis Tool (`analyze_network_traffic_dataset`)
- **Underlying Dataset:** Resource 1 (CIC-IDS2017).
- **Extraction Logic:**
  - Evaluates `Flow Duration`, `Flow Packets/s`, `SYN Flag Count`, `ACK Flag Count`, and `Average Packet Size`.
  - **DoS Slowloris Detection:** Identifies long flow duration ($>5,000,000\ \mu\text{s}$), very low packet velocity ($<20\text{ packets/s}$), small packet sizes ($<64\text{ bytes}$), and high SYN/zero ACK ratios.
  - **DDoS Volumetric Detection:** Identifies extreme packet rates ($>2,000\text{ packets/s}$) and symmetric bi-directional flooding.
  - **Port Scanning:** Identifies single-host connections with zero data payload, high RST/SYN flags, and connection bursts across distinct destination ports.
- **Output:** Structured JSON containing classified flows, anomaly confidence, MITRE mappings, and targeted ports.

### 3.2 Phishing & Email Inspection Tool (`analyze_phishing_dataset`)
- **Underlying Dataset:** Resource 2 (Phishing Email Dataset).
- **Extraction Logic:**
  - Extracts RFC 5322 headers, checks domain consistency between `From` and `Reply-To`.
  - Evaluates SPF/DKIM verification results (`FAIL` raises risk score by $+40$).
  - Scans for embedded IP addresses in hyperlinks (e.g. `http://198.51.100.2/login`).
  - Scans for urgency trigger phrases (*suspended*, *verify within 24 hours*, *immediate action*).
- **Output:** Categorical verdict (`PHISHING` vs `LEGITIMATE`), risk score ($0$–$100$), and explicit finding points.

### 3.3 Enterprise Multi-Source Telemetry Tool (`analyze_lanl_cyber_events`)
- **Underlying Dataset:** Resource 3 (LANL cyber1).
- **Extraction Logic:**
  - Correlates authentication events (`auth.txt`) with known Red Team compromises (`redteam.txt`).
  - Identifies lateral movement hops: tracks source computer to destination computer hops within short time windows using the same user credentials.
  - Detects credential spraying: single source computer attempting authentications across $>5$ distinct target computers within a narrow time epoch.
- **Output:** Adversary pivot path graph, targeted host computers, compromised users, and timeline of lateral hops.

### 3.4 System Log Anomaly Tool (`analyze_system_log_dataset`)
- **Underlying Datasets:** Resource 4 (HDFS_v1) & Resource 5 (Loghub OpenSSH/Linux).
- **Extraction Logic:**
  - Evaluates OpenSSH logs for failed passwords, invalid user attempts, and PAM failures.
  - Identifies HDFS block anomalies (e.g., unexpected replica termination, DataNode exceptions).
- **Output:** Grouped failure counts by IP, targeted accounts, block failure status, and root-cause explanation.

---

## 4. APPROACH D: RESERVED EVALUATION DATASETS

To prevent data contamination and ensure rigorous verification:
1. **Strict Partitioning:**
   - 80% of dataset records are designated for structured parsing, knowledge base synthesis, and tool development.
   - 20% are quarantined into a dedicated held-out evaluation test suite (`data/eval/`).
2. **Leakage Prevention:**
   - Evaluation questions in `backend/tests/test_chatbot_knowledge_eval.py` test queries against held-out records that were never fed into prompt few-shot examples or hardcoded templates.
3. **Objective Metrics:**
   - Classification Accuracy: Ratio of correct attack labels on held-out records.
   - Grounding Rate: Percentage of factual claims verified by backend tool output.
   - Hallucination Rate: Frequency of fabricated entities (must be 0.0%).

---

## 5. SUMMARY OF RESOURCE ROLES

```
+------------------+-------------------------+-----------------------------------------+
| RESOURCE         | PRIMARY STRATEGY        | DELIVERABLE IN SENTINEL AI              |
+------------------+-------------------------+-----------------------------------------+
| CIC-IDS2017      | Structured Analysis     | analyze_network_traffic_dataset tool    |
| Phishing / URLs  | RAG + Heuristic Tool    | analyze_phishing_dataset tool & Threat  |
| LANL cyber1      | Structured Correlation  | analyze_lanl_cyber_events lateral tool  |
| HDFS_v1 Logfit   | Anomaly Detection Tool  | analyze_system_log_dataset (HDFS mode)  |
| logpai/loghub    | Parsing Engine & RAG    | OpenSSH/Linux brute-force & template    |
+------------------+-------------------------+-----------------------------------------+
```
