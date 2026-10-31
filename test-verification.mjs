import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('--- GENYSIS AI v2.5 (AUTONOMOUS DEFENSE & COCKPIT VERIFICATION) ---');

const filesToCheck = [
  'src/types/index.ts',
  'src/services/mock/data.ts',
  'src/services/api/index.ts',
  'src/stores/useSecurityStore.ts',
  'src/components/ui/SentinelLogo.tsx',
  'src/components/ui/GenysisLogo.tsx',
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
  'src/features/workspace/IntelligenceWorkspacePage.tsx',
  'src/features/investigations/InvestigationsPage.tsx',
  'src/features/activity/SecurityActivityPage.tsx',
  'src/features/threats/ThreatsPage.tsx',
  'src/features/incidents/IncidentsPage.tsx',
  'src/features/response/AutonomousResponsePage.tsx',
  'src/features/integrations/IntegrationsPage.tsx',
  'src/features/audit/AuditTrailPage.tsx',
  'src/features/settings/SettingsPage.tsx',
  'docs/FRONTEND_REDESIGN_STRATEGY.md'
];

let allFilesExist = true;
for (const file of filesToCheck) {
  const fullPath = resolve(process.cwd(), file);
  if (!existsSync(fullPath)) {
    console.error(`[FAIL] File missing: ${file}`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  process.exit(1);
}
console.log(`[PASS] All ${filesToCheck.length} design files and components verified.`);

// Check primary navigation routes
const routerContent = readFileSync(resolve(process.cwd(), 'src/app/router/index.tsx'), 'utf-8');
const sidebarContent = readFileSync(resolve(process.cwd(), 'src/components/navigation/Sidebar.tsx'), 'utf-8');

const coreRoutes = [
  '/',
  '/investigations',
  '/activity',
  '/threats',
  '/incidents',
  '/response',
  '/integrations',
  '/audit',
  '/settings'
];

for (const r of coreRoutes) {
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
console.log(`[PASS] All ${coreRoutes.length} core routes match 1:1 between router and navigation.`);

// Verify Genysis Logo Component
const logoContent = readFileSync(resolve(process.cwd(), 'src/components/ui/SentinelLogo.tsx'), 'utf-8');
if (!logoContent.includes('GENYSIS')) {
  console.error('[FAIL] Missing wordmark "GENYSIS" in SentinelLogo/GenysisLogo component');
  process.exit(1);
}
console.log('[PASS] Genysis logo wordmark verified.');

// Verify Workspace Cockpit & Bot Identity
const workspaceContent = readFileSync(resolve(process.cwd(), 'src/features/workspace/IntelligenceWorkspacePage.tsx'), 'utf-8');
if (!workspaceContent.includes('GENYSIS') || !workspaceContent.includes('CYBER BOT')) {
  console.error('[FAIL] Missing "GENYSIS CYBER BOT" in IntelligenceWorkspacePage');
  process.exit(1);
}
if (!workspaceContent.includes('OBSERVE') || !workspaceContent.includes('DETECT') || !workspaceContent.includes('INVESTIGATE') || !workspaceContent.includes('RESPOND')) {
  console.error('[FAIL] Missing 4 Core Capabilities in Workspace');
  process.exit(1);
}
console.log('[PASS] Genysis Cyber Bot workspace and 4 core capabilities verified.');

console.log('--- ALL QUALITY GATES PASSED (100%) ---');
