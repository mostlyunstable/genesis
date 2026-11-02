import ipaddress
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.response import ResponsePlaybookModel, ResponseActionModel
from backend.app.models.audit import AuditRecordModel
from backend.app.models.incident import IncidentModel
from backend.app.models.settings import SettingsModel
from backend.app.services.audit import audit_service

# Protected subnets that can NEVER be targeted by automated defense actions
PROTECTED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("10.0.0.1/32"),     # Core DNS
    ipaddress.ip_network("10.0.0.254/32"),   # Core Gateway
    ipaddress.ip_network("10.240.0.0/24"),   # Core DC & Identity Subnet (including 10.240.0.1, 10.240.0.5, 10.240.0.100)
    ipaddress.ip_network("10.240.10.1/32"),  # Bastion Gateway
    ipaddress.ip_network("198.51.100.210/32") # Legitimate Corporate User IP
]

ALLOWED_ACTION_TYPES = {
    "iptables drop",
    "firewall ip drop",
    "simulated mitigation",
    "rate limit",
    "terminate session",
    "automated isolation & containment"
}


class PolicyEngine:
    @staticmethod
    def is_target_protected(target: str) -> bool:
        if not target or not target.strip():
            return False
        # Extract IP if target contains port or text
        parts = target.strip().split()
        if not parts:
            return False
        ip_str = parts[0].split(":")[0]
        try:
            target_ip = ipaddress.ip_address(ip_str)
            for net in PROTECTED_NETWORKS:
                if target_ip in net:
                    return True
        except ValueError:
            # Not a bare IP (e.g. username or session id)
            pass
        return False

    @staticmethod
    async def evaluate_action_policy(
        action_name: str,
        target: str,
        playbook: ResponsePlaybookModel,
        db: AsyncSession
    ) -> Tuple[bool, str]:
        # 1. Global Kill Switch Check
        res_settings = await db.execute(select(SettingsModel).where(SettingsModel.id == 1))
        current_settings = res_settings.scalar_one_or_none()
        global_enabled = current_settings.autonomous_response_enabled if current_settings else settings.AUTONOMOUS_RESPONSE_GLOBAL_ENABLED

        if not global_enabled:
            return False, "POLICY_REJECTED: Autonomous response is GLOBALLY DISABLED (Emergency Halt)."

        # 2. Protected Subnet Exclusions
        if PolicyEngine.is_target_protected(target):
            return False, f"POLICY_REJECTED: Target '{target}' resides in a protected exclusion subnet."

        # 3. Action Allowlist Check
        normalized_action = action_name.lower()
        if not any(allowed in normalized_action for allowed in ALLOWED_ACTION_TYPES):
            return False, f"POLICY_REJECTED: Action '{action_name}' is not in the authorized defense allowlist."

        # 4. Hourly Action Budget Check (Max 20 actions/hour)
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        res_actions = await db.execute(
            select(ResponseActionModel).where(ResponseActionModel.timestamp >= one_hour_ago)
        )
        recent_count = len(res_actions.scalars().all())
        if recent_count >= 20:
            return False, "POLICY_REJECTED: Circuit breaker triggered (hourly action budget of 20 exceeded)."

        return True, "POLICY_APPROVED"


class ResponseService:
    @classmethod
    async def execute_action(
        cls,
        playbook_id: str,
        action_name: str,
        target: str,
        incident_id: Optional[str],
        actor: str,
        db: AsyncSession
    ) -> Tuple[bool, ResponseActionModel, str]:
        # Find playbook
        res_pb = await db.execute(select(ResponsePlaybookModel).where(ResponsePlaybookModel.id == playbook_id))
        playbook = res_pb.scalar_one_or_none()
        if not playbook:
            return False, None, f"Playbook '{playbook_id}' does not exist"

        # Evaluate against Policy Engine
        approved, reason = await PolicyEngine.evaluate_action_policy(action_name, target, playbook, db)
        ts = datetime.now(timezone.utc)

        if not approved:
            # Audit the rejection
            await audit_service.record_audit(
                db=db,
                category="POLICY_DECISION",
                action="DEFENSIVE_ACTION_BLOCKED",
                actor=actor,
                target=target,
                result="FAILURE",
                details={"reason": reason, "playbookId": playbook_id, "actionName": action_name},
                is_simulated=True
            )
            await db.commit()
            return False, None, reason

        # Action Idempotency Check: if active action already exists on target, return it idempotently
        res_active = await db.execute(
            select(ResponseActionModel).where(
                ResponseActionModel.playbook_id == playbook_id,
                ResponseActionModel.target == target,
                ResponseActionModel.status == "simulated_success"
            )
        )
        existing_active = res_active.scalar_one_or_none()
        if existing_active:
            return True, existing_active, "Action already active on target (idempotent)"

        # Execution in Dry-Run / Safe Lab mode
        action_id = f"ACT-2026-{int(time.time()*1000)%10000:04d}"
        action_record = ResponseActionModel(
            id=action_id,
            incident_id=incident_id,
            playbook_id=playbook_id,
            action_name=action_name,
            target=target,
            status="simulated_success",
            execution_mode="simulated",
            timestamp=ts,
            duration_ms=145,
            details=f"Simulated defensive response executed: {action_name} targeting {target}.",
            verification_status="verified",
            rollback_available=not ("kill" in action_name.lower() and "ip" not in action_name.lower()),
            is_simulated=True
        )
        db.add(action_record)

        # Audit successful execution
        await audit_service.record_audit(
            db=db,
            category="RESPONSE_EXECUTION",
            action="DEFENSIVE_ACTION_EXECUTED",
            actor=actor,
            target=target,
            result="SUCCESS",
            details={
                "actionId": action_id,
                "playbookId": playbook_id,
                "actionName": action_name,
                "incidentId": incident_id,
                "verificationStatus": "verified"
            },
            is_simulated=True
        )

        # Increment playbook count
        playbook.execution_count += 1

        # If incident associated, mark contained
        if incident_id:
            res_inc = await db.execute(select(IncidentModel).where(IncidentModel.id == incident_id))
            inc = res_inc.scalar_one_or_none()
            if inc:
                inc.status = "contained"
                inc.updated_at = ts

        await db.commit()
        return True, action_record, "Executed successfully"

    @classmethod
    async def expire_stale_actions(
        cls,
        ttl_minutes: int,
        db: AsyncSession
    ) -> int:
        """
        Scans for actions in simulated_success status older than ttl_minutes,
        transitions them to expired, disables rollback, and creates an audit record.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=ttl_minutes)
        res_stale = await db.execute(
            select(ResponseActionModel).where(
                ResponseActionModel.status == "simulated_success",
                ResponseActionModel.timestamp <= cutoff
            )
        )
        stale_actions = res_stale.scalars().all()
        expired_count = 0
        for action in stale_actions:
            action.status = "expired"
            action.rollback_available = False
            action.verification_status = "expired"
            expired_count += 1

            await audit_service.record_audit(
                db=db,
                category="POLICY_DECISION",
                action="DEFENSIVE_ACTION_EXPIRED",
                actor="system:ttl_worker",
                target=action.target,
                result="INFO",
                details={"actionId": action.id, "ttlMinutes": ttl_minutes},
                is_simulated=True
            )

        if expired_count > 0:
            await db.commit()
        return expired_count

    @classmethod
    async def rollback_action(
        cls,
        action_id: str,
        actor: str,
        db: AsyncSession
    ) -> Tuple[bool, str]:
        res_act = await db.execute(select(ResponseActionModel).where(ResponseActionModel.id == action_id))
        action = res_act.scalar_one_or_none()
        if not action:
            return False, f"Action '{action_id}' not found"

        if not action.rollback_available or action.status in ["rolled_back", "expired"]:
            return False, f"Action '{action_id}' cannot be rolled back or is already reverted/expired"

        ts = datetime.now(timezone.utc)
        action.status = "rolled_back"
        action.rollback_available = False

        # Audit the rollback
        await audit_service.record_audit(
            db=db,
            category="POLICY_DECISION",
            action="DEFENSIVE_ACTION_ROLLED_BACK",
            actor=actor,
            target=action.target,
            result="SUCCESS",
            details={"originalActionId": action_id, "actionName": action.action_name},
            is_simulated=True
        )
        await db.commit()
        return True, "Rollback verified"

    @classmethod
    async def toggle_emergency_switch(
        cls,
        enabled: bool,
        actor: str,
        db: AsyncSession
    ) -> bool:
        res_settings = await db.execute(select(SettingsModel).where(SettingsModel.id == 1))
        st = res_settings.scalar_one_or_none()
        if not st:
            st = SettingsModel(id=1, autonomous_response_enabled=enabled)
            db.add(st)
        else:
            st.autonomous_response_enabled = enabled

        await audit_service.record_audit(
            db=db,
            category="CONFIG_CHANGE",
            action="AUTONOMOUS_RESPONSE_GLOBAL_ENABLED" if enabled else "AUTONOMOUS_RESPONSE_GLOBAL_DISABLED",
            actor=actor,
            target="AutonomousResponseGlobalSwitch",
            result="INFO" if enabled else "WARNING",
            details={"state": "ENABLED" if enabled else "EMERGENCY_HALT"},
            is_simulated=True
        )
        await db.commit()
        return enabled


response_service = ResponseService()
