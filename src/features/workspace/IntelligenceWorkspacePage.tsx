import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ShieldAlert, 
  Search, 
  ShieldCheck, 
  Radio, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Terminal, 
  Layers, 
  Copy, 
  Check, 
  Send,
  Sparkles,
  FileText,
  Bot,
  Flame,
  Clock,
  Shield,
  CornerDownRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';
import logoImage from '@/assets/genysis-logo.png';

interface StructuredInvestigation {
  query: string;
  findingTitle: string;
  findingSummary: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  adversaryIp: string;
  adversaryAsn: string;
  targetAsset: string;
  attackTechnique: string;
  evidenceItems: {
    key: string;
    val: string;
    note: string;
    isAdversary?: boolean;
  }[];
  referencedEvents: string[];
  attackProgression: {
    stageNumber: string;
    title: string;
    timestamp: string;
    description: string;
    status: 'OBSERVED' | 'CORRELATED' | 'INTERCEPTED';
  }[];
  mitreCodes: string[];
  recommendedPlaybookId: string;
  recommendedAction: string;
  status: 'AWAITING_APPROVAL' | 'DRY_RUN_VERIFIED';
}

const BOT_QUICK_DIRECTIVES = [
  { label: 'Investigate IP 198.51.100.42', query: 'Investigate suspicious IP 198.51.100.42' },
  { label: 'Explain INC-2026-0042', query: 'Why was INC-2026-0042 classified as critical?' },
  { label: 'Audit SAML Password Spray', query: 'Find authentication anomalies and password spraying' },
  { label: 'Trace Bastion Blast Radius', query: 'Evaluate blast radius and corporate assets affected' }
];

export const IntelligenceWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    incidents, 
    detections, 
    events, 
    actions, 
    logSources, 
    autonomousResponseGlobalEnabled, 
    executePlaybookAction, 
    addNotification,
    setSelectedIncidentId 
  } = useSecurityStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active investigation dossier managed by Genysis Autonomous Bot
  const [investigation, setInvestigation] = useState<StructuredInvestigation>({
    query: 'Investigate suspicious IP 198.51.100.42',
    findingTitle: 'Adversary Credential Exhaustion & Active Shell Compromise',
    findingSummary: 'Genysis Bot intercepted 35 consecutive SSH authentication rejections against production host bastion-01, followed within 4.0 seconds by valid interactive session creation for account "deploy" from external adversary IP 198.51.100.42. The behavioral profile confirms automated dictionary exhaustion succeeded by interactive shell access.',
    riskLevel: 'CRITICAL',
    confidence: 98,
    adversaryIp: '198.51.100.42',
    adversaryAsn: 'AS64496 (RFC 5737 Test Range)',
    targetAsset: 'bastion-01 (10.240.10.15:22)',
    attackTechnique: 'T1110.001 - Password Guessing & T1078.003 - Local Accounts',
    evidenceItems: [
      { key: 'Source Adversary', val: '198.51.100.42', note: 'AS64496 External Probe', isAdversary: true },
      { key: 'Target Ingress', val: 'bastion-01:22', note: 'Production DMZ Bastion', isAdversary: false },
      { key: 'Velocity Metric', val: '35 Rejections / 91s', note: '0.38 attempts/second peak', isAdversary: true },
      { key: 'Compromised Session', val: 'user: deploy (PID 12436)', note: 'Accepted via publickey fallback', isAdversary: true }
    ],
    referencedEvents: ['EVT-2026-SSH-001', 'EVT-2026-SSH-020', 'EVT-2026-SSH-035', 'EVT-2026-SSH-036'],
    attackProgression: [
      {
        stageNumber: '01',
        title: 'Ingress Reconnaissance & Handshake',
        timestamp: '10:15:00 UTC',
        description: 'Adversary client initiates OpenSSH 8.9p1 banner exchange against port 22.',
        status: 'OBSERVED'
      },
      {
        stageNumber: '02',
        title: 'High-Velocity Password Guessing Cycle',
        timestamp: '10:15:20 – 10:16:27 UTC',
        description: '35 invalid authentication failures targeting system accounts (root, admin, deploy).',
        status: 'CORRELATED'
      },
      {
        stageNumber: '03',
        title: 'Interactive Session Acquisition & Shell Spawn',
        timestamp: '10:16:31 UTC',
        description: 'Authentication accepted for account deploy. Remote bash process spawned under PID 12436.',
        status: 'INTERCEPTED'
      }
    ],
    mitreCodes: ['T1110.001', 'T1078.003', 'T1021.004'],
    recommendedPlaybookId: 'PB-SSH-BRUTE-01',
    recommendedAction: 'Execute Playbook PB-SSH-BRUTE-01: Terminate rogue process tree PID 12436 and inject automated iptables DROP rule for 198.51.100.42.',
    status: 'AWAITING_APPROVAL'
  });

  const [dryRunLogs, setDryRunLogs] = useState<string[]>([]);

  // Telemetry counts
  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'investigating');
  const criticalDetections = detections.filter(d => d.severity === 'critical');
  const activeSources = logSources.filter(s => s.status === 'active');
  const primaryIncident = incidents[0] || { id: 'INC-2026-0042' };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addNotification({
      type: 'info',
      title: 'Copied Telemetry ID',
      message: `${id} copied to clipboard.`
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleRunBotDirective = async (queryText: string) => {
    if (!queryText.trim() || isBotThinking) return;
    setIsBotThinking(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      const textLower = queryText.toLowerCase();

      if (textLower.includes('spray') || textLower.includes('sso') || textLower.includes('203.0')) {
        setInvestigation({
          query: queryText,
          findingTitle: 'Distributed SAML SSO Password Spray Campaign',
          findingSummary: 'Genysis Bot identified a distributed horizontal authentication spray targeting 18 corporate identities across sso-gw-02. Queries arrived at 12-second intervals, triggering Windows AD Event 4740 account lockouts with zero legitimate user tokens issued.',
          riskLevel: 'HIGH',
          confidence: 91,
          adversaryIp: '203.0.113.88',
          adversaryAsn: 'AS64497 (Tor Exit / RFC 5737)',
          targetAsset: 'sso-gw-02 (Enterprise SAML 2.0)',
          attackTechnique: 'T1110.003 - Password Spraying',
          evidenceItems: [
            { key: 'Source Adversary', val: '203.0.113.88', note: 'Tor Exit Node Proxy', isAdversary: true },
            { key: 'Target Service', val: 'sso-gw-02:443', note: 'Production Auth Gateway', isAdversary: false },
            { key: 'Target Scope', val: '18 Corporate Identities', note: 'Low-and-slow interval (12s)', isAdversary: true },
            { key: 'Compromise Status', val: '0 Tokens Issued', note: 'All attempts failed or locked', isAdversary: false }
          ],
          referencedEvents: ['EVT-2026-SSO-001', 'EVT-2026-SSO-005', 'EVT-2026-WIN-001'],
          attackProgression: [
            {
              stageNumber: '01',
              title: 'SSO Endpoint Enumeration',
              timestamp: '09:40:00 UTC',
              description: 'TLS connection established to SAML identity provider federation endpoint.',
              status: 'OBSERVED'
            },
            {
              stageNumber: '02',
              title: 'Horizontal Credential Spray',
              timestamp: '09:40:12 – 09:43:36 UTC',
              description: '18 individual account authentication attempts using single password candidate.',
              status: 'CORRELATED'
            },
            {
              stageNumber: '03',
              title: 'Threshold Lockout Interception',
              timestamp: '09:43:36 UTC',
              description: 'Active Directory lockouts triggered; automated rate-limit rule queued.',
              status: 'INTERCEPTED'
            }
          ],
          mitreCodes: ['T1110.003', 'T1078.004'],
          recommendedPlaybookId: 'PB-SPRAY-DEFENSE-02',
          recommendedAction: 'Execute Playbook PB-SPRAY-DEFENSE-02: Inject gateway rate limiting (1 req/min per IP) and enforce step-up MFA for targeted accounts.',
          status: 'AWAITING_APPROVAL'
        });
      } else if (textLower.includes('blast') || textLower.includes('radius') || textLower.includes('bastion')) {
        setInvestigation({
          query: queryText,
          findingTitle: 'Compromise Blast Radius & Lateral Asset Exposure',
          findingSummary: 'Genysis Bot evaluated topological exposure for bastion-01. Host possesses active ingress routing to 14 private VPC subnets (10.240.0.0/16). The compromised account "deploy" holds sudo privileges on Docker and possesses SSH key trust to 3 backend database nodes.',
          riskLevel: 'CRITICAL',
          confidence: 96,
          adversaryIp: '198.51.100.42',
          adversaryAsn: 'AS64496 (RFC 5737 Test Range)',
          targetAsset: 'bastion-01 (10.240.10.15)',
          attackTechnique: 'T1078.003 - Local Accounts & T1021.004 - SSH Lateral Pivot',
          evidenceItems: [
            { key: 'Compromised Host', val: 'bastion-01', note: '10.240.10.15 (us-east-1a)', isAdversary: false },
            { key: 'Exposed Subnets', val: '14 Private VPC Zones', note: 'Direct peering reachable', isAdversary: true },
            { key: 'Account Privilege', val: 'deploy (Docker + Sudo)', note: 'Interactive shell active', isAdversary: true },
            { key: 'Lateral Pivot Status', val: '0 Hops Executed', note: 'Interception active before pivot', isAdversary: false }
          ],
          referencedEvents: ['EVT-2026-SSH-036', 'EVT-2026-PAM-001'],
          attackProgression: [
            {
              stageNumber: '01',
              title: 'Ingress Breach Confirmed',
              timestamp: '10:16:31 UTC',
              description: 'Valid shell established on bastion-01 by adversary.',
              status: 'OBSERVED'
            },
            {
              stageNumber: '02',
              title: 'Identity Graph Topology Correlated',
              timestamp: '10:16:35 UTC',
              description: 'Genysis Bot mapped IAM trust boundaries across 14 subnets.',
              status: 'CORRELATED'
            },
            {
              stageNumber: '03',
              title: 'Perimeter Quarantine Recommended',
              timestamp: '10:16:40 UTC',
              description: 'Immediate session termination and host routing freeze recommended.',
              status: 'INTERCEPTED'
            }
          ],
          mitreCodes: ['T1078.003', 'T1021.004', 'T1046'],
          recommendedPlaybookId: 'PB-SSH-BRUTE-01',
          recommendedAction: 'Execute Playbook PB-SSH-BRUTE-01: Sever bastion-01 public ingress, revoke PID 12436, and invalidate active deploy SSH key.',
          status: 'AWAITING_APPROVAL'
        });
      } else {
        // Default SSH brute force
        setInvestigation({
          query: queryText,
          findingTitle: 'Adversary Credential Exhaustion & Active Shell Compromise',
          findingSummary: 'Genysis Bot intercepted 35 consecutive SSH authentication rejections against production host bastion-01, followed within 4.0 seconds by valid interactive session creation for account "deploy" from external adversary IP 198.51.100.42.',
          riskLevel: 'CRITICAL',
          confidence: 98,
          adversaryIp: '198.51.100.42',
          adversaryAsn: 'AS64496 (RFC 5737 Test Range)',
          targetAsset: 'bastion-01 (10.240.10.15:22)',
          attackTechnique: 'T1110.001 - Password Guessing & T1078.003 - Local Accounts',
          evidenceItems: [
            { key: 'Source Adversary', val: '198.51.100.42', note: 'AS64496 External Probe', isAdversary: true },
            { key: 'Target Ingress', val: 'bastion-01:22', note: 'Production DMZ Bastion', isAdversary: false },
            { key: 'Velocity Metric', val: '35 Rejections / 91s', note: '0.38 attempts/second peak', isAdversary: true },
            { key: 'Compromised Session', val: 'user: deploy (PID 12436)', note: 'Accepted via publickey fallback', isAdversary: true }
          ],
          referencedEvents: ['EVT-2026-SSH-001', 'EVT-2026-SSH-020', 'EVT-2026-SSH-035', 'EVT-2026-SSH-036'],
          attackProgression: [
            {
              stageNumber: '01',
              title: 'Ingress Reconnaissance & Handshake',
              timestamp: '10:15:00 UTC',
              description: 'Adversary client initiates OpenSSH 8.9p1 banner exchange against port 22.',
              status: 'OBSERVED'
            },
            {
              stageNumber: '02',
              title: 'High-Velocity Password Guessing Cycle',
              timestamp: '10:15:20 – 10:16:27 UTC',
              description: '35 invalid authentication failures targeting system accounts (root, admin, deploy).',
              status: 'CORRELATED'
            },
            {
              stageNumber: '03',
              title: 'Interactive Session Acquisition & Shell Spawn',
              timestamp: '10:16:31 UTC',
              description: 'Authentication accepted for account deploy. Remote bash process spawned under PID 12436.',
              status: 'INTERCEPTED'
            }
          ],
          mitreCodes: ['T1110.001', 'T1078.003', 'T1021.004'],
          recommendedPlaybookId: 'PB-SSH-BRUTE-01',
          recommendedAction: 'Execute Playbook PB-SSH-BRUTE-01: Terminate rogue process tree PID 12436 and inject automated iptables DROP rule for 198.51.100.42.',
          status: 'AWAITING_APPROVAL'
        });
      }

      setDryRunLogs([]);
    } finally {
      setIsBotThinking(false);
      setSearchQuery('');
    }
  };

  const handleExecutePolicyDryRun = async () => {
    const playbookId = investigation.recommendedPlaybookId;
    const target = investigation.adversaryIp;

    const success = await executePlaybookAction(
      playbookId,
      'Automated Countermeasure Isolation',
      target,
      'INC-2026-0042'
    );

    if (success) {
      setInvestigation(prev => ({
        ...prev,
        status: 'DRY_RUN_VERIFIED'
      }));

      setDryRunLogs([
        `[GENYSIS BOT POLICY] Evaluating defensive rule scope for playbook ${playbookId}... OK`,
        `[GUARD VERIFICATION] Target ${target} verified within sandbox boundary (RFC 5737).`,
        `[FIREWALL DISPATCH] Simulated command: iptables -A INPUT -s ${target} -j DROP`,
        `[PROCESS TERMINATION] Revoked rogue session tree PID 12436 (account: deploy)... Killed`,
        `[INSPECTION PROBE] Inbound telemetry check: 0 unauthorized packets observed in last 60 seconds.`,
        `[STATUS: DETERMINISTIC SUCCESS] Defense validated and logged in cryptographic audit trail.`
      ]);

      addNotification({
        type: 'success',
        title: 'Genysis Bot Policy Verified',
        message: `Autonomous countermeasure against ${target} successfully executed in dry-run mode.`
      });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. AUTONOMOUS BOT COMMAND COCKPIT (HERO SECTION)
          Unmistakable autonomous cyber bot identity:
          Emblem + Live Cognitive State + Command Bar + Telemetry Ribbon
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#0B0F19] border border-[#1A2333] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        {/* Subtle Cyber Glow Backgrounds */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3B82F6]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#F97316]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Row: Bot Identity + Operational Status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1A2333] pb-6">
            <div className="flex items-center gap-4">
              {/* Glowing Genysis Hexagonal Bot Emblem */}
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-[#06080D] border border-[#F97316]/50 p-2.5 flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.35)] group">
                <img 
                  src={logoImage} 
                  alt="Genysis Autonomous Bot" 
                  className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(249,115,22,0.7)] transition-transform duration-300 group-hover:scale-105" 
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] ring-2 ring-[#0B0F19] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
                    AUTONOMOUS SECURITY BOT
                  </span>
                  <span className="text-[#64748B]">•</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 uppercase">
                    ACTIVE MONITORING
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 font-sans">
                  GENYSIS <span className="text-[#F97316]">CYBER BOT</span>
                </h1>
              </div>
            </div>

            {/* Cognitive State Telemetry */}
            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="px-3.5 py-2 rounded-xl bg-[#06080D] border border-[#1A2333] flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-[#3B82F6] animate-pulse" />
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase">Forwarders</div>
                  <div className="text-white font-bold">{activeSources.length} Active Streams</div>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-[#06080D] border border-[#1A2333] flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-[#F97316]" />
                <div>
                  <div className="text-[10px] text-[#64748B] uppercase">Engine State</div>
                  <div className="text-[#F97316] font-bold">ARMED (Lab Mode)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Bot Directives Prompt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8] font-medium flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#3B82F6]" />
                Direct the autonomous bot to investigate, correlate, or simulate countermeasures:
              </span>
              <span className="text-[11px] font-mono text-[#64748B] hidden sm:inline">
                Natural Language • Real-Time Correlation
              </span>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleRunBotDirective(searchQuery);
              }}
              className="relative flex items-center"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask Genysis Bot: 'Investigate IP 198.51.100.42', 'Trace attack progression', 'Audit SAML spraying'..."
                className="w-full bg-[#06080D] border border-[#1E293B] hover:border-[#3B82F6]/60 rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] transition-all font-sans shadow-inner"
              />
              <Search className="w-5 h-5 text-[#64748B] absolute left-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={!searchQuery.trim() || isBotThinking}
                className="absolute right-2.5 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>{isBotThinking ? 'Thinking...' : 'Instruct Bot'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Directive Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs font-mono">
              <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider">Directives:</span>
              {BOT_QUICK_DIRECTIVES.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleRunBotDirective(d.query)}
                  className="px-3 py-1 rounded-full bg-[#121826] hover:bg-[#1A2337] text-slate-300 hover:text-white border border-[#1E293B] hover:border-[#3B82F6]/50 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span className="text-[#3B82F6]">&gt;</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clean Telemetry Pipeline Ribbon (OBSERVE • DETECT • INVESTIGATE • RESPOND) 
              Rendered cleanly as a single seamless strip, NOT chunky detached boxes! */}
          <div className="pt-4 border-t border-[#1A2333] grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. OBSERVE */}
            <div 
              onClick={() => navigate('/activity')}
              className="group cursor-pointer p-3 rounded-xl hover:bg-[#121826] transition-colors"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#3B82F6] flex items-center justify-between uppercase">
                <span>1. OBSERVE</span>
                <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#3B82F6] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-xl font-mono font-bold text-white mt-1">8,421,940</div>
              <div className="text-xs text-[#94A3B8]">Telemetry Ingested (24h)</div>
            </div>

            {/* 2. DETECT */}
            <div 
              onClick={() => navigate('/threats')}
              className="group cursor-pointer p-3 rounded-xl hover:bg-[#121826] transition-colors"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#EF4444] flex items-center justify-between uppercase">
                <span>2. DETECT</span>
                <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#EF4444] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-xl font-mono font-bold text-white mt-1">
                {detections.length} <span className="text-xs text-[#EF4444] font-normal">({criticalDetections.length} Critical)</span>
              </div>
              <div className="text-xs text-[#94A3B8]">Behavioral Threats Identified</div>
            </div>

            {/* 3. INVESTIGATE */}
            <div 
              onClick={() => {
                setSelectedIncidentId(primaryIncident.id);
                navigate('/investigations');
              }}
              className="group cursor-pointer p-3 rounded-xl hover:bg-[#121826] transition-colors"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#F97316] flex items-center justify-between uppercase">
                <span>3. INVESTIGATE</span>
                <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#F97316] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-xl font-mono font-bold text-white mt-1">
                {activeIncidents.length} <span className="text-xs text-[#F97316] font-normal">Correlated</span>
              </div>
              <div className="text-xs text-[#94A3B8]">Active Security Incidents</div>
            </div>

            {/* 4. RESPOND */}
            <div 
              onClick={() => navigate('/response')}
              className="group cursor-pointer p-3 rounded-xl hover:bg-[#121826] transition-colors"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#10B981] flex items-center justify-between uppercase">
                <span>4. RESPOND</span>
                <ArrowRight className="w-3 h-3 text-[#64748B] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-xl font-mono font-bold text-white mt-1">
                {actions.length} <span className="text-xs text-[#10B981] font-normal">Actions</span>
              </div>
              <div className="text-xs text-[#94A3B8]">Defensive Countermeasures</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. URGENT OPERATOR ACTION BANNER (When Playbook Pending)
          Clean, bold, non-boxy alert strip
          ───────────────────────────────────────────────────────────── */}
      {investigation.status === 'AWAITING_APPROVAL' && (
        <section className="bg-[#0B0F19] border-l-4 border-l-[#F97316] border-y border-r border-[#1A2333] rounded-r-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-[#F97316] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#F97316]" />
                OPERATOR ACTION REQUIRED
              </span>
              <span className="text-xs font-mono font-bold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded">
                CRITICAL THREAT
              </span>
            </div>
            <h2 className="text-base font-bold text-white font-sans">
              Autonomous Countermeasure Queued: <span className="font-mono text-[#F97316]">{investigation.recommendedPlaybookId}</span>
            </h2>
            <p className="text-xs text-slate-300 font-sans">
              Isolate adversary <strong className="font-mono text-white">{investigation.adversaryIp}</strong> and terminate unauthorized remote session on <strong className="font-mono text-white">{investigation.targetAsset}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={handleExecutePolicyDryRun}
            >
              Execute Policy Dry Run
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedIncidentId('INC-2026-0042');
                navigate('/investigations');
              }}
            >
              Inspect Full Dossier
            </Button>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. GENYSIS BOT INTELLIGENCE DOSSIER & ATTACK SEQUENCE
          Clean editorial layout: NO nested card boxes!
          Divided with clean lines and generous typographic contrast.
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#0B0F19] border border-[#1A2333] rounded-2xl overflow-hidden shadow-xl">
        {/* Dossier Header */}
        <div className="p-6 sm:p-8 border-b border-[#1A2333] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#080C14]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#3B82F6]">
              <FileText className="w-3.5 h-3.5" />
              <span>GENYSIS BOT ACTIVE INVESTIGATION DOSSIER</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 font-sans">
              {investigation.findingTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
            <span className={`px-3 py-1 rounded-full font-bold ${
              investigation.riskLevel === 'CRITICAL' 
                ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30' 
                : 'bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30'
            }`}>
              {investigation.riskLevel} RISK
            </span>
            <span className="px-3 py-1 rounded-full bg-[#3B82F6]/15 text-[#38BDF8] border border-[#3B82F6]/30 font-bold">
              {investigation.confidence}% AI Confidence
            </span>
          </div>
        </div>

        {/* Dossier Content: Spacious, Clean, Accessible */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Executive Bot Finding Summary (Large, high-contrast, perfectly readable) */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#64748B]">
              BOT SUMMARY &amp; ROOT CAUSE ANALYSIS
            </div>
            <p className="text-base sm:text-lg text-slate-100 font-sans leading-relaxed">
              {investigation.findingSummary}
            </p>
          </div>

          {/* Key Evidence Breakdown (Clean metric ribbon, NOT chunky nested cards) */}
          <div className="pt-6 border-t border-[#1A2333] space-y-3">
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#64748B]">
              CORRELATED ADVERSARY &amp; TARGET METRICS
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {investigation.evidenceItems.map((item, idx) => (
                <div key={idx} className="pb-3 border-b sm:border-b-0 sm:border-r border-[#1A2333] last:border-0 pr-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B]">{item.key}</div>
                  <div className={`text-base font-mono font-bold mt-1 truncate ${item.isAdversary ? 'text-[#F97316]' : 'text-white'}`}>
                    {item.val}
                  </div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Attack Progression Sequence (Vertical linear timeline with clean step numbers) */}
          <div className="pt-6 border-t border-[#1A2333] space-y-4">
            <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-[#64748B]">
              CHRONOLOGICAL ATTACK PROGRESSION STAGES
            </div>

            <div className="space-y-4 pt-2">
              {investigation.attackProgression.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  {/* Step Badge */}
                  <div className="w-8 h-8 rounded-lg bg-[#06080D] border border-[#1E293B] flex items-center justify-center shrink-0 font-mono text-xs font-bold text-[#3B82F6]">
                    {step.stageNumber}
                  </div>

                  {/* Step Description */}
                  <div className="flex-1 pb-4 border-b border-[#1A2333] last:border-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-white font-sans">{step.title}</h4>
                      <div className="flex items-center gap-2 font-mono text-xs text-[#64748B]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{step.timestamp}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          step.status === 'INTERCEPTED' ? 'bg-[#F97316]/20 text-[#F97316]' : 'bg-[#3B82F6]/20 text-[#38BDF8]'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-sans">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MITRE ATT&CK & Telemetry Event References */}
          <div className="pt-6 border-t border-[#1A2333] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="text-[#64748B] text-[10px] uppercase tracking-wider font-bold">Referenced Events:</span>
              {investigation.referencedEvents.map((eid) => (
                <button
                  key={eid}
                  type="button"
                  onClick={() => copyToClipboard(eid, eid)}
                  className="px-2.5 py-1 rounded-md bg-[#06080D] hover:bg-[#121826] border border-[#1A2333] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <span>{eid}</span>
                  {copiedId === eid ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="text-[#64748B] text-[10px] uppercase tracking-wider font-bold">MITRE ATT&amp;CK:</span>
              {investigation.mitreCodes.map((code) => (
                <span key={code} className="px-2.5 py-1 rounded-md bg-[#3B82F6]/10 border border-[#3B82F6]/25 text-[#38BDF8] text-xs font-semibold">
                  {code}
                </span>
              ))}
            </div>
          </div>

          {/* Dry Run Deterministic Execution Output Log */}
          {dryRunLogs.length > 0 && (
            <div className="p-5 rounded-xl bg-[#06080D] border border-[#10B981]/30 font-mono text-xs space-y-2 animate-in fade-in-0 duration-150">
              <div className="flex items-center justify-between border-b border-[#1A2333] pb-2 text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  DETERMINISTIC VERIFICATION TELEMETRY LOG
                </span>
                <span className="text-[#64748B]">RFC 5737 Boundary Confirmed</span>
              </div>
              <div className="space-y-1 pt-1">
                {dryRunLogs.map((log, index) => (
                  <div key={index} className="text-slate-300 text-xs leading-relaxed flex items-start gap-2">
                    <span className="text-[#3B82F6] font-bold select-none">&gt;</span>
                    <span className={log.includes('SUCCESS') ? 'text-[#10B981] font-bold' : log.includes('DROP') ? 'text-[#F97316]' : ''}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Countermeasure Execution Bar */}
          <div className="pt-6 border-t border-[#1A2333] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold text-[#F97316] uppercase tracking-[0.14em]">
                POLICY-APPROVED DEFENSIVE ACTION
              </div>
              <p className="text-sm sm:text-base font-semibold text-white font-sans">
                {investigation.recommendedAction}
              </p>
            </div>

            {investigation.status === 'AWAITING_APPROVAL' ? (
              <Button
                variant="primary"
                size="md"
                icon={<ShieldCheck className="w-4 h-4" />}
                onClick={handleExecutePolicyDryRun}
                className="shrink-0"
              >
                Execute Policy Dry Run
              </Button>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-xs font-mono font-bold shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span>COUNTERMEASURE VERIFIED • ZERO REPEAT PACKETS</span>
              </div>
            )}
          </div>

        </div>
      </section>

    </div>
  );
};
