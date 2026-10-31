import { 
  SecurityEvent, 
  Detection, 
  Incident, 
  ResponsePlaybook, 
  ResponseAction, 
  LogSource, 
  ThreatIntelIndicator, 
  AuditRecord,
  DetectionThresholdConfig
} from '@/types';

// RFC 5737 and reserved test IPs for honesty & safety
export const TEST_IPS = {
  ATTACKER_SSH: '198.51.100.42',
  ATTACKER_SPRAY: '203.0.113.88',
  ATTACKER_DISTRIB_1: '192.0.2.14',
  ATTACKER_DISTRIB_2: '192.0.2.55',
  ATTACKER_DISTRIB_3: '192.0.2.91',
  INTERNAL_BASTION: '10.240.10.15',
  INTERNAL_DC: '10.240.0.5',
  INTERNAL_SSO: '10.240.4.12',
  INTERNAL_WEB: '10.240.20.100',
  LEGITIMATE_USER_IP: '198.51.100.210'
};

// Generate realistic mock events
const generateMockEvents = (): SecurityEvent[] => {
  const events: SecurityEvent[] = [];
  const baseTime = new Date('2026-10-31T10:15:00Z').getTime();

  // 1. SSH Brute Force Sequence (35 failed attempts + 1 successful login)
  const sshUsernames = ['root', 'admin', 'ubuntu', 'devops', 'ansible', 'deploy', 'backup', 'support', 'test', 'oracle', 'postgres', 'service', 'jenkins', 'git', 'appuser'];
  
  for (let i = 0; i < 35; i++) {
    const timeOffset = i * 2500; // ~2.5s intervals
    const eventTime = new Date(baseTime + timeOffset).toISOString();
    const user = sshUsernames[i % sshUsernames.length];
    const eventId = `EVT-2026-SSH-${String(i + 1).padStart(3, '0')}`;
    
    events.push({
      id: eventId,
      timestamp: eventTime,
      source: 'linux_ssh',
      eventType: 'SSH_AUTH_FAIL',
      username: user,
      sourceIp: TEST_IPS.ATTACKER_SSH,
      destinationIp: TEST_IPS.INTERNAL_BASTION,
      destinationPort: 22,
      outcome: 'failure',
      severity: i > 25 ? 'critical' : i > 10 ? 'warning' : 'info',
      rawEvent: `Oct 31 ${new Date(baseTime + timeOffset).toLocaleTimeString()} bastion-01 sshd[${12400 + i}]: Failed password for invalid user ${user} from ${TEST_IPS.ATTACKER_SSH} port ${41200 + i} ssh2`,
      parsedFields: {
        clientVersion: 'SSH-2.0-OpenSSH_8.4p1',
        authMethod: 'password',
        failureReason: 'Invalid user or password rejected',
        workstationName: 'unknown',
        targetService: 'sshd',
        geoCountry: 'Simulated Autonomous Region',
        asn: 'AS64512 (Simulated Transit)',
      },
      correlationId: 'CORR-SSH-BF-001',
      isSimulated: true
    });
  }

  // Event #36: The suspicious successful login that triggers the Critical Incident
  const breachTime = new Date(baseTime + 35 * 2500 + 4000).toISOString();
  events.push({
    id: 'EVT-2026-SSH-036',
    timestamp: breachTime,
    source: 'linux_ssh',
    eventType: 'SSH_AUTH_SUCCESS',
    username: 'deploy',
    sourceIp: TEST_IPS.ATTACKER_SSH,
    destinationIp: TEST_IPS.INTERNAL_BASTION,
    destinationPort: 22,
    outcome: 'success',
    severity: 'critical',
    rawEvent: `Oct 31 ${new Date(baseTime + 35 * 2500 + 4000).toLocaleTimeString()} bastion-01 sshd[12436]: Accepted password for deploy from ${TEST_IPS.ATTACKER_SSH} port 41236 ssh2`,
    parsedFields: {
      clientVersion: 'SSH-2.0-OpenSSH_8.4p1',
      authMethod: 'password',
      workstationName: 'bastion-internal',
      sessionId: 'sess_993429ab',
      targetService: 'sshd',
      geoCountry: 'Simulated Autonomous Region',
      asn: 'AS64512 (Simulated Transit)',
    },
    correlationId: 'CORR-SSH-BF-001',
    isSimulated: true
  });

  // 2. Password Spraying Sequence against Corporate SSO (18 unique accounts)
  const sprayUsers = [
    'a.smith', 'b.johnson', 'c.williams', 'd.brown', 'e.jones',
    'f.garcia', 'g.miller', 'h.davis', 'j.rodriguez', 'k.martinez',
    'l.hernandez', 'm.lopez', 'n.gonzalez', 'p.wilson', 'r.anderson',
    's.thomas', 't.taylor', 'v.moore'
  ];
  const sprayBaseTime = new Date('2026-10-31T09:40:00Z').getTime();

  sprayUsers.forEach((user, idx) => {
    const timeOffset = idx * 12000; // 12-second intervals (slow spray)
    const eventTime = new Date(sprayBaseTime + timeOffset).toISOString();
    const eventId = `EVT-2026-SSO-${String(idx + 1).padStart(3, '0')}`;

    events.push({
      id: eventId,
      timestamp: eventTime,
      source: 'app_auth',
      eventType: 'APP_LOGIN_FAIL',
      username: user,
      sourceIp: TEST_IPS.ATTACKER_SPRAY,
      destinationIp: TEST_IPS.INTERNAL_SSO,
      destinationPort: 443,
      outcome: 'failure',
      severity: idx > 10 ? 'warning' : 'info',
      rawEvent: `[2026-10-31 ${new Date(sprayBaseTime + timeOffset).toISOString()}] [sso-gw-02] WARN AuthProvider: BadCredentialsException: user="${user}" realm="corp" client_ip="${TEST_IPS.ATTACKER_SPRAY}" agent="Python-urllib/3.11"`,
      parsedFields: {
        targetService: 'sso-enterprise-gateway',
        authMethod: 'saml_sso',
        failureReason: 'BadCredentialsException',
        httpUserAgent: 'Python-urllib/3.11',
        geoCountry: 'Simulated External Host',
        asn: 'AS64520'
      },
      correlationId: 'CORR-SPRAY-002',
      isSimulated: true
    });
  });

  // 3. Windows Active Directory Account Lockout Events
  const winBaseTime = new Date('2026-10-31T09:45:00Z').getTime();
  const lockedUsers = ['a.smith', 'c.williams'];
  lockedUsers.forEach((user, idx) => {
    const eventTime = new Date(winBaseTime + idx * 45000).toISOString();
    events.push({
      id: `EVT-2026-WIN-${String(idx + 1).padStart(3, '0')}`,
      timestamp: eventTime,
      source: 'windows_security',
      eventType: 'WIN_ACCOUNT_LOCKOUT',
      username: user,
      sourceIp: TEST_IPS.INTERNAL_DC,
      destinationIp: TEST_IPS.INTERNAL_DC,
      destinationPort: 389,
      outcome: 'blocked',
      severity: 'warning',
      rawEvent: `EventID: 4740 - A user account was locked out. Target UserName: ${user}. Subject DomainName: CORP. Caller MachineName: SSO-GW-02.`,
      parsedFields: {
        logonType: 3,
        workstationName: 'SSO-GW-02',
        failureReason: 'Status 0xC0000234 (Account locked out)',
        targetService: 'ActiveDirectory Kerberos'
      },
      correlationId: 'CORR-SPRAY-002',
      isSimulated: true
    });
  });

  // 4. Normal Background Baseline Traffic (Legitimate Logins)
  const baselineUsers = ['m.kumar', 's.chen', 'alex.rivera', 'dev-operator', 'sarah.k'];
  const baselineBaseTime = new Date('2026-10-31T08:00:00Z').getTime();
  
  for (let i = 0; i < 25; i++) {
    const timeOffset = i * 400000;
    const user = baselineUsers[i % baselineUsers.length];
    events.push({
      id: `EVT-2026-NORM-${String(i + 1).padStart(3, '0')}`,
      timestamp: new Date(baselineBaseTime + timeOffset).toISOString(),
      source: i % 2 === 0 ? 'app_auth' : 'linux_auth',
      eventType: i % 2 === 0 ? 'APP_LOGIN_SUCCESS' : 'LINUX_PAM_SUCCESS',
      username: user,
      sourceIp: TEST_IPS.LEGITIMATE_USER_IP,
      destinationIp: TEST_IPS.INTERNAL_SSO,
      destinationPort: 443,
      outcome: 'success',
      severity: 'low',
      rawEvent: `[2026-10-31] Authenticated session created for user=${user} from IP=${TEST_IPS.LEGITIMATE_USER_IP} via MFA_DUO_PUSH`,
      parsedFields: {
        authMethod: 'saml_webauthn',
        workstationName: 'Corp-MacBook-2041',
        sessionId: `sess_legit_${i}`,
        targetService: 'Okta-IDP-Gateway'
      },
      isSimulated: true
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const INITIAL_EVENTS = generateMockEvents();

export const INITIAL_DETECTIONS: Detection[] = [
  {
    id: 'DET-2026-0891',
    name: 'SSH Brute Force with Successful Authentication',
    category: 'ssh_brute_force',
    description: '35 consecutive SSH authentication failures within 90 seconds followed immediately by a successful login for account "deploy" from 198.51.100.42.',
    severity: 'critical',
    sourceIp: TEST_IPS.ATTACKER_SSH,
    targetAccounts: ['root', 'admin', 'deploy', 'ubuntu'],
    eventCount: 36,
    timestamp: '2026-10-31T10:16:31.500Z',
    confidence: 98,
    riskScore: 94,
    status: 'open',
    triggeringConditions: [
      'Failed SSH login attempts >= 10 in 120s window (Count: 35)',
      'Subsequent successful login within 60s from identical source IP (Account: deploy)',
      'Non-standard geographic ASN origin with no prior host baseline'
    ],
    supportingEventIds: ['EVT-2026-SSH-001', 'EVT-2026-SSH-020', 'EVT-2026-SSH-035', 'EVT-2026-SSH-036'],
    ruleId: 'RULE-SSH-BRUTE-SUCCESS-01',
    ruleName: 'SSH High-Velocity Brute Force Followed by Compromise',
    associatedIncidentId: 'INC-2026-0042',
    suggestedPlaybookId: 'PB-SSH-BRUTE-01',
    isSimulated: true
  },
  {
    id: 'DET-2026-0889',
    name: 'Distributed Low-and-Slow Password Spraying',
    category: 'password_spraying',
    description: 'Single external source IP testing a single common password permutation across 18 distinct enterprise directory identities.',
    severity: 'warning',
    sourceIp: TEST_IPS.ATTACKER_SPRAY,
    targetAccounts: ['a.smith', 'b.johnson', 'c.williams', 'd.brown', 'e.jones', '+13 more'],
    eventCount: 18,
    timestamp: '2026-10-31T09:43:36.000Z',
    confidence: 89,
    riskScore: 78,
    status: 'investigating',
    triggeringConditions: [
      'Authentication failures across >= 10 unique users within 10-minute window from single source (Count: 18)',
      'Fixed delay spacing between attempts indicating automation (12.0s ± 0.4s)',
      'Triggered AD Lockout threshold (4740) for 2 high-privilege users'
    ],
    supportingEventIds: ['EVT-2026-SSO-001', 'EVT-2026-SSO-005', 'EVT-2026-SSO-018', 'EVT-2026-WIN-001'],
    ruleId: 'RULE-SPRAY-ENT-02',
    ruleName: 'SAML Gateway Identity Enumeration and Password Spray',
    associatedIncidentId: 'INC-2026-0041',
    suggestedPlaybookId: 'PB-SPRAY-DEFENSE-02',
    isSimulated: true
  },
  {
    id: 'DET-2026-0884',
    name: 'Distributed Credential Stuffing Campaign',
    category: 'credential_stuffing',
    description: 'Coordinated credential stuffing attempts originating from multiple simulated transient proxy nodes targeting public API endpoint.',
    severity: 'warning',
    sourceIp: '192.0.2.0/24 (Cluster)',
    targetAccounts: ['customer_portal_users'],
    eventCount: 142,
    timestamp: '2026-10-31T08:30:15.000Z',
    confidence: 84,
    riskScore: 68,
    status: 'contained',
    triggeringConditions: [
      'High ratio of 401 Unauthorized responses to valid session cookies',
      'Header entropy analysis matches known credential stuffing bot toolkits'
    ],
    supportingEventIds: [],
    ruleId: 'RULE-CRED-STUFF-03',
    ruleName: 'Edge Gateway Coordinated Stuffing Detection',
    suggestedPlaybookId: 'PB-SUSP-LOGIN-03',
    isSimulated: true
  },
  {
    id: 'DET-2026-0879',
    name: 'Abnormal Authentication Velocity & Geospatial Drift',
    category: 'abnormal_frequency',
    description: 'Simultaneous login attempts for service account "svc_deploy" across non-routable transit networks within 400 milliseconds.',
    severity: 'info',
    sourceIp: '192.0.2.14',
    targetAccounts: ['svc_deploy'],
    eventCount: 6,
    timestamp: '2026-10-31T07:12:00.000Z',
    confidence: 76,
    riskScore: 48,
    status: 'resolved',
    triggeringConditions: [
      'Impossible travel calculation (Delta > 8,000km in < 1 minute)',
      'Service principal credential used outside of designated CI/CD VPC CIDR'
    ],
    supportingEventIds: [],
    ruleId: 'RULE-GEO-VELOCITY-04',
    ruleName: 'Service Principal Anomalous Geo Velocity',
    suggestedPlaybookId: 'PB-COMP-ACCT-04',
    isSimulated: true
  }
];

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-0042',
    title: 'SSH Brute Force Followed by Successful Authentication',
    category: 'Credential Access / Brute Force',
    severity: 'critical',
    status: 'active',
    riskScore: 94,
    confidenceScore: 98,
    sourceIps: [TEST_IPS.ATTACKER_SSH],
    targetAccounts: ['deploy', 'root', 'admin'],
    eventCount: 36,
    createdAt: '2026-10-31T10:16:35.000Z',
    updatedAt: '2026-10-31T10:16:48.000Z',
    detectionIds: ['DET-2026-0891'],
    eventIds: ['EVT-2026-SSH-001', 'EVT-2026-SSH-020', 'EVT-2026-SSH-035', 'EVT-2026-SSH-036'],
    detectionExplanation: 'A systematic password exhaustion attack against SSH port 22 on bastion host bastion-01 (10.240.10.15) was detected from 198.51.100.42. The attacker tested 35 distinct common Unix and administrative usernames. At 10:16:31 UTC, an authentication success was recorded for user "deploy", indicating probable credential compromise.',
    mitreAttack: [
      {
        tactic: 'Credential Access',
        techniqueId: 'T1110',
        techniqueName: 'Brute Force',
        subtechnique: 'T1110.001 - Password Guessing',
        referenceUrl: 'https://attack.mitre.org/techniques/T1110/001/'
      },
      {
        tactic: 'Initial Access',
        techniqueId: 'T1078',
        techniqueName: 'Valid Accounts',
        subtechnique: 'T1078.003 - Local Accounts',
        referenceUrl: 'https://attack.mitre.org/techniques/T1078/003/'
      },
      {
        tactic: 'Persistence',
        techniqueId: 'T1098',
        techniqueName: 'Account Manipulation',
        referenceUrl: 'https://attack.mitre.org/techniques/T1098/'
      }
    ],
    aiSummary: {
      executiveSummary: 'CRITICAL ALERT: Genysis Bot correlated 35 high-frequency SSH password rejections followed within 4.0 seconds by an accepted authentication on host bastion-01 from external IP 198.51.100.42. Account "deploy" possesses sudoer privileges. Immediate host session termination and IP isolation recommended.',
      evidenceChain: [
        'EVT-2026-SSH-001 to EVT-2026-SSH-035: Rapid failed attempts against multiple administrative accounts from 198.51.100.42.',
        'EVT-2026-SSH-036: Successful password authentication accepted for user "deploy" from identical source IP port 41236.',
        'Host bastion-01 has no record of prior logins from ASN AS64512 in the last 180 days.',
        'Session sess_993429ab remains actively connected in Linux process table.'
      ],
      rootCauseAnalysis: 'Weak password policy enforcement on fallback local Linux user accounts; absence of public key exclusivity requirement on public-facing bastion SSH interface.',
      recommendedActions: [
        'Execute Autonomous Playbook PB-SSH-BRUTE-01 (Simulated iptables block + kill session).',
        'Revoke current SSH authorized_keys and password hash for user "deploy".',
        'Audit sudo log execution under session sess_993429ab on bastion-01.',
        'Enforce SSH public-key authentication only and disable PasswordAuthentication in /etc/ssh/sshd_config.'
      ],
      confidenceExplanation: 'High confidence (98%) based on exact temporal continuity (Δt = 4.0s) between brute-force storm and valid session establishment from identical external IP.'
    },
    timelineEvents: [
      {
        id: 'TL-01',
        timestamp: '10:15:00 UTC',
        stage: 'credential_access',
        title: 'Initial SSH Authentication Failure',
        description: 'First failed login attempt from 198.51.100.42 for user "root".',
        severity: 'info',
        evidenceId: 'EVT-2026-SSH-001',
        type: 'event'
      },
      {
        id: 'TL-02',
        timestamp: '10:15:45 UTC',
        stage: 'credential_access',
        title: 'Threshold Exceeded: 20 Authentication Failures',
        description: 'Brute-force velocity threshold breached (20 attempts in 45s).',
        severity: 'warning',
        evidenceId: 'EVT-2026-SSH-020',
        type: 'event'
      },
      {
        id: 'TL-03',
        timestamp: '10:16:27 UTC',
        stage: 'credential_access',
        title: '35th Failed Attempt',
        description: 'Final failed login attempt for user "appuser".',
        severity: 'warning',
        evidenceId: 'EVT-2026-SSH-035',
        type: 'event'
      },
      {
        id: 'TL-04',
        timestamp: '10:16:31 UTC',
        stage: 'initial_access',
        title: 'Compromise: Accepted SSH Login',
        description: 'Accepted password for "deploy" from 198.51.100.42 port 41236.',
        severity: 'critical',
        evidenceId: 'EVT-2026-SSH-036',
        type: 'event'
      },
      {
        id: 'TL-05',
        timestamp: '10:16:33 UTC',
        stage: 'detection',
        title: 'Detection Rule Triggered',
        description: 'Rule RULE-SSH-BRUTE-SUCCESS-01 matched high-velocity brute force followed by success.',
        severity: 'critical',
        evidenceId: 'DET-2026-0891',
        type: 'detection'
      },
      {
        id: 'TL-06',
        timestamp: '10:16:35 UTC',
        stage: 'detection',
        title: 'Incident INC-2026-0042 Created',
        description: 'Incident raised with Critical severity and 94 risk score.',
        severity: 'critical',
        type: 'detection'
      },
      {
        id: 'TL-07',
        timestamp: '10:16:40 UTC',
        stage: 'detection',
        title: 'Autonomous AI Investigation Completed',
        description: 'Evidence chain correlated, MITRE T1110 / T1078 mapped, playbook recommended.',
        severity: 'info',
        type: 'ai_note'
      }
    ],
    assignedPlaybookId: 'PB-SSH-BRUTE-01',
    isSimulated: true
  },
  {
    id: 'INC-2026-0041',
    title: 'Enterprise Identity Password Spraying Campaign',
    category: 'Credential Access / Password Spraying',
    severity: 'warning',
    status: 'investigating',
    riskScore: 78,
    confidenceScore: 89,
    sourceIps: [TEST_IPS.ATTACKER_SPRAY],
    targetAccounts: ['a.smith', 'b.johnson', 'c.williams', 'd.brown', '+14 accounts'],
    eventCount: 18,
    createdAt: '2026-10-31T09:43:40.000Z',
    updatedAt: '2026-10-31T09:48:12.000Z',
    detectionIds: ['DET-2026-0889'],
    eventIds: ['EVT-2026-SSO-001', 'EVT-2026-SSO-005', 'EVT-2026-SSO-018', 'EVT-2026-WIN-001'],
    detectionExplanation: 'Slow password spray pattern across 18 unique employee usernames originating from 203.0.113.88 targeting the corporate SAML Gateway. Two accounts exceeded AD bad-password limit resulting in Event ID 4740 lockouts.',
    mitreAttack: [
      {
        tactic: 'Credential Access',
        techniqueId: 'T1110',
        techniqueName: 'Brute Force',
        subtechnique: 'T1110.003 - Password Spraying',
        referenceUrl: 'https://attack.mitre.org/techniques/T1110/003/'
      }
    ],
    aiSummary: {
      executiveSummary: 'Automated horizontal password guessing observed against corporate SSO. Attacker is pacing queries at 12s intervals to bypass basic rate limiters. No successful logins observed; two accounts placed in lockout state.',
      evidenceChain: [
        '18 consecutive 401 Unauthorized responses from sso-gw-02.',
        'User-Agent string constant: Python-urllib/3.11.',
        'Two active Active Directory Event 4740 lockouts logged on DC01.'
      ],
      rootCauseAnalysis: 'SAML endpoint lacks IP-based rate limiting across distinct account identifiers.',
      recommendedActions: [
        'Enforce temporary rate limit / challenge on IP 203.0.113.88.',
        'Notify affected locked-out users and perform credential reset verification.',
        'Block Python-urllib User-Agent on public SSO ingress.'
      ],
      confidenceExplanation: '89% confidence due to fixed timing distribution and broad account coverage.'
    },
    timelineEvents: [
      {
        id: 'TL-SPRAY-01',
        timestamp: '09:40:00 UTC',
        stage: 'credential_access',
        title: 'Password Spray Initiated',
        description: 'First attempt against user "a.smith" from 203.0.113.88.',
        severity: 'info',
        evidenceId: 'EVT-2026-SSO-001',
        type: 'event'
      },
      {
        id: 'TL-SPRAY-02',
        timestamp: '09:43:36 UTC',
        stage: 'detection',
        title: 'Rule RULE-SPRAY-ENT-02 Fired',
        description: '18 unique user accounts probed in 3 minutes.',
        severity: 'warning',
        evidenceId: 'DET-2026-0889',
        type: 'detection'
      },
      {
        id: 'TL-SPRAY-03',
        timestamp: '09:45:00 UTC',
        stage: 'defense_evasion',
        title: 'Account Lockout Triggered',
        description: 'AD Event ID 4740: User "a.smith" locked out by domain controller policy.',
        severity: 'warning',
        evidenceId: 'EVT-2026-WIN-001',
        type: 'event'
      }
    ],
    assignedPlaybookId: 'PB-SPRAY-DEFENSE-02',
    isSimulated: true
  },
  {
    id: 'INC-2026-0039',
    title: 'Credential Stuffing Against Customer Authentication API',
    category: 'Credential Access / Stuffing',
    severity: 'warning',
    status: 'contained',
    riskScore: 68,
    confidenceScore: 84,
    sourceIps: ['192.0.2.14', '192.0.2.55', '192.0.2.91'],
    targetAccounts: ['customer_portal_users'],
    eventCount: 142,
    createdAt: '2026-10-31T08:30:20.000Z',
    updatedAt: '2026-10-31T08:50:00.000Z',
    detectionIds: ['DET-2026-0884'],
    eventIds: [],
    detectionExplanation: 'Distributed credential stuffing from proxy pool attempting combos against mobile API.',
    mitreAttack: [
      {
        tactic: 'Credential Access',
        techniqueId: 'T1110',
        techniqueName: 'Brute Force',
        subtechnique: 'T1110.004 - Credential Stuffing',
        referenceUrl: 'https://attack.mitre.org/techniques/T1110/004/'
      }
    ],
    aiSummary: {
      executiveSummary: 'WAF managed bot rules mitigated 142 stuffing attempts with zero verified breaches.',
      evidenceChain: [
        '142 failed authentications across 40 customer accounts.',
        'WAF challenged 92% of requests with captcha tokens.'
      ],
      rootCauseAnalysis: 'Third-party leaked credential combo list targeted at generic login API.',
      recommendedActions: [
        'Maintain IP range challenge rules on WAF.',
        'Review leaked credential database for customer email overlaps.'
      ],
      confidenceExplanation: 'High correlation with known leak database hashes.'
    },
    timelineEvents: [
      {
        id: 'TL-STUFF-01',
        timestamp: '08:30:15 UTC',
        stage: 'credential_access',
        title: 'Stuffing Surge Detected',
        description: '142 requests in 60s from 3 proxy endpoints.',
        severity: 'warning',
        type: 'detection'
      },
      {
        id: 'TL-STUFF-02',
        timestamp: '08:35:00 UTC',
        stage: 'response',
        title: 'WAF Managed Challenge Enacted',
        description: 'Autonomous WAF rule applied; attack subsided.',
        severity: 'info',
        type: 'response'
      }
    ],
    assignedPlaybookId: 'PB-SUSP-LOGIN-03',
    isSimulated: true
  }
];

export const INITIAL_PLAYBOOKS: ResponsePlaybook[] = [
  {
    id: 'PB-SSH-BRUTE-01',
    name: 'SSH Brute Force Autonomous Mitigation',
    description: 'Instantly applies simulated firewall ingress drop rule on attacking IP, terminates active SSH process session, and flags target identity for credential rotation.',
    severityTrigger: ['critical', 'warning'],
    triggers: [
      'Failed SSH login attempts >= 10 in 120 seconds',
      'Successful login following brute-force pattern',
      'Manual SOC analyst escalation'
    ],
    investigationRequirements: [
      'Confirm source IP is not internal corporate NAT or verified gateway',
      'Check active session PID on target host via SSH daemon telemetry',
      'Verify whether privileged commands were executed post-login'
    ],
    responseSteps: [
      {
        stepNumber: 1,
        action: 'Simulate Temporary Firewall Ingress Block (iptables DROP / Security Group)',
        targetType: 'ip',
        automated: true,
        requiresApproval: false
      },
      {
        stepNumber: 2,
        action: 'Simulate Terminate Active Linux SSH Session (pkill -HUP -s <PID>)',
        targetType: 'session',
        automated: true,
        requiresApproval: false
      },
      {
        stepNumber: 3,
        action: 'Simulate Lock Compromised Linux User Account (passwd -l)',
        targetType: 'user',
        automated: false,
        requiresApproval: true
      },
      {
        stepNumber: 4,
        action: 'Simulate Dispatch Incident Notification to Security On-Call Channel',
        targetType: 'host',
        automated: true,
        requiresApproval: false
      }
    ],
    allowedScope: 'Target Bastion & Edge Ingress Firewalls (Non-production bypass disabled)',
    verificationSteps: [
      'Query iptables / nftables counters to verify dropped packets from source IP',
      'Query ps aux | grep sshd to verify target session termination',
      'Check SSH daemon logs for any subsequent accepted handshakes'
    ],
    rollbackStrategy: 'Execute simulated iptables -D INPUT -s <IP> -j DROP and passwd -u <USER>',
    enabled: true,
    executionCount: 14
  },
  {
    id: 'PB-SPRAY-DEFENSE-02',
    name: 'Password Spraying Containment & Rate Limit',
    description: 'Enforces synthetic rate limits and captcha challenges on targeted authentication gateways, unlocks false-positive AD lockouts, and initiates step-up MFA.',
    severityTrigger: ['warning'],
    triggers: [
      '10+ failed logins across multiple accounts within 10 minutes',
      'AD Event 4740 triggered on 2+ user identities'
    ],
    investigationRequirements: [
      'Inspect User-Agent distribution across spray attempts',
      'Confirm whether source IP is known VPN/Proxy node'
    ],
    responseSteps: [
      {
        stepNumber: 1,
        action: 'Simulate Gateway IP Rate Limiting (1 req/min throttled)',
        targetType: 'ip',
        automated: true,
        requiresApproval: false
      },
      {
        stepNumber: 2,
        action: 'Simulate Step-Up MFA Challenge for Targeted Accounts',
        targetType: 'user',
        automated: true,
        requiresApproval: false
      },
      {
        stepNumber: 3,
        action: 'Simulate Re-enable Locked Accounts post-MFA verification',
        targetType: 'user',
        automated: false,
        requiresApproval: true
      }
    ],
    allowedScope: 'SAML / OAuth Gateway Ingress',
    verificationSteps: [
      'Verify request rate throttle telemetry from gateway logs',
      'Confirm zero lockouts occurred in following 15 minutes'
    ],
    rollbackStrategy: 'Remove IP rate limit policy from gateway reverse proxy configuration',
    enabled: true,
    executionCount: 22
  },
  {
    id: 'PB-SUSP-LOGIN-03',
    name: 'Suspicious Login Deep Investigation & Revoke',
    description: 'Analyzes impossible travel or abnormal user session telemetry, terminates active JWT refresh tokens, and prompts user for out-of-band verification.',
    severityTrigger: ['warning', 'info'],
    triggers: [
      'Impossible travel calculation',
      'Session token used from new autonomous system'
    ],
    investigationRequirements: [
      'Correlate with device management (MDM) enrollment status',
      'Check user calendar for approved travel notification'
    ],
    responseSteps: [
      {
        stepNumber: 1,
        action: 'Simulate Invalidate OAuth 2.0 / OIDC Active Refresh Tokens',
        targetType: 'session',
        automated: true,
        requiresApproval: false
      },
      {
        stepNumber: 2,
        action: 'Simulate Prompt User via Authenticator Push Push-Verify',
        targetType: 'user',
        automated: true,
        requiresApproval: false
      }
    ],
    allowedScope: 'Identity Provider Session Management',
    verificationSteps: [
      'Confirm token revocation response 200 OK from IdP',
      'Confirm user push approval or denial'
    ],
    rollbackStrategy: 'Re-issue invitation link / reset session cookie',
    enabled: true,
    executionCount: 9
  },
  {
    id: 'PB-COMP-ACCT-04',
    name: 'Compromised Account Containment',
    description: 'High-severity identity containment: isolates user across all enterprise directories, terminates active VPN sessions, and freezes cloud role assumptions.',
    severityTrigger: ['critical'],
    triggers: [
      'Confirmed privilege escalation or lateral movement by compromised user',
      'Manual security engineer containment command'
    ],
    investigationRequirements: [
      'Executive stakeholder approval if VP+ or C-level executive account'
    ],
    responseSteps: [
      {
        stepNumber: 1,
        action: 'Simulate Active Directory Account Disable (AccountDisabled = True)',
        targetType: 'user',
        automated: true,
        requiresApproval: true
      },
      {
        stepNumber: 2,
        action: 'Simulate Revoke AWS IAM Assumed Role Temporary Credentials',
        targetType: 'user',
        automated: true,
        requiresApproval: false
      },
      {
        stepNumber: 3,
        action: 'Simulate Kill Remote Access VPN Tunnels',
        targetType: 'session',
        automated: true,
        requiresApproval: false
      }
    ],
    allowedScope: 'All Corporate & Cloud Directory Services',
    verificationSteps: [
      'Directory sync confirms Disabled status across Azure AD and On-Prem DC',
      'Zero active AWS STS sessions verified via CloudTrail'
    ],
    rollbackStrategy: 'Reactivate user in Active Directory and unfreeze IAM access roles',
    enabled: true,
    executionCount: 3
  },
  {
    id: 'PB-REPEAT-ATTACK-05',
    name: 'Repeated Attack Escalation & Global Threat Intel Feed Push',
    description: 'Escalates persistently attacking IPs across all edge perimeter firewalls and synchronizes threat indicator into corporate STIX/TAXII threat intel repository.',
    severityTrigger: ['critical', 'warning'],
    triggers: [
      'IP address involved in 3+ distinct incidents over 48 hours',
      'Brute-force resumed after temporary restriction window'
    ],
    investigationRequirements: [
      'Confirm IP is not a shared public CDN or legitimate cloud crawler'
    ],
    responseSteps: [
      {
        stepNumber: 1,
        action: 'Simulate Escalate to Global Perimeter Border BGP Blackhole / CDN Block',
        targetType: 'ip',
        automated: false,
        requiresApproval: true
      },
      {
        stepNumber: 2,
        action: 'Simulate Export Threat Indicator to Internal TIP and SIEM Feed',
        targetType: 'ip',
        automated: true,
        requiresApproval: false
      }
    ],
    allowedScope: 'Global Edge Ingress & Perimeter BGP Route Reflector',
    verificationSteps: [
      'Verify BGP route advertisement withdrawn / community tagged blackhole',
      'Indicator verified in Threat Intel cache'
    ],
    rollbackStrategy: 'Withdraw BGP blackhole advertisement and purge IP from edge blocklists',
    enabled: true,
    executionCount: 7
  }
];

export const INITIAL_ACTIONS: ResponseAction[] = [
  {
    id: 'ACT-2026-0312',
    incidentId: 'INC-2026-0042',
    playbookId: 'PB-SSH-BRUTE-01',
    actionName: 'Simulated Firewall Ingress Block (iptables DROP)',
    target: TEST_IPS.ATTACKER_SSH,
    status: 'simulated_success',
    executionMode: 'simulated',
    timestamp: '2026-10-31T10:16:42.120Z',
    durationMs: 420,
    details: 'Simulated execution: iptables -I INPUT -s 198.51.100.42 -p tcp --dport 22 -j DROP applied on bastion-01.',
    verificationStatus: 'verified',
    rollbackAvailable: true,
    isSimulated: true
  },
  {
    id: 'ACT-2026-0313',
    incidentId: 'INC-2026-0042',
    playbookId: 'PB-SSH-BRUTE-01',
    actionName: 'Simulated Terminate Linux SSH Session (PID 12436)',
    target: 'sess_993429ab (deploy)',
    status: 'simulated_success',
    executionMode: 'simulated',
    timestamp: '2026-10-31T10:16:44.800Z',
    durationMs: 210,
    details: 'Simulated execution: kill -9 12436; child processes of session sess_993429ab reaped.',
    verificationStatus: 'verified',
    rollbackAvailable: false,
    isSimulated: true
  },
  {
    id: 'ACT-2026-0309',
    incidentId: 'INC-2026-0041',
    playbookId: 'PB-SPRAY-DEFENSE-02',
    actionName: 'Simulated Gateway Rate Limiting',
    target: TEST_IPS.ATTACKER_SPRAY,
    status: 'simulated_success',
    executionMode: 'simulated',
    timestamp: '2026-10-31T09:44:10.000Z',
    durationMs: 180,
    details: 'Simulated rule applied on reverse proxy sso-gw-02: limit_req_zone $binary_remote_addr rate=1r/m.',
    verificationStatus: 'verified',
    rollbackAvailable: true,
    isSimulated: true
  },
  {
    id: 'ACT-2026-0298',
    incidentId: 'INC-2026-0039',
    playbookId: 'PB-SUSP-LOGIN-03',
    actionName: 'Simulated Token Revocation',
    target: 'customer_portal_users (142 tokens)',
    status: 'simulated_success',
    executionMode: 'simulated',
    timestamp: '2026-10-31T08:35:12.000Z',
    durationMs: 650,
    details: 'Simulated Redis token cache invalidation across 142 suspicious session tokens.',
    verificationStatus: 'verified',
    rollbackAvailable: false,
    isSimulated: true
  }
];

export const INITIAL_LOG_SOURCES: LogSource[] = [
  {
    id: 'SRC-LINUX-SSH-01',
    name: 'Linux SSH Bastion Daemon',
    type: 'linux_ssh',
    status: 'active',
    lastEventReceived: '4 seconds ago',
    eventsProcessed24h: 421940,
    errorCount24h: 38,
    host: 'bastion-01.mgmt.sentinel.internal',
    port: 514,
    agentVersion: 'sentinel-collector-v2.4.1',
    format: 'RFC 5424 Syslog / OpenSSH Audit',
    description: 'Primary SSH ingress bastion cluster forwarder monitoring administrative shell sessions.'
  },
  {
    id: 'SRC-LINUX-AUTH-02',
    name: 'K8s Control Plane PAM & Sudo Logs',
    type: 'linux_auth',
    status: 'active',
    lastEventReceived: '12 seconds ago',
    eventsProcessed24h: 891200,
    errorCount24h: 12,
    host: 'k8s-cp-node-01.corp.sentinel.internal',
    port: 514,
    agentVersion: 'sentinel-collector-v2.4.1',
    format: 'Linux PAM / Auditd Daemon',
    description: 'Operating system authentication, su, sudo privilege delegations on Kubernetes master nodes.'
  },
  {
    id: 'SRC-WIN-DC-01',
    name: 'Active Directory Security Event Log',
    type: 'windows_security',
    status: 'active',
    lastEventReceived: '28 seconds ago',
    eventsProcessed24h: 1540320,
    errorCount24h: 84,
    host: 'dc01.corp.sentinel.internal',
    port: 5985,
    agentVersion: 'sentinel-winlogbeat-v1.8.0',
    format: 'Windows XML EventLog (Channels: Security, System)',
    description: 'Domain controller Kerberos/NTLM authentication audits, account lockouts (4740), and ticket grants.'
  },
  {
    id: 'SRC-APP-SSO-01',
    name: 'Enterprise SSO & Identity Provider',
    type: 'app_auth',
    status: 'active',
    lastEventReceived: '1 second ago',
    eventsProcessed24h: 2190450,
    errorCount24h: 5,
    host: 'sso-gw-cluster.sentinel.internal',
    port: 8443,
    agentVersion: 'sentinel-app-fluentd-v3.0.2',
    format: 'Structured JSON OAuth/SAML Auth Telemetry',
    description: 'Centralized single sign-on access logs, MFA challenges, bad password exceptions.'
  },
  {
    id: 'SRC-NGINX-EDGE-01',
    name: 'Edge Ingress Proxy Cluster',
    type: 'nginx_access',
    status: 'degraded',
    lastEventReceived: '3 minutes ago',
    eventsProcessed24h: 5820100,
    errorCount24h: 312,
    host: 'edge-ingress-lb01.sentinel.internal',
    port: 443,
    agentVersion: 'sentinel-syslog-forwarder-v1.2.0',
    format: 'W3C Extended NGINX Combined Log',
    description: 'Public reverse proxy tier handling TLS termination and WAF filtering.'
  }
];

export const INITIAL_THREAT_INTEL: ThreatIntelIndicator[] = [
  {
    ip: TEST_IPS.ATTACKER_SSH,
    threatClassification: 'Known SSH Brute Force Scanner & Botnet Node',
    reputationScore: 94,
    associatedIncidents: ['INC-2026-0042'],
    firstSeen: '2026-10-24T14:20:00Z',
    lastSeen: '2026-10-31T10:16:31Z',
    confidence: 96,
    country: 'Simulated Transit Region',
    countryCode: 'XX',
    asn: 'AS64512 (Simulated Transit)',
    mitreTechniques: ['T1110.001 - Password Guessing', 'T1078 - Valid Accounts'],
    tags: ['ssh-scanner', 'botnet-worker', 'high-velocity', 'simulated-feed'],
    simulatedDataSource: 'Simulated Community Threat Intelligence Exchange (CTIX)'
  },
  {
    ip: TEST_IPS.ATTACKER_SPRAY,
    threatClassification: 'SaaS Identity Password Spray Actor',
    reputationScore: 82,
    associatedIncidents: ['INC-2026-0041'],
    firstSeen: '2026-10-28T09:15:00Z',
    lastSeen: '2026-10-31T09:43:36Z',
    confidence: 88,
    country: 'Simulated External Host',
    countryCode: 'XZ',
    asn: 'AS64520 (Simulated Hosting)',
    mitreTechniques: ['T1110.003 - Password Spraying'],
    tags: ['password-spray', 'sso-targeted', 'slow-rate', 'simulated-feed'],
    simulatedDataSource: 'Simulated Sentinel Global Defense Mesh'
  },
  {
    ip: '192.0.2.14',
    threatClassification: 'Commercial Proxy / Tor Exit Candidate',
    reputationScore: 68,
    associatedIncidents: ['INC-2026-0039'],
    firstSeen: '2026-10-15T18:00:00Z',
    lastSeen: '2026-10-31T08:30:15Z',
    confidence: 79,
    country: 'Simulated Neutral Zone',
    countryCode: 'XN',
    asn: 'AS64530 (Simulated Datacenter)',
    mitreTechniques: ['T1110.004 - Credential Stuffing'],
    tags: ['open-proxy', 'credential-stuffing', 'automated-traffic'],
    simulatedDataSource: 'Simulated Sentinel Global Defense Mesh'
  },
  {
    ip: '192.0.2.55',
    threatClassification: 'Credential Stuffing Botnet Node',
    reputationScore: 71,
    associatedIncidents: ['INC-2026-0039'],
    firstSeen: '2026-10-20T22:10:00Z',
    lastSeen: '2026-10-31T08:30:15Z',
    confidence: 82,
    country: 'Simulated Neutral Zone',
    countryCode: 'XN',
    asn: 'AS64530 (Simulated Datacenter)',
    mitreTechniques: ['T1110.004 - Credential Stuffing'],
    tags: ['credential-stuffing', 'residential-proxy'],
    simulatedDataSource: 'Simulated Sentinel Global Defense Mesh'
  }
];

export const INITIAL_AUDIT_RECORDS: AuditRecord[] = [
  {
    id: 'AUD-2026-1049',
    timestamp: '2026-10-31T10:16:44.800Z',
    category: 'RESPONSE_EXECUTION',
    action: 'SIMULATED_PROCESS_KILL',
    actor: 'GENYSIS_AUTONOMOUS_ENGINE',
    target: 'sess_993429ab (deploy)',
    result: 'SUCCESS',
    details: {
      playbook: 'PB-SSH-BRUTE-01',
      incident: 'INC-2026-0042',
      signal: 'SIGKILL',
      pid: 12436,
      executionMode: 'simulated'
    },
    isSimulated: true
  },
  {
    id: 'AUD-2026-1048',
    timestamp: '2026-10-31T10:16:42.120Z',
    category: 'RESPONSE_EXECUTION',
    action: 'SIMULATED_IP_BLOCK',
    actor: 'GENYSIS_AUTONOMOUS_ENGINE',
    target: TEST_IPS.ATTACKER_SSH,
    result: 'SUCCESS',
    details: {
      playbook: 'PB-SSH-BRUTE-01',
      incident: 'INC-2026-0042',
      table: 'iptables/INPUT',
      dport: 22,
      duration: '30m'
    },
    isSimulated: true
  },
  {
    id: 'AUD-2026-1047',
    timestamp: '2026-10-31T10:16:40.000Z',
    category: 'AI_INVESTIGATION',
    action: 'SYNTHESIS_COMPLETED',
    actor: 'GENYSIS_AI_ANALYST',
    target: 'INC-2026-0042',
    result: 'SUCCESS',
    details: {
      model: 'Genysis-Security-LLM-Simulated',
      evidenceCount: 4,
      confidence: 0.98,
      riskScore: 94
    },
    isSimulated: true
  },
  {
    id: 'AUD-2026-1046',
    timestamp: '2026-10-31T10:16:35.000Z',
    category: 'DETECTION',
    action: 'INCIDENT_GENERATED',
    actor: 'GENYSIS_CORRELATION_ENGINE',
    target: 'INC-2026-0042',
    result: 'WARNING',
    details: {
      detectionId: 'DET-2026-0891',
      rule: 'RULE-SSH-BRUTE-SUCCESS-01',
      severity: 'critical'
    },
    isSimulated: true
  },
  {
    id: 'AUD-2026-1045',
    timestamp: '2026-10-31T09:44:10.000Z',
    category: 'POLICY_DECISION',
    action: 'RATE_LIMIT_ENACTED',
    actor: 'GENYSIS_AUTONOMOUS_ENGINE',
    target: TEST_IPS.ATTACKER_SPRAY,
    result: 'SUCCESS',
    details: {
      playbook: 'PB-SPRAY-DEFENSE-02',
      rate: '1r/m',
      gateway: 'sso-gw-02'
    },
    isSimulated: true
  },
  {
    id: 'AUD-2026-1040',
    timestamp: '2026-10-31T08:00:00.000Z',
    category: 'CONFIG_CHANGE',
    action: 'THRESHOLD_UPDATED',
    actor: 'secops_admin@sentinel.ai',
    target: 'DetectionThresholdConfig',
    result: 'INFO',
    details: {
      parameter: 'sshFailedAttemptThreshold',
      oldValue: 15,
      newValue: 10
    },
    isSimulated: true
  }
];

export const INITIAL_THRESHOLDS: DetectionThresholdConfig = {
  sshFailedAttemptThreshold: 10,
  sshWindowSeconds: 120,
  passwordSprayUniqueUsersThreshold: 8,
  passwordSprayWindowSeconds: 600,
  distributedThresholdIps: 3,
  autonomousResponseEnabled: true,
  requireApprovalForCritical: false,
  temporaryIpBlockDurationMinutes: 30
};
