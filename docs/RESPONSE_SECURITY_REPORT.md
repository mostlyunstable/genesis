# SENTINEL AI — RESPONSE SECURITY & DEFENSIVE SAFEGUARDS REPORT

## Executive Summary

SENTINEL AI incorporates an autonomous Security Orchestration, Automation, and Response (SOAR) engine. Because autonomous defensive actions have the potential to disrupt legitimate business operations if misconfigured, the platform enforces mandatory defense-in-depth safety guardrails.

Autonomous response is governed by deterministic policy rules evaluated prior to any simulated or physical action execution.

---

## 1. Safety Guardrails Architecture

```
                                  +------------------------------+
                                  | Playbook Trigger / Execution |
                                  +--------------+---------------+
                                                 |
                                                 v
                                  +------------------------------+
                                  |      PolicyEngine Audit      |
                                  +--------------+---------------+
                                                 |
                     +---------------------------+---------------------------+
                     | Check 1: Global Emergency Kill Switch                 | Fail -> BLOCK & AUDIT
                     v                                                       |
                     +---------------------------+---------------------------+
                     | Check 2: Protected Subnet & Asset Exclusions          | Fail -> BLOCK & AUDIT
                     v                                                       |
                     +---------------------------+---------------------------+
                     | Check 3: Action Allowlist Validation                  | Fail -> BLOCK & AUDIT
                     v                                                       |
                     +---------------------------+---------------------------+
                     | Check 4: Hourly Circuit Breaker Action Budget         | Fail -> BLOCK & AUDIT
                     v                                                       |
                     +---------------------------+---------------------------+
                     | Check 5: Action Idempotency Check                     | Active -> RETURN EXISTING
                     v                                                       |
                                                 | (All Approved)
                                                 v
                                  +------------------------------+
                                  | Execute Simulated / Lab      |
                                  | Defensive Playbook Action    |
                                  +--------------+---------------+
                                                 |
                                                 v
                                  +------------------------------+
                                  | Cryptographic Audit Record   |
                                  | Appended to Hash Chain       |
                                  +------------------------------+
```

---

## 2. Protected Subnet Exclusions

Under no circumstances can the automated response engine target or disrupt the following critical networks and assets:

| Protected CIDR / Asset | Description | Justification |
|---|---|---|
| `127.0.0.0/8`, `::1` | Localhost loopback | Prevents host self-isolation |
| `169.254.0.0/16` | Link-local network | Prevents cloud metadata & DHCP disruption |
| `10.0.0.1/32` | Primary Core DNS Resolver | Prevents infrastructure name resolution blackout |
| `10.0.0.254/32` | Core Default Gateway | Prevents total perimeter network severance |
| `10.240.0.0/24` | Core Active Directory / DC Subnet | Prevents identity & authentication lockout |
| `10.240.10.1/32` | Bastion Host Gateway | Preserves administrative ingress control |
| `198.51.100.210/32` | Verified Corporate VPN User | Prevents accidental executive/analyst quarantine |

Any action targeting an IP within these subnets is immediately rejected with:
`POLICY_REJECTED: Target '<ip>' resides in a protected exclusion subnet.`
and logged to the cryptographic audit trail.

---

## 3. Action Budgets and Circuit Breakers

To prevent cascading disruption during large-scale authentication anomaly storms:
- **Action Budget**: Maximum of 20 defensive actions per hour.
- **Circuit Breaker**: If 20 actions have executed within the preceding 60 minutes, subsequent actions are halted with:
  `POLICY_REJECTED: Circuit breaker triggered (hourly action budget of 20 exceeded).`

---

## 4. Idempotency and TTL Expiration

- **Idempotent Duplicate Execution**: If an action is already active on a given target, re-executing returns the existing action record without creating redundant firewall rules or duplicate jobs.
- **Automatic TTL Expiration**: Temporary IP blocks have a configurable TTL (default 30 minutes). Background workers scan for expired actions, transition them to `expired`, disable rollback, and log an audit record.
- **Rollback Safety**: Only reversible actions (e.g. firewall IP blocks) can be rolled back. Non-reversible actions (e.g. process SIGKILL) and expired actions strictly disallow rollback.

---

## 5. Global Emergency Kill Switch

- An administrator can instantly disable all autonomous response capabilities across the entire platform via `POST /api/v1/response/emergency-toggle`.
- When disabled, all pending and incoming playbook executions are immediately halted.
- Every state toggle is cryptographically recorded in the audit trail with the administrator identity.
