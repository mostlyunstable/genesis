import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Radio, 
  Zap, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  ExternalLink,
  Layers,
  Terminal,
  Clock,
  Sparkles,
  RefreshCw,
  Server
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, OutcomeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const CommandCenterPage: React.FC = () => {
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

  const [isExecutingDryRun, setIsExecutingDryRun] = useState(false);
  const [dryRunConfirmed, setDryRunConfirmed] = useState(false);

  // Operational metrics
  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'investigating');
  const criticalDetections = detections.filter(d => d.severity === 'critical');
  const highDetections = detections.filter(d => d.severity === 'warning');
  const activeSources = logSources.filter(s => s.status === 'active');
  const primaryIncident = incidents[0] || { id: 'INC-2026-0042', title: 'SSH Brute Force with Valid User Compromise' };

  const handleSimulateApproval = async () => {
    setIsExecutingDryRun(true);
    try {
      const ok = await executePlaybookAction(
        'PB-SSH-BRUTE-01',
        'Simulated Host Session Revocation & Ingress Drop',
        '198.51.100.42',
        'INC-2026-0042'
      );
      if (ok) {
        setDryRunConfirmed(true);
        addNotification({
          type: 'success',
          title: 'Countermeasure Dry Run Executed',
          message: 'Playbook PB-SSH-BRUTE-01 verified in deterministic sandbox.'
        });
      }
    } finally {
      setIsExecutingDryRun(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. OPERATIONAL HEALTH & SURVEILLANCE HUD
          High-density single-ribbon status: Ingestion, Engine, Threat State
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#38BDF8]">
              OPERATIONAL SURVEILLANCE ACTIVE
            </span>
            <span className="text-[#64748B]">•</span>
            <span className="text-[10px] font-mono text-[#94A3B8]">SENTINEL ENGINE v2.5</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Command Center
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Continuous autonomous monitoring across 5 forwarders. Zero unverified defensive actions permitted.
          </p>
        </div>

        {/* Real-time Health Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 font-mono text-xs">
          <div className="px-3.5 py-2 rounded-lg bg-[#07080B] border border-[#1C2230]">
            <div className="text-[10px] text-[#64748B] uppercase">Ingestion Stream</div>
            <div className="text-white font-bold text-sm mt-0.5">8.42M <span className="text-[10px] font-normal text-[#94A3B8]">/ 24h</span></div>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-[#07080B] border border-[#1C2230]">
            <div className="text-[10px] text-[#64748B] uppercase">Active Sensors</div>
            <div className="text-[#38BDF8] font-bold text-sm mt-0.5">{activeSources.length} <span className="text-[10px] font-normal text-[#94A3B8]">Online</span></div>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-[#07080B] border border-[#1C2230]">
            <div className="text-[10px] text-[#64748B] uppercase">Detections</div>
            <div className="text-[#EF4444] font-bold text-sm mt-0.5">{criticalDetections.length} <span className="text-[10px] font-normal text-[#94A3B8]">Critical</span></div>
          </div>
          <div className="px-3.5 py-2 rounded-lg bg-[#07080B] border border-[#1C2230]">
            <div className="text-[10px] text-[#64748B] uppercase">Policy Engine</div>
            <div className="text-[#F97316] font-bold text-sm mt-0.5">
              {autonomousResponseGlobalEnabled ? 'ARMED (Lab)' : 'HALTED'}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. OPERATOR ACTION REQUIRED: POLICY APPROVAL STRIP
          Appears prominently when a critical countermeasure awaits sign-off
          ───────────────────────────────────────────────────────────── */}
      {!dryRunConfirmed && (
        <section className="bg-[#10131B] border-l-4 border-l-[#F97316] border-y border-r border-[#1C2230] rounded-r-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#F97316] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#F97316]" />
                OPERATOR ACTION REQUIRED
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                CRITICAL THREAT
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white font-sans">
              Playbook Countermeasure Awaiting Dry-Run Simulation: <span className="font-mono text-[#F97316]">PB-SSH-BRUTE-01</span>
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Target: <strong className="font-mono text-white">198.51.100.42</strong> on <strong className="font-mono text-white">bastion-01:22</strong> • Revoke rogue SSH session (PID 12436) and apply simulated iptables DROP rule.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="action"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={handleSimulateApproval}
              isLoading={isExecutingDryRun}
            >
              Simulate Policy Dry Run
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedIncidentId('INC-2026-0042');
                navigate('/incidents');
              }}
            >
              Incident Dossier
            </Button>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN TWO-COLUMN OPERATIONAL COCKPIT
          Left Column: Live Incidents & Telemetry Stream
          Right Column: AI Investigator State & Forwarder Matrix
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Incidents & Live Threat Telemetry */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Incidents Overview */}
          <section className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#1C2230] flex items-center justify-between bg-[#0C0E14]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#F97316]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Active Correlated Incidents ({activeIncidents.length})
                </h2>
              </div>
              <button
                onClick={() => navigate('/incidents')}
                className="text-[11px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>All Incidents</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-[#1C2230]">
              {incidents.slice(0, 3).map((incident) => (
                <div 
                  key={incident.id} 
                  onClick={() => {
                    setSelectedIncidentId(incident.id);
                    navigate('/incidents');
                  }}
                  className="p-4 hover:bg-[#161B26] transition-colors cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#38BDF8]">{incident.id}</span>
                      <SeverityBadge severity={incident.severity} />
                      <span className="text-[10px] font-mono uppercase text-[#64748B]">Risk Score: {incident.riskScore}</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{incident.createdAt.split('T')[1]?.replace('Z', ' UTC')}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-[#38BDF8] transition-colors">
                    {incident.title}
                  </h3>

                  <p className="text-xs text-[#94A3B8] line-clamp-2">
                    {incident.aiSummary.executiveSummary}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-[#64748B]">
                    <span>Target: <strong className="text-white">{incident.targetAccounts.join(', ')}</strong></span>
                    <span>•</span>
                    <span>Adversary: <strong className="text-[#F97316]">{incident.sourceIps.join(', ')}</strong></span>
                    <span>•</span>
                    <span>Events: <strong className="text-white">{incident.eventCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Live Security Event Stream (High-density telemetry) */}
          <section className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#1C2230] flex items-center justify-between bg-[#0C0E14]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#38BDF8] animate-pulse" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Live Telemetry Ingestion Stream
                </h2>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="text-[11px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Explore Events</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-[#1C2230] font-mono text-xs max-h-96 overflow-y-auto">
              {events.slice(0, 7).map((evt) => (
                <div key={evt.id} className="p-3 hover:bg-[#161B26] transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <OutcomeBadge outcome={evt.outcome} />
                    <span className="text-[#64748B] text-[11px] shrink-0">
                      {evt.timestamp.split('T')[1]?.replace('Z', '')}
                    </span>
                    <span className="text-white font-semibold truncate">
                      {evt.sourceIp} &rarr; {evt.destinationIp}:{evt.destinationPort}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-[11px]">
                    <span className="text-[#94A3B8]">user: <strong className="text-white">{evt.username}</strong></span>
                    <span className="px-1.5 py-0.5 rounded bg-[#07080B] border border-[#1C2230] text-[#64748B] text-[10px]">
                      {evt.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column (5 cols): AI Investigator State & Sensor Topology */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Investigator Live Hypothesis Card */}
          <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#1C2230] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  AI Investigator Status
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                ACTIVE REASONING
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-mono uppercase text-[#64748B]">Active Working Hypothesis:</div>
              <h4 className="text-sm font-bold text-white leading-snug">
                Credential Exhaustion followed by Interactive Shell Acquisition on Bastion DMZ
              </h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Sentinel correlated 35 SSH rejection events with a successful key-based login from 198.51.100.42 within a 4-second convergence window.
              </p>
            </div>

            {/* AI Confidence Meter */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#64748B]">Confidence Score</span>
                <span className="text-[#38BDF8] font-bold">98% (High Evidence Density)</span>
              </div>
              <div className="w-full bg-[#07080B] h-2 rounded-full overflow-hidden border border-[#1C2230]">
                <div className="bg-[#38BDF8] h-full rounded-full transition-all duration-500" style={{ width: '98%' }} />
              </div>
            </div>

            {/* Evidence Anchors */}
            <div className="space-y-1.5 pt-2 border-t border-[#1C2230] text-xs font-mono">
              <div className="text-[10px] text-[#64748B] uppercase">Confirmed Evidence Anchors:</div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Adversary Origin:</span>
                  <span className="text-[#EF4444] font-semibold">198.51.100.42 (AS64496)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Compromised Process:</span>
                  <span className="text-white font-semibold">PID 12436 (user: deploy)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Attack Velocity:</span>
                  <span className="text-white font-semibold">0.38 attempts/sec</span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-2"
              onClick={() => navigate('/investigator')}
              icon={<Search className="w-3.5 h-3.5" />}
            >
              Open AI Investigation Workspace
            </Button>
          </section>

          {/* Forwarder Sensor Health & Ingestion Matrix */}
          <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#1C2230] pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#10B981]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Telemetry Forwarders ({logSources.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#10B981] font-bold">100% HEALTHY</span>
            </div>

            <div className="space-y-2.5">
              {logSources.map((source) => (
                <div 
                  key={source.id} 
                  className="p-2.5 rounded-lg bg-[#07080B] border border-[#1C2230] flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <div>
                      <div className="text-white font-bold text-[11px]">{source.name}</div>
                      <div className="text-[10px] text-[#64748B]">{source.host}:{source.port}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-300 text-[11px] font-semibold">
                      {source.eventsProcessed24h.toLocaleString()} evts
                    </div>
                    <div className="text-[9px] text-[#10B981]">SYNCED</div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="xs"
              className="w-full text-[11px]"
              onClick={() => navigate('/settings')}
            >
              Configure Ingestion Thresholds
            </Button>
          </section>

        </div>

      </div>

    </div>
  );
};
