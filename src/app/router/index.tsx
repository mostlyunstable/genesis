import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { SecurityCopilotPage } from '@/features/copilot/SecurityCopilotPage';
import { AutonomousResponsePage } from '@/features/response/AutonomousResponsePage';
import { AuditTrailPage } from '@/features/audit/AuditTrailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <SecurityCopilotPage />
      },
      {
        path: 'copilot',
        element: <SecurityCopilotPage />
      },
      {
        path: 'response',
        element: <AutonomousResponsePage />
      },
      {
        path: 'audit',
        element: <AuditTrailPage />
      },
      {
        path: 'settings',
        element: <SettingsPage />
      },
      // Redirect legacy paths to Copilot or Response
      {
        path: '*',
        element: <Navigate to="/copilot" replace />
      }
    ]
  }
]);
