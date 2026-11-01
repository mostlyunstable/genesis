import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/app/layouts/AppLayout';
import { LandingPage } from '@/features/landing/LandingPage';
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
        element: <LandingPage />
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
      // Redirect legacy paths to Landing Page
      {
        path: '*',
        element: <Navigate to="/" replace />
      }
    ]
  }
]);
