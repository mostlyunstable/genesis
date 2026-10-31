# SENTINEL AI — Frontend/Backend API Contract Specification

**Document Version:** 1.0.0  
**Date:** October 31, 2026  
**Status:** CANONICAL CONTRACT

---

## 1. Overview & General Conventions

This document establishes the binding HTTP REST contract between the SENTINEL AI frontend (`src/services/api/index.ts`) and the Python FastAPI backend (`backend/app`).

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Authentication Header:** `Authorization: Bearer <jwt-token>`
- **Forwarder Ingestion Header:** `X-Sentinel-Forwarder-Key: <secret-key>`
- **Standard Error Format:**
  ```json
  {
    "detail": {
      "code": "VALIDATION_ERROR",
      "message": "Human-readable explanation of error",
      "field": "optional_field_name"
    }
  }
  ```

---

## 2. Authentication & Session Endpoints

### 2.1. Analyst Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Request Body:**
  ```json
  {
    "username": "secops_analyst@sentinel.ai",
    "password": "<secure-password>"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 28800,
    "user": {
      "id": "USR-001",
      "username": "secops_analyst@sentinel.ai",
      "fullName": "SecOps Lead Analyst",
      "role": "admin"
    }
  }
  ```

### 2.2. Current Session User
- **Endpoint:** `GET /api/v1/auth/me`
- **Response `200 OK`:**
  ```json
  {
    "id": "USR-001",
    "username": "secops_analyst@sentinel.ai",
    "fullName": "SecOps Lead Analyst",
    "role": "admin"
  }
  ```

---

## 3. Log Ingestion & Telemetry Endpoints

### 3.1. Batch Log Ingestion
- **Endpoint:** `POST /api/v1/ingest/batch`
- **Headers:** `X-Sentinel-Forwarder-Key: <key>` or Bearer token
- **Request Body:**
  ```json
  {
    "source": "linux_ssh",
    "logs": [
      {
        "timestamp": "2026-10-31T10:15:00Z",
        "raw": "Oct 31 10:15:00 bastion-01 sshd[12400]: Failed password for invalid user root from 198.51.100.42 port 41200 ssh2",
        "metadata": { "host": "bastion-01" }
      }
    ]
  }
  ```
- **Response `202 Accepted`:**
  ```json
  {
    "status": "ACCEPTED",
    "receivedCount": 1,
    "normalizedCount": 1,
    "duplicateCount": 0,
    "droppedCount": 0
  }
  ```

### 3.2. List Security Events
- **Endpoint:** `GET /api/v1/events`
- **Query Parameters:**
  - `source`: (e.g. `linux_ssh`, `windows_security`, `all`)
  - `outcome`: (e.g. `failure`, `success`, `blocked`, `all`)
  - `severity`: (e.g. `critical`, `warning`, `info`, `low`, `all`)
  - `ip`: (string filter on source or destination IP)
  - `query`: (free-text search)
  - `limit`: (default `100`, max `1000`)
  - `offset`: (default `0`)
- **Response `200 OK`:**
  ```json
  {
    "items": [
      {
        "id": "EVT-2026-SSH-036",
        "timestamp": "2026-10-31T10:16:31Z",
        "source": "linux_ssh",
        "eventType": "SSH_AUTH_SUCCESS",
        "username": "deploy",
        "sourceIp": "198.51.100.42",
        "destinationIp": "10.240.10.15",
        "destinationPort": 22,
        "outcome": "success",
        "severity": "critical",
        "rawEvent": "Oct 31 10:16:31 bastion-01 sshd[12436]: Accepted password for deploy from 198.51.100.42 port 41236 ssh2",
        "parsedFields": {
          "clientVersion": "SSH-2.0-OpenSSH_8.4p1",
          "authMethod": "password",
          "sessionId": "sess_993429ab",
          "targetService": "sshd"
        },
        "correlationId": "CORR-SSH-BF-001",
        "isSimulated": true
      }
    ],
    "total": 36
  }
  ```

### 3.3. Get Security Event by ID
- **Endpoint:** `GET /api/v1/events/{id}`
- **Response `200 OK`:** Single `SecurityEvent` object.

---

## 4. Threat Detection Endpoints

### 4.1. List Detections
- **Endpoint:** `GET /api/v1/detections`
- **Query Parameters:** `category`, `severity`, `status`, `query`
- **Response `200 OK`:**
  ```json
  {
    "items": [
      {
        "id": "DET-2026-0891",
        "name": "High-Velocity SSH Brute-Force Sequence",
        "category": "ssh_brute_force",
        "description": "35 failed authentications targeting 15 unique accounts from 198.51.100.42 within 87 seconds.",
        "severity": "critical",
        "sourceIp": "198.51.100.42",
        "targetAccounts": ["root", "admin", "devops", "deploy"],
        "eventCount": 36,
        "timestamp": "2026-10-31T10:16:32Z",
        "confidence": 98,
        "riskScore": 94,
        "status": "open",
        "triggeringConditions": [
          "Failed attempts > 10 in 120s window",
          "Multiple administrative accounts targeted",
          "Followed by successful login (EVT-2026-SSH-036)"
        ],
        "supportingEventIds": ["EVT-2026-SSH-001", "EVT-2026-SSH-020", "EVT-2026-SSH-035", "EVT-2026-SSH-036"],
        "ruleId": "RULE-SSH-BRUTE-001",
        "ruleName": "SSH Velocity Threshold",
        "associatedIncidentId": "INC-2026-0042",
        "suggestedPlaybookId": "PB-SSH-BRUTE-01",
        "isSimulated": true
      }
    ],
    "total": 1
  }
  ```

### 4.2. Update Detection Status
- **Endpoint:** `PATCH /api/v1/detections/{id}/status`
- **Request Body:**
  ```json
  {
    "status": "investigating"
  }
  ```
- **Response `200 OK`:** Updated Detection object.

---

## 5. Incident Management Endpoints

### 5.1. List Incidents
- **Endpoint:** `GET /api/v1/incidents`
- **Query Parameters:** `severity`, `status`, `query`
- **Response `200 OK`:**
  ```json
  {
    "items": [
      {
        "id": "INC-2026-0042",
        "title": "SSH Brute-Force Intrusion & Breach on Bastion-01",
        "category": "Authentication Compromise",
        "severity": "critical",
        "status": "active",
        "riskScore": 94,
        "confidenceScore": 98,
        "sourceIps": ["198.51.100.42"],
        "targetAccounts": ["root", "admin", "devops", "deploy"],
        "eventCount": 36,
        "createdAt": "2026-10-31T10:16:33Z",
        "updatedAt": "2026-10-31T10:16:33Z",
        "detectionIds": ["DET-2026-0891"],
        "eventIds": ["EVT-2026-SSH-001", "EVT-2026-SSH-036"],
        "detectionExplanation": "High velocity credential attack succeeded in obtaining valid interactive session for user 'deploy'.",
        "mitreAttack": [
          {
            "tactic": "Credential Access",
            "techniqueId": "T1110.001",
            "techniqueName": "Password Guessing",
            "referenceUrl": "https://attack.mitre.org/techniques/T1110/001/"
          }
        ],
        "aiSummary": {
          "executiveSummary": "Attacker at 198.51.100.42 conducted 35 rapid dictionary attempts...",
          "evidenceChain": ["Initial SSH handshake", "35 failed attempts", "Accepted deploy login"],
          "rootCauseAnalysis": "Weak password on administrative account 'deploy' without MFA.",
          "recommendedActions": ["Block 198.51.100.42 at edge firewall", "Terminate deploy session"],
          "confidenceExplanation": "Definite mathematical correlation between IP source and subsequent login."
        },
        "timelineEvents": [],
        "assignedPlaybookId": "PB-SSH-BRUTE-01",
        "isSimulated": true
      }
    ],
    "total": 1
  }
  ```

### 5.2. Update Incident Status
- **Endpoint:** `PATCH /api/v1/incidents/{id}/status`
- **Request Body:**
  ```json
  {
    "status": "contained"
  }
  ```
- **Response `200 OK`:** Updated Incident object.

---

## 6. AI Analyst & Investigation Endpoints

### 6.1. Investigation Query
- **Endpoint:** `POST /api/v1/analyst/query`
- **Request Body:**
  ```json
  {
    "prompt": "Investigate the latest SSH brute-force incident (INC-2026-0042)",
    "contextIncidentId": "INC-2026-0042"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "reply": "Analysis of SSH attack sequence from **198.51.100.42**:\n\n1. **Attack Pattern**: High-velocity password guessing...",
    "referencedEventIds": ["EVT-2026-SSH-001", "EVT-2026-SSH-020", "EVT-2026-SSH-035", "EVT-2026-SSH-036"],
    "mitreTechniques": ["T1110.001 (Password Guessing)", "T1078.003 (Local Accounts)"],
    "recommendedPlaybookId": "PB-SSH-BRUTE-01",
    "confidence": 0.98
  }
  ```

---

## 7. Autonomous Response & SOAR Endpoints

### 7.1. List Playbooks
- **Endpoint:** `GET /api/v1/response/playbooks`
- **Response `200 OK`:** Array of `ResponsePlaybook` objects.

### 7.2. List Executed Actions
- **Endpoint:** `GET /api/v1/response/actions`
- **Response `200 OK`:** Array of `ResponseAction` objects.

### 7.3. Execute Defensive Action
- **Endpoint:** `POST /api/v1/response/execute`
- **Request Body:**
  ```json
  {
    "playbookId": "PB-SSH-BRUTE-01",
    "actionName": "Firewall IP Drop",
    "target": "198.51.100.42",
    "incidentId": "INC-2026-0042"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "action": {
      "id": "ACT-2026-8912",
      "incidentId": "INC-2026-0042",
      "playbookId": "PB-SSH-BRUTE-01",
      "actionName": "Firewall IP Drop",
      "target": "198.51.100.42",
      "status": "simulated_success",
      "executionMode": "simulated",
      "timestamp": "2026-10-31T10:16:35Z",
      "durationMs": 142,
      "details": "Simulated defensive response executed: iptables -I INPUT -s 198.51.100.42 -j DROP",
      "verificationStatus": "verified",
      "rollbackAvailable": true,
      "isSimulated": true
    }
  }
  ```

### 7.4. Rollback Action
- **Endpoint:** `POST /api/v1/response/actions/{id}/rollback`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "actionId": "ACT-2026-8912",
    "status": "rolled_back"
  }
  ```

### 7.5. Emergency Kill Switch / Global Switch
- **Endpoint:** `POST /api/v1/response/emergency-toggle`
- **Request Body:**
  ```json
  {
    "enabled": false
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "autonomousResponseGlobalEnabled": false,
    "status": "EMERGENCY_HALT"
  }
  ```

---

## 8. Administration Endpoints

### 8.1. Log Sources
- **Endpoint:** `GET /api/v1/sources`
- **Response `200 OK`:** Array of `LogSource` objects.

### 8.2. Threat Intelligence Indicators
- **Endpoint:** `GET /api/v1/threat-intel`
- **Endpoint:** `GET /api/v1/threat-intel/{ip}`
- **Response `200 OK`:** `ThreatIntelIndicator` object.

### 8.3. Audit Trail
- **Endpoint:** `GET /api/v1/audit`
- **Response `200 OK`:** Array of `AuditRecord` objects.

### 8.4. Detection Thresholds
- **Endpoint:** `GET /api/v1/settings/thresholds`
- **Endpoint:** `PUT /api/v1/settings/thresholds`
- **Request Body:** Partial or full `DetectionThresholdConfig`.
- **Response `200 OK`:** Current `DetectionThresholdConfig`.
