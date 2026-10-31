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
  system: {
    getBackendUrl: () => string;
    setBackendUrl: (url: string) => void;
    isLiveMode: () => boolean;
    setLiveMode: (enabled: boolean) => void;
    pingHealth: () => Promise<{ healthy: boolean; details?: any }>;
  };
}

let activeBackendUrl = localStorage.getItem('sentinel_backend_url') || 'http://localhost:8000';
let liveBackendMode = localStorage.getItem('sentinel_live_mode') === 'true';
let authToken = localStorage.getItem('sentinel_auth_token') || '';

async function fetchFromBackend<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${activeBackendUrl}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail?.message || errorData.detail || `HTTP Error ${res.status}`);
  }
  return res.json();
}

export const sentinelApi: SentinelApiClient = {
  events: {
    list: async (params) => {
      if (liveBackendMode) {
        try {
          const queryParts: string[] = [];
          if (params?.source && params.source !== 'all') queryParts.push(`source=${encodeURIComponent(params.source)}`);
          if (params?.outcome && params.outcome !== 'all') queryParts.push(`outcome=${encodeURIComponent(params.outcome)}`);
          if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
          if (params?.limit) queryParts.push(`limit=${params.limit}`);
          const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
          const data = await fetchFromBackend<{ items: SecurityEvent[]; total: number }>(`/events${qs}`);
          return data.items;
        } catch (err) {
          console.warn('[SentinelApi] Failed to fetch live events, falling back to local store:', err);
        }
      }

      // Demo / Mock fallback
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
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<SecurityEvent>(`/events/${id}`);
        } catch {
          // fallback
        }
      }
      return useSecurityStore.getState().events.find(e => e.id === id);
    }
  },

  detections: {
    list: async () => {
      if (liveBackendMode) {
        try {
          const data = await fetchFromBackend<{ items: Detection[]; total: number }>('/detections');
          return data.items;
        } catch (err) {
          console.warn('[SentinelApi] Failed to fetch live detections:', err);
        }
      }
      return useSecurityStore.getState().detections;
    },
    getById: async (id) => {
      return useSecurityStore.getState().detections.find(d => d.id === id);
    }
  },

  incidents: {
    list: async () => {
      if (liveBackendMode) {
        try {
          const data = await fetchFromBackend<{ items: Incident[]; total: number }>('/incidents');
          return data.items;
        } catch (err) {
          console.warn('[SentinelApi] Failed to fetch live incidents:', err);
        }
      }
      return useSecurityStore.getState().incidents;
    },
    getById: async (id) => {
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<Incident>(`/incidents/${id}`);
        } catch {
          // fallback
        }
      }
      return useSecurityStore.getState().incidents.find(i => i.id === id);
    },
    updateStatus: async (id, status) => {
      if (liveBackendMode) {
        try {
          await fetchFromBackend(`/incidents/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
          });
        } catch (err) {
          console.warn('[SentinelApi] Live incident status update failed:', err);
        }
      }
      useSecurityStore.getState().updateIncidentStatus(id, status);
    }
  },

  response: {
    listPlaybooks: async () => {
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<ResponsePlaybook[]>('/response/playbooks');
        } catch (err) {
          console.warn('[SentinelApi] Live playbooks fetch failed:', err);
        }
      }
      return useSecurityStore.getState().playbooks;
    },
    listActions: async () => {
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<ResponseAction[]>('/response/actions');
        } catch (err) {
          console.warn('[SentinelApi] Live actions fetch failed:', err);
        }
      }
      return useSecurityStore.getState().actions;
    },
    execute: async (playbookId, actionName, target, incidentId) => {
      if (liveBackendMode) {
        try {
          const res = await fetchFromBackend<{ success: boolean; action: ResponseAction }>('/response/execute', {
            method: 'POST',
            body: JSON.stringify({ playbookId, actionName, target, incidentId })
          });
          if (res.success) {
            useSecurityStore.getState().addNotification({
              type: 'success',
              title: 'Live Action Executed',
              message: `Playbook ${actionName} applied to ${target}.`
            });
            return true;
          }
        } catch (err: any) {
          useSecurityStore.getState().addNotification({
            type: 'error',
            title: 'Policy Execution Blocked',
            message: err.message || 'Execution failed'
          });
          return false;
        }
      }
      return useSecurityStore.getState().executePlaybookAction(playbookId, actionName, target, incidentId);
    },
    rollback: async (actionId) => {
      if (liveBackendMode) {
        try {
          await fetchFromBackend(`/response/actions/${actionId}/rollback`, { method: 'POST' });
        } catch (err) {
          console.warn('[SentinelApi] Live rollback failed:', err);
        }
      }
      return useSecurityStore.getState().rollbackAction(actionId);
    }
  },

  sources: {
    list: async () => {
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<LogSource[]>('/sources');
        } catch (err) {
          console.warn('[SentinelApi] Live log sources fetch failed:', err);
        }
      }
      return useSecurityStore.getState().logSources;
    }
  },

  threatIntel: {
    list: async () => {
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<ThreatIntelIndicator[]>('/threat-intel');
        } catch (err) {
          console.warn('[SentinelApi] Live threat intel fetch failed:', err);
        }
      }
      return useSecurityStore.getState().threatIntel;
    },
    getByIp: async (ip) => {
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<ThreatIntelIndicator>(`/threat-intel/${ip}`);
        } catch {
          // fallback
        }
      }
      return useSecurityStore.getState().threatIntel.find(ti => ti.ip === ip);
    }
  },

  audit: {
    list: async () => {
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<AuditRecord[]>('/audit');
        } catch (err) {
          console.warn('[SentinelApi] Live audit trail fetch failed:', err);
        }
      }
      return useSecurityStore.getState().auditRecords;
    }
  },

  analyst: {
    query: async (prompt, contextIncidentId) => {
      if (liveBackendMode) {
        try {
          return await fetchFromBackend<{
            reply: string;
            referencedEventIds: string[];
            mitreTechniques: string[];
            recommendedPlaybookId?: string;
            confidence: number;
          }>('/analyst/query', {
            method: 'POST',
            body: JSON.stringify({ prompt, contextIncidentId })
          });
        } catch (err) {
          console.warn('[SentinelApi] Live analyst query failed, falling back:', err);
        }
      }

      // Local deterministic simulated response
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
          referencedEventIds: ['EVT-2026-SSO-001', 'EVT-2026-SSO-018', 'EVT-2026-WIN-001'],
          mitreTechniques: ['T1110.003 (Password Spraying)'],
          recommendedPlaybookId: 'PB-SPRAY-DEFENSE-02',
          confidence: 0.89
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
  },

  system: {
    getBackendUrl: () => activeBackendUrl,
    setBackendUrl: (url) => {
      activeBackendUrl = url.replace(/\/$/, '');
      localStorage.setItem('sentinel_backend_url', activeBackendUrl);
    },
    isLiveMode: () => liveBackendMode,
    setLiveMode: (enabled) => {
      liveBackendMode = enabled;
      localStorage.setItem('sentinel_live_mode', enabled ? 'true' : 'false');
    },
    pingHealth: async () => {
      try {
        const res = await fetch(`${activeBackendUrl}/health`);
        if (res.ok) {
          const details = await res.json();
          return { healthy: true, details };
        }
        return { healthy: false };
      } catch (err: any) {
        return { healthy: false, details: err.message };
      }
    }
  }
};
