import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { IntelligenceWorkspacePage } from '@/features/workspace/IntelligenceWorkspacePage';
import { InvestigationsPage } from '@/features/investigations/InvestigationsPage';
import { SecurityActivityPage } from '@/features/activity/SecurityActivityPage';
import { ThreatsPage } from '@/features/threats/ThreatsPage';
import { IncidentsPage } from '@/features/incidents/IncidentsPage';
import { AutonomousResponsePage } from '@/features/response/AutonomousResponsePage';
import { IntegrationsPage } from '@/features/integrations/IntegrationsPage';
import { AuditTrailPage } from '@/features/audit/AuditTrailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <IntelligenceWorkspacePage />
      },
      {
        path: 'investigations',
        element: <InvestigationsPage />
      },
      {
        path: 'activity',
        element: <SecurityActivityPage />
      },
      {
        path: 'threats',
        element: <ThreatsPage />
      },
      {
        path: 'incidents',
        element: <IncidentsPage />
      },
      {
        path: 'response',
        element: <AutonomousResponsePage />
      },
      {
        path: 'integrations',
        element: <IntegrationsPage />
      },
      {
        path: 'audit',
        element: <AuditTrailPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      // Aliases / Graceful redirects for prior routes
      {
        path: 'analyst',
        element: <Navigate to="/" replace />
      },
      {
        path: 'logs',
        element: <Navigate to="/activity" replace />
      },
      {
        path: 'detections',
        element: <Navigate to="/threats" replace />
      },
      {
        path: 'timeline',
        element: <Navigate to="/investigations" replace />
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
