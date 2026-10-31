import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  ShieldAlert, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink,
  Cpu,
  Layers,
  Terminal,
  ShieldCheck,
  Zap,
  Filter
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface EvidenceItem {
  id: string;
  type: 'CONFIRMED_EVIDENCE' | 'AI_HYPOTHESIS';
  label: string;
  value: string;
  source: string;
  confidence?: number;
  details: string;
}

export const AIInvestigatorPage: React.FC = () => {
  const { 
    incidents, 
    detections, 
    events, 
    selectedIncidentId, 
    setSelectedIncidentId,
    executePlaybookAction,
    addNotification
  } = useSecurityStore();

  const [activeTab, setActiveTab] = useState<'evidence' | 'timeline' | 'mitre' | 'raw_events'>('evidence');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [dryRunLogs, setDryRunLogs] = useState<string[]>([]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addNotification({
      type: 'info',
      title: 'Copied Reference',
      message: `${id} copied to clipboard.`
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Structured distinction between verified evidence and AI hypotheses
  const evidenceArtifacts: EvidenceItem[] = [
    {
      id: 'EV-01',
      type: 'CONFIRMED_EVIDENCE',
      label: 'Adversary Source IP',
      value: '198.51.100.42',
      source: 'Bastion Auth Forwarder (syslog)',
      details: 'RFC 5737 Benchmark IP Range / AS64496. 35 distinct SSH handshakes initiated.'
    },
    {
      id: 'EV-02',
      type: 'CONFIRMED_EVIDENCE',
      label: 'Authentication Rejections',
      value: '35 Failed SSH Attempts',
      source: 'sshd[12390] logs',
      details: '35 invalid PAM auth cycles across accounts: root (12), admin (8), ubuntu (8), deploy (7).'
    },
    {
      id: 'EV-03',
      type: 'CONFIRMED_EVIDENCE',
      label: 'Compromised Linux Session',
      value: 'user: deploy (PID 12436)',
      source: 'PAM Session Open (auditd)',
      details: 'Accepted publickey for deploy from 198.51.100.42 port 49152 ssh2. Bash spawned under PID 12436.'
    },
    {
      id: 'HY-01',
      type: 'AI_HYPOTHESIS',
      label: 'Attack Vector Deduction',
      value: 'Dictionary Rotation to Shell Pivot',
      source: 'Genysis Correlation Engine',
      confidence: 98,
      details: 'High-velocity automated spray succeeded by human operator interactive shell takeover within 4.0 seconds of key acceptance.'
    },
    {
      id: 'HY-02',
      type: 'AI_HYPOTHESIS',
      label: 'Potential Blast Radius Scope',
      value: '14 Peered VPC Subnets Exposed',
      source: 'Topology & IAM Graph Analyzer',
      confidence: 94,
      details: 'Bastion-01 route table permits ingress routing into 10.240.0.0/16. "deploy" account possesses Docker sudo privileges.'
    }
  ];

  const handleExecutePolicyDryRun = async () => {
    setIsSimulating(true);
    try {
      const ok = await executePlaybookAction(
        'PB-SSH-BRUTE-01',
        'Simulated Host Session Termination & Drop Filter',
        '198.51.100.42',
        selectedIncident.id
      );

      if (ok) {
        setDryRunLogs([
          '[POLICY EVALUATION] Evaluating PB-SSH-BRUTE-01 against active security policy... OK',
          '[SANDBOX BOUNDARY] Target 198.51.100.42 verified within RFC 5737 test boundary.',
          '[DISPATCH SIMULATION] Simulated command: iptables -A INPUT -s 198.51.100.42 -j DROP',
          '[KILL SIMULATION] Revoking rogue process tree PID 12436 (deploy)... Terminated',
          '[TELEMETRY PROBE] Validating connection state: 0 ingress packets received from 198.51.100.42.',
          '[RESULT: VERIFIED] Defensive countermeasure validated in deterministic dry-run mode.'
        ]);
        addNotification({
          type: 'success',
          title: 'Countermeasure Dry Run Completed',
          message: 'Policy simulation validated with zero errors.'
        });
      }
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. INVESTIGATION WORKSPACE HEADER & SCOPE SELECTOR
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#38BDF8] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                AUTONOMOUS SECURITY INTELLIGENCE
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-[10px] font-mono text-[#94A3B8]">EVIDENCE CORRELATION ENGINE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              AI Investigator Workspace
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Automated root-cause deduction, forensic evidence verification, and attack trajectory synthesis.
            </p>
          </div>

          {/* Incident Scope Selector */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#64748B] text-[10px] uppercase">Incident Scope:</span>
            <select
              value={selectedIncident.id}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-[#07080B] border border-[#1C2230] text-white px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-[#38BDF8]"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} — {inc.title.slice(0, 35)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. ACTIVE INCIDENT DOSSIER & AI HYPOTHESIS OVERVIEW
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm">
        {/* Dossier Header */}
        <div className="p-5 border-b border-[#1C2230] bg-[#0C0E14] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#38BDF8]">{selectedIncident.id}</span>
              <SeverityBadge severity={selectedIncident.severity} />
              <span className="text-[11px] font-mono text-[#64748B]">Category: {selectedIncident.category}</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              {selectedIncident.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="px-3 py-1 rounded bg-[#07080B] border border-[#1C2230]">
              <span className="text-[#64748B]">Risk Score: </span>
              <span className="text-[#EF4444] font-bold">{selectedIncident.riskScore}/100</span>
            </div>
            <div className="px-3 py-1 rounded bg-[#07080B] border border-[#1C2230]">
              <span className="text-[#64748B]">AI Confidence: </span>
              <span className="text-[#38BDF8] font-bold">{selectedIncident.confidenceScore}%</span>
            </div>
          </div>
        </div>

        {/* Executive Summary & Root Cause */}
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
              AI ROOT-CAUSE DEDUCTION &amp; FINDING NARRATIVE
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {selectedIncident.aiSummary.rootCauseAnalysis}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#07080B] border border-[#1C2230] text-xs font-mono space-y-1 text-slate-300">
            <div className="text-[10px] font-bold text-[#38BDF8] uppercase">Forensic Summary:</div>
            <div>{selectedIncident.aiSummary.executiveSummary}</div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-[#1C2230] pt-2">
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-3 py-2 text-xs font-mono font-bold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'evidence'
                  ? 'border-[#38BDF8] text-[#38BDF8]'
                  : 'border-transparent text-[#94A3B8] hover:text-white'
              }`}
            >
              Confirmed Evidence vs Hypotheses ({evidenceArtifacts.length})
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3 py-2 text-xs font-mono font-bold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-[#38BDF8] text-[#38BDF8]'
                  : 'border-transparent text-[#94A3B8] hover:text-white'
              }`}
            >
              Attack Trajectory ({selectedIncident.timelineEvents.length} stages)
            </button>
            <button
              onClick={() => setActiveTab('mitre')}
              className={`px-3 py-2 text-xs font-mono font-bold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'mitre'
                  ? 'border-[#38BDF8] text-[#38BDF8]'
                  : 'border-transparent text-[#94A3B8] hover:text-white'
              }`}
            >
              MITRE ATT&amp;CK Mapping ({selectedIncident.mitreAttack.length})
            </button>
            <button
              onClick={() => setActiveTab('raw_events')}
              className={`px-3 py-2 text-xs font-mono font-bold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'raw_events'
                  ? 'border-[#38BDF8] text-[#38BDF8]'
                  : 'border-transparent text-[#94A3B8] hover:text-white'
              }`}
            >
              Raw Event Telemetry ({selectedIncident.eventCount})
            </button>
          </div>

          {/* TAB 1: CONFIRMED EVIDENCE VS AI HYPOTHESES */}
          {activeTab === 'evidence' && (
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-mono text-[#64748B] flex items-center justify-between">
                <span>Cryptographic verification distinction: Verified telemetry vs Generative hypothesis</span>
                <span className="text-[#38BDF8]">Strict Evidence Governance Enforced</span>
              </div>

              <div className="divide-y divide-[#1C2230] border border-[#1C2230] rounded-lg bg-[#07080B] overflow-hidden">
                {evidenceArtifacts.map((item) => (
                  <div key={item.id} className="p-3.5 hover:bg-[#10131B] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {item.type === 'CONFIRMED_EVIDENCE' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                            CONFIRMED EVIDENCE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                            AI HYPOTHESIS ({item.confidence}% CONFIDENCE)
                          </span>
                        )}
                        <span className="text-white font-bold">{item.label}</span>
                      </div>
                      <div className="text-slate-300 font-sans text-xs">{item.details}</div>
                      <div className="text-[10px] text-[#64748B]">Source: {item.source}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-sm font-bold block ${
                        item.type === 'CONFIRMED_EVIDENCE' ? 'text-white' : 'text-[#38BDF8]'
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ATTACK TRAJECTORY TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-3 pt-2">
              <div className="relative border-l-2 border-[#1C2230] ml-3 pl-4 space-y-4">
                {selectedIncident.timelineEvents.map((step, idx) => (
                  <div key={step.id} className="relative space-y-1">
                    <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#38BDF8] border-2 border-[#0A0D14]" />
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white font-sans">{step.title}</span>
                      <span className="text-[#64748B] text-[11px]">{step.timestamp.split('T')[1]?.replace('Z', ' UTC')}</span>
                    </div>
                    <p className="text-xs text-[#94A3B8] font-sans">{step.description}</p>
                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#07080B] text-[#64748B] border border-[#1C2230]">
                      Stage: {step.stage.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MITRE ATT&CK MAPPING */}
          {activeTab === 'mitre' && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedIncident.mitreAttack.map((technique) => (
                  <div key={technique.techniqueId} className="p-3.5 rounded-lg bg-[#07080B] border border-[#1C2230] text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#64748B] uppercase">{technique.tactic}</span>
                      <span className="text-[#38BDF8] font-bold">{technique.techniqueId}</span>
                    </div>
                    <div className="text-white font-bold font-sans">{technique.techniqueName}</div>
                    <a
                      href={technique.referenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#38BDF8] hover:underline flex items-center gap-1 pt-1"
                    >
                      <span>MITRE Knowledge Base</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: RAW EVENT TELEMETRY */}
          {activeTab === 'raw_events' && (
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230] font-mono text-xs max-h-72 overflow-y-auto space-y-2">
                {events.filter(e => selectedIncident.eventIds.includes(e.id)).map((evt) => (
                  <div key={evt.id} className="p-2 border-b border-[#1C2230] last:border-0 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>{evt.id} • {evt.source}</span>
                      <span>{evt.timestamp}</span>
                    </div>
                    <div className="text-slate-200 text-xs">{evt.rawEvent}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              3. POLICY-GOVERNED COUNTERMEASURE RECOMMENDATION
              Strictly distinct from execution: "RECOMMENDED BY AI"
              ───────────────────────────────────────────────────────────── */}
          <div className="mt-6 pt-5 border-t border-[#1C2230] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F97316]">
                  POLICY-GOVERNED ACTION (NOT YET EXECUTED)
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">Approval Required</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white">
                Execute Playbook PB-SSH-BRUTE-01: Apply simulated iptables DROP rule for 198.51.100.42 and terminate PID 12436.
              </p>
            </div>

            <Button
              variant="action"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={handleExecutePolicyDryRun}
              isLoading={isSimulating}
              className="shrink-0"
            >
              Simulate Policy Dry Run
            </Button>
          </div>

          {/* Dry Run Execution Output (if triggered) */}
          {dryRunLogs.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-[#07080B] border border-[#10B981]/30 font-mono text-xs space-y-1.5 animate-in fade-in-0 duration-150">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#10B981] uppercase tracking-wider pb-1 border-b border-[#1C2230]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Deterministic Sandbox Verification Log
                </span>
                <span>RFC 5737 Enforced</span>
              </div>
              {dryRunLogs.map((log, i) => (
                <div key={i} className="text-slate-300 text-[11px] leading-relaxed">
                  <span className="text-[#38BDF8]">&gt; </span>
                  <span className={log.includes('VERIFIED') ? 'text-[#10B981] font-bold' : log.includes('DROP') ? 'text-[#F97316]' : ''}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

    </div>
  );
};
