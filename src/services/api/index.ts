import { useSecurityStore } from '@/stores/useSecurityStore';
import { 
  SecurityEvent, 
  Detection, 
  Incident, 
  ResponsePlaybook, 
  ResponseAction, 
  LogSource, 
  ThreatIntelIndicator, 
  AuditRecord 
} from '@/types';

// Clean API contract for Sentinel AI Backend (compatible with FastAPI Python backend)
export interface SentinelApiClient {
  events: {
    list: (params?: { source?: string; outcome?: string; query?: string; limit?: number }) => Promise<SecurityEvent[]>;
    getById: (id: string) => Promise<SecurityEvent | undefined>;
  };
  detections: {
    list: () => Promise<Detection[]>;
    getById: (id: string) => Promise<Detection | undefined>;
  };
  incidents: {
    list: () => Promise<Incident[]>;
    getById: (id: string) => Promise<Incident | undefined>;
    updateStatus: (id: string, status: Incident['status']) => Promise<void>;
  };
  response: {
    listPlaybooks: () => Promise<ResponsePlaybook[]>;
    listActions: () => Promise<ResponseAction[]>;
    execute: (playbookId: string, actionName: string, target: string, incidentId?: string) => Promise<boolean>;
    rollback: (actionId: string) => Promise<boolean>;
  };
  sources: {
    list: () => Promise<LogSource[]>;
  };
  threatIntel: {
    list: () => Promise<ThreatIntelIndicator[]>;
    getByIp: (ip: string) => Promise<ThreatIntelIndicator | undefined>;
  };
  audit: {
    list: () => Promise<AuditRecord[]>;
  };
  analyst: {
    query: (prompt: string, contextIncidentId?: string) => Promise<{
      reply: string;
      referencedEventIds: string[];
      mitreTechniques: string[];
      recommendedPlaybookId?: string;
      confidence: number;
    }>;
  };
}

// Current Mock Adapter implementing SentinelApiClient
export const sentinelApi: SentinelApiClient = {
  events: {
    list: async (params) => {
      const events = useSecurityStore.getState().events;
      if (!params) return events;
      return events.filter(e => {
        if (params.source && params.source !== 'all' && e.source !== params.source) return false;
        if (params.outcome && params.outcome !== 'all' && e.outcome !== params.outcome) return false;
        if (params.query) {
          const q = params.query.toLowerCase();
          return (
            e.username.toLowerCase().includes(q) ||
            e.sourceIp.includes(q) ||
            e.rawEvent.toLowerCase().includes(q) ||
            e.id.toLowerCase().includes(q)
          );
        }
        return true;
      });
    },
    getById: async (id) => {
      return useSecurityStore.getState().events.find(e => e.id === id);
    }
  },
  detections: {
    list: async () => useSecurityStore.getState().detections,
    getById: async (id) => useSecurityStore.getState().detections.find(d => d.id === id)
  },
  incidents: {
    list: async () => useSecurityStore.getState().incidents,
    getById: async (id) => useSecurityStore.getState().incidents.find(i => i.id === id),
    updateStatus: async (id, status) => {
      useSecurityStore.getState().updateIncidentStatus(id, status);
    }
  },
  response: {
    listPlaybooks: async () => useSecurityStore.getState().playbooks,
    listActions: async () => useSecurityStore.getState().actions,
    execute: async (playbookId, actionName, target, incidentId) => {
      return useSecurityStore.getState().executePlaybookAction(playbookId, actionName, target, incidentId);
    },
    rollback: async (actionId) => {
      return useSecurityStore.getState().rollbackAction(actionId);
    }
  },
  sources: {
    list: async () => useSecurityStore.getState().logSources
  },
  threatIntel: {
    list: async () => useSecurityStore.getState().threatIntel,
    getByIp: async (ip) => useSecurityStore.getState().threatIntel.find(ti => ti.ip === ip)
  },
  audit: {
    list: async () => useSecurityStore.getState().auditRecords
  },
  analyst: {
    query: async (prompt, contextIncidentId) => {
      // Deterministic simulated AI investigation responses connected to local mock dataset
      const p = prompt.toLowerCase();
      const state = useSecurityStore.getState();
      const inc = state.incidents.find(i => i.id === contextIncidentId) || state.incidents[0];

      if (p.includes('ssh') || p.includes('brute') || p.includes('198.51.100.42')) {
        return {
          reply: `Analysis of SSH attack sequence from **198.51.100.42**:\n\n1. **Attack Pattern**: High-velocity password guessing targeting 15 distinct service and root usernames across 35 consecutive attempts between 10:15:00 and 10:16:27 UTC.\n2. **Critical Breakthrough**: At 10:16:31 UTC, an accepted password logon occurred for user \`deploy\` (\`EVT-2026-SSH-036\`), establishing an interactive shell session (\`sess_993429ab\`).\n3. **Risk Vector**: The \`deploy\` account holds sudo privileges on host \`bastion-01\`.\n4. **Autonomous Action Executed**: The system simulated an iptables DROP rule on 198.51.100.42 and sent SIGKILL to session PID 12436.`,
          referencedEventIds: ['EVT-2026-SSH-001', 'EVT-2026-SSH-020', 'EVT-2026-SSH-035', 'EVT-2026-SSH-036'],
          mitreTechniques: ['T1110.001 (Password Guessing)', 'T1078.003 (Local Accounts)'],
          recommendedPlaybookId: 'PB-SSH-BRUTE-01',
          confidence: 0.98
        };
      } else if (p.includes('spray') || p.includes('sso') || p.includes('203.0.113.88')) {
        return {
          reply: `Analysis of Password Spraying Campaign:\n\n1. **Actor Profile**: Originating from **203.0.113.88**, utilizing automated script client (\`Python-urllib/3.11\`).\n2. **Scope**: 18 corporate user identities systematically probed with 12.0s timing intervals.\n3. **Impact**: Active Directory accounts \`a.smith\` and \`c.williams\` exceeded bad-password lockout thresholds (\`EVT-2026-WIN-001\`). No successful authentications registered.\n4. **Countermeasure**: Throttling applied at reverse proxy tier with MFA challenge enforcement.`,
          referencedEventIds: ['EVT-2026-SSO-001', 'EVT-2026-SSO-005', 'EVT-2026-SSO-018', 'EVT-2026-WIN-001'],
          mitreTechniques: ['T1110.003 (Password Spraying)'],
          recommendedPlaybookId: 'PB-SPRAY-DEFENSE-02',
          confidence: 0.89
        };
      } else if (p.includes('summarize') || p.includes('critical') || p.includes('posture')) {
        return {
          reply: `**Executive Security Summary (Simulated Telemetry)**:\n\n- **Highest Priority Incident**: [INC-2026-0042] SSH Brute Force with Successful Authentication (Risk Score: 94/100). Attacker gained session on \`bastion-01\`.\n- **Secondary Threat**: [INC-2026-0041] Password Spray targeting 18 corporate identities on SAML SSO Gateway.\n- **Autonomous Readiness**: Autonomous engine is ONLINE. 4 simulated countermeasures executed with 100% verification.\n- **Action Required**: Verify sudo logs on bastion-01 and enforce SSH key-only authentication.`,
          referencedEventIds: ['EVT-2026-SSH-036', 'EVT-2026-WIN-001'],
          mitreTechniques: ['T1110 (Brute Force)', 'T1078 (Valid Accounts)'],
          recommendedPlaybookId: 'PB-SSH-BRUTE-01',
          confidence: 0.95
        };
      } else {
        return {
          reply: `Investigation note for incident **${inc.id}** (${inc.title}):\n\n- Correlated **${inc.eventCount} telemetry events** across ${inc.sourceIps.join(', ')}.\n- Attack vector matches MITRE technique **${inc.mitreAttack[0]?.techniqueName || 'Brute Force'}** (${inc.mitreAttack[0]?.techniqueId || 'T1110'}).\n- Defense playbook **${inc.assignedPlaybookId || 'PB-SSH-BRUTE-01'}** is configured for autonomous remediation.`,
          referencedEventIds: inc.eventIds,
          mitreTechniques: inc.mitreAttack.map(m => `${m.techniqueId} - ${m.techniqueName}`),
          recommendedPlaybookId: inc.assignedPlaybookId,
          confidence: inc.confidenceScore / 100
        };
      }
    }
  }
};
