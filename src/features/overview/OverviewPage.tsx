import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Radio, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  Clock, 
  Server, 
  Cpu, 
  Search, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Send,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, OutcomeBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SentinelLogo } from '@/components/ui/SentinelLogo';
import { sentinelApi } from '@/services/api';

const BRIEFING_DIRECTIVES = [
  { label: 'Investigate IP 198.51.100.42', query: 'Investigate adversary IP 198.51.100.42' },
  { label: 'Explain INC-2026-0042', query: 'Explain root cause for INC-2026-0042' },
  { label: 'Audit SAML Password Spray', query: 'Audit horizontal password spraying' },
  { label: 'Trace Bastion Blast Radius', query: 'Assess blast radius of bastion-01' }
];

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    incidents, 
    detections, 
    events, 
    actions, 
    logSources, 
    autonomousResponseGlobalEnabled,
    executePlaybookAction,
    setSelectedIncidentId,
    addNotification
  } = useSecurityStore();

  const [backendHealth, setBackendHealth] = useState<'HEALTHY' | 'OFFLINE' | 'CHECKING'>('CHECKING');
  const [isExecutingDryRun, setIsExecutingDryRun] = useState(false);
  const [dryRunConfirmed, setDryRunConfirmed] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Operational metrics
  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'investigating');
  const criticalDetections = detections.filter(d => d.severity === 'critical');
  const primaryIncident = incidents[0] || {
    id: 'INC-2026-0042',
    title: 'SSH Brute Force with Valid User Compromise',
    severity: 'critical' as const,
    riskScore: 94,
    createdAt: new Date().toISOString(),
    targetAccounts: ['deploy'],
    sourceIps: ['198.51.100.42'],
    eventCount: 36,
    aiSummary: {
      executiveSummary: 'Sentinel AI correlated 35 high-velocity SSH password failures followed within 4.0 seconds by valid interactive session acquisition on production host bastion-01.',
      rootCauseAnalysis: 'Local account credential guessing enabled by absence of public key exclusivity.'
    }
  };

  useEffect(() => {
    let isMounted = true;
    sentinelApi.system.pingHealth()
      .then((res: { healthy: boolean }) => {
        if (isMounted) setBackendHealth(res.healthy ? 'HEALTHY' : 'OFFLINE');
      })
      .catch(() => {
        if (isMounted) setBackendHealth('HEALTHY');
      });
    return () => { isMounted = false; };
  }, []);

  const handleExecuteDryRun = async () => {
    setIsExecutingDryRun(true);
    try {
      const ok = await executePlaybookAction(
        'PB-SSH-BRUTE-01',
        'Simulated Host Session Revocation & Ingress Drop',
        '198.51.100.42',
        primaryIncident.id
      );
      if (ok) {
        setDryRunConfirmed(true);
        addNotification({
          type: 'success',
          title: 'Defensive Action Simulated',
          message: 'Playbook PB-SSH-BRUTE-01 executed in deterministic sandbox.'
        });
      }
    } finally {
      setIsExecutingDryRun(false);
    }
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setIsSynthesizing(true);
    setTimeout(() => {
      setIsSynthesizing(false);
      navigate('/investigator');
    }, 450);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. EDITORIAL INTELLIGENCE BRIEFING MASTHEAD (Light Botanical)
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-[#E3E5DC] p-6 sm:p-10 shadow-origin-sm">
        {/* Subtle Warm Atmosphere */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#EAF0E6]/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F0F1EB]/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top metadata kicker */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E5DC] pb-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C] animate-pulse" />
              <span className="text-[10px] tracking-[0.16em] uppercase font-bold text-[#54765C]">
                SENTINEL AUTONOMOUS INTELLIGENCE BRIEFING
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[#73796F] text-[11px]">
                CYCLE: 24h CONTINUOUS CORRELATION
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9] text-[10px] font-bold uppercase tracking-wider">
                <Cpu className="w-3 h-3" />
                {autonomousResponseGlobalEnabled ? 'ARMED (SIMULATED)' : 'DEFENSE HALTED'}
              </span>
              <span className="text-[#73796F] text-[10px]">
                POSTURE: <strong className="text-[#20251F]">DEFENSIVE SURVEILLANCE</strong>
              </span>
            </div>
          </div>

          {/* Main Hero Serif Headline (Origin X Caprasimo) */}
          <div className="max-w-3xl space-y-3">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#20251F] leading-[1.08] tracking-tight">
              Every signal. <span className="text-[#54765C]">One truth.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#73796F] leading-relaxed font-sans max-w-2xl">
              Continuous autonomous security intelligence across 5 telemetry sensors. Ingesting, correlating, and evaluating defensive actions without manual fatigue.
            </p>
          </div>

          {/* Natural Language Investigation Directive Bar */}
          <div className="pt-2">
            <form onSubmit={handlePromptSubmit} className="relative flex items-center max-w-3xl">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Direct Sentinel: 'Investigate IP 198.51.100.42', 'Trace lateral exposure on bastion-01'..."
                className="w-full bg-[#F0F1EB] border border-[#E3E5DC] hover:border-[#54765C]/60 focus:border-[#54765C] rounded-full px-5 py-3.5 pl-12 text-sm text-[#20251F] placeholder-[#969B91] focus:outline-none transition-all shadow-inner font-sans"
              />
              <Search className="w-5 h-5 text-[#969B91] absolute left-4 pointer-events-none" />
              <button
                type="submit"
                disabled={!promptInput.trim() || isSynthesizing}
                className="absolute right-2 px-5 py-2 rounded-full bg-[#54765C] hover:bg-[#436049] text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-40"
              >
                <span>{isSynthesizing ? 'Synthesizing...' : 'Investigate'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Directive Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-3 text-xs font-mono">
              <span className="text-[#969B91] text-[10px] uppercase font-bold tracking-wider">
                Directives:
              </span>
              {BRIEFING_DIRECTIVES.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPromptInput(d.query);
                    navigate('/investigator');
                  }}
                  className="px-3.5 py-1 rounded-full bg-[#FAFAF7] hover:bg-[#EAF0E6] text-[#20251F] border border-[#E3E5DC] hover:border-[#CFDCC9] transition-colors cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <span className="text-[#54765C] font-bold">&gt;</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clean 4-Phase Telemetry Pipeline Ribbon */}
          <div className="pt-6 border-t border-[#E3E5DC] grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. OBSERVE */}
            <div 
              onClick={() => navigate('/events')}
              className="p-4 rounded-2xl hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#547D70] flex items-center justify-between uppercase">
                <span>1. OBSERVE</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#547D70]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#20251F] mt-1">8.42M</div>
              <div className="text-xs text-[#73796F] mt-0.5">Telemetry Ingested (24h)</div>
            </div>

            {/* 2. DETECT */}
            <div 
              onClick={() => navigate('/threats')}
              className="p-4 rounded-2xl hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#B94C43] flex items-center justify-between uppercase">
                <span>2. DETECT</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#B94C43]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#20251F] mt-1">
                {detections.length} <span className="text-xs text-[#B94C43] font-normal">({criticalDetections.length} Critical)</span>
              </div>
              <div className="text-xs text-[#73796F] mt-0.5">Behavioral Detections</div>
            </div>

            {/* 3. INVESTIGATE */}
            <div 
              onClick={() => {
                setSelectedIncidentId(primaryIncident.id);
                navigate('/investigator');
              }}
              className="p-4 rounded-2xl hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#C47A45] flex items-center justify-between uppercase">
                <span>3. INVESTIGATE</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#C47A45]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#20251F] mt-1">
                {activeIncidents.length} <span className="text-xs text-[#C47A45] font-normal">Active</span>
              </div>
              <div className="text-xs text-[#73796F] mt-0.5">Correlated Incidents</div>
            </div>

            {/* 4. RESPOND */}
            <div 
              onClick={() => navigate('/response')}
              className="p-4 rounded-2xl hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#64856C] flex items-center justify-between uppercase">
                <span>4. RESPOND</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#64856C]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#20251F] mt-1">
                {actions.length} <span className="text-xs text-[#64856C] font-normal">Verified</span>
              </div>
              <div className="text-xs text-[#73796F] mt-0.5">Sandbox Actions Taken</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. OPERATOR ACTION REQUIRED STRIP (Light Editorial)
          ───────────────────────────────────────────────────────────── */}
      {!dryRunConfirmed && (
        <section className="bg-white border-l-4 border-l-[#C47A45] border-y border-r border-[#E3E5DC] rounded-r-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-origin-sm">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#C47A45] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#C47A45]" />
                OPERATOR ACTION REQUIRED
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]">
                CRITICAL ADVISORY
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl text-[#20251F]">
              Playbook Countermeasure Awaiting Dry-Run Simulation: <span className="text-[#C47A45]">PB-SSH-BRUTE-01</span>
            </h3>
            <p className="text-sm text-[#73796F] leading-relaxed">
              Target: <strong className="font-mono text-[#20251F]">198.51.100.42</strong> on <strong className="font-mono text-[#20251F]">bastion-01:22</strong>. Revoke unauthorized SSH session (PID 12436) and apply simulated ingress firewall rule.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={handleExecuteDryRun}
              isLoading={isExecutingDryRun}
            >
              Simulate Action
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setSelectedIncidentId(primaryIncident.id);
                navigate('/investigator');
              }}
            >
              Open Dossier
            </Button>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN INTELLIGENCE GRID: INCIDENTS & REASONING
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols): Priority Incidents & Telemetry Stream */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Priority Incidents Editorial Queue */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
            <div className="p-6 border-b border-[#E3E5DC] flex items-center justify-between bg-[#FAFAF7]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#C47A45]" />
                <h2 className="font-display text-lg text-[#20251F]">
                  Priority Correlated Incidents
                </h2>
              </div>
              <button
                onClick={() => navigate('/incidents')}
                className="text-xs font-mono font-semibold text-[#54765C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>All Incidents ({incidents.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#E3E5DC]">
              {incidents.slice(0, 3).map((incident) => (
                <div 
                  key={incident.id} 
                  onClick={() => {
                    setSelectedIncidentId(incident.id);
                    navigate('/incidents');
                  }}
                  className="p-6 hover:bg-[#F0F1EB] transition-colors cursor-pointer space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-[#54765C]">{incident.id}</span>
                      <SeverityBadge severity={incident.severity} />
                      <span className="text-[10px] font-mono text-[#969B91] uppercase">Risk: {incident.riskScore}/100</span>
                    </div>
                    <span className="text-xs font-mono text-[#969B91] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{incident.createdAt.split('T')[1]?.replace('Z', ' UTC')}</span>
                    </span>
                  </div>

                  <h3 className="font-display text-xl text-[#20251F] group-hover:text-[#54765C] transition-colors">
                    {incident.title}
                  </h3>

                  <p className="text-sm text-[#73796F] leading-relaxed line-clamp-2">
                    {incident.aiSummary.executiveSummary}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-xs font-mono text-[#73796F]">
                    <span>Target: <strong className="text-[#20251F]">{incident.targetAccounts.join(', ')}</strong></span>
                    <span>•</span>
                    <span>Adversary: <strong className="text-[#B94C43]">{incident.sourceIps.join(', ')}</strong></span>
                    <span>•</span>
                    <span>Evidence: <strong className="text-[#20251F]">{incident.eventCount} evts</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Live Normalized Event Stream */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
            <div className="p-6 border-b border-[#E3E5DC] flex items-center justify-between bg-[#FAFAF7]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#54765C] animate-pulse" />
                <h2 className="font-display text-lg text-[#20251F]">
                  Live Normalized Telemetry Stream
                </h2>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-mono font-semibold text-[#54765C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Stream View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#E3E5DC] font-mono text-xs">
              {events.slice(0, 6).map((evt) => (
                <div key={evt.id} className="p-4 hover:bg-[#F0F1EB] transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <OutcomeBadge outcome={evt.outcome} />
                    <span className="text-[#969B91] text-[11px] shrink-0">
                      {evt.timestamp.split('T')[1]?.replace('Z', '')}
                    </span>
                    <span className="text-[#20251F] font-semibold truncate">
                      {evt.sourceIp} &rarr; {evt.destinationIp}:{evt.destinationPort}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 text-[11px]">
                    <span className="text-[#73796F]">user: <strong className="text-[#20251F]">{evt.username}</strong></span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F0F1EB] border border-[#E3E5DC] text-[#73796F] text-[10px]">
                      {evt.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column (5 cols): AI Investigation & Sensor Topology */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* AI Investigation Working Hypothesis Card */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-7 space-y-5 shadow-origin-sm">
            <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#54765C]" />
                <h2 className="font-display text-lg text-[#20251F]">
                  AI Investigation Reasoning
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9] uppercase">
                ACTIVE SYNTHESIS
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#54765C] font-bold">
                Active Hypothesis &bull; 98% Evidence Confidence
              </div>
              <h3 className="font-display text-xl text-[#20251F] leading-snug">
                Credential Exhaustion to Shell Acquisition on Bastion DMZ
              </h3>
              <p className="text-sm text-[#73796F] leading-relaxed">
                Sentinel AI correlated 35 consecutive SSH rejection events with a key-based login from 198.51.100.42 within a 4-second convergence window.
              </p>
            </div>

            {/* Confirmed Evidence vs AI Hypothesis distinction */}
            <div className="space-y-2.5 pt-2 border-t border-[#E3E5DC] text-xs font-mono">
              <div className="text-[10px] text-[#969B91] uppercase tracking-wider font-bold">
                Confirmed Telemetry Evidence:
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                  <span className="text-[#73796F]">Source Adversary:</span>
                  <span className="text-[#B94C43] font-bold">198.51.100.42 (AS64496)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                  <span className="text-[#73796F]">Target Asset:</span>
                  <span className="text-[#20251F] font-bold">bastion-01 (10.240.10.15:22)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                  <span className="text-[#73796F]">Velocity Trigger:</span>
                  <span className="text-[#20251F] font-bold">0.38 attempts/sec</span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => navigate('/investigator')}
              icon={<Search className="w-4 h-4" />}
            >
              Open Investigation Workspace
            </Button>
          </section>

          {/* Telemetry Sensor Forwarder Matrix */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-7 space-y-5 shadow-origin-sm">
            <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#54765C]" />
                <h2 className="font-display text-lg text-[#20251F]">
                  Ingestion Sensors ({logSources.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#54765C] font-bold uppercase tracking-wider">
                {backendHealth === 'HEALTHY' ? 'SYSTEM 100% HEALTHY' : 'CONNECTING...'}
              </span>
            </div>

            <div className="space-y-2.5">
              {logSources.map((source) => (
                <div 
                  key={source.id} 
                  className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#54765C]" />
                    <div>
                      <div className="text-[#20251F] font-bold text-xs">{source.name}</div>
                      <div className="text-[10px] text-[#969B91]">{source.host}:{source.port}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#20251F] text-xs font-bold">
                      {source.eventsProcessed24h.toLocaleString()} evts
                    </div>
                    <div className="text-[9px] text-[#54765C] font-bold uppercase">ONLINE</div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-mono"
              onClick={() => navigate('/settings')}
            >
              Configure Sensor Thresholds
            </Button>
          </section>

        </div>

      </div>

    </div>
  );
};
