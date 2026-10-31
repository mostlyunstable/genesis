from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.config import settings
from backend.app.core.security import get_password_hash
from backend.app.db.base import Base
from backend.app.db.session import engine, async_session_factory
from backend.app.models.user import User
from backend.app.models.settings import SettingsModel
from backend.app.models.source import LogSourceModel
from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.models.response import ResponsePlaybookModel, ResponseActionModel
from backend.app.models.audit import AuditRecordModel


async def init_db() -> None:
    """Create tables and seed initial system baselines if needed."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # 1. Seed Default Analyst User
        res_user = await session.execute(select(User).where(User.username == "secops_analyst@sentinel.ai"))
        if not res_user.scalar_one_or_none():
            admin_user = User(
                id="USR-001",
                username="secops_analyst@sentinel.ai",
                full_name="SecOps Lead Analyst",
                hashed_password=get_password_hash("sentinel_secops_2026!"),
                role="admin",
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            session.add(admin_user)

        # 2. Seed Default Platform Settings
        res_settings = await session.execute(select(SettingsModel).where(SettingsModel.id == 1))
        if not res_settings.scalar_one_or_none():
            default_settings = SettingsModel(
                id=1,
                ssh_failed_attempt_threshold=settings.SSH_FAILED_ATTEMPT_THRESHOLD,
                ssh_window_seconds=settings.SSH_WINDOW_SECONDS,
                password_spray_unique_users_threshold=settings.PASSWORD_SPRAY_UNIQUE_USERS_THRESHOLD,
                password_spray_window_seconds=settings.PASSWORD_SPRAY_WINDOW_SECONDS,
                distributed_threshold_ips=settings.DISTRIBUTED_THRESHOLD_IPS,
                autonomous_response_enabled=settings.AUTONOMOUS_RESPONSE_GLOBAL_ENABLED,
                require_approval_for_critical=False,
                temporary_ip_block_duration_minutes=settings.TEMPORARY_IP_BLOCK_DURATION_MINUTES
            )
            session.add(default_settings)

        # 3. Seed Default Playbooks
        res_pb = await session.execute(select(ResponsePlaybookModel))
        if not res_pb.scalars().first():
            pb1 = ResponsePlaybookModel(
                id="PB-SSH-BRUTE-01",
                name="Automated SSH Brute-Force Containment",
                description="Deterministic stateful isolation of high-velocity brute-force SSH actors with session termination and temporary iptables drop.",
                severity_trigger=["critical", "warning"],
                triggers=["Velocity > 10 fails/120s", "Accepted login after failures"],
                investigation_requirements=["Verify source IP is external", "Check active interactive sessions"],
                response_steps=[
                    {"stepNumber": 1, "action": "iptables -I INPUT -s {target} -j DROP", "targetType": "ip", "automated": True, "requiresApproval": False},
                    {"stepNumber": 2, "action": "pkill -u {user} -KILL", "targetType": "session", "automated": True, "requiresApproval": False},
                    {"stepNumber": 3, "action": "Lock user account deploy", "targetType": "user", "automated": False, "requiresApproval": True}
                ],
                allowed_scope="RFC 5737 test IP subnets & local container interfaces",
                verification_steps=["Verify iptables -L INPUT rule exists", "Confirm active SSH socket closed"],
                rollback_strategy="iptables -D INPUT -s {target} -j DROP within 30 minutes",
                enabled=True,
                execution_count=4
            )
            pb2 = ResponsePlaybookModel(
                id="PB-SPRAY-DEFENSE-02",
                name="SSO Credential Spray Mitigation",
                description="Rate-limits reverse proxy ingress and forces step-up MFA challenge for probed corporate accounts.",
                severity_trigger=["warning", "critical"],
                triggers=["Single IP probing > 5 unique identities"],
                investigation_requirements=["Confirm zero successful logins occurred", "Inspect User-Agent strings"],
                response_steps=[
                    {"stepNumber": 1, "action": "Apply Nginx rate-limit zone (1 req/s)", "targetType": "ip", "automated": True, "requiresApproval": False},
                    {"stepNumber": 2, "action": "Invalidate probed user active session cookies", "targetType": "user", "automated": True, "requiresApproval": False}
                ],
                allowed_scope="Ingress Reverse Proxy Tier",
                verification_steps=["Confirm 429 Too Many Requests returned on probing IP"],
                rollback_strategy="Remove rate-limit after 15 minutes of silence",
                enabled=True,
                execution_count=1
            )
            session.add_all([pb1, pb2])

        # 4. Seed Default Log Sources
        res_src = await session.execute(select(LogSourceModel))
        if not res_src.scalars().first():
            sources = [
                LogSourceModel(
                    id="SRC-BASTION-01",
                    name="Bastion Host SSH Forwarder",
                    type="linux_ssh",
                    status="active",
                    last_event_received=datetime.now(timezone.utc),
                    events_processed_24h=142900,
                    error_count_24h=0,
                    host="bastion-01.corp.internal",
                    port=514,
                    agent_version="Rsyslog 8.2102",
                    format="RFC 5424 Syslog",
                    description="Primary DMZ bastion SSH authentication journal forwarder."
                ),
                LogSourceModel(
                    id="SRC-WIN-DC-01",
                    name="Active Directory Domain Controller",
                    type="windows_security",
                    status="active",
                    last_event_received=datetime.now(timezone.utc),
                    events_processed_24h=890450,
                    error_count_24h=2,
                    host="dc-01.corp.internal",
                    port=5044,
                    agent_version="Winlogbeat 8.11.1",
                    format="Windows Event Log (Security.evtx)",
                    description="Domain Controller logon telemetry (Event IDs 4624, 4625, 4740)."
                ),
                LogSourceModel(
                    id="SRC-SSO-GW",
                    name="Corporate SAML SSO Gateway",
                    type="app_auth",
                    status="active",
                    last_event_received=datetime.now(timezone.utc),
                    events_processed_24h=234010,
                    error_count_24h=0,
                    host="sso.sentinel.ai",
                    port=443,
                    agent_version="Sentinel Envoy Filter 1.4",
                    format="JSON Structured Auth Log",
                    description="Identity provider authentication and MFA challenge telemetry."
                )
            ]
            session.add_all(sources)

        # 5. Seed Initial Threat Intel Indicators
        res_ti = await session.execute(select(ThreatIntelModel))
        if not res_ti.scalars().first():
            ti1 = ThreatIntelModel(
                ip="198.51.100.42",
                threat_classification="High-Velocity SSH Brute-Force Botnet",
                reputation_score=94,
                associated_incidents=["INC-2026-0042"],
                first_seen=datetime.now(timezone.utc),
                last_seen=datetime.now(timezone.utc),
                confidence=98,
                country="Simulated Autonomous Region",
                country_code="SA",
                asn="AS64512 (Simulated Transit)",
                mitre_techniques=["T1110.001", "T1078.003"],
                tags=["BruteForce", "SSH", "BreachActor", "RFC5737"],
                simulated_data_source="Sentinel Threat Intel RFC 5737 Feed"
            )
            ti2 = ThreatIntelModel(
                ip="203.0.113.88",
                threat_classification="Distributed SAML Password Spraying Proxy",
                reputation_score=78,
                associated_incidents=["INC-2026-0041"],
                first_seen=datetime.now(timezone.utc),
                last_seen=datetime.now(timezone.utc),
                confidence=89,
                country="Simulated Test Cloud",
                country_code="SC",
                asn="AS64513 (Simulated Proxy)",
                mitre_techniques=["T1110.003"],
                tags=["PasswordSpray", "SSO", "AutomatedClient", "RFC5737"],
                simulated_data_source="Sentinel Threat Intel RFC 5737 Feed"
            )
            session.add_all([ti1, ti2])

        # 6. Seed System Initialization Audit Record
        res_aud = await session.execute(select(AuditRecordModel))
        if not res_aud.scalars().first():
            audit = AuditRecordModel(
                id="AUD-INIT-0001",
                timestamp=datetime.now(timezone.utc),
                category="CONFIG_CHANGE",
                action="SYSTEM_DATABASE_INITIALIZED",
                actor="sentinel_system_kernel",
                target="PostgreSQL/SQLite Dual Engine",
                result="SUCCESS",
                details={"version": "1.0.0", "status": "ONLINE", "mode": "DEMO/LAB"},
                is_simulated=True
            )
            session.add(audit)

        await session.commit()
