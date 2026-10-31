import pytest
from httpx import AsyncClient
from backend.app.models.user import User
from backend.app.models.audit import AuditRecordModel
from backend.app.core.security import get_password_hash


@pytest.fixture
async def secops_users(client: AsyncClient, db_session):
    admin_user = User(
        id="USR-AUD-ADMIN",
        username="audit_admin@sentinel.ai",
        full_name="Audit Administrator",
        hashed_password=get_password_hash("admin_audit_2026!"),
        role="admin",
        is_active=True
    )
    analyst_user = User(
        id="USR-AUD-ANALYST",
        username="ordinary_analyst@sentinel.ai",
        full_name="Ordinary Analyst",
        hashed_password=get_password_hash("analyst_audit_2026!"),
        role="analyst",
        is_active=True
    )
    db_session.add_all([admin_user, analyst_user])
    await db_session.commit()

    admin_login = await client.post("/api/v1/auth/login", json={
        "username": "audit_admin@sentinel.ai",
        "password": "admin_audit_2026!"
    })
    analyst_login = await client.post("/api/v1/auth/login", json={
        "username": "ordinary_analyst@sentinel.ai",
        "password": "analyst_audit_2026!"
    })

    return {
        "admin": {"Authorization": f"Bearer {admin_login.json()['access_token']}"},
        "analyst": {"Authorization": f"Bearer {analyst_login.json()['access_token']}"}
    }


@pytest.mark.asyncio
async def test_audit_api_has_no_mutation_endpoints(client: AsyncClient, secops_users: dict):
    """
    Application-level immutability verification:
    Verify that DELETE, PUT, and PATCH HTTP methods are not supported on /api/v1/audit endpoints.
    Neither ordinary analysts nor administrators can mutate audit logs via REST API.
    """
    for role_name in ["analyst", "admin"]:
        headers = secops_users[role_name]

        # 1. DELETE on audit collection (endpoint exists as GET, method DELETE disallowed -> 405)
        res_del_col = await client.delete("/api/v1/audit", headers=headers)
        assert res_del_col.status_code == 405, f"{role_name} got status {res_del_col.status_code} on DELETE collection"

        # 2. DELETE on specific audit record (no delete route exists -> 404 / 405)
        res_del_rec = await client.delete("/api/v1/audit/AUD-00001", headers=headers)
        assert res_del_rec.status_code in [404, 405], f"{role_name} got status {res_del_rec.status_code} on DELETE item"

        # 3. PUT (update) on specific audit record (no update route exists -> 404 / 405)
        res_put = await client.put("/api/v1/audit/AUD-00001", json={"action": "TAMPERED"}, headers=headers)
        assert res_put.status_code in [404, 405], f"{role_name} got status {res_put.status_code} on PUT"

        # 4. PATCH on specific audit record (no patch route exists -> 404 / 405)
        res_patch = await client.patch("/api/v1/audit/AUD-00001", json={"result": "TAMPERED"}, headers=headers)
        assert res_patch.status_code in [404, 405], f"{role_name} got status {res_patch.status_code} on PATCH"


@pytest.mark.asyncio
async def test_audit_records_exist_for_critical_security_events(client: AsyncClient, secops_users: dict, db_session):
    """
    Verify that security events (policy decisions, emergency toggles, responses) generate audit records.
    """
    # 1. Trigger an emergency halt toggle
    toggle_res = await client.post(
        "/api/v1/response/emergency-toggle",
        json={"enabled": False},
        headers=secops_users["admin"]
    )
    assert toggle_res.status_code == 200

    # 2. Query audit trail
    audit_res = await client.get("/api/v1/audit", headers=secops_users["analyst"])
    assert audit_res.status_code == 200
    records = audit_res.json()
    assert len(records) > 0

    # Verify audit schema completeness
    rec = records[0]
    assert "id" in rec
    assert "timestamp" in rec
    assert "category" in rec
    assert "action" in rec
    assert "actor" in rec
    assert "target" in rec
    assert "result" in rec
    assert "details" in rec

    # Restore switch
    await client.post(
        "/api/v1/response/emergency-toggle",
        json={"enabled": True},
        headers=secops_users["admin"]
    )
