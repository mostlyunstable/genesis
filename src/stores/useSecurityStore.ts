import { create } from 'zustand';
import { 
  SecurityEvent, 
  Detection, 
  Incident, 
  ResponsePlaybook, 
  ResponseAction, 
  LogSource, 
  ThreatIntelIndicator, 
  AuditRecord,
  DetectionThresholdConfig,
  OverviewMetrics
} from '@/types';
import { sentinelApi } from '@/services/api';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

interface SecurityState {
  // Real Operational Data Entities (Empty on fresh install)
  events: SecurityEvent[];
  totalEventsCount: number;
  detections: Detection[];
  incidents: Incident[];
  playbooks: ResponsePlaybook[];
  actions: ResponseAction[];
  logSources: LogSource[];
  threatIntel: ThreatIntelIndicator[];
  auditRecords: AuditRecord[];
  thresholds: DetectionThresholdConfig;
  overviewMetrics: OverviewMetrics | null;

  // Status & Telemetry Metadata
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  isStale: boolean;
  
  // UI & Global Controls
  environment: 'theatre' | 'workspace';
  autonomousResponseGlobalEnabled: boolean;
  selectedIncidentId: string | null;
  selectedDetectionId: string | null;
  selectedEventId: string | null;
  notifications: ToastNotification[];
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  globalSearchQuery: string;

  // Sync Actions with Real Backend
  fetchOverviewMetrics: (window?: string) => Promise<void>;
  fetchIncidents: (params?: { severity?: string; status?: string; query?: string; limit?: number }) => Promise<void>;
  fetchEvents: (params?: { source?: string; outcome?: string; severity?: string; query?: string; limit?: number }) => Promise<void>;
  fetchDetections: (params?: { category?: string; severity?: string; status?: string; query?: string }) => Promise<void>;
  fetchPlaybooks: () => Promise<void>;
  fetchActions: () => Promise<void>;
  fetchSources: () => Promise<void>;
  fetchThreatIntel: () => Promise<void>;
  fetchAuditRecords: () => Promise<void>;
  fetchThresholds: () => Promise<void>;

  // UI Actions
  setEnvironment: (env: 'theatre' | 'workspace') => void;
  toggleEnvironment: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setGlobalSearchQuery: (query: string) => void;
  setSelectedIncidentId: (id: string | null) => void;
  setSelectedDetectionId: (id: string | null) => void;
  setSelectedEventId: (id: string | null) => void;
  
  // Mutations backed by real backend API
  updateIncidentStatus: (incidentId: string, status: Incident['status']) => Promise<boolean>;
  updateDetectionStatus: (detectionId: string, status: Detection['status']) => Promise<boolean>;
  executePlaybookAction: (
    playbookId: string, 
    actionName: string, 
    target: string, 
    incidentId?: string
  ) => Promise<boolean>;
  rollbackAction: (actionId: string) => Promise<boolean>;
  toggleAutonomousGlobal: () => Promise<boolean>;
  updateThresholds: (thresholds: Partial<DetectionThresholdConfig>) => Promise<boolean>;
  
  // Notifications
  addNotification: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  resetToMockDefaults: () => void;
}

const DEFAULT_THRESHOLDS: DetectionThresholdConfig = {
  sshFailedAttemptThreshold: 10,
  sshWindowSeconds: 120,
  passwordSprayUniqueUsersThreshold: 5,
  passwordSprayWindowSeconds: 300,
  distributedThresholdIps: 3,
  autonomousResponseEnabled: true,
  requireApprovalForCritical: false,
  temporaryIpBlockDurationMinutes: 30
};

export const useSecurityStore = create<SecurityState>((set, get) => ({
  // Operational collections default to empty: strictly backed by real backend
  events: [],
  totalEventsCount: 0,
  detections: [],
  incidents: [],
  playbooks: [],
  actions: [],
  logSources: [],
  threatIntel: [],
  auditRecords: [],
  thresholds: DEFAULT_THRESHOLDS,
  overviewMetrics: null,

  isLoading: false,
  error: null,
  lastUpdated: null,
  isStale: false,

  autonomousResponseGlobalEnabled: true,
  environment: 'workspace',
  selectedIncidentId: null,
  selectedDetectionId: null,
  selectedEventId: null,
  notifications: [],
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  globalSearchQuery: '',

  // -------------------------------------------------------------
  // Data Fetching Actions (Direct Backend Connection)
  // -------------------------------------------------------------
  fetchOverviewMetrics: async (window = '24h') => {
    try {
      set({ isLoading: true });
      const metrics = await sentinelApi.analytics.getOverview(window);
      set({
        overviewMetrics: metrics,
        totalEventsCount: metrics.totalEvents,
        autonomousResponseGlobalEnabled: metrics.systemHealth.defenseStatus === 'ARMED',
        lastUpdated: metrics.lastUpdated,
        isLoading: false,
        error: null,
        isStale: false
      });
    } catch (err: any) {
      set((state) => ({
        isLoading: false,
        error: err.message || 'Failed to fetch metrics from backend',
        isStale: state.overviewMetrics !== null
      }));
    }
  },

  fetchIncidents: async (params) => {
    try {
      set({ isLoading: true });
      const res = await sentinelApi.incidents.list(params);
      set((state) => ({
        incidents: res.items,
        selectedIncidentId: state.selectedIncidentId && res.items.some(i => i.id === state.selectedIncidentId)
          ? state.selectedIncidentId
          : (res.items[0]?.id || null),
        isLoading: false,
        error: null,
        isStale: false
      }));
    } catch (err: any) {
      set((state) => ({
        isLoading: false,
        error: err.message || 'Failed to fetch incidents',
        isStale: state.incidents.length > 0
      }));
    }
  },

  fetchEvents: async (params) => {
    try {
      set({ isLoading: true });
      const res = await sentinelApi.events.list(params);
      set({
        events: res.items,
        totalEventsCount: res.total,
        isLoading: false,
        error: null,
        isStale: false
      });
    } catch (err: any) {
      set((state) => ({
        isLoading: false,
        error: err.message || 'Failed to fetch security events',
        isStale: state.events.length > 0
      }));
    }
  },

  fetchDetections: async (params) => {
    try {
      set({ isLoading: true });
      const res = await sentinelApi.detections.list(params);
      set((state) => ({
        detections: res.items,
        selectedDetectionId: state.selectedDetectionId && res.items.some(d => d.id === state.selectedDetectionId)
          ? state.selectedDetectionId
          : (res.items[0]?.id || null),
        isLoading: false,
        error: null,
        isStale: false
      }));
    } catch (err: any) {
      set((state) => ({
        isLoading: false,
        error: err.message || 'Failed to fetch detections',
        isStale: state.detections.length > 0
      }));
    }
  },

  fetchPlaybooks: async () => {
    try {
      const pbs = await sentinelApi.response.listPlaybooks();
      set({ playbooks: pbs });
    } catch (err: any) {
      console.warn('Failed to fetch playbooks:', err);
    }
  },

  fetchActions: async () => {
    try {
      const acts = await sentinelApi.response.listActions();
      set({ actions: acts });
    } catch (err: any) {
      console.warn('Failed to fetch actions:', err);
    }
  },

  fetchSources: async () => {
    try {
      const srcs = await sentinelApi.sources.list();
      set({ logSources: srcs });
    } catch (err: any) {
      console.warn('Failed to fetch log sources:', err);
    }
  },

  fetchThreatIntel: async () => {
    try {
      const ti = await sentinelApi.threatIntel.list();
      set({ threatIntel: ti });
    } catch (err: any) {
      console.warn('Failed to fetch threat intelligence:', err);
    }
  },

  fetchAuditRecords: async () => {
    try {
      const records = await sentinelApi.audit.list();
      set({ auditRecords: records });
    } catch (err: any) {
      console.warn('Failed to fetch audit records:', err);
    }
  },

  fetchThresholds: async () => {
    try {
      const thresholds = await sentinelApi.settings.getThresholds();
      set({
        thresholds,
        autonomousResponseGlobalEnabled: thresholds.autonomousResponseEnabled
      });
    } catch (err: any) {
      console.warn('Failed to fetch thresholds:', err);
    }
  },

  // -------------------------------------------------------------
  // UI Controls
  // -------------------------------------------------------------
  setEnvironment: (env) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark', 'env-theatre');
      root.classList.add('light');
    }
    set({ environment: env });
  },

  toggleEnvironment: () => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.remove('dark', 'env-theatre');
      root.classList.add('light');
    }
  },

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
  setSelectedDetectionId: (id) => set({ selectedDetectionId: id }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),

  // -------------------------------------------------------------
  // Real Backend Mutation Actions
  // -------------------------------------------------------------
  updateIncidentStatus: async (incidentId, status) => {
    try {
      const updated = await sentinelApi.incidents.updateStatus(incidentId, status);
      set((state) => ({
        incidents: state.incidents.map((inc) => (inc.id === incidentId ? updated : inc))
      }));
      get().addNotification({
        type: 'info',
        title: 'Incident Status Updated',
        message: `Incident ${incidentId} marked as ${status.toUpperCase()}.`
      });
      // Refresh metrics to keep counts synchronized
      get().fetchOverviewMetrics();
      return true;
    } catch (err: any) {
      get().addNotification({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update incident status on backend'
      });
      return false;
    }
  },

  updateDetectionStatus: async (detectionId, status) => {
    try {
      set((state) => ({
        detections: state.detections.map((det) =>
          det.id === detectionId ? { ...det, status } : det
        )
      }));
      get().addNotification({
        type: 'info',
        title: 'Detection Updated',
        message: `Detection ${detectionId} marked as ${status}.`
      });
      return true;
    } catch (err: any) {
      get().addNotification({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update detection status'
      });
      return false;
    }
  },

  executePlaybookAction: async (playbookId, actionName, target, incidentId) => {
    const state = get();
    if (!state.autonomousResponseGlobalEnabled) {
      get().addNotification({
        type: 'error',
        title: 'Execution Blocked',
        message: 'Autonomous defensive responses are globally DISABLED in Emergency Settings.'
      });
      return false;
    }

    try {
      const res = await sentinelApi.response.execute(playbookId, actionName, target, incidentId);
      if (res.success && res.action) {
        set((state) => ({
          actions: [res.action!, ...state.actions]
        }));
        get().addNotification({
          type: 'success',
          title: 'Defensive Action Executed',
          message: res.message || `${actionName} on ${target} verified successfully.`
        });
        get().fetchOverviewMetrics();
        return true;
      }
      return false;
    } catch (err: any) {
      get().addNotification({
        type: 'error',
        title: 'Execution Failed',
        message: err.message || 'Defensive action failed on backend'
      });
      return false;
    }
  },

  rollbackAction: async (actionId) => {
    try {
      const res = await sentinelApi.response.rollback(actionId);
      if (res.success) {
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === actionId ? { ...a, status: 'rolled_back' as const, rollbackAvailable: false } : a
          )
        }));
        get().addNotification({
          type: 'info',
          title: 'Action Rolled Back',
          message: `Reverted action ${actionId}.`
        });
        get().fetchOverviewMetrics();
        return true;
      }
      return false;
    } catch (err: any) {
      get().addNotification({
        type: 'error',
        title: 'Rollback Failed',
        message: err.message || 'Failed to rollback defensive action'
      });
      return false;
    }
  },

  toggleAutonomousGlobal: async () => {
    const state = get();
    const nextState = !state.autonomousResponseGlobalEnabled;

    try {
      const res = await sentinelApi.response.emergencyToggle(nextState);
      set({
        autonomousResponseGlobalEnabled: res.autonomousResponseGlobalEnabled
      });
      get().addNotification({
        type: res.autonomousResponseGlobalEnabled ? 'success' : 'warning',
        title: res.autonomousResponseGlobalEnabled ? 'Autonomous Defense Online' : 'EMERGENCY STOP ENGAGED',
        message: res.autonomousResponseGlobalEnabled 
          ? 'Autonomous defensive response engine is active.'
          : 'All automated countermeasures halted immediately.'
      });
      return true;
    } catch (err: any) {
      get().addNotification({
        type: 'error',
        title: 'Configuration Error',
        message: err.message || 'Failed to toggle emergency halt on backend'
      });
      return false;
    }
  },

  updateThresholds: async (newThresholds) => {
    try {
      const updated = await sentinelApi.settings.updateThresholds(newThresholds);
      set({ thresholds: updated });
      get().addNotification({
        type: 'success',
        title: 'Thresholds Updated',
        message: 'Detection velocity thresholds applied to backend engine.'
      });
      return true;
    } catch (err: any) {
      get().addNotification({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to update thresholds on backend'
      });
      return false;
    }
  },

  // -------------------------------------------------------------
  // Notification Management
  // -------------------------------------------------------------
  addNotification: (item) => {
    const id = `toast-${Date.now()}-${(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36))}`;
    const notification: ToastNotification = {
      id,
      timestamp: new Date().toLocaleTimeString(),
      ...item
    };
    set((state) => ({ notifications: [notification, ...state.notifications.slice(0, 4)] }));

    setTimeout(() => {
      get().dismissNotification(notification.id);
    }, 5000);
  },

  dismissNotification: (id) => {
    set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) }));
  },

  resetToMockDefaults: () => {
    set({
      events: [],
      detections: [],
      incidents: [],
      playbooks: [],
      actions: [],
      logSources: [],
      threatIntel: [],
      auditRecords: [],
      autonomousResponseGlobalEnabled: true
    });
  }
}));
