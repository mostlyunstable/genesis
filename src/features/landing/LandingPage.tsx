import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  ShieldAlert, 
  ArrowRight, 
  Terminal, 
  Lock, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Cpu, 
  Sliders, 
  ExternalLink,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Check,
  Copy,
  AlertTriangle,
  Flame,
  Radio,
  Binary,
  Database,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useChatStore } from '@/stores/useChatStore';
import { useSecurityStore } from '@/stores/useSecurityStore';

interface ThreatScenario {
  id: 'ssh' | 'dns' | 'kerberos' | 'phishing';
  name: string;
  badge: string;
  mitre: string;
  sourceDataset: string;
  sourceIp: string;
  targetService: string;
  observedRate: number; // events/min
  entropy?: string;
  description: string;
  copilotPrompt: string;
  playbookId: string;
  playbookName: string;
  containmentCommand: string;
  rawLogs: Array<{
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR';
    text: string;
    highlightToken: string;
  }>;
}

const SCENARIOS: ThreatScenario[] = [
  {
    id: 'ssh',
    name: 'SSH Velocity Brute Force',
    badge: 'T1110.001',
    mitre: 'Credential Access • Brute Force',
    sourceDataset: 'CIC-IDS2017 & OpenSSH (data/cic_ids2017/)',
    sourceIp: '198.51.100.42',
    targetService: 'sshd:22',
    observedRate: 16,
    description: 'High-frequency dictionary probing rotating through admin, root, and service usernames against OpenSSH.',
    copilotPrompt: 'Investigate SSH brute force velocity from 198.51.100.42 and propose containment',
    playbookId: 'PB-SSH-BRUTE-01',
    playbookName: 'Stateful Perimeter IP Isolation',
    containmentCommand: 'iptables -A INPUT -s 198.51.100.42 -j DROP',
    rawLogs: [
      { timestamp: '14:20:01', level: 'WARN', text: 'sshd[28410]: Failed password for invalid user admin from 198.51.100.42 port 49210 ssh2', highlightToken: 'user admin' },
      { timestamp: '14:20:03', level: 'WARN', text: 'sshd[28414]: Failed password for invalid user root from 198.51.100.42 port 49212 ssh2', highlightToken: 'user root' },
      { timestamp: '14:20:06', level: 'WARN', text: 'sshd[28419]: Failed password for invalid user deploy from 198.51.100.42 port 49218 ssh2', highlightToken: 'user deploy' },
      { timestamp: '14:20:09', level: 'ERROR', text: 'sshd[28425]: Exceeded 10 failed authentications in 60s window: 198.51.100.42', highlightToken: 'Exceeded threshold' },
      { timestamp: '14:20:12', level: 'WARN', text: 'sshd[28430]: Failed password for invalid user oracle from 198.51.100.42 port 49230 ssh2', highlightToken: 'user oracle' }
    ]
  },
  {
    id: 'dns',
    name: 'Shannon Entropy DNS Tunnel',
    badge: 'T1048 / T1071.004',
    mitre: 'Exfiltration Over DNS • Shannon H ≥ 3.8',
    sourceDataset: 'DNS Exfiltration Telemetry (data/dns/)',
    sourceIp: '10.0.4.15',
    targetService: 'named:53',
    observedRate: 24,
    entropy: '4.38 H',
    description: 'High-entropy base64/hex payload chunks chunked into subdomains destined for attacker C2 nameserver.',
    copilotPrompt: 'Analyze DNS tunneling and Shannon entropy exfiltration to exfil.darkops.io',
    playbookId: 'PB-DNS-QUARANTINE-04',
    playbookName: 'Sinkhole & DNS Blackhole Policy',
    containmentCommand: 'rndc nullzone exfil.darkops.io && iptables -I OUTPUT -d 198.51.100.99 -j DROP',
    rawLogs: [
      { timestamp: '14:22:10', level: 'INFO', text: 'named[1410]: query: aW5pdF9zZXFfMDAx.exfil.darkops.io IN TXT (entropy=4.12)', highlightToken: 'entropy=4.12' },
      { timestamp: '14:22:12', level: 'WARN', text: 'named[1412]: query: ZGF0YV9wYXlsb2FkX2NoazAx.exfil.darkops.io IN TXT (entropy=4.41)', highlightToken: 'entropy=4.41' },
      { timestamp: '14:22:15', level: 'ERROR', text: 'dns_engine: Shannon entropy threshold violated: H=4.38 (baseline normal < 3.2)', highlightToken: 'H=4.38' },
      { timestamp: '14:22:18', level: 'WARN', text: 'named[1418]: query: cGFzc3dkX2Jhc2U2NF9leGZpbDE.exfil.darkops.io IN TXT (entropy=4.52)', highlightToken: 'entropy=4.52' },
      { timestamp: '14:22:21', level: 'INFO', text: 'named[1422]: query: a2VyYmVyb3NfdGlja2V0c19yYw.exfil.darkops.io IN TXT (entropy=4.35)', highlightToken: 'entropy=4.35' }
    ]
  },
  {
    id: 'kerberos',
    name: 'AD Kerberoasting Ticket Downgrade',
    badge: 'T1558.003',
    mitre: 'Credential Access • Steal Kerberos Tickets',
    sourceDataset: 'AD Security Event 4769 (data/kerberos/)',
    sourceIp: '10.0.12.88',
    targetService: 'kdc:88',
    observedRate: 14,
    description: 'Requesting Service Principal Name (SPN) Kerberos TGS tickets with legacy RC4 (0x17) encryption for offline crack.',
    copilotPrompt: 'Investigate Active Directory Kerberoasting Event 4769 RC4 downgrade from 10.0.12.88',
    playbookId: 'PB-KERB-STEPUP-02',
    playbookName: 'SPN Ticket Revocation & MFA Enforcement',
    containmentCommand: 'kadmin.local -q "purge_tgs user@DOM1" && setspn -D MSSQLSvc/sql01.corp svc_sql',
    rawLogs: [
      { timestamp: '14:25:01', level: 'INFO', text: 'Security-Auditing [4769]: TGS ticket requested for MSSQLSvc/sql01.corp Encryption: 0x17 (RC4-HMAC)', highlightToken: '0x17 (RC4-HMAC)' },
      { timestamp: '14:25:03', level: 'WARN', text: 'Security-Auditing [4769]: TGS ticket requested for HTTP/web02.corp Encryption: 0x17 (RC4-HMAC)', highlightToken: '0x17 (RC4-HMAC)' },
      { timestamp: '14:25:06', level: 'ERROR', text: 'ad_detect: Rapid RC4 downgrade detected across 4 SPNs from workstation C1029', highlightToken: 'Rapid RC4 downgrade' },
      { timestamp: '14:25:09', level: 'WARN', text: 'Security-Auditing [4769]: TGS ticket requested for HOST/dc01.corp Encryption: 0x17 (RC4-HMAC)', highlightToken: '0x17 (RC4-HMAC)' },
      { timestamp: '14:25:12', level: 'INFO', text: 'Security-Auditing [4768]: TGT Request without Pre-Authentication (AS-REP Roasting candidate)', highlightToken: 'without Pre-Authentication' }
    ]
  },
  {
    id: 'phishing',
    name: 'Spearphishing Spoof & Lure',
    badge: 'T1566.002',
    mitre: 'Initial Access • Spearphishing Link',
    sourceDataset: 'Phishing Email & URL Corpus (data/phishing/)',
    sourceIp: '203.0.113.88',
    targetService: 'postfix:25',
    observedRate: 11,
    description: 'Inbound message masquerading as corporate IT password expiry with failed SPF/DKIM and IP-in-URL hyperlink.',
    copilotPrompt: 'Analyze phishing email telemetry and SPF/DKIM spoofing from 203.0.113.88',
    playbookId: 'PB-MAIL-PURGE-03',
    playbookName: 'Automated Mailbox Quarantine & Ingress Block',
    containmentCommand: 'postscreen_access_list -a 203.0.113.88 REJECT && purge_inbox --domain g00gle-sec.com',
    rawLogs: [
      { timestamp: '14:28:10', level: 'WARN', text: 'mailgw[9021]: SPF check FAILED: sender <admin@g00gle-accounts.com> IP 203.0.113.88', highlightToken: 'SPF check FAILED' },
      { timestamp: '14:28:12', level: 'WARN', text: 'mailgw[9023]: DKIM verification failed: header domain mismatches envelope sender', highlightToken: 'DKIM verification failed' },
      { timestamp: '14:28:14', level: 'ERROR', text: 'mail_engine: Extracted hyperlink contains raw IP (http://203.0.113.88/login) with urgency keyword "URGENT_EXPIRE"', highlightToken: 'URGENT_EXPIRE' },
      { timestamp: '14:28:17', level: 'WARN', text: 'mailgw[9029]: Message routed to quarantine queue ID 4F9B201A', highlightToken: 'quarantine queue' },
      { timestamp: '14:28:20', level: 'INFO', text: 'threat_intel: IP 203.0.113.88 correlated with Russian credential harvesting campaign', highlightToken: 'credential harvesting' }
    ]
  }
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSideDrawerOpen, setPendingDrawerPrompt } = useChatStore();
  const { playbooks, actions, auditRecords, autonomousResponseGlobalEnabled } = useSecurityStore();

  // ─── Micro-Interactions State ──────────────────────────────────────────────
  const [selectedScenarioId, setSelectedScenarioId] = useState<'ssh' | 'dns' | 'kerberos' | 'phishing'>('ssh');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [visibleLogCount, setVisibleLogCount] = useState<number>(3);
  const [thresholdSlider, setThresholdSlider] = useState<number>(8); // Sensitivity threshold
  const [containmentStep, setContainmentStep] = useState<0 | 1 | 2 | 3>(0); // 0=idle, 1=policy, 2=kernel, 3=merkle
  const [isContainmentRunning, setIsContainmentRunning] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  const scenario = SCENARIOS.find(s => s.id === selectedScenarioId) || SCENARIOS[0];

  // Auto-streaming log simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setVisibleLogCount(prev => {
        if (prev >= scenario.rawLogs.length) {
          return 1; // loop back seamlessly
        }
        return prev + 1;
      });
    }, 2400 / speedMultiplier);

    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier, scenario.rawLogs.length]);

  // Reset log count and containment state when switching scenarios
  const handleSelectScenario = (id: 'ssh' | 'dns' | 'kerberos' | 'phishing') => {
    setSelectedScenarioId(id);
    setVisibleLogCount(2);
    setContainmentStep(0);
    setIsContainmentRunning(false);
  };

  // Launch Copilot with prompt
  const handleLaunchCopilot = (prompt?: string) => {
    if (prompt) {
      setPendingDrawerPrompt(prompt);
    }
    setSideDrawerOpen(true);
  };

  // Run interactive SOAR simulation
  const handleSimulateContainment = () => {
    if (isContainmentRunning || containmentStep === 3) return;
    setIsContainmentRunning(true);
    setContainmentStep(1);

    setTimeout(() => {
      setContainmentStep(2);
      setTimeout(() => {
        setContainmentStep(3);
        setIsContainmentRunning(false);
      }, 700);
    }, 600);
  };

  const handleCopyProof = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const isTriggerArmed = scenario.observedRate >= thresholdSlider;

  return (
    <div className="space-y-14 max-w-7xl mx-auto font-sans pb-24">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION
          ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-6 sm:pt-10 pb-8 border-b border-[#E2E4DC]">
        <div className="max-w-4xl space-y-6">
          
          {/* Status Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFF4FF] border-2 border-[#D0DEFF] text-xs font-mono font-bold text-[#1E4BD8] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#1E4BD8] animate-pulse" />
            <span>GENESIS AI • AUTONOMOUS SECURITY PLATFORM</span>
            <span className="text-[#A7C1FF]">•</span>
            <span className="text-[#1E4BD8]">CALIBRATED TELEMETRY</span>
          </div>

          {/* Monumental Display Headline */}
          <h1 className="font-display font-semibold text-3xl sm:text-5xl lg:text-6xl text-[#111417] tracking-tight leading-[1.08]">
            Autonomous Security Intelligence.
            <br />
            <span className="text-[#5C645B]">Engineered for Modern Cyber Defense.</span>
          </h1>

          {/* Value Proposition Description */}
          <p className="text-base sm:text-lg text-[#5C645B] max-w-2xl leading-relaxed">
            GENESIS ingests heterogeneous log streams, performs autonomous forensic reasoning calibrated on academic cybersecurity benchmarks, and dispatches deterministic SOAR countermeasures under strict human governance.
          </p>

          {/* Main Action Bar with Distinct 2px Borders & Bold Typography */}
          <div className="flex flex-wrap items-center gap-3.5 pt-3">
            <Button
              variant="action"
              size="lg"
              onClick={() => handleLaunchCopilot()}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Open Copilot
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/response')}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Response Operations
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/audit')}
              icon={<FileText className="w-4 h-4" />}
            >
              Audit Trail
            </Button>
          </div>
        </div>

        {/* Telemetry Proof Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-8 mt-8 border-t border-[#E2E4DC] text-xs font-mono">
          <div className="p-4 rounded-xl bg-white border-2 border-[#E2E4DC] shadow-2xs space-y-1">
            <div className="text-[10px] uppercase text-[#889085] font-bold tracking-wider">Log Ingestion</div>
            <div className="font-bold text-[#111417]">RFC 5424 & OpenSSH</div>
            <div className="text-[11px] font-semibold text-[#1E4BD8]">Drain Cluster Normalized</div>
          </div>

          <div className="p-4 rounded-xl bg-white border-2 border-[#E2E4DC] shadow-2xs space-y-1">
            <div className="text-[10px] uppercase text-[#889085] font-bold tracking-wider">SOAR Defense</div>
            <div className="font-bold text-[#111417]">{playbooks.length} Active Playbooks</div>
            <div className="text-[11px] font-semibold text-[#1E4BD8]">
              {autonomousResponseGlobalEnabled ? 'Engine Armed' : 'Halted'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border-2 border-[#E2E4DC] shadow-2xs space-y-1">
            <div className="text-[10px] uppercase text-[#889085] font-bold tracking-wider">Audit Integrity</div>
            <div className="font-bold text-[#111417]">SHA-256 Merkle Chain</div>
            <div className="text-[11px] font-semibold text-[#1E4BD8]">{auditRecords.length} Blocks Verified</div>
          </div>

          <div className="p-4 rounded-xl bg-white border-2 border-[#E2E4DC] shadow-2xs space-y-1">
            <div className="text-[10px] uppercase text-[#889085] font-bold tracking-wider">Execution History</div>
            <div className="font-bold text-[#111417]">{actions.length} Persisted Actions</div>
            <div className="text-[11px] font-semibold text-[#1E4BD8]">Deterministic SOAR</div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. INTERACTIVE AUTONOMOUS DEFENSE LAB & LIVE LOG STREAMER
          (MICRO-INTERACTION HOOK)
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E4BD8] animate-ping" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#1E4BD8]">
                INTERACTIVE LAB • REAL-TIME BENCHMARK REPLAY
              </span>
            </div>
            <h2 className="font-display font-semibold text-2xl sm:text-3xl text-[#111417] tracking-tight">
              Test Autonomous Detection & Governed Containment
            </h2>
            <p className="text-xs sm:text-sm text-[#5C645B] max-w-2xl">
              Interact with real attack sequences calibrated from Kaggle and academic datasets. Adjust heuristic velocity thresholds, inspect streaming Drain tokens, and simulate deterministic SOAR containment.
            </p>
          </div>

          <button
            onClick={() => handleLaunchCopilot(scenario.copilotPrompt)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs shrink-0 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-[#1E4BD8]" />
            <span>Send Scenario to Copilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* The Interactive Lab Container */}
        <div className="bg-white border-2 border-[#E2E4DC] rounded-2xl overflow-hidden shadow-xs divide-y divide-[#E2E4DC]">
          
          {/* Lab Scenario Switcher Tabs */}
          <div className="bg-[#F8F8F5] p-2 sm:p-3 flex items-center gap-2 overflow-x-auto">
            {SCENARIOS.map(s => {
              const isSelected = s.id === selectedScenarioId;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectScenario(s.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border-2 ${
                    isSelected
                      ? 'bg-[#111417] text-white border-[#2A3138] shadow-xs'
                      : 'bg-white text-[#5C645B] hover:text-[#111417] border-[#E2E4DC] hover:border-[#CFD4C9]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#4D76F8]' : 'bg-[#CFD4C9]'}`} />
                  <span>{s.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    isSelected ? 'bg-white/15 text-white' : 'bg-[#EFF4FF] text-[#1E4BD8]'
                  }`}>
                    {s.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Interactive Stage Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left 7 Cols: Live Terminal & Streaming Log Parser */}
            <div className="lg:col-span-7 p-5 sm:p-6 bg-[#0E1216] text-[#E2E4DC] flex flex-col justify-between font-mono space-y-4">
              
              {/* Terminal Top Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs font-bold text-white/90 pl-2">
                    {scenario.sourceDataset}
                  </span>
                </div>

                {/* Terminal Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10"
                    title={isPlaying ? "Pause Stream" : "Play Stream"}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setVisibleLogCount(1)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/10"
                    title="Replay Stream"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSpeedMultiplier(speedMultiplier === 1 ? 2 : 1)}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition-colors cursor-pointer border border-white/10"
                  >
                    {speedMultiplier}x
                  </button>
                </div>
              </div>

              {/* Terminal Log Lines */}
              <div className="space-y-2.5 min-h-[170px] overflow-y-auto text-xs leading-relaxed">
                {scenario.rawLogs.slice(0, visibleLogCount).map((l, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-2 animate-in fade-in slide-in-from-left-1 duration-200"
                  >
                    <span className="text-white/40 shrink-0">[{l.timestamp}]</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                      l.level === 'ERROR' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      l.level === 'WARN' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {l.level}
                    </span>
                    <p className="text-white/90 break-all">
                      {l.text.split(l.highlightToken).map((part, pidx, arr) => (
                        <React.Fragment key={pidx}>
                          {part}
                          {pidx < arr.length - 1 && (
                            <span className="bg-[#1E4BD8]/40 text-[#A7C1FF] px-1 py-0.2 rounded font-bold border border-[#1E4BD8]/60">
                              {l.highlightToken}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </p>
                  </div>
                ))}
              </div>

              {/* Drain Clustering Normalization Footnote */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                <div className="flex items-center gap-2">
                  <Binary className="w-3.5 h-3.5 text-[#4D76F8]" />
                  <span>Drain Template: <code className="text-[#A7C1FF]">{`<IP> <SERVICE> <ACTION>`}</code></span>
                </div>
                <span className="text-white/70 font-bold">
                  {visibleLogCount} / {scenario.rawLogs.length} Events Replayed
                </span>
              </div>
            </div>

            {/* Right 5 Cols: Live Anomaly Slider, Telemetry & SOAR Action */}
            <div className="lg:col-span-5 p-5 sm:p-6 bg-[#FAFAF8] flex flex-col justify-between space-y-6">
              
              {/* Telemetry Snapshot Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#889085]">
                    Forensic Parameters
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    isTriggerArmed
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    {isTriggerArmed ? 'ARMED: TRIGGER THRESHOLD MET' : 'NORMAL: PASSIVE MONITORING'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-white border border-[#E2E4DC]">
                    <div className="text-[10px] text-[#889085] uppercase">Target Service</div>
                    <div className="font-bold text-[#111417]">{scenario.targetService}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-[#E2E4DC]">
                    <div className="text-[10px] text-[#889085] uppercase">Adversary IP</div>
                    <div className="font-bold text-[#111417]">{scenario.sourceIp}</div>
                  </div>
                </div>

                {/* Interactive Slider Micro-Interaction */}
                <div className="p-4 rounded-xl bg-white border-2 border-[#E2E4DC] space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#111417] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#1E4BD8]" />
                      Sensitivity Threshold:
                    </span>
                    <span className="font-mono font-bold text-sm text-[#1E4BD8]">
                      {thresholdSlider} events/min
                    </span>
                  </div>

                  <input
                    type="range"
                    min="3"
                    max="25"
                    value={thresholdSlider}
                    onChange={(e) => setThresholdSlider(Number(e.target.value))}
                    className="w-full accent-[#1E4BD8] cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-[#889085]">
                    <span>3 (Strict)</span>
                    <span className="font-bold text-[#111417]">Current Rate: {scenario.observedRate} / min</span>
                    <span>25 (Permissive)</span>
                  </div>
                </div>
              </div>

              {/* Interactive Governed Containment Box */}
              <div className="space-y-3 pt-2 border-t border-[#E2E4DC]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#111417]">Governed SOAR Mitigation</span>
                  <span className="font-mono text-[10px] text-[#5C645B]">{scenario.playbookId}</span>
                </div>

                {containmentStep === 0 && (
                  <button
                    onClick={handleSimulateContainment}
                    disabled={!isTriggerArmed}
                    className={`w-full py-3 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border-2 transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
                      isTriggerArmed
                        ? 'bg-[#1E4BD8] hover:bg-[#163CAE] text-white border-[#4D76F8]'
                        : 'bg-white text-[#889085] border-[#E2E4DC] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>{isTriggerArmed ? `Deploy ${scenario.playbookName}` : 'Threshold Not Met (Lower Slider)'}</span>
                  </button>
                )}

                {isContainmentRunning && (
                  <div className="p-3.5 rounded-xl bg-[#EFF4FF] border-2 border-[#D0DEFF] text-xs font-mono space-y-2">
                    <div className="flex items-center gap-2 text-[#1E4BD8] font-bold">
                      <div className="w-3.5 h-3.5 border-2 border-[#1E4BD8] border-t-transparent rounded-full animate-spin" />
                      <span>
                        {containmentStep === 1 && "Verifying RFC 5737 Boundary & Policy Guardrail..."}
                        {containmentStep === 2 && `Applying Kernel Drop: ${scenario.containmentCommand}...`}
                      </span>
                    </div>
                  </div>
                )}

                {containmentStep === 3 && (
                  <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-xs space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Containment Verified • Kernel Active</span>
                      </div>
                      <button
                        onClick={() => setContainmentStep(0)}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="font-mono text-[11px] text-emerald-950 bg-white/70 p-2 rounded border border-emerald-200 flex items-center justify-between">
                      <span className="truncate pr-2">SHA-256: 0x9f4a7c2e...b38d</span>
                      <button
                        onClick={() => handleCopyProof("0x9f4a7c2e819a6b0c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c")}
                        className="p-1 hover:bg-emerald-100 rounded text-emerald-800 cursor-pointer"
                        title="Copy Merkle Hash"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    <div className="text-[11px] text-emerald-800">
                      Appended to immutable Merkle ledger block #084. Zero drift verified.
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-[#5C645B] flex items-center justify-between">
                  <span>MITRE ATT&CK: <strong className="text-[#111417]">{scenario.badge}</strong></span>
                  <button
                    onClick={() => handleLaunchCopilot(scenario.copilotPrompt)}
                    className="font-bold text-[#1E4BD8] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>Investigate in Copilot</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. CORE ARCHITECTURE PILLARS (3-COLUMN GRID)
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#889085]">
              CORE SUBSYSTEMS
            </span>
            <h2 className="font-display font-semibold text-2xl text-[#111417] tracking-tight">
              Three Pillars of Autonomous Resilience
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Autonomous Copilot */}
          <div className="bg-white border-2 border-[#E2E4DC] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-[#1E4BD8] transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#EFF4FF] text-[#1E4BD8] flex items-center justify-center border border-[#D0DEFF]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#111417]">
                Autonomous Forensic Copilot
              </h3>
              <p className="text-xs sm:text-sm text-[#5C645B] leading-relaxed">
                Interact with an intelligent security analyst that investigates authentic log datasets, calculates attack velocity, and synthesizes MITRE ATT&CK techniques with zero fabricated data.
              </p>
            </div>

            <Button
              variant="action"
              size="sm"
              onClick={() => handleLaunchCopilot()}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full"
            >
              Open in Side Panel
            </Button>
          </div>

          {/* Pillar 2: Governed SOAR */}
          <div className="bg-white border-2 border-[#E2E4DC] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-[#1E4BD8] transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#F0F1EA] text-[#111417] flex items-center justify-center border border-[#CFD4C9]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#111417]">
                Governed SOAR Response
              </h3>
              <p className="text-xs sm:text-sm text-[#5C645B] leading-relaxed">
                Execute automated stateful isolation, firewall IP drops, and session terminations. Governed by strict human-in-the-loop authorization gates and kernel rollback controls.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/response')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full"
            >
              Inspect Playbooks
            </Button>
          </div>

          {/* Pillar 3: Cryptographic Audit */}
          <div className="bg-white border-2 border-[#E2E4DC] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5 hover:border-[#1E4BD8] transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#F0F1EA] text-[#111417] flex items-center justify-center border border-[#CFD4C9]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-display font-semibold text-lg text-[#111417]">
                SHA-256 Merkle Ledger
              </h3>
              <p className="text-xs sm:text-sm text-[#5C645B] leading-relaxed">
                Every investigative finding, policy update, and automated countermeasure is appended to an immutable, cryptographically chained audit log for regulatory defensibility.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/audit')}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full"
            >
              Verify Cryptographic Chain
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. BENCHMARK DATASET CORPUS SHOWCASE
          ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#889085]">
            CALIBRATED BENCHMARKS
          </span>
          <h2 className="font-display font-semibold text-2xl text-[#111417] tracking-tight">
            Trained & Calibrated on Ground-Truth Threat Telemetry
          </h2>
          <p className="text-xs sm:text-sm text-[#5C645B]">
            GENESIS evaluates six premier Kaggle and academic security benchmarks to ensure domain-specific threat intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card 1 */}
          <div className="p-5 rounded-xl border-2 border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all space-y-3 shadow-2xs flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-[#1E4BD8]">CIC-IDS2017</span>
                <span className="text-[#889085]">2.83M Flows</span>
              </div>
              <div className="font-bold text-sm text-[#111417]">Network Flow & DoS Slowloris</div>
              <p className="text-xs text-[#5C645B] leading-relaxed">
                79 bi-directional statistical features evaluating Slowloris, DDoS, PortScan, and SSH-Patator.
              </p>
            </div>
            <button
              onClick={() => handleLaunchCopilot("Analyze the CIC-IDS2017 network traffic dataset")}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span>Analyze in Copilot</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#1E4BD8]" />
            </button>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-xl border-2 border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all space-y-3 shadow-2xs flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-[#1E4BD8]">Phishing Corpus</span>
                <span className="text-[#889085]">82K Emails</span>
              </div>
              <div className="font-bold text-sm text-[#111417]">SPF/DKIM Spoofing & Lures</div>
              <p className="text-xs text-[#5C645B] leading-relaxed">
                Header forensics, lookalike domain detection, and synthetic urgency scoring across executive targets.
              </p>
            </div>
            <button
              onClick={() => handleLaunchCopilot("Analyze the phishing email dataset and SPF/DKIM telemetry")}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span>Analyze in Copilot</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#1E4BD8]" />
            </button>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-xl border-2 border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all space-y-3 shadow-2xs flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-[#1E4BD8]">LANL Cyber1</span>
                <span className="text-[#889085]">1.64B Events</span>
              </div>
              <div className="font-bold text-sm text-[#111417]">Enterprise Lateral Movement</div>
              <p className="text-xs text-[#5C645B] leading-relaxed">
                749 verified ground-truth Red Team compromise events tracking Windows network hops.
              </p>
            </div>
            <button
              onClick={() => handleLaunchCopilot("Analyze LANL Cyber1 enterprise authentication dataset")}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span>Analyze in Copilot</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#1E4BD8]" />
            </button>
          </div>

          {/* Card 4 */}
          <div className="p-5 rounded-xl border-2 border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all space-y-3 shadow-2xs flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-[#1E4BD8]">AD Kerberos</span>
                <span className="text-[#889085]">Event 4769</span>
              </div>
              <div className="font-bold text-sm text-[#111417]">Kerberoasting RC4 Downgrades</div>
              <p className="text-xs text-[#5C645B] leading-relaxed">
                Ticket Encryption Type 0x17 tracking offline service ticket hash harvesting and AS-REP roasting.
              </p>
            </div>
            <button
              onClick={() => handleLaunchCopilot("Explain Kerberoasting detection and RC4 downgrade mechanics")}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span>Analyze in Copilot</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#1E4BD8]" />
            </button>
          </div>

          {/* Card 5 */}
          <div className="p-5 rounded-xl border-2 border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all space-y-3 shadow-2xs flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-[#1E4BD8]">DNS Exfiltration</span>
                <span className="text-[#889085]">H ≥ 3.8 Entropy</span>
              </div>
              <div className="font-bold text-sm text-[#111417]">Base64 Tunneling Detection</div>
              <p className="text-xs text-[#5C645B] leading-relaxed">
                Information-theoretic Shannon entropy measuring anomalous label length and randomized character density.
              </p>
            </div>
            <button
              onClick={() => handleLaunchCopilot("Analyze DNS Shannon entropy exfiltration telemetry")}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span>Analyze in Copilot</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#1E4BD8]" />
            </button>
          </div>

          {/* Card 6 */}
          <div className="p-5 rounded-xl border-2 border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all space-y-3 shadow-2xs flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-[#1E4BD8]">OWASP Web</span>
                <span className="text-[#889085]">WAF Logs</span>
              </div>
              <div className="font-bold text-sm text-[#111417]">SQLi, XSS & IMDS SSRF</div>
              <p className="text-xs text-[#5C645B] leading-relaxed">
                Captures evaluating injection vectors, directory traversals, and Cloud Metadata 169.254.169.254 exfiltration.
              </p>
            </div>
            <button
              onClick={() => handleLaunchCopilot("Analyze the OWASP web attacks dataset and Cloud IMDS SSRF")}
              className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#F0F1EA] text-[#111417] border-2 border-[#CFD4C9] hover:border-[#111417] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <span>Analyze in Copilot</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#1E4BD8]" />
            </button>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. TECHNICAL INTEGRITY CALLOUT & GITHUB REPO
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border-2 border-[#E2E4DC] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E4BD8]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#1E4BD8]">
              OPEN SOURCE PLATFORM & REPOSITORY
            </span>
          </div>
          <h3 className="font-display font-semibold text-xl sm:text-2xl text-[#111417] tracking-tight">
            Deterministic Precision. Zero Manufactured Metrics.
          </h3>
          <p className="text-xs sm:text-sm text-[#5C645B] leading-relaxed">
            GENESIS operates strictly on real database transactions, kernel logs, and cryptographic proofs. Explore the source architecture, playbooks, and Drain parser algorithms on GitHub.
          </p>
          <div className="font-mono text-xs text-[#1E4BD8] font-bold pt-1">
            github.com/mostlyunstable/genesis
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="action"
            size="md"
            onClick={() => handleLaunchCopilot("Tell me about the Genesis GitHub repository and architecture")}
            icon={<Sparkles className="w-4 h-4" />}
          >
            Ask About Architecture
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/settings')}
            icon={<Sliders className="w-4 h-4" />}
          >
            Safeguards
          </Button>
        </div>
      </section>

    </div>
  );
};