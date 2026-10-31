import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('--- SENTINEL AI VERIFICATION SUITE ---');

const filesToCheck = [
  'src/types/index.ts',
  'src/services/mock/data.ts',
  'src/services/api/index.ts',
  'src/stores/useSecurityStore.ts',
  'src/components/ui/Badge.tsx',
  'src/components/ui/Button.tsx',
  'src/components/ui/Card.tsx',
  'src/components/ui/Input.tsx',
  'src/components/ui/RiskScoreBadge.tsx',
  'src/components/ui/DemoModeBanner.tsx',
  'src/components/navigation/Sidebar.tsx',
  'src/components/navigation/TopNav.tsx',
  'src/components/navigation/GlobalSearchModal.tsx',
  'src/app/layouts/AppLayout.tsx',
  'src/app/router/index.tsx',
  'src/features/dashboard/DashboardPage.tsx',
  'src/features/logs/LiveLogsPage.tsx',
  'src/features/detection/ThreatDetectionPage.tsx',
  'src/features/incidents/IncidentsPage.tsx',
  'src/features/analyst/AIAnalystPage.tsx',
  'src/features/timeline/AttackTimelinePage.tsx',
  'src/features/response/AutonomousResponsePage.tsx',
  'src/features/response/PlaybooksPage.tsx',
  'src/features/response/ActionHistoryPage.tsx',
  'src/features/sources/LogSourcesPage.tsx',
  'src/features/intelligence/ThreatIntelPage.tsx',
  'src/features/intelligence/AttackIntelligencePage.tsx',
  'src/features/audit/AuditTrailPage.tsx',
  'src/features/settings/SettingsPage.tsx',
];

let allFilesExist = true;
for (const file of filesToCheck) {
  const fullPath = resolve(process.cwd(), file);
  if (!existsSync(fullPath)) {
    console.error(`[FAIL] File missing: ${file}`);
    allFilesExist = false;
  } else {
    // Check non-empty
    const content = readFileSync(fullPath, 'utf-8');
    if (content.length < 50) {
      console.error(`[FAIL] File suspiciously small: ${file}`);
      allFilesExist = false;
    }
  }
}

if (allFilesExist) {
  console.log(`[PASS] All ${filesToCheck.length} required module files verified and populated.`);
} else {
  process.exit(1);
}

// Check route parity between router and sidebar
const routerContent = readFileSync(resolve(process.cwd(), 'src/app/router/index.tsx'), 'utf-8');
const sidebarContent = readFileSync(resolve(process.cwd(), 'src/components/navigation/Sidebar.tsx'), 'utf-8');

const requiredRoutes = [
  '/',
  '/logs',
  '/detections',
  '/attack-intelligence',
  '/incidents',
  '/analyst',
  '/timeline',
  '/response',
  '/playbooks',
  '/action-history',
  '/sources',
  '/threat-intel',
  '/audit',
  '/settings'
];

for (const r of requiredRoutes) {
  const pathPart = r === '/' ? "index: true" : `path: '${r.replace('/', '')}'`;
  if (!routerContent.includes(pathPart)) {
    console.error(`[FAIL] Route not declared in router: ${r}`);
    process.exit(1);
  }
  if (!sidebarContent.includes(`path: '${r}'`)) {
    console.error(`[FAIL] Route not linked in sidebar: ${r}`);
    process.exit(1);
  }
}

console.log(`[PASS] All ${requiredRoutes.length} application routes match 1:1 between router and navigation.`);
console.log('--- ALL QUALITY GATES PASSED ---');
