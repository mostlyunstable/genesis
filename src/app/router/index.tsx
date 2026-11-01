import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { CommandCenterPage } from '@/features/command-center/CommandCenterPage';
import { ThreatsPage } from '@/features/threats/ThreatsPage';
import { SecurityEventsPage } from '@/features/events/SecurityEventsPage';
import { DetectionEnginePage } from '@/features/detection/DetectionEnginePage';
import { IncidentsPage } from '@/features/incidents/IncidentsPage';
import { AIInvestigatorPage } from '@/features/investigator/AIInvestigatorPage';
import { AutonomousResponsePage } from '@/features/response/AutonomousResponsePage';
import { AuditTrailPage } from '@/features/audit/AuditTrailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage';
import { AssetsPage } from '@/features/assets/AssetsPage';
import { MitreMatrixPage } from '@/features/mitre/MitreMatrixPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // 1. Autonomous Security Intelligence Briefing (Primary Overview)
      {
        index: true,
        element: <OverviewPage />
      },
      // Command Center View
      {
        path: 'command',
        element: <OverviewPage />
      },
      // 2. Threat Intelligence
      {
        path: 'threats',
        element: <ThreatsPage />
      },
      // 3. Security Events
      {
        path: 'events',
        element: <SecurityEventsPage />
      },
      // 4. Detection Engine
      {
        path: 'detections',
        element: <DetectionEnginePage />
      },
      // 5. Incidents
      {
        path: 'incidents',
        element: <IncidentsPage />
      },
      // 6. AI Investigator
      {
        path: 'investigator',
        element: <AIInvestigatorPage />
      },
      {
        path: 'investigations',
        element: <AIInvestigatorPage />
      },
      // 7. Response Operations
      {
        path: 'response',
        element: <AutonomousResponsePage />
      },
      // 8. Audit Trail
      {
        path: 'audit',
        element: <AuditTrailPage />
      },
      // 9. Infrastructure Assets
      {
        path: 'assets',
        element: <AssetsPage />
      },
      // 10. MITRE ATT&CK Matrix
      {
        path: 'mitre',
        element: <MitreMatrixPage />
      },
      // 11. System Configuration
      {
        path: 'settings',
        element: <SettingsPage />
      },
      // Platform / Telemetry Forwarders
      {
        path: 'integrations',
        element: <IntegrationsPage />
      },
      // Aliases & redirects for seamless compatibility
      {
        path: 'activity',
        element: <Navigate to="/events" replace />
      },
      {
        path: 'analyst',
        element: <Navigate to="/investigator" replace />
      },
      {
        path: 'logs',
        element: <Navigate to="/events" replace />
      },
      {
        path: 'timeline',
        element: <Navigate to="/investigator" replace />
      },
      {
        path: 'playbooks',
        element: <Navigate to="/response" replace />
      },
      {
        path: 'action-history',
        element: <Navigate to="/response" replace />
      },
      {
        path: 'sources',
        element: <Navigate to="/integrations" replace />
      },
      {
        path: 'threat-intel',
        element: <Navigate to="/threats" replace />
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);
