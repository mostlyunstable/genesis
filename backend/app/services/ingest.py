import re
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from backend.app.schemas.event import RawLogItem, SecurityEventSchema
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


class NormalizerService:
    @staticmethod
    def compute_fingerprint(source: str, timestamp: datetime, source_ip: str, username: str, raw_event: str) -> str:
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
        username = "unknown"
        source_ip = "127.0.0.1"
        port = destination_port
        outcome = "failure"
        severity = "info"
        event_type = "AUTH_EVENT"

        # 1. Linux SSH Logs
        if source == "linux_ssh":
            failed_match = SSH_FAILED_PATTERN.search(raw)
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
                    "pid": int(failed_match.group("pid"))
                })
            else:
                accepted_match = SSH_ACCEPTED_PATTERN.search(raw)
                if accepted_match:
                    username = accepted_match.group("user")
                    source_ip = accepted_match.group("ip")
                    port = int(accepted_match.group("port"))
                    outcome = "success"
                    severity = "critical" if username in ["deploy", "root", "admin"] else "info"
                    event_type = "SSH_AUTH_SUCCESS"
                    parsed_fields.update({
                        "authMethod": accepted_match.group("method"),
                        "clientVersion": "SSH-2.0-OpenSSH_8.4p1",
                        "sessionId": f"sess_{hashlib.md5(raw.encode()).hexdigest()[:8]}",
                        "targetService": "sshd",
                        "pid": int(accepted_match.group("pid"))
                    })
                else:
                    # Fallback / unparseable sshd line
                    username = "system"
                    event_type = "SSH_SYS_LOG"
                    outcome = "info"

        # 2. Linux PAM Logs
        elif source == "linux_auth":
            pam_fail = PAM_FAILURE_PATTERN.search(raw)
            if pam_fail:
                username = pam_fail.group("user")
                source_ip = pam_fail.group("ip")
                outcome = "failure"
                severity = "warning"
                event_type = "PAM_AUTH_FAIL"
                parsed_fields["failureReason"] = "PAM authentication failure"
            else:
                pam_ok = PAM_SUCCESS_PATTERN.search(raw)
                if pam_ok:
                    username = pam_ok.group("user")
                    outcome = "success"
                    severity = "info"
                    event_type = "PAM_SESSION_OPEN"

        # 3. App SAML / SSO JSON logs
        elif source == "app_auth":
            try:
                data = json.loads(raw) if raw.startswith("{") else {}
                username = data.get("username", data.get("user", "unknown"))
                source_ip = data.get("sourceIp", data.get("ip", "127.0.0.1"))
                destination_ip = data.get("destinationIp", "10.240.4.12")
                port = data.get("destinationPort", 443)
                outcome = data.get("outcome", "failure")
                severity = data.get("severity", "warning" if outcome == "failure" else "info")
                event_type = data.get("eventType", "SSO_AUTH_EVENT")
                parsed_fields.update(data.get("parsedFields", {}))
            except Exception:
                # Text fallback
                if "failed" in raw.lower():
                    outcome = "failure"
                    event_type = "SSO_LOGIN_FAIL"
                else:
                    outcome = "success"
                    event_type = "SSO_LOGIN_SUCCESS"

        # 4. Windows Security Logs (Event ID 4625 / 4624)
        elif source == "windows_security":
            if "4625" in raw or "Logon Failure" in raw:
                outcome = "failure"
                severity = "warning"
                event_type = "WIN_LOGON_FAIL"
                user_match = re.search(r"Account For Which Logon Failed:\s+Account Name:\s+(\S+)", raw)
                ip_match = re.search(r"Source Network Address:\s+(\S+)", raw)
                if user_match:
                    username = user_match.group(1)
                if ip_match:
                    source_ip = ip_match.group(1)
            elif "4624" in raw or "Logon Success" in raw:
                outcome = "success"
                severity = "info"
                event_type = "WIN_LOGON_SUCCESS"
                user_match = re.search(r"New Logon:\s+Account Name:\s+(\S+)", raw)
                ip_match = re.search(r"Source Network Address:\s+(\S+)", raw)
                if user_match:
                    username = user_match.group(1)
                if ip_match:
                    source_ip = ip_match.group(1)

        # Default fallback
        else:
            username = "unknown"
            source_ip = "127.0.0.1"

        fingerprint = cls.compute_fingerprint(source, ts, source_ip, username, raw)
        event_id = f"EVT-2026-{fingerprint[:8].upper()}"

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
