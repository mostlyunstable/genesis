export type Severity = 'critical' | 'warning' | 'info' | 'low';

export type Outcome = 'failure' | 'success' | 'blocked' | 'challenged';

export type EventSource = 
  | 'linux_ssh'
  | 'linux_auth'
  | 'windows_security'
  | 'app_auth'
  | 'nginx_access';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  source: EventSource;
  eventType: string;
  username: string;
  sourceIp: string;
  destinationIp: string;
  destinationPort: number;
  outcome: Outcome;
  severity: Severity;
  rawEvent: string;
  parsedFields: {
    clientVersion?: string;
    authMethod?: string;
    logonType?: number;
    failureReason?: string;
    workstationName?: string;
    sessionId?: string;
    geoCountry?: string;
    asn?: string;
    targetService?: string;
    httpUserAgent?: string;
    [key: string]: any;
  };
  correlationId?: string;
  isSimulated: boolean;
}

export type DetectionCategory = 
  | 'ssh_brute_force'
  | 'password_spraying'
  | 'distributed_brute_force'
  | 'credential_stuffing'
  | 'suspicious_auth'
  | 'abnormal_frequency';

export interface Detection {
  id: string;
  name: string;
  category: DetectionCategory;
  description: string;
  severity: Severity;
  sourceIp: string;
  targetAccounts: string[];
  eventCount: number;
  timestamp: string;
  confidence: number; // 0 - 100
  riskScore: number;  // 0 - 100
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'false_positive';
  triggeringConditions: string[];
  supportingEventIds: string[];
  ruleId: string;
  ruleName: string;
  associatedIncidentId?: string;
  suggestedPlaybookId?: string;
  isSimulated: boolean;
}

export interface MitreTechnique {
  tactic: string;
  techniqueId: string;
  techniqueName: string;
  subtechnique?: string;
  referenceUrl: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  stage: 'initial_access' | 'credential_access' | 'execution' | 'defense_evasion' | 'detection' | 'response';
  title: string;
  description: string;
  severity: Severity;
  evidenceId?: string;
  type: 'event' | 'detection' | 'response' | 'ai_note';
}

export interface Incident {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  status: 'active' | 'investigating' | 'contained' | 'resolved' | 'dismissed';
  riskScore: number;
  confidenceScore: number;
  sourceIps: string[];
  targetAccounts: string[];
  eventCount: number;
  createdAt: string;
  updatedAt: string;
  detectionIds: string[];
  eventIds: string[];
  detectionExplanation: string;
  mitreAttack: MitreTechnique[];
  aiSummary: {
    executiveSummary: string;
    evidenceChain: string[];
    rootCauseAnalysis: string;
    recommendedActions: string[];
    confidenceExplanation: string;
  };
  timelineEvents: TimelineEvent[];
  assignedPlaybookId?: string;
  isSimulated: boolean;
}

export interface ResponseAction {
  id: string;
  incidentId?: string;
  playbookId: string;
  actionName: string;
  target: string;
  status: 'simulated_pending' | 'simulated_active' | 'simulated_success' | 'simulated_failed' | 'rolled_back';
  executionMode: 'simulated';
  timestamp: string;
  durationMs: number;
  details: string;
  verificationStatus: 'verified' | 'unverified' | 'failed';
  rollbackAvailable: boolean;
  isSimulated: boolean;
}

export interface ResponsePlaybook {
  id: string;
  name: string;
  description: string;
  severityTrigger: Severity[];
  triggers: string[];
  investigationRequirements: string[];
  responseSteps: {
    stepNumber: number;
    action: string;
    targetType: 'ip' | 'user' | 'host' | 'session';
    automated: boolean;
    requiresApproval: boolean;
  }[];
  allowedScope: string;
  verificationSteps: string[];
  rollbackStrategy: string;
  enabled: boolean;
  executionCount: number;
}

export interface LogSource {
  id: string;
  name: string;
  type: 'linux_ssh' | 'linux_auth' | 'windows_security' | 'app_auth' | 'nginx_access';
  status: 'active' | 'degraded' | 'disconnected';
  lastEventReceived: string;
  eventsProcessed24h: number;
  errorCount24h: number;
  host: string;
  port: number;
  agentVersion: string;
  format: string;
  description: string;
}

export interface ThreatIntelIndicator {
  ip: string;
  threatClassification: string;
  reputationScore: number; // 0-100 (100 = malicious)
  associatedIncidents: string[];
  firstSeen: string;
  lastSeen: string;
  confidence: number;
  country: string;
  countryCode: string;
  asn: string;
  mitreTechniques: string[];
  tags: string[];
  simulatedDataSource: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  category: 
    | 'DETECTION'
    | 'AI_INVESTIGATION'
    | 'RISK_ASSESSMENT'
    | 'POLICY_DECISION'
    | 'RESPONSE_EXECUTION'
    | 'VERIFICATION'
    | 'CONFIG_CHANGE';
  action: string;
  actor: string;
  target: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILURE' | 'INFO';
  details: Record<string, any>;
  isSimulated: boolean;
}

export interface DetectionThresholdConfig {
  sshFailedAttemptThreshold: number;
  sshWindowSeconds: number;
  passwordSprayUniqueUsersThreshold: number;
  passwordSprayWindowSeconds: number;
  distributedThresholdIps: number;
  autonomousResponseEnabled: boolean;
  requireApprovalForCritical: boolean;
  temporaryIpBlockDurationMinutes: number;
}
