import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LiveLogsPage } from '@/features/logs/LiveLogsPage';
import { ThreatDetectionPage } from '@/features/detection/ThreatDetectionPage';
import { AttackIntelligencePage } from '@/features/intelligence/AttackIntelligencePage';
import { IncidentsPage } from '@/features/incidents/IncidentsPage';
import { AIAnalystPage } from '@/features/analyst/AIAnalystPage';
import { AttackTimelinePage } from '@/features/timeline/AttackTimelinePage';
import { AutonomousResponsePage } from '@/features/response/AutonomousResponsePage';
import { PlaybooksPage } from '@/features/response/PlaybooksPage';
import { ActionHistoryPage } from '@/features/response/ActionHistoryPage';
import { LogSourcesPage } from '@/features/sources/LogSourcesPage';
import { ThreatIntelPage } from '@/features/intelligence/ThreatIntelPage';
import { AuditTrailPage } from '@/features/audit/AuditTrailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      {
        path: 'logs',
        element: <LiveLogsPage />
      },
      {
        path: 'detections',
        element: <ThreatDetectionPage />
      },
      {
        path: 'attack-intelligence',
        element: <AttackIntelligencePage />
      },
      {
        path: 'incidents',
        element: <IncidentsPage />
      },
      {
        path: 'analyst',
        element: <AIAnalystPage />
      },
      {
        path: 'timeline',
        element: <AttackTimelinePage />
      },
      {
        path: 'response',
        element: <AutonomousResponsePage />
      },
      {
        path: 'playbooks',
        element: <PlaybooksPage />
      },
      {
        path: 'action-history',
        element: <ActionHistoryPage />
      },
      {
        path: 'sources',
        element: <LogSourcesPage />
      },
      {
        path: 'threat-intel',
        element: <ThreatIntelPage />
      },
      {
        path: 'audit',
        element: <AuditTrailPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);
