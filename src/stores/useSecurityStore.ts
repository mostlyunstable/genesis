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
  Severity
} from '@/types';
import { 
  INITIAL_EVENTS, 
  INITIAL_DETECTIONS, 
  INITIAL_INCIDENTS, 
  INITIAL_PLAYBOOKS, 
  INITIAL_ACTIONS, 
  INITIAL_LOG_SOURCES, 
  INITIAL_THREAT_INTEL, 
  INITIAL_AUDIT_RECORDS, 
  INITIAL_THRESHOLDS 
} from '@/services/mock/data';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

interface SecurityState {
  // Data entities
  events: SecurityEvent[];
  detections: Detection[];
  incidents: Incident[];
  playbooks: ResponsePlaybook[];
  actions: ResponseAction[];
  logSources: LogSource[];
  threatIntel: ThreatIntelIndicator[];
  auditRecords: AuditRecord[];
  thresholds: DetectionThresholdConfig;
  
  // UI & Global Controls
  autonomousResponseGlobalEnabled: boolean;
  selectedIncidentId: string;
  selectedDetectionId: string | null;
  selectedEventId: string | null;
  notifications: ToastNotification[];
  sidebarCollapsed: boolean;
  globalSearchQuery: string;

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setGlobalSearchQuery: (query: string) => void;
  setSelectedIncidentId: (id: string) => void;
  setSelectedDetectionId: (id: string | null) => void;
  setSelectedEventId: (id: string | null) => void;
  
  // Incident & Detection workflow
  updateIncidentStatus: (incidentId: string, status: Incident['status']) => void;
  updateDetectionStatus: (detectionId: string, status: Detection['status']) => void;
  
  // Autonomous Response Execution (Simulated)
  executePlaybookAction: (
    playbookId: string, 
    actionName: string, 
    target: string, 
    incidentId?: string
  ) => Promise<boolean>;
  
  rollbackAction: (actionId: string) => Promise<boolean>;
  toggleAutonomousGlobal: () => void;
  updateThresholds: (thresholds: Partial<DetectionThresholdConfig>) => void;
  
  // Notifications
  addNotification: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  
  // Mock reset
  resetToMockDefaults: () => void;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  events: INITIAL_EVENTS,
  detections: INITIAL_DETECTIONS,
  incidents: INITIAL_INCIDENTS,
  playbooks: INITIAL_PLAYBOOKS,
  actions: INITIAL_ACTIONS,
  logSources: INITIAL_LOG_SOURCES,
  threatIntel: INITIAL_THREAT_INTEL,
  auditRecords: INITIAL_AUDIT_RECORDS,
  thresholds: INITIAL_THRESHOLDS,
  
  autonomousResponseGlobalEnabled: true,
  selectedIncidentId: 'INC-2026-0042',
  selectedDetectionId: null,
  selectedEventId: null,
  notifications: [],
  sidebarCollapsed: false,
  globalSearchQuery: '',

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
  setSelectedIncidentId: (id) => set({ selectedIncidentId: id }),
  setSelectedDetectionId: (id) => set({ selectedDetectionId: id }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),

  updateIncidentStatus: (incidentId, status) => {
    const timestamp = new Date().toISOString();
    set((state) => {
      const updatedIncidents = state.incidents.map((inc) => 
        inc.id === incidentId 
          ? { ...inc, status, updatedAt: timestamp }
          : inc
      );

      const targetInc = state.incidents.find((i) => i.id === incidentId);
      const newAudit: AuditRecord = {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp,
        category: 'POLICY_DECISION',
        action: `INCIDENT_STATUS_${status.toUpperCase()}`,
        actor: 'secops_analyst@sentinel.ai (Manual)',
        target: incidentId,
        result: 'SUCCESS',
        details: {
          previousStatus: targetInc?.status,
          newStatus: status,
          incidentTitle: targetInc?.title
        },
        isSimulated: true
      };

      return {
        incidents: updatedIncidents,
        auditRecords: [newAudit, ...state.auditRecords]
      };
    });

    get().addNotification({
      type: 'info',
      title: 'Incident Status Updated',
      message: `Incident ${incidentId} marked as ${status.toUpperCase()} (Simulated).`
    });
  },

  updateDetectionStatus: (detectionId, status) => {
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

    const timestamp = new Date().toISOString();
    const actionId = `ACT-2026-${Date.now().toString().slice(-4)}`;
    
    // Simulate brief network / executor latency
    const newAction: ResponseAction = {
      id: actionId,
      incidentId,
      playbookId,
      actionName,
      target,
      status: 'simulated_success',
      executionMode: 'simulated',
      timestamp,
      durationMs: Math.floor(Math.random() * 300) + 120,
      details: `Simulated defensive response executed: ${actionName} targeting ${target}.`,
      verificationStatus: 'verified',
      rollbackAvailable: !actionName.toLowerCase().includes('kill'),
      isSimulated: true
    };

    const newAudit: AuditRecord = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp,
      category: 'RESPONSE_EXECUTION',
      action: 'DEFENSIVE_ACTION_EXECUTED',
      actor: 'GENYSIS_AUTONOMOUS_ENGINE (Simulated)',
      target: target,
      result: 'SUCCESS',
      details: {
        actionId,
        actionName,
        playbookId,
        incidentId
      },
      isSimulated: true
    };

    // If linked to incident, update incident to 'contained'
    const updatedIncidents = incidentId 
      ? state.incidents.map(inc => inc.id === incidentId ? { ...inc, status: 'contained' as const, updatedAt: timestamp } : inc)
      : state.incidents;

    // Increment execution count on playbook
    const updatedPlaybooks = state.playbooks.map(pb => 
      pb.id === playbookId ? { ...pb, executionCount: pb.executionCount + 1 } : pb
    );

    set({
      actions: [newAction, ...state.actions],
      auditRecords: [newAudit, ...state.auditRecords],
      incidents: updatedIncidents,
      playbooks: updatedPlaybooks
    });

    get().addNotification({
      type: 'success',
      title: 'Defensive Action Executed (Simulated)',
      message: `${actionName} on ${target} verified successfully.`
    });

    return true;
  },

  rollbackAction: async (actionId) => {
    const timestamp = new Date().toISOString();
    const state = get();
    const targetAction = state.actions.find(a => a.id === actionId);

    if (!targetAction || !targetAction.rollbackAvailable) {
      get().addNotification({
        type: 'error',
        title: 'Rollback Not Available',
        message: 'This simulated defensive action cannot be rolled back or is already reverted.'
      });
      return false;
    }

    const updatedActions = state.actions.map(a =>
      a.id === actionId ? { ...a, status: 'rolled_back' as const, rollbackAvailable: false } : a
    );

    const rollbackAudit: AuditRecord = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp,
      category: 'POLICY_DECISION',
      action: 'DEFENSIVE_ACTION_ROLLED_BACK',
      actor: 'secops_analyst@sentinel.ai (Manual)',
      target: targetAction.target,
      result: 'SUCCESS',
      details: {
        originalActionId: actionId,
        actionName: targetAction.actionName
      },
      isSimulated: true
    };

    set({
      actions: updatedActions,
      auditRecords: [rollbackAudit, ...state.auditRecords]
    });

    get().addNotification({
      type: 'info',
      title: 'Action Rolled Back (Simulated)',
      message: `Reverted ${targetAction.actionName} on ${targetAction.target}.`
    });

    return true;
  },

  toggleAutonomousGlobal: () => {
    const state = get();
    const nextState = !state.autonomousResponseGlobalEnabled;
    const timestamp = new Date().toISOString();

    const audit: AuditRecord = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp,
      category: 'CONFIG_CHANGE',
      action: nextState ? 'AUTONOMOUS_RESPONSE_GLOBAL_ENABLED' : 'AUTONOMOUS_RESPONSE_GLOBAL_DISABLED',
      actor: 'secops_admin@sentinel.ai',
      target: 'AutonomousResponseGlobalSwitch',
      result: nextState ? 'INFO' : 'WARNING',
      details: {
        state: nextState ? 'ENABLED' : 'EMERGENCY_HALT'
      },
      isSimulated: true
    };

    set({
      autonomousResponseGlobalEnabled: nextState,
      auditRecords: [audit, ...state.auditRecords]
    });

    get().addNotification({
      type: nextState ? 'success' : 'warning',
      title: nextState ? 'Autonomous Defense Online' : 'EMERGENCY STOP ENGAGED',
      message: nextState 
        ? 'Autonomous defensive response engine is active (Simulated mode).'
        : 'All automated countermeasures halted immediately.'
    });
  },

  updateThresholds: (newThresholds) => {
    const timestamp = new Date().toISOString();
    set((state) => {
      const merged = { ...state.thresholds, ...newThresholds };
      const audit: AuditRecord = {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp,
        category: 'CONFIG_CHANGE',
        action: 'DETECTION_THRESHOLDS_UPDATED',
        actor: 'secops_admin@sentinel.ai',
        target: 'DetectionThresholdConfig',
        result: 'INFO',
        details: newThresholds,
        isSimulated: true
      };

      return {
        thresholds: merged,
        auditRecords: [audit, ...state.auditRecords]
      };
    });

    get().addNotification({
      type: 'success',
      title: 'Thresholds Updated',
      message: 'Detection thresholds and response policies applied (Simulated).'
    });
  },

  addNotification: (item) => {
    const notification: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
      events: INITIAL_EVENTS,
      detections: INITIAL_DETECTIONS,
      incidents: INITIAL_INCIDENTS,
      playbooks: INITIAL_PLAYBOOKS,
      actions: INITIAL_ACTIONS,
      logSources: INITIAL_LOG_SOURCES,
      threatIntel: INITIAL_THREAT_INTEL,
      auditRecords: INITIAL_AUDIT_RECORDS,
      thresholds: INITIAL_THRESHOLDS,
      autonomousResponseGlobalEnabled: true
    });
  }
}));
