# SENTINEL AI — CRYPTOGRAPHIC AUDIT INTEGRITY & TAMPER DETECTION REPORT

## Executive Summary

Audit log immutability and provenance are mission-critical requirements for autonomous cybersecurity platforms. If an autonomous agent or adversary can alter the historical record of response actions or policy decisions, forensics and regulatory compliance become invalid.

SENTINEL AI implements application-level immutability reinforced by a cryptographic SHA-256 hash chain structure. Every security decision, policy block, defensive playbook execution, and emergency toggle is linked to its predecessor via a cryptographic hash pointer:

$$\text{record\_hash}_i = \text{SHA-256}(\text{canonical\_json}(\text{record}_i) \parallel \text{record\_hash}_{i-1})$$

Where $\text{record\_hash}_0 = \text{"GENESIS\_SENTINEL\_AI\_2026\_BLOCK\_0"}$.

---

## 1. Cryptographic Design

```
+------------------------------------+          +------------------------------------+
| Audit Record 1 (Genesis)           |          | Audit Record 2                     |
| id: AUD-000001                     |          | id: AUD-000002                     |
| action: POLICY_DECISION_BLOCKED    |          | action: DEFENSIVE_ACTION_EXECUTED  |
| previous_hash: "GENESIS..._0"      |          | previous_hash: [Record 1 Hash]     |
| record_hash: 8fbc23...17a9         +--------->| record_hash: e12d9a...44f2         |
+------------------------------------+          +-----------------+------------------+
                                                                  |
                                                                  v
                                                +------------------------------------+
                                                | Audit Record 3                     |
                                                | id: AUD-000003                     |
                                                | action: EMERGENCY_TOGGLE           |
                                                | previous_hash: [Record 2 Hash]     |
                                                | record_hash: 3b9c41...88a1         |
                                                +------------------------------------+
```

### Canonical Serialization
To guarantee deterministic hashing across varying database drivers (PostgreSQL `asyncpg` vs SQLite `aiosqlite`) and serialization libraries:
1. Fields are sorted alphabetically (`sort_keys=True`).
2. Whitespace is eliminated (`separators=(',', ':')`).
3. Timestamps are normalized to UTC ISO format with trailing `Z` (`%Y-%m-%dT%H:%M:%S.%fZ`).

---

## 2. API Endpoints

- `GET /api/v1/audit`: Returns audit records in descending chronological order for the administrative console.
- `GET /api/v1/audit/verify`: Performs online cryptographic verification of the entire hash chain from Genesis to latest. Returns:
  - `verified`: Boolean indicating total chain validity.
  - `totalRecords`: Total audit records audited.
  - `tamperedCount`: Count of corrupt or tampered records detected.
  - `tamperedRecords`: Granular error diagnostics (`PAYLOAD_TAMPERED`, `CHAIN_BROKEN`, `GENESIS_MISMATCH`).
  - `status`: `"VALID"` or `"TAMPERED"`.
  - `latestHash`: The head SHA-256 hash of the audit ledger.

---

## 3. Immutability & Access Control Enforcement

1. **No Mutation Endpoints**: The REST API exposes only `GET` methods on `/api/v1/audit`. Any `DELETE`, `PUT`, or `PATCH` request is rejected with HTTP 405 Method Not Allowed or HTTP 404 Not Found.
2. **Database Tamper Detection**: If a privileged database administrator manually modifies a field (e.g. changing `actor`, `target`, or `result`) directly in PostgreSQL or SQLite, `AuditService.verify_chain()` detects the SHA-256 digest discrepancy (`PAYLOAD_TAMPERED`) immediately.
3. **Chain Deletion Detection**: If an adversary deletes an intermediate audit row to hide an action, the succeeding record's `previous_hash` fails to match the prior remaining record, triggering immediate `CHAIN_BROKEN` detection.

---

## 4. Verification Evidence

The test suite `backend/tests/test_phase3_audit_chain.py` confirmed:
```
backend/tests/test_phase3_audit_chain.py::test_audit_hash_chain_sequential_integrity PASSED [ 20%]
backend/tests/test_phase3_audit_chain.py::test_audit_tamper_detection_on_payload_modification PASSED [ 40%]
backend/tests/test_phase3_audit_chain.py::test_audit_tamper_detection_on_broken_chain_pointer PASSED [ 60%]
backend/tests/test_phase3_audit_chain.py::test_audit_verification_api_endpoint PASSED        [ 80%]
backend/tests/test_phase3_audit_chain.py::test_response_policy_protected_subnets_and_audit PASSED [100%]
```
