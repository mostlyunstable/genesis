import { 
  SecurityEvent, 
  Detection, 
  Incident, 
  ResponsePlaybook, 
  ResponseAction, 
  LogSource, 
  ThreatIntelIndicator, 
  AuditRecord,
  OverviewMetrics,
  EventsTimelinePoint,
  DetectionThresholdConfig,
  ConversationSummary,
  ConversationDetail,
  ChatMessage,
  EvidenceReference,
  SuggestedAction,
  StreamInvestigationStep
} from '@/types';

export interface SentinelApiClient {
  chat: {
    listConversations: (params?: { query?: string; limit?: number; offset?: number }) => Promise<ConversationSummary[]>;
    getConversation: (id: string) => Promise<ConversationDetail>;
    createConversation: (title?: string, contextMetadata?: Record<string, any>) => Promise<ConversationSummary>;
    updateConversation: (id: string, updates: { title?: string; isPinned?: boolean }) => Promise<ConversationSummary>;
    deleteConversation: (id: string) => Promise<{ status: string; conversationId: string }>;
    sendMessageSync: (id: string, message: string, contextIncidentId?: string, contextAssetId?: string) => Promise<ChatMessage>;
    streamMessage: (
      id: string,
      message: string,
      callbacks: {
        onStep?: (step: StreamInvestigationStep) => void;
        onEvidence?: (evidence: EvidenceReference[]) => void;
        onActions?: (actions: SuggestedAction[]) => void;
        onToken?: (token: string) => void;
        onDone?: (data: { messageId: string; tokenCount: number; timestamp: string }) => void;
        onError?: (err: any) => void;
      },
      contextIncidentId?: string,
      contextAssetId?: string,
      abortSignal?: AbortSignal
    ) => Promise<void>;
    confirmAction: (payload: {
      actionProposalId: string;
      confirmed: boolean;
      actionName: string;
      target: string;
      playbookId: string;
      incidentId?: string;
    }) => Promise<any>;
  };
  analytics: {
    getOverview: (window?: string) => Promise<OverviewMetrics>;
    getTimeline: (window?: string) => Promise<EventsTimelinePoint[]>;
  };
  events: {
    list: (params?: { source?: string; outcome?: string; severity?: string; query?: string; limit?: number; offset?: number }) => Promise<{ items: SecurityEvent[]; total: number }>;
    getById: (id: string) => Promise<SecurityEvent>;
  };
  detections: {
    list: (params?: { category?: string; severity?: string; status?: string; query?: string; limit?: number }) => Promise<{ items: Detection[]; total: number }>;
    getById: (id: string) => Promise<Detection>;
  };
  incidents: {
    list: (params?: { severity?: string; status?: string; query?: string; limit?: number }) => Promise<{ items: Incident[]; total: number }>;
    getById: (id: string) => Promise<Incident>;
    updateStatus: (id: string, status: Incident['status']) => Promise<Incident>;
  };
  response: {
    listPlaybooks: () => Promise<ResponsePlaybook[]>;
    listActions: () => Promise<ResponseAction[]>;
    execute: (playbookId: string, actionName: string, target: string, incidentId?: string) => Promise<{ success: boolean; message: string; action?: ResponseAction }>;
    rollback: (actionId: string) => Promise<{ success: boolean; actionId: string; status: string }>;
    emergencyToggle: (enabled: boolean) => Promise<{ autonomousResponseGlobalEnabled: boolean; status: string }>;
  };
  sources: {
    list: () => Promise<LogSource[]>;
  };
  threatIntel: {
    list: () => Promise<ThreatIntelIndicator[]>;
    getByIp: (ip: string) => Promise<ThreatIntelIndicator>;
  };
  audit: {
    list: () => Promise<AuditRecord[]>;
    verify: () => Promise<{
      verified: boolean;
      totalRecords: number;
      tamperedCount: number;
      tamperedRecords: any[];
      status: string;
      latestHash?: string;
    }>;
  };
  settings: {
    getThresholds: () => Promise<DetectionThresholdConfig>;
    updateThresholds: (thresholds: Partial<DetectionThresholdConfig>) => Promise<DetectionThresholdConfig>;
  };
  system: {
    getBackendUrl: () => string;
    setBackendUrl: (url: string) => void;
    pingHealth: () => Promise<{ healthy: boolean; details?: any }>;
  };
}

let activeBackendUrl = (typeof window !== 'undefined' && localStorage.getItem('sentinel_backend_url')) || 'http://127.0.0.1:8000';
let authToken = (typeof window !== 'undefined' && localStorage.getItem('sentinel_auth_token')) || '';

function getAuthToken(): string {
  return (typeof window !== 'undefined' && localStorage.getItem('sentinel_auth_token')) || '';
}

async function fetchFromBackend<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${activeBackendUrl}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = errorData.detail?.message || errorData.detail || `HTTP Error ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json();
}

export const sentinelApi: SentinelApiClient = {
  chat: {
    listConversations: async (params?: { query?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.query) q.append('query', params.query);
      if (params?.limit) q.append('limit', params.limit.toString());
      if (params?.offset) q.append('offset', params.offset.toString());
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return await fetchFromBackend<ConversationSummary[]>(`/chat/conversations${queryStr}`);
    },

    getConversation: async (id: string) => {
      return await fetchFromBackend<ConversationDetail>(`/chat/conversations/${encodeURIComponent(id)}`);
    },

    createConversation: async (title?: string, contextMetadata: Record<string, any> = {}) => {
      return await fetchFromBackend<ConversationSummary>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ title, contextMetadata })
      });
    },

    updateConversation: async (id: string, updates: { title?: string; isPinned?: boolean }) => {
      return await fetchFromBackend<ConversationSummary>(`/chat/conversations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },

    deleteConversation: async (id: string) => {
      return await fetchFromBackend<{ status: string; conversationId: string }>(`/chat/conversations/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    },

    sendMessageSync: async (id: string, message: string, contextIncidentId?: string, contextAssetId?: string) => {
      return await fetchFromBackend<ChatMessage>(`/chat/conversations/${encodeURIComponent(id)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message, contextIncidentId, contextAssetId })
      });
    },

    streamMessage: async (
      id: string,
      message: string,
      callbacks: {
        onStep?: (step: StreamInvestigationStep) => void;
        onEvidence?: (evidence: EvidenceReference[]) => void;
        onActions?: (actions: SuggestedAction[]) => void;
        onToken?: (token: string) => void;
        onDone?: (data: { messageId: string; tokenCount: number; timestamp: string }) => void;
        onError?: (err: any) => void;
      },
      contextIncidentId?: string,
      contextAssetId?: string,
      abortSignal?: AbortSignal
    ) => {
      const url = `${activeBackendUrl}/api/v1/chat/conversations/${encodeURIComponent(id)}/stream`;
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          contextIncidentId,
          contextAssetId
        }),
        signal: abortSignal
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: res.statusText }));
        const msg = errorData.detail?.message || errorData.detail || `Stream error ${res.status}`;
        throw new Error(msg);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported by response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const block of parts) {
            if (!block.trim()) continue;
            let eventType = 'message';
            let dataStr = '';

            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) {
                eventType = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.substring(5).trim();
              }
            }

            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (eventType === 'step' && callbacks.onStep) {
                callbacks.onStep(data);
              } else if (eventType === 'evidence' && callbacks.onEvidence) {
                callbacks.onEvidence(data.references || []);
              } else if (eventType === 'actions' && callbacks.onActions) {
                callbacks.onActions(data.actions || []);
              } else if (eventType === 'token' && callbacks.onToken) {
                callbacks.onToken(data.token || '');
              } else if (eventType === 'done' && callbacks.onDone) {
                callbacks.onDone(data);
              } else if (eventType === 'error' && callbacks.onError) {
                callbacks.onError(data);
              }
            } catch (e) {
              console.warn('Failed to parse SSE payload', dataStr, e);
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        if (callbacks.onError) {
          callbacks.onError(err);
        }
        throw err;
      }
    },

    confirmAction: async (payload: {
      actionProposalId: string;
      confirmed: boolean;
      actionName: string;
      target: string;
      playbookId: string;
      incidentId?: string;
    }) => {
      return await fetchFromBackend('/chat/actions/confirm', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  },

  analytics: {
    getOverview: async (window = '24h') => {
      return await fetchFromBackend<OverviewMetrics>(`/analytics/overview?window=${encodeURIComponent(window)}`);
    },
    getTimeline: async (window = '24h') => {
      return await fetchFromBackend<EventsTimelinePoint[]>(`/analytics/events-timeline?window=${encodeURIComponent(window)}`);
    }
  },

  events: {
    list: async (params) => {
      const queryParts: string[] = [];
      if (params?.source && params.source !== 'all') queryParts.push(`source=${encodeURIComponent(params.source)}`);
      if (params?.outcome && params.outcome !== 'all') queryParts.push(`outcome=${encodeURIComponent(params.outcome)}`);
      if (params?.severity && params.severity !== 'all') queryParts.push(`severity=${encodeURIComponent(params.severity)}`);
      if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);
      if (params?.offset) queryParts.push(`offset=${params.offset}`);
      const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
      return await fetchFromBackend<{ items: SecurityEvent[]; total: number }>(`/events${qs}`);
    },
    getById: async (id) => {
      return await fetchFromBackend<SecurityEvent>(`/events/${encodeURIComponent(id)}`);
    }
  },

  detections: {
    list: async (params) => {
      const queryParts: string[] = [];
      if (params?.category && params.category !== 'all') queryParts.push(`category=${encodeURIComponent(params.category)}`);
      if (params?.severity && params.severity !== 'all') queryParts.push(`severity=${encodeURIComponent(params.severity)}`);
      if (params?.status && params.status !== 'all') queryParts.push(`status=${encodeURIComponent(params.status)}`);
      if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);
      const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
      return await fetchFromBackend<{ items: Detection[]; total: number }>(`/detections${qs}`);
    },
    getById: async (id) => {
      return await fetchFromBackend<Detection>(`/detections/${encodeURIComponent(id)}`);
    }
  },

  incidents: {
    list: async (params) => {
      const queryParts: string[] = [];
      if (params?.severity && params.severity !== 'all') queryParts.push(`severity=${encodeURIComponent(params.severity)}`);
      if (params?.status && params.status !== 'all') queryParts.push(`status=${encodeURIComponent(params.status)}`);
      if (params?.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);
      const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
      return await fetchFromBackend<{ items: Incident[]; total: number }>(`/incidents${qs}`);
    },
    getById: async (id) => {
      return await fetchFromBackend<Incident>(`/incidents/${encodeURIComponent(id)}`);
    },
    updateStatus: async (id, status) => {
      return await fetchFromBackend<Incident>(`/incidents/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    }
  },

  response: {
    listPlaybooks: async () => {
      return await fetchFromBackend<ResponsePlaybook[]>('/response/playbooks');
    },
    listActions: async () => {
      return await fetchFromBackend<ResponseAction[]>('/response/actions');
    },
    execute: async (playbookId, actionName, target, incidentId) => {
      return await fetchFromBackend<{ success: boolean; message: string; action?: ResponseAction }>('/response/execute', {
        method: 'POST',
        body: JSON.stringify({ playbookId, actionName, target, incidentId })
      });
    },
    rollback: async (actionId) => {
      return await fetchFromBackend<{ success: boolean; actionId: string; status: string }>(`/response/actions/${encodeURIComponent(actionId)}/rollback`, {
        method: 'POST'
      });
    },
    emergencyToggle: async (enabled) => {
      return await fetchFromBackend<{ autonomousResponseGlobalEnabled: boolean; status: string }>('/response/emergency-toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled })
      });
    }
  },

  sources: {
    list: async () => {
      return await fetchFromBackend<LogSource[]>('/sources');
    }
  },

  threatIntel: {
    list: async () => {
      return await fetchFromBackend<ThreatIntelIndicator[]>('/threat-intel');
    },
    getByIp: async (ip) => {
      return await fetchFromBackend<ThreatIntelIndicator>(`/threat-intel/${encodeURIComponent(ip)}`);
    }
  },

  audit: {
    list: async () => {
      return await fetchFromBackend<AuditRecord[]>('/audit');
    },
    verify: async () => {
      return await fetchFromBackend<{
        verified: boolean;
        totalRecords: number;
        tamperedCount: number;
        tamperedRecords: any[];
        status: string;
        latestHash?: string;
      }>('/audit/verify');
    }
  },

  settings: {
    getThresholds: async () => {
      return await fetchFromBackend<DetectionThresholdConfig>('/settings/thresholds');
    },
    updateThresholds: async (thresholds) => {
      return await fetchFromBackend<DetectionThresholdConfig>('/settings/thresholds', {
        method: 'PATCH',
        body: JSON.stringify(thresholds)
      });
    }
  },

  system: {
    getBackendUrl: () => activeBackendUrl,
    setBackendUrl: (url) => {
      activeBackendUrl = url.replace(/\/$/, '');
      if (typeof window !== 'undefined') {
        localStorage.setItem('sentinel_backend_url', activeBackendUrl);
      }
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
