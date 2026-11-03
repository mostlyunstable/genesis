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
  StreamInvestigationStep,
  UploadedFileSummary
} from '@/types';

export interface SentinelApiClient {
  chat: {
    getModel: () => Promise<{ provider: string; model: string; available: boolean }>;
    listConversations: (params?: { query?: string; limit?: number; offset?: number }) => Promise<ConversationSummary[]>;
    getConversation: (id: string) => Promise<ConversationDetail>;
    createConversation: (title?: string, contextMetadata?: Record<string, any>) => Promise<ConversationSummary>;
    updateConversation: (id: string, updates: { title?: string; isPinned?: boolean }) => Promise<ConversationSummary>;
    deleteConversation: (id: string) => Promise<{ status: string; conversationId: string }>;
    uploadFile: (conversationId: string, file: File) => Promise<UploadedFileSummary>;
    listFiles: (conversationId: string) => Promise<UploadedFileSummary[]>;
    getFile: (fileId: string) => Promise<UploadedFileSummary>;
    sendMessageSync: (id: string, message: string, contextIncidentId?: string, contextAssetId?: string, contextFileId?: string) => Promise<ChatMessage>;
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
      abortSignal?: AbortSignal,
      contextFileId?: string
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
let authPromise: Promise<string> | null = null;

async function ensureAuthToken(): Promise<string> {
  const existing = (typeof window !== 'undefined' && localStorage.getItem('sentinel_auth_token')) || '';
  if (existing) {
    authToken = existing;
    return existing;
  }
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      const res = await fetch(`${activeBackendUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'secops_analyst@genesis.ai',
          password: 'genesis_secops_2026!'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          authToken = data.access_token;
          if (typeof window !== 'undefined') {
            localStorage.setItem('sentinel_auth_token', authToken);
          }
          return authToken;
        }
      }
    } catch (e) {
      console.warn('[GENESIS Auto-Auth] Background session initialization notice:', e);
    } finally {
      authPromise = null;
    }
    return '';
  })();

  return authPromise;
}

function getAuthToken(): string {
  return authToken || (typeof window !== 'undefined' && localStorage.getItem('sentinel_auth_token')) || '';
}

async function fetchFromBackend<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${activeBackendUrl}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  let token = getAuthToken();
  if (!token && !endpoint.includes('/auth/login')) {
    token = await ensureAuthToken();
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(url, { ...options, headers });
  if (res.status === 401 && !endpoint.includes('/auth/login')) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sentinel_auth_token');
    }
    authToken = '';
    token = await ensureAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = errorData.detail?.message || errorData.detail || `HTTP Error ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json();
}

export const sentinelApi: SentinelApiClient = {
  chat: {
    getModel: () => fetchFromBackend<{ provider: string; model: string; available: boolean }>('/chat/model'),
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

    uploadFile: async (conversationId: string, file: File) => {
      const url = `${activeBackendUrl}/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/upload`;
      let token = getAuthToken();
      if (!token) token = await ensureAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: res.statusText }));
        const msg = errorData.detail?.message || errorData.detail || `Upload failed with status ${res.status}`;
        throw new Error(msg);
      }
      return await res.json() as UploadedFileSummary;
    },

    listFiles: async (conversationId: string) => {
      return await fetchFromBackend<UploadedFileSummary[]>(`/chat/conversations/${encodeURIComponent(conversationId)}/files`);
    },

    getFile: async (fileId: string) => {
      return await fetchFromBackend<UploadedFileSummary>(`/chat/files/${encodeURIComponent(fileId)}`);
    },

    sendMessageSync: async (id: string, message: string, contextIncidentId?: string, contextAssetId?: string, contextFileId?: string) => {
      return await fetchFromBackend<ChatMessage>(`/chat/conversations/${encodeURIComponent(id)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message, contextIncidentId, contextAssetId, contextFileId })
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
      abortSignal?: AbortSignal,
      contextFileId?: string
    ) => {
      const url = `${activeBackendUrl}/api/v1/chat/conversations/${encodeURIComponent(id)}/stream`;
      let token = getAuthToken();
      if (!token) token = await ensureAuthToken();
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
          contextAssetId,
          contextFileId
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
                callbacks.onToken(data.delta || data.token || '');
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
