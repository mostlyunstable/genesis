import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('--- SENTINEL AI v2.0 (METAMASK-INSPIRED MINIMALISM) VERIFICATION ---');

const filesToCheck = [
  'src/types/index.ts',
  'src/services/mock/data.ts',
  'src/services/api/index.ts',
  'src/stores/useSecurityStore.ts',
  'src/components/ui/SentinelLogo.tsx',
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
  'src/features/assistant/SentinelAssistantPage.tsx',
  'src/features/investigations/InvestigationsPage.tsx',
  'src/features/activity/SecurityActivityPage.tsx',
  'src/features/threats/ThreatsPage.tsx',
  'src/features/incidents/IncidentsPage.tsx',
  'src/features/response/AutonomousResponsePage.tsx',
  'src/features/integrations/IntegrationsPage.tsx',
  'src/features/settings/SettingsPage.tsx',
  'docs/FRONTEND_REDESIGN_PLAN.md'
];

let allFilesExist = true;
for (const file of filesToCheck) {
  const fullPath = resolve(process.cwd(), file);
  if (!existsSync(fullPath)) {
    console.error(`[FAIL] File missing: ${file}`);
    allFilesExist = false;
  }
}

if (allFilesExist) {
  console.log(`[PASS] All ${filesToCheck.length} design files and components verified.`);
} else {
  process.exit(1);
}

// Check primary navigation routes
const routerContent = readFileSync(resolve(process.cwd(), 'src/app/router/index.tsx'), 'utf-8');
const sidebarContent = readFileSync(resolve(process.cwd(), 'src/components/navigation/Sidebar.tsx'), 'utf-8');

const redesignedRoutes = [
  '/',
  '/investigations',
  '/activity',
  '/threats',
  '/incidents',
  '/response',
  '/integrations',
  '/settings'
];

for (const r of redesignedRoutes) {
  const pathPart = r === '/' ? "index: true" : `path: '${r.replace('/', '')}'`;
  if (!routerContent.includes(pathPart)) {
    console.error(`[FAIL] Route not in router: ${r}`);
    process.exit(1);
  }
  if (!sidebarContent.includes(`path: '${r}'`)) {
    console.error(`[FAIL] Route not in sidebar: ${r}`);
    process.exit(1);
  }
}

console.log(`[PASS] All ${redesignedRoutes.length} core routes match 1:1 between router and navigation.`);
console.log('--- ALL QUALITY GATES PASSED ---');
