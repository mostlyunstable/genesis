import re
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from backend.app.schemas.event import RawLogItem
from backend.app.models.event import SecurityEventModel

# Regex patterns for SSH Syslog parsing
SSH_FAILED_PATTERN = re.compile(
    r"sshd\[(?P<pid>\d+)\]:\s+Failed\s+password\s+for\s+(?:invalid\s+user\s+)?(?P<user>\S+)\s+from\s+(?P<ip>\S+)\s+port\s+(?P<port>\d+)",
    re.IGNORECASE
)
SSH_ACCEPTED_PATTERN = re.compile(
    r"sshd\[(?P<pid>\d+)\]:\s+Accepted\s+(?P<method>password|publickey)\s+for\s+(?P<user>\S+)\s+from\s+(?P<ip>\S+)\s+port\s+(?P<port>\d+)",
    re.IGNORECASE
)
PAM_FAILURE_PATTERN = re.compile(
    r"pam_unix\([^)]+\):\s+authentication failure;.*?rhost=(?P<ip>\S+).*?user=(?P<user>\S+)",
    re.IGNORECASE
)
PAM_SUCCESS_PATTERN = re.compile(
    r"pam_unix\([^)]+\):\s+session opened for user\s+(?P<user>\S+)",
    re.IGNORECASE
)

# RFC 5424 Syslog regex: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID [STRUCTURED-DATA] MSG
RFC5424_PATTERN = re.compile(
    r"^<(?P<pri>\d+)>(?P<version>\d+)\s+(?P<timestamp>\S+)\s+(?P<hostname>\S+)\s+(?P<app>\S+)\s+(?P<pid>\S+)\s+(?P<msgid>\S+)\s+(?P<sd>\[.*?\]|-)\s+(?P<msg>.*)$"
)

# Known vulnerability signatures for automated banner extraction (Stage B & F)
KNOWN_VULNERABILITY_PATTERNS = [
    {
        "pattern": re.compile(r"OpenSSH[_\s](8\.[5-9]|9\.[0-7])p\d*", re.IGNORECASE),
        "service": "openssh",
        "cve_id": "CVE-2024-6387",
        "title": "regreSSHion: Remote Code Execution in OpenSSH sshd",
        "severity": "CRITICAL",
        "cvss": 8.1
    },
    {
        "pattern": re.compile(r"OpenSSH[_\s](?:[1-6]\.|7\.[0-6])p?\d*", re.IGNORECASE),
        "service": "openssh",
        "cve_id": "CVE-2018-15473",
        "title": "OpenSSH User Enumeration Vulnerability",
        "severity": "MEDIUM",
        "cvss": 5.3
    },
    {
        "pattern": re.compile(r"Apache\/2\.4\.(49|50)", re.IGNORECASE),
        "service": "apache_httpd",
        "cve_id": "CVE-2021-41773",
        "title": "Apache HTTP Server Path Traversal & Remote Code Execution",
        "severity": "CRITICAL",
        "cvss": 9.8
    },
    {
        "pattern": re.compile(r"sudo[\s\/]1\.(?:[0-7]\.|8\.[0-9]|8\.3[0-1])", re.IGNORECASE),
        "service": "sudo",
        "cve_id": "CVE-2021-3156",
        "title": "Baron Samedit: Heap-based Buffer Overflow in Sudo",
        "severity": "HIGH",
        "cvss": 7.8
    }
]


class NormalizerService:
    @staticmethod
    def extract_vulnerabilities(text: str) -> List[Dict[str, Any]]:
        """Scans raw log text for service banners and matches against known CVE signatures."""
        detected = []
        for vuln in KNOWN_VULNERABILITY_PATTERNS:
            match = vuln["pattern"].search(text)
            if match:
                detected.append({
                    "cve_id": vuln["cve_id"],
                    "service": vuln["service"],
                    "matched_version": match.group(0),
                    "title": vuln["title"],
                    "severity": vuln["severity"],
                    "cvss": vuln["cvss"]
                })
        return detected

    @staticmethod
    def compute_fingerprint(source: str, timestamp: datetime, source_ip: str, username: str, raw_event: str) -> str:
        """
        Cryptographic SHA-256 deduplication fingerprint.
        Ensures consistent hashing across distributed workers and database engines.
        """
        data = f"{source}|{timestamp.isoformat()}|{source_ip}|{username}|{raw_event.strip()}"
        return hashlib.sha256(data.encode("utf-8")).hexdigest()

    @classmethod
    def parse_log(
        cls,
        source: str,
        item: RawLogItem,
        destination_ip: str = "10.240.10.15",
        destination_port: int = 22
    ) -> Optional[SecurityEventModel]:
        raw = item.raw.strip()
        ts = item.timestamp or datetime.now(timezone.utc)
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        parsed_fields: Dict[str, Any] = item.metadata.copy() if item.metadata else {}
        if item.metadata and "destinationIp" in item.metadata:
            destination_ip = item.metadata["destinationIp"]
        if item.metadata and "destinationPort" in item.metadata:
            destination_port = int(item.metadata["destinationPort"])
        username = "unknown"
        source_ip = "127.0.0.1"
        port = destination_port
        outcome = "failure"
        severity = "info"
        event_type = "AUTH_EVENT"
        hostname = parsed_fields.get("hostname", "sentinel-host")

        # -----------------------------------------------------------------
        # 1. RFC 5424 Syslog Parser
        # -----------------------------------------------------------------
        rfc_match = RFC5424_PATTERN.match(raw)
        if rfc_match:
            source = "syslog_rfc5424" if source in ["generic", "syslog"] else source
            hostname = rfc_match.group("hostname")
            parsed_fields.update({
                "pri": int(rfc_match.group("pri")),
                "app": rfc_match.group("app"),
                "pid": rfc_match.group("pid"),
                "msgid": rfc_match.group("msgid"),
                "hostname": hostname
            })
            msg_payload = rfc_match.group("msg").strip()
            # If msg contains ssh or auth failure, parse further
            if "failed" in msg_payload.lower():
                outcome = "failure"
                severity = "warning"
                event_type = "SYSLOG_AUTH_FAIL"
                ip_search = re.search(r"(\d{1,3}(?:\.\d{1,3}){3})", msg_payload)
                if ip_search:
                    source_ip = ip_search.group(1)
                user_search = re.search(r"user[=:\s]+(?P<user>\S+)", msg_payload, re.IGNORECASE)
                if user_search:
                    username = user_search.group("user")
            elif "accepted" in msg_payload.lower() or "success" in msg_payload.lower():
                outcome = "success"
                severity = "info"
                event_type = "SYSLOG_AUTH_SUCCESS"
            raw_eval = msg_payload
        else:
            raw_eval = raw

        # -----------------------------------------------------------------
        # 2. Linux SSH Logs (OpenSSH)
        # -----------------------------------------------------------------
        if source == "linux_ssh" or "sshd[" in raw_eval:
            failed_match = SSH_FAILED_PATTERN.search(raw_eval)
            if failed_match:
                username = failed_match.group("user")
                source_ip = failed_match.group("ip")
                port = int(failed_match.group("port"))
                outcome = "failure"
                severity = "warning"
                event_type = "SSH_AUTH_FAIL"
                parsed_fields.update({
                    "authMethod": "password",
                    "clientVersion": "SSH-2.0-OpenSSH_8.4p1",
                    "failureReason": "Password rejected or invalid user",
                    "targetService": "sshd",
                    "pid": int(failed_match.group("pid")),
                    "hostname": hostname
                })
            else:
                accepted_match = SSH_ACCEPTED_PATTERN.search(raw_eval)
                if accepted_match:
                    username = accepted_match.group("user")
                    source_ip = accepted_match.group("ip")
                    port = int(accepted_match.group("port"))
                    outcome = "success"
                    severity = "critical" if username in ["deploy", "root", "admin"] else "info"
                    event_type = "SSH_AUTH_SUCCESS"
                    session_sha = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
                    parsed_fields.update({
                        "authMethod": accepted_match.group("method"),
                        "clientVersion": "SSH-2.0-OpenSSH_8.4p1",
                        "sessionId": f"sess_{session_sha}",
                        "targetService": "sshd",
                        "pid": int(accepted_match.group("pid")),
                        "hostname": hostname
                    })
                else:
                    username = "system"
                    event_type = "SSH_SYS_LOG"
                    outcome = "info"

        # -----------------------------------------------------------------
        # 3. Linux PAM Authentication Logs
        # -----------------------------------------------------------------
        elif source == "linux_auth" or "pam_unix" in raw_eval:
            pam_fail = PAM_FAILURE_PATTERN.search(raw_eval)
            if pam_fail:
                username = pam_fail.group("user")
                source_ip = pam_fail.group("ip")
                outcome = "failure"
                severity = "warning"
                event_type = "PAM_AUTH_FAIL"
                parsed_fields["failureReason"] = "PAM authentication failure"
                parsed_fields["hostname"] = hostname
            else:
                pam_ok = PAM_SUCCESS_PATTERN.search(raw_eval)
                if pam_ok:
                    username = pam_ok.group("user")
                    outcome = "success"
                    severity = "info"
                    event_type = "PAM_SESSION_OPEN"
                    parsed_fields["hostname"] = hostname

        # -----------------------------------------------------------------
        # 4. Okta System Log Telemetry (JSON Schema)
        # -----------------------------------------------------------------
        elif source == "okta" or (raw.startswith("{") and ("eventType" in raw or "actor" in raw)):
            try:
                data = json.loads(raw)
                source = "okta"
                # Okta System Log format
                actor_data = data.get("actor", {})
                client_data = data.get("client", {})
                outcome_data = data.get("outcome", {})

                username = actor_data.get("alternateId", data.get("username", data.get("user", "unknown")))
                source_ip = client_data.get("ipAddress", data.get("sourceIp", data.get("ip", "127.0.0.1")))
                destination_ip = data.get("destinationIp", "10.240.4.12")
                port = data.get("destinationPort", 443)
                
                result_str = str(outcome_data.get("result", data.get("outcome", "FAILURE"))).upper()
                outcome = "success" if result_str in ["SUCCESS", "ALLOW"] else "failure"
                severity = "warning" if outcome == "failure" else "info"
                event_type = data.get("eventType", "okta.user.authentication.verify")

                parsed_fields.update({
                    "vendor": "okta",
                    "authMethod": data.get("authMethod", "SAML/SSO"),
                    "failureReason": outcome_data.get("reason", data.get("failureReason")),
                    "clientDevice": client_data.get("device", "workstation"),
                    "zone": client_data.get("geographicalContext", {}).get("country", "US")
                })
            except Exception:
                outcome = "failure"
                event_type = "OKTA_AUTH_FAIL"

        # -----------------------------------------------------------------
        # 5. App SAML / SSO Generic JSON Logs
        # -----------------------------------------------------------------
        elif source == "app_auth" or (raw.startswith("{") and "json" in source):
            try:
                data = json.loads(raw)
                username = data.get("username", data.get("user", "unknown"))
                source_ip = data.get("sourceIp", data.get("ip", "127.0.0.1"))
                destination_ip = data.get("destinationIp", "10.240.4.12")
                port = data.get("destinationPort", 443)
                outcome = data.get("outcome", "failure")
                severity = data.get("severity", "warning" if outcome == "failure" else "info")
                event_type = data.get("eventType", "SSO_AUTH_EVENT")
                parsed_fields.update(data.get("parsedFields", {}))
            except Exception:
                outcome = "failure" if "failed" in raw.lower() else "success"
                event_type = "SSO_LOGIN_FAIL" if outcome == "failure" else "SSO_LOGIN_SUCCESS"

        # -----------------------------------------------------------------
        # 6. Windows Security Events (Event ID 4625 / 4624)
        # -----------------------------------------------------------------
        elif source == "windows_security" or "Event 4625" in raw or "Event 4624" in raw:
            source = "windows_security"
            destination_ip = "10.240.0.5"  # Domain Controller default
            port = 3389  # RDP / WinLogon
            if "4625" in raw or "Logon Failure" in raw:
                outcome = "failure"
                severity = "warning"
                event_type = "WIN_LOGON_FAIL"
                parsed_fields["failureReason"] = "Bad password or username"
            else:
                outcome = "success"
                severity = "info"
                event_type = "WIN_LOGON_SUCCESS"

            # Parse fields from Event text
            user_match = re.search(r"(?:Account Name|TargetUserName|User):\s*(\S+)", raw, re.IGNORECASE)
            ip_match = re.search(r"(?:Source Network Address|IpAddress|Address):\s*(\S+)", raw, re.IGNORECASE)
            port_match = re.search(r"(?:Source Port|IpPort|Port):\s*(\d+)", raw, re.IGNORECASE)
            workstation_match = re.search(r"Workstation Name:\s*(\S+)", raw, re.IGNORECASE)

            if user_match:
                username = user_match.group(1).replace("$", "").strip(".,;: \t\r\n")
            if ip_match and ip_match.group(1) not in ["-", "::1"]:
                source_ip = ip_match.group(1).strip(".,;: \t\r\n")
            if port_match:
                port = int(port_match.group(1))
            if workstation_match:
                parsed_fields["workstation"] = workstation_match.group(1)
            parsed_fields["eventId"] = "4625" if outcome == "failure" else "4624"

        # -----------------------------------------------------------------
        # Default Fallback Parser (if not already parsed by RFC 5424 or specific source)
        # -----------------------------------------------------------------
        elif source != "syslog_rfc5424":
            username = "unknown"
            source_ip = "127.0.0.1"

        fingerprint = cls.compute_fingerprint(source, ts, source_ip, username, raw)
        event_id = f"EVT-2026-{fingerprint[:12].upper()}"

        detected_cves = cls.extract_vulnerabilities(raw)
        if detected_cves:
            parsed_fields["detectedCves"] = detected_cves
            if "serviceBanner" not in parsed_fields:
                parsed_fields["serviceBanner"] = detected_cves[0]["matched_version"]

        return SecurityEventModel(
            id=event_id,
            timestamp=ts,
            source=source,
            event_type=event_type,
            username=username,
            source_ip=source_ip,
            destination_ip=destination_ip,
            destination_port=port,
            outcome=outcome,
            severity=severity,
            raw_event=raw,
            parsed_fields=parsed_fields,
            correlation_id=item.metadata.get("correlationId") if item.metadata else None,
            is_simulated=True,
            fingerprint=fingerprint
        )
