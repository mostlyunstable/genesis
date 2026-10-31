import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

console.log('--- SENTINEL AI v2.0 (BRAND VOICE & ARCHITECTURE VERIFICATION) ---');

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
  'docs/BRAND_VOICE.md',
  'docs/COPY_AUDIT.md'
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

// Brand Voice Quality Gates
const assistantContent = readFileSync(resolve(process.cwd(), 'src/features/assistant/SentinelAssistantPage.tsx'), 'utf-8');
if (!assistantContent.includes('AUTONOMOUS SECURITY INTELLIGENCE')) {
  console.error('[FAIL] Missing eyebrow "AUTONOMOUS SECURITY INTELLIGENCE" in Assistant page');
  process.exit(1);
}
if (!assistantContent.includes('Know what happened.') || !assistantContent.includes('Understand what happens next.')) {
  console.error('[FAIL] Missing canonical headline in Assistant page');
  process.exit(1);
}
if (!assistantContent.includes('Investigate an IP address')) {
  console.error('[FAIL] Missing prompt chip "Investigate an IP address"');
  process.exit(1);
}
if (!assistantContent.includes('Start Investigation')) {
  console.error('[FAIL] Missing primary CTA "Start Investigation"');
  process.exit(1);
}
console.log('[PASS] Assistant brand voice and headlines strictly aligned.');

// Check Investigations Page
const invContent = readFileSync(resolve(process.cwd(), 'src/features/investigations/InvestigationsPage.tsx'), 'utf-8');
if (!invContent.includes('Every signal has a story. Find it.')) {
  console.error('[FAIL] Missing subheading "Every signal has a story. Find it."');
  process.exit(1);
}
console.log('[PASS] Investigations copy verified.');

console.log('--- ALL QUALITY GATES PASSED (100%) ---');
