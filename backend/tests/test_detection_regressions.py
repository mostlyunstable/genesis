from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from backend.app.models.detection import DetectionModel
from backend.app.schemas.event import RawLogItem
from backend.app.services.detection import DetectionEngine
from backend.app.services.ingest import NormalizerService


async def ingest(engine, db, count, outcome="failure", users=None, ips=None, offset=0):
    results = []
    for i in range(count):
        user = users[i] if users else "root"
        ip = ips[i] if ips else "198.51.100.40"
        raw = f"sshd[{100+i+offset}]: {'Failed' if outcome == 'failure' else 'Accepted'} password for {user} from {ip} port 12345 ssh2"
        event = NormalizerService.parse_log("linux_ssh", RawLogItem(
            raw=raw, timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=i+offset)))
        db.add(event)
        await db.flush()
        results.extend(await engine.process_event(event, db))
    return results


@pytest.mark.asyncio
async def test_successful_logins_are_not_password_spraying(db_session):
    results = await ingest(DetectionEngine(), db_session, 6, outcome="success", users=[f"user{i}" for i in range(6)])
    assert not any(d.category == "password_spraying" for d in results)


@pytest.mark.asyncio
@pytest.mark.parametrize("account", ["root", "admin"])
async def test_distributed_attack_detects_privileged_accounts(db_session, account):
    results = await ingest(DetectionEngine(), db_session, 3, users=[account]*3,
                           ips=[f"198.51.100.{i}" for i in range(3)])
    assert any(d.category == "distributed_brute_force" for d in results)


@pytest.mark.asyncio
async def test_attack_recurs_after_alert_is_resolved(db_session):
    engine = DetectionEngine()
    await ingest(engine, db_session, 10)
    alerts = (await db_session.execute(select(DetectionModel))).scalars().all()
    original = next(d for d in alerts if d.category == "ssh_brute_force")
    original.status = "resolved"
    await db_session.flush()
    results = await ingest(engine, db_session, 1, offset=11)
    repeated = next(d for d in results if d.category == "ssh_brute_force")
    assert repeated.id != original.id
    assert original.status == "resolved"

    next_results = await ingest(engine, db_session, 1, offset=12)
    assert next(d for d in next_results if d.category == "ssh_brute_force").id == repeated.id


@pytest.mark.asyncio
async def test_brute_force_tool_excludes_failures_outside_dataset_window(db_session):
    from backend.app.services.chat_tools import tool_registry, DetectBruteForceActivityInput

    engine = DetectionEngine()
    await ingest(engine, db_session, 4)
    await ingest(engine, db_session, 1, offset=7200)
    result = await tool_registry.detect_brute_force_activity(
        DetectBruteForceActivityInput(time_window_minutes=60), db_session)
    assert result["totalFailures"] == 1
    assert not result["suspects"][0]["isBruteForce"]


@pytest.mark.asyncio
async def test_brute_force_window_survives_detector_restart(db_session):
    await ingest(DetectionEngine(), db_session, 9)
    await db_session.commit()
    results = await ingest(DetectionEngine(), db_session, 1, offset=10)
    alert = next(d for d in results if d.category == "ssh_brute_force")
    assert alert.event_count == 10
