import ipaddress
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.models.event import SecurityEventModel


# =====================================================================
# STRUCTURED CYBERSECURITY KNOWLEDGE BASE (MITRE ATT&CK, SIGMA, PLAYBOOKS)
# =====================================================================

MITRE_ATTACK_KNOWLEDGE: List[Dict[str, Any]] = [
    {
        "technique_id": "T1110.001",
        "technique_name": "Password Guessing",
        "tactic": "Credential Access",
        "keywords": ["ssh", "brute", "force", "guessing", "password", "linux", "sshd"],
        "description": "Adversaries may systematically guess passwords to gain access to target accounts.",
        "detection_guidelines": "Monitor authentication logs (e.g., Linux sshd, Windows 4625) for high failure velocity from single IP.",
        "mitigations": ["Enforce account lockout thresholds", "Implement IP rate limiting", "Require multi-factor authentication (MFA)"],
        "reference_url": "https://attack.mitre.org/techniques/T1110/001/"
    },
    {
        "technique_id": "T1110.003",
        "technique_name": "Password Spraying",
        "tactic": "Credential Access",
        "keywords": ["spray", "spraying", "horizontal", "sso", "okta", "active directory"],
        "description": "Adversaries may use a single or small set of common passwords against many different accounts to avoid lockouts.",
        "detection_guidelines": "Correlate failed authentication events across multiple usernames originating from the same source IP within a sliding window.",
        "mitigations": ["Enforce strong enterprise password policies", "Implement smart lockout", "Enable risk-based authentication"],
        "reference_url": "https://attack.mitre.org/techniques/T1110/003/"
    },
    {
        "technique_id": "T1078.003",
        "technique_name": "Valid Accounts: Local Accounts",
        "tactic": "Defense Evasion, Persistence, Initial Access",
        "keywords": ["root", "local", "administrator", "breach", "compromise"],
        "description": "Adversaries may obtain and abuse credentials of default or local system accounts.",
        "detection_guidelines": "Alert on interactive logons to local administrator/root accounts, especially after failed attempts.",
        "mitigations": ["Disable unnecessary local accounts", "Enforce Local Administrator Password Solution (LAPS)", "Restrict remote logon rights"],
        "reference_url": "https://attack.mitre.org/techniques/T1078/003/"
    },
    {
        "technique_id": "T1078.002",
        "technique_name": "Valid Accounts: Domain Accounts",
        "tactic": "Initial Access, Privilege Escalation",
        "keywords": ["domain", "kerberos", "admin", "active directory", "privileged"],
        "description": "Adversaries may compromise and abuse domain accounts to access enterprise domain services.",
        "detection_guidelines": "Monitor Kerberos pre-authentication failures (Windows 4771) and anomalous privilege assignments.",
        "mitigations": ["Implement Tiered Administration model", "Protect domain admin credentials with dedicated jump boxes"],
        "reference_url": "https://attack.mitre.org/techniques/T1078/002/"
    },
    {
        "technique_id": "T1021.004",
        "technique_name": "Remote Services: SSH",
        "tactic": "Lateral Movement",
        "keywords": ["lateral", "movement", "ssh", "pivot", "internal"],
        "description": "Adversaries may use SSH to move laterally across systems in the network environment.",
        "detection_guidelines": "Inspect east-west SSH connections between non-bastion internal subnets.",
        "mitigations": ["Segment internal networks", "Enforce SSH key-only authentication with passphrase protection"],
        "reference_url": "https://attack.mitre.org/techniques/T1021/004/"
    },
    {
        "technique_id": "T1558.003",
        "technique_name": "Steal or Forge Kerberos Tickets: Kerberoasting",
        "tactic": "Credential Access",
        "keywords": ["kerberoast", "kerberoasting", "spn", "tgs", "rc4", "active directory", "ticket"],
        "description": "Adversaries may request service tickets (TGS) for target Service Principal Names (SPNs) using RC4-HMAC encryption to crack service account passwords offline.",
        "detection_guidelines": "Monitor Event ID 4769 for abnormal volumes of TGS requests with ticket encryption type 0x17 (RC4-HMAC-MD5).",
        "mitigations": ["Enforce AES-256 Kerberos encryption", "Require managed service accounts (gMSA) with 128-bit randomized passwords", "Audit SPN privileges"],
        "reference_url": "https://attack.mitre.org/techniques/T1558/003/"
    },
    {
        "technique_id": "T1558.004",
        "technique_name": "Steal or Forge Kerberos Tickets: AS-REP Roasting",
        "tactic": "Credential Access",
        "keywords": ["as-rep", "asrep", "roasting", "preauth", "dont_req_preauth", "kerberos"],
        "description": "Adversaries may request authentication tickets for domain accounts configured with Kerberos pre-authentication disabled to crack user password hashes offline.",
        "detection_guidelines": "Audit Event ID 4768 where Pre-Authentication Type is 0 (no pre-authentication required).",
        "mitigations": ["Audit and enable Kerberos Pre-Authentication on all user accounts", "Enforce 25+ character passphrases"],
        "reference_url": "https://attack.mitre.org/techniques/T1558/004/"
    },
    {
        "technique_id": "T1550.002",
        "technique_name": "Use Alternate Authentication Material: Pass the Hash",
        "tactic": "Lateral Movement, Defense Evasion",
        "keywords": ["pass the hash", "pth", "ntlm", "hash", "lateral", "mimikatz"],
        "description": "Adversaries may use the NTLM hash of a user's password to authenticate to remote servers without needing the cleartext password.",
        "detection_guidelines": "Alert on NTLM logons (Logon Type 3) across internal network boundaries where Kerberos is expected.",
        "mitigations": ["Disable NTLM in favor of Kerberos", "Add privileged users to Protected Users security group", "Deploy LAPS"],
        "reference_url": "https://attack.mitre.org/techniques/T1550/002/"
    },
    {
        "technique_id": "T1190",
        "technique_name": "Exploit Public-Facing Application",
        "tactic": "Initial Access",
        "keywords": ["sqli", "sql injection", "xss", "ssrf", "waf", "rce", "exploit", "path traversal"],
        "description": "Adversaries may exploit vulnerabilities in Internet-facing software (SQLi, SSRF, command injection, path traversal) to execute code or steal data.",
        "detection_guidelines": "Inspect web application and WAF logs for SQL meta-characters, path traversal sequences ('../'), and cloud metadata queries (169.254.169.254).",
        "mitigations": ["Enforce parameterized SQL queries and ORMs", "Deploy WAF with OWASP Core Rule Set", "Enforce IMDSv2 with token hops constraint"],
        "reference_url": "https://attack.mitre.org/techniques/T1190/"
    },
    {
        "technique_id": "T1048.003",
        "technique_name": "Exfiltration Over Alternative Protocol: DNS Exfiltration",
        "tactic": "Exfiltration, Command and Control",
        "keywords": ["dns", "tunneling", "exfiltration", "txt", "shannon", "entropy", "subdomain"],
        "description": "Adversaries may exfiltrate stolen data or establish command-and-control channels by encoding payloads into DNS query labels.",
        "detection_guidelines": "Calculate Shannon entropy on DNS query subdomains (alerting on entropy > 3.8), anomalous subdomain lengths (>35 chars), and high frequency TXT record queries.",
        "mitigations": ["Deploy DNS sinkholing and Response Policy Zones (RPZ)", "Enforce internal DNS forwarder resolvers", "Block direct external UDP 53 egress"],
        "reference_url": "https://attack.mitre.org/techniques/T1048/003/"
    },
    {
        "technique_id": "T1071.001",
        "technique_name": "Application Layer Protocol: Web Protocols",
        "tactic": "Command and Control",
        "keywords": ["c2", "beaconing", "jitter", "command and control", "heartbeat", "dga"],
        "description": "Adversaries may communicate with command and control infrastructure using standard HTTP/HTTPS protocols with randomized timing jitter.",
        "detection_guidelines": "Analyze statistical periodicity, coefficient of variation in inter-request arrival times, and JA3/JA4 TLS fingerprint anomalies.",
        "mitigations": ["Inspect TLS traffic via decrypting proxies", "Block dynamic DNS and newly registered domains (NRDs)", "Enforce strict egress proxy authentication"],
        "reference_url": "https://attack.mitre.org/techniques/T1071/001/"
    },
    {
        "technique_id": "T1498.001",
        "technique_name": "Network Denial of Service: Direct Network Flood",
        "tactic": "Impact",
        "keywords": ["syn flood", "dos", "ddos", "flood", "tcp syn", "volumetric"],
        "description": "Adversaries may flood network services with transport-layer packets (such as TCP SYN floods) to exhaust server resources.",
        "detection_guidelines": "Monitor asymmetric SYN without ACK packet ratios and half-open TCP connection table saturation.",
        "mitigations": ["Enable SYN cookies (tcp_syncookies=1)", "Tune tcp_max_syn_backlog", "Deploy upstream DDoS mitigation scrubbers"],
        "reference_url": "https://attack.mitre.org/techniques/T1498/001/"
    },
    {
        "technique_id": "T1499.003",
        "technique_name": "Endpoint Denial of Service: Application Exhaustion",
        "tactic": "Impact",
        "keywords": ["slowloris", "slow http", "low and slow", "connection exhaustion"],
        "description": "Adversaries may exploit application architecture by holding connection sockets open with incomplete HTTP requests (Slowloris).",
        "detection_guidelines": "Alert on HTTP sessions with extended durations, low packet volume, and prolonged header inter-arrival times.",
        "mitigations": ["Deploy Apache mod_reqtimeout", "Set aggressive client header timeout thresholds", "Use event-driven reverse proxies (Nginx/Envoy)"],
        "reference_url": "https://attack.mitre.org/techniques/T1499/003/"
    }
]

SIGMA_RULES_KNOWLEDGE: List[Dict[str, Any]] = [
    {
        "rule_id": "SIGMA-SSH-VELOCITY",
        "title": "High Velocity SSH Authentication Failures",
        "log_source": "linux_ssh",
        "severity": "high",
        "logic": "count(event.outcome == 'failure') >= 10 by source_ip in 120s",
        "false_positives": ["Vulnerability scanners", "Misconfigured batch automation jobs"]
    },
    {
        "rule_id": "SIGMA-AUTH-SPRAY",
        "title": "Horizontal Credential Spray Across Multiple User Identities",
        "log_source": "any_auth",
        "severity": "high",
        "logic": "distinct_count(username) >= 5 where outcome == 'failure' by source_ip in 300s",
        "false_positives": ["Automated directory synchronization scripts"]
    },
    {
        "rule_id": "SIGMA-PRIV-TARGET",
        "title": "Targeted Authentication Probing on Privileged Accounts",
        "log_source": "any_auth",
        "severity": "critical",
        "logic": "username in ('root', 'admin', 'administrator', 'domain_admin') and outcome == 'failure' >= 5 by source_ip",
        "false_positives": ["Administrator password typos during emergency maintenance"]
    },
    {
        "rule_id": "SIGMA-KERBEROAST-TGS",
        "title": "Suspicious Kerberos TGS Ticket Request with RC4 Encryption",
        "log_source": "windows_security_4769",
        "severity": "high",
        "logic": "event.id == 4769 and ticket_encryption_type == '0x17' and not service_name.endswith('$')",
        "false_positives": ["Legacy enterprise services requiring RC4 compatibility"]
    },
    {
        "rule_id": "SIGMA-DNS-TUNNEL",
        "title": "High-Entropy DNS Query Subdomain Exfiltration",
        "log_source": "dns_query_logs",
        "severity": "high",
        "logic": "shannon_entropy(query.subdomain) >= 3.8 and length(query.subdomain) >= 35",
        "false_positives": ["Content delivery network hash routing (e.g. Akamai, Cloudflare)"]
    },
    {
        "rule_id": "SIGMA-WEB-SQLI",
        "title": "SQL Injection Meta-Character or Union Pattern in HTTP Request",
        "log_source": "web_waf_access",
        "severity": "critical",
        "logic": "request_uri matches '(?i)(union\\s+select|or\\s+1=1|--|/\\*|sleep\\(\\d+\\))'",
        "false_positives": ["Security vulnerability scanners in scheduled lab windows"]
    },
    {
        "rule_id": "SIGMA-C2-BEACON",
        "title": "Periodic HTTP/HTTPS Outbound Beaconing with Statistical Low Jitter",
        "log_source": "egress_netflow",
        "severity": "high",
        "logic": "coefficient_of_variation(inter_arrival_time) <= 0.15 and connection_count >= 50 by destination_ip",
        "false_positives": ["Software auto-updaters", "NTP synchronization clients"]
    }
]

DEFENSIVE_PLAYBOOKS_KNOWLEDGE: List[Dict[str, Any]] = [
    {
        "playbook_id": "PB-SSH-BRUTE-01",
        "name": "SSH Brute-Force Neutralization Playbook",
        "target_type": "source_ip",
        "containment_actions": [
            "Inject edge firewall temporary DROP rule for offending source IP (30 min TTL)",
            "Terminate active interactive SSH sessions originating from source IP (SIGKILL)",
            "Invalidate cached authentication tokens"
        ],
        "verification_steps": [
            "Verify iptables/nftables rule presence at boundary router",
            "Confirm session termination via pkill -KILL -u <user>"
        ],
        "rollback_procedure": "Remove boundary drop rule: iptables -D INPUT -s <source_ip> -j DROP"
    },
    {
        "playbook_id": "PB-SPRAY-DEFENSE-02",
        "name": "Horizontal Password Spray Defense Playbook",
        "target_type": "source_ip",
        "containment_actions": [
            "Enforce reverse-proxy WAF rate limiting on offending IP/subnet",
            "Trigger mandatory MFA challenge step-up on all probed user accounts",
            "Alert account holders to verify recent activity"
        ],
        "verification_steps": [
            "Confirm WAF rate limit threshold in edge gateway metrics",
            "Verify user session MFA re-authentication tokens"
        ],
        "rollback_procedure": "Restore default WAF rate limits and disable temporary MFA enforcement flags"
    },
    {
        "playbook_id": "PB-LATERAL-CONTAIN-03",
        "name": "Lateral Movement Isolation Playbook",
        "target_type": "host",
        "containment_actions": [
            "Isolate compromised host into quarantine VLAN",
            "Revoke all active Kerberos TGT and NTLM session cookies",
            "Force immediate password reset for targeted service accounts"
        ],
        "verification_steps": [
            "Ping quarantine gateway to verify packet isolation",
            "Verify Kerberos ticket invalidation in KDC logs"
        ],
        "rollback_procedure": "Re-enable standard trunk switch port and reconnect host to production VLAN"
    }
]


class SecurityKnowledgeRetriever:
    """
    RAG retriever providing ground-truth MITRE ATT&CK techniques,
    Sigma detection rules, and defensive playbooks for AI investigation grounding.
    """
    @staticmethod
    def retrieve(
        query: str,
        technique_ids: Optional[List[str]] = None,
        max_results: int = 4
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        q = query.lower()

        # 1. Search MITRE ATT&CK
        for item in MITRE_ATTACK_KNOWLEDGE:
            matches_tech = technique_ids and item["technique_id"] in technique_ids
            keywords = item.get("keywords", [])
            matches_query = (
                item["technique_id"].lower() in q or
                item["technique_name"].lower() in q or
                any(k in q for k in keywords) or
                any(word in item["description"].lower() for word in q.split() if len(word) > 3)
            )
            if matches_tech or matches_query:
                results.append({
                    "source": "mitre_attack",
                    "id": item["technique_id"],
                    "title": f"{item['technique_id']} - {item['technique_name']}",
                    "tactic": item["tactic"],
                    "guidelines": item["detection_guidelines"],
                    "mitigations": item["mitigations"]
                })

        # 2. Search Sigma Rules
        for sigma in SIGMA_RULES_KNOWLEDGE:
            if sigma["rule_id"].lower() in q or sigma["title"].lower() in q or any(w in sigma["title"].lower() for w in q.split() if len(w) > 3):
                results.append({
                    "source": "sigma_rule",
                    "id": sigma["rule_id"],
                    "title": sigma["title"],
                    "severity": sigma["severity"],
                    "logic": sigma["logic"],
                    "false_positives": sigma["false_positives"]
                })

        # 3. Search Defensive Playbooks
        for pb in DEFENSIVE_PLAYBOOKS_KNOWLEDGE:
            if pb["playbook_id"].lower() in q or any(w in pb["name"].lower() for w in q.split() if len(w) > 3):
                results.append({
                    "source": "defensive_playbook",
                    "id": pb["playbook_id"],
                    "title": pb["name"],
                    "actions": pb["containment_actions"],
                    "verification": pb["verification_steps"]
                })

        # 4. Dense Vector Semantic RAG Retrieval
        try:
            from backend.app.services.vector_rag import vector_rag
            vector_matches = vector_rag.search(query, top_k=max_results)
            for vm in vector_matches:
                if not any(r.get("id") == vm.get("id") for r in results):
                    results.append(vm)
        except Exception:
            pass

        # Default fallback if query is generic
        if not results:
            results.append({
                "source": "mitre_attack",
                "id": MITRE_ATTACK_KNOWLEDGE[0]["technique_id"],
                "title": f"{MITRE_ATTACK_KNOWLEDGE[0]['technique_id']} - {MITRE_ATTACK_KNOWLEDGE[0]['technique_name']}",
                "tactic": MITRE_ATTACK_KNOWLEDGE[0]["tactic"],
                "guidelines": MITRE_ATTACK_KNOWLEDGE[0]["detection_guidelines"],
                "mitigations": MITRE_ATTACK_KNOWLEDGE[0]["mitigations"]
            })

        return results[:max_results]


class ThreatIntelligenceService:
    """
    Threat Intelligence indicator management subsystem.
    Handles IP reputation lookups, CIDR prefix matching, confidence tracking, and TTL expiration.
    """
    def __init__(self, default_ttl_days: int = 7):
        self.default_ttl = timedelta(days=default_ttl_days)

    async def lookup_ip(self, ip: str, db: AsyncSession) -> Optional[ThreatIntelModel]:
        """Lookup an IP indicator in the database, with support for exact match and TTL validation."""
        res = await db.execute(select(ThreatIntelModel).where(ThreatIntelModel.ip == ip))
        record = res.scalar_one_or_none()
        if not record:
            return None

        # Check TTL
        now = datetime.now(timezone.utc)
        record_last_seen = record.last_seen
        if record_last_seen.tzinfo is None:
            record_last_seen = record_last_seen.replace(tzinfo=timezone.utc)

        if (now - record_last_seen) > self.default_ttl:
            # Indicator has expired
            return None

        return record

    async def register_indicator(
        self,
        db: AsyncSession,
        ip: str,
        threat_classification: str,
        reputation_score: int = 75,
        confidence: int = 85,
        country: str = "US",
        country_code: str = "US",
        asn: str = "AS15169",
        mitre_techniques: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        associated_incidents: Optional[List[str]] = None,
        source: str = "Sentinel Synthetic Feed"
    ) -> ThreatIntelModel:
        """Register or update an intelligence indicator record."""
        now = datetime.now(timezone.utc)
        res = await db.execute(select(ThreatIntelModel).where(ThreatIntelModel.ip == ip))
        existing = res.scalar_one_or_none()

        if existing:
            existing.threat_classification = threat_classification
            existing.reputation_score = reputation_score
            existing.confidence = confidence
            existing.last_seen = now
            existing.mitre_techniques = list(set(existing.mitre_techniques + (mitre_techniques or [])))
            existing.tags = list(set(existing.tags + (tags or [])))
            existing.associated_incidents = list(set(existing.associated_incidents + (associated_incidents or [])))
            await db.commit()
            await db.refresh(existing)
            return existing

        new_record = ThreatIntelModel(
            ip=ip,
            threat_classification=threat_classification,
            reputation_score=reputation_score,
            confidence=confidence,
            country=country,
            country_code=country_code,
            asn=asn,
            first_seen=now,
            last_seen=now,
            mitre_techniques=mitre_techniques or [],
            tags=tags or [],
            associated_incidents=associated_incidents or [],
            simulated_data_source=source
        )
        db.add(new_record)
        await db.commit()
        await db.refresh(new_record)
        return new_record


threat_intel_service = ThreatIntelligenceService()
knowledge_retriever = SecurityKnowledgeRetriever()
