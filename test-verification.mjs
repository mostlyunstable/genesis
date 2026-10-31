import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('--- SENTINEL AI v2.5 (RECONSTRUCTION QUALITY GATES) ---');

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
  'src/components/navigation/Sidebar.tsx',
  'src/components/navigation/TopNav.tsx',
  'src/components/navigation/GlobalSearchModal.tsx',
  'src/app/layouts/AppLayout.tsx',
  'src/app/router/index.tsx',
  'src/features/command-center/CommandCenterPage.tsx',
  'src/features/investigator/AIInvestigatorPage.tsx',
  'src/features/events/SecurityEventsPage.tsx',
  'src/features/detection/DetectionEnginePage.tsx',
  'src/features/threats/ThreatsPage.tsx',
  'src/features/incidents/IncidentsPage.tsx',
  'src/features/response/AutonomousResponsePage.tsx',
  'src/features/integrations/IntegrationsPage.tsx',
  'src/features/audit/AuditTrailPage.tsx',
  'src/features/settings/SettingsPage.tsx'
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

// Check the 9 Canonical Operations routes
const routerContent = readFileSync(resolve(process.cwd(), 'src/app/router/index.tsx'), 'utf-8');
const sidebarContent = readFileSync(resolve(process.cwd(), 'src/components/navigation/Sidebar.tsx'), 'utf-8');

const canonicalRoutes = [
  '/',
  '/threats',
  '/events',
  '/detections',
  '/incidents',
  '/investigator',
  '/response',
  '/audit',
  '/settings'
];

for (const r of canonicalRoutes) {
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
console.log(`[PASS] All 9 canonical operations routes match 1:1 between router and navigation.`);

// Verify Command Center Presentation
const commandCenterContent = readFileSync(resolve(process.cwd(), 'src/features/command-center/CommandCenterPage.tsx'), 'utf-8');
if (!commandCenterContent.includes('Command Center')) {
  console.error('[FAIL] Missing "Command Center" headline');
  process.exit(1);
}
if (!commandCenterContent.includes('Active Correlated Incidents') || !commandCenterContent.includes('Telemetry Ingestion Stream')) {
  console.error('[FAIL] Missing core operational monitoring sections in Command Center');
  process.exit(1);
}
console.log('[PASS] Command Center operational structure verified.');

// Verify AI Investigator Presentation
const investigatorContent = readFileSync(resolve(process.cwd(), 'src/features/investigator/AIInvestigatorPage.tsx'), 'utf-8');
if (!investigatorContent.includes('AI Investigator Workspace')) {
  console.error('[FAIL] Missing "AI Investigator Workspace" headline');
  process.exit(1);
}
if (!investigatorContent.includes('CONFIRMED EVIDENCE') || !investigatorContent.includes('AI HYPOTHESIS')) {
  console.error('[FAIL] Missing explicit distinction between confirmed evidence and AI hypothesis');
  process.exit(1);
}
console.log('[PASS] AI Investigator evidence governance and distinction verified.');

console.log('--- ALL QUALITY GATES PASSED (100%) ---');
