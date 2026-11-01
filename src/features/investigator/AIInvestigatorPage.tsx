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
  Filter,
  Server
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
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
      source: 'Sentinel Correlation Engine',
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
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. INVESTIGATION WORKSPACE HEADER & SCOPE SELECTOR
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#54765C] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AUTONOMOUS FORENSIC LABORATORY
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">SENTINEL REASONING MATRIX</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              AI Investigator Workspace
            </h1>
            <p className="text-sm text-[#73796F] max-w-2xl leading-relaxed">
              Forensic evidence attribution, automated root-cause deduction, and deterministic attack trajectory reconstruction.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#969B91] uppercase">Scope:</span>
            <select
              value={selectedIncident.id}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="bg-[#F0F1EB] border border-[#E3E5DC] text-[#20251F] px-4 py-2.5 rounded-full text-xs font-mono font-bold focus:outline-none focus:border-[#54765C] cursor-pointer max-w-xs truncate"
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.id} — {inc.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. ACTIVE INVESTIGATION DOSSIER & REASONING SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
        
        {/* Dossier Header */}
        <div className="p-6 sm:p-8 border-b border-[#E3E5DC] bg-[#FAFAF7] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-[#54765C] font-bold text-sm">{selectedIncident.id}</span>
              <SeverityBadge severity={selectedIncident.severity} />
              <span className="text-[#73796F]">Category: Credential Access / Brute Force</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <div className="px-3.5 py-1.5 rounded-full bg-white border border-[#E3E5DC] text-center">
                <span className="text-[10px] text-[#969B91] uppercase mr-1">Risk Score:</span>
                <span className="font-bold text-[#B94C43]">{selectedIncident.riskScore}/100</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-white border border-[#E3E5DC] text-center">
                <span className="text-[10px] text-[#969B91] uppercase mr-1">AI Confidence:</span>
                <span className="font-bold text-[#54765C]">98%</span>
              </div>
            </div>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl text-[#20251F] font-bold">
            {selectedIncident.title}
          </h2>
        </div>

        {/* Narrative & Reasoning Summary */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
              AI ROOT-CAUSE DEDUCTION &amp; FINDING NARRATIVE
            </div>
            <p className="text-base text-[#20251F] leading-relaxed font-sans font-medium">
              {selectedIncident.aiSummary.rootCauseAnalysis}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] space-y-2 font-mono text-xs text-[#20251F]">
            <span className="text-[10px] text-[#54765C] font-bold uppercase tracking-wider block">
              FORENSIC SUMMARY:
            </span>
            <p className="leading-relaxed">
              {selectedIncident.aiSummary.executiveSummary}
            </p>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="px-6 border-t border-[#E3E5DC] bg-[#FAFAF7] flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`py-3.5 px-4 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'evidence'
                ? 'border-[#54765C] text-[#54765C]'
                : 'border-transparent text-[#73796F] hover:text-[#20251F]'
            }`}
          >
            Confirmed Evidence vs Hypotheses ({evidenceArtifacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`py-3.5 px-4 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-[#54765C] text-[#54765C]'
                : 'border-transparent text-[#73796F] hover:text-[#20251F]'
            }`}
          >
            Attack Trajectory (7 stages)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mitre')}
            className={`py-3.5 px-4 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'mitre'
                ? 'border-[#54765C] text-[#54765C]'
                : 'border-transparent text-[#73796F] hover:text-[#20251F]'
            }`}
          >
            MITRE ATT&amp;CK Mapping ({selectedIncident.mitreAttack.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('raw_events')}
            className={`py-3.5 px-4 font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'raw_events'
                ? 'border-[#54765C] text-[#54765C]'
                : 'border-transparent text-[#73796F] hover:text-[#20251F]'
            }`}
          >
            Raw Event Telemetry ({selectedIncident.eventCount})
          </button>
        </div>

        {/* Tab 1: Confirmed Evidence vs AI Hypotheses */}
        {activeTab === 'evidence' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between text-xs font-mono text-[#73796F]">
              <span>Cryptographic verification distinction: Verified telemetry vs Generative hypothesis</span>
              <span className="text-[#54765C] font-bold">Strict Evidence Governance Enforced</span>
            </div>

            <div className="space-y-3">
              {evidenceArtifacts.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] hover:border-[#CFD4C9] transition-all space-y-2"
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.type === 'CONFIRMED_EVIDENCE'
                          ? 'bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9]'
                          : 'bg-[#FAF5EB] text-[#B28A42] border border-[#F4ECD5]'
                      }`}>
                        {item.type === 'CONFIRMED_EVIDENCE' ? 'CONFIRMED EVIDENCE' : 'AI HYPOTHESIS'}
                      </span>
                      <span className="font-bold text-[#20251F] text-sm font-sans">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[#969B91]">
                      {item.confidence && (
                        <span className="font-bold text-[#54765C]">{item.confidence}% confidence</span>
                      )}
                      <span>source: {item.source}</span>
                    </div>
                  </div>

                  <div className="font-mono text-sm font-bold text-[#20251F]">
                    {item.value}
                  </div>

                  <p className="text-xs text-[#73796F] font-sans leading-relaxed">
                    {item.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Chronological Attack Trajectory */}
        {activeTab === 'timeline' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
              CORRELATED ATTACK CHRONOLOGY &amp; INTERCEPTION
            </div>

            <div className="space-y-4">
              {[
                { stage: '01', title: 'Adversary Reconnaissance Handshake', time: '10:15:00 UTC', status: 'OBSERVED', desc: 'Adversary IP 198.51.100.42 initiates OpenSSH 8.9p1 banner exchange against port 22.' },
                { stage: '02', title: 'High-Velocity Password Guessing Cycle', time: '10:15:20 – 10:16:27 UTC', status: 'CORRELATED', desc: '35 invalid authentication attempts rejected across system usernames (root, admin, deploy).' },
                { stage: '03', title: 'Authentication Breakthrough on Deploy User', time: '10:16:31 UTC', status: 'CORRELATED', desc: 'Session accepted for user deploy. Bash interactive shell spawned under PID 12436.' },
                { stage: '04', title: 'Autonomous Sandbox Policy Countermeasure Queued', time: '10:16:35 UTC', status: 'INTERCEPTED', desc: 'PB-SSH-BRUTE-01 triggered: iptables DROP rule and session kill dispatched in sandbox mode.' }
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#EAF0E6] text-[#54765C] flex items-center justify-center shrink-0 font-mono text-xs font-bold border border-[#CFDCC9]">
                    {step.stage}
                  </div>
                  <div className="flex-1 pb-4 border-b border-[#E3E5DC] last:border-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-sm font-bold text-[#20251F] font-sans">{step.title}</h4>
                      <div className="flex items-center gap-2 font-mono text-xs text-[#73796F]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{step.time}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          step.status === 'INTERCEPTED' ? 'bg-[#FAF2EC] text-[#C47A45] border border-[#F4E2D5]' : 'bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9]'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#73796F] mt-1 font-sans">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: MITRE ATT&CK */}
        {activeTab === 'mitre' && (
          <div className="p-6 sm:p-8 space-y-4">
            <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
              CORRELATED ADVERSARY TACTICS &amp; TECHNIQUES
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedIncident.mitreAttack.map((item) => (
                <div key={item.techniqueId} className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#54765C]">{item.techniqueId}</span>
                    <span className="text-[#969B91] uppercase">{item.tactic}</span>
                  </div>
                  <div className="font-display text-lg text-[#20251F] mt-1">{item.techniqueName}</div>
                  <p className="text-xs text-[#73796F] mt-1 font-sans">
                    Technique matched via heuristic pattern analysis and RFC 5424 normalized event stream.
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Raw Event Telemetry */}
        {activeTab === 'raw_events' && (
          <div className="p-6 sm:p-8 space-y-4 font-mono text-xs">
            <div className="text-[10px] uppercase text-[#969B91] font-bold tracking-wider">
              CORRELATED TELEMETRY LOG ({selectedIncident.eventIds.length} EVENTS)
            </div>
            <div className="divide-y divide-[#E3E5DC] border border-[#E3E5DC] rounded-2xl overflow-hidden bg-[#FAFAF7]">
              {selectedIncident.eventIds.map((eid) => (
                <div key={eid} className="p-3.5 flex items-center justify-between hover:bg-white transition-colors">
                  <span className="font-bold text-[#54765C]">{eid}</span>
                  <span className="text-[#73796F]">bastion-01:22 &bull; user: deploy</span>
                  <button
                    onClick={() => copyToClipboard(eid, eid)}
                    className="text-[#54765C] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === eid ? <Check className="w-3.5 h-3.5 text-[#64856C]" /> : <Copy className="w-3.5 h-3.5 text-[#969B91]" />}
                    <span>Copy ID</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Policy Simulation Dry-Run Bar */}
        <div className="p-6 sm:p-8 border-t border-[#E3E5DC] bg-[#FAFAF7] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#C47A45] font-bold tracking-wider">
                POLICY-VERIFIED COUNTERMEASURE
              </div>
              <h3 className="text-base font-bold text-[#20251F] font-sans mt-0.5">
                Playbook PB-SSH-BRUTE-01 &bull; Sandbox Isolation &amp; Session Termination
              </h3>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={handleExecutePolicyDryRun}
              isLoading={isSimulating}
              className="shrink-0"
            >
              Simulate Action
            </Button>
          </div>

          {dryRunLogs.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-[#CFDCC9] font-mono text-xs space-y-1.5 animate-in fade-in-0 duration-150">
              <div className="flex items-center justify-between text-[#54765C] font-bold text-[11px] pb-1 border-b border-[#E3E5DC]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Deterministic Sandbox Telemetry Output
                </span>
                <span className="text-[#969B91]">RFC 5737 Protected</span>
              </div>
              {dryRunLogs.map((log, idx) => (
                <div key={idx} className="text-[#20251F] text-xs leading-relaxed flex items-start gap-2">
                  <span className="text-[#54765C] font-bold">&gt;</span>
                  <span className={log.includes('VERIFIED') ? 'text-[#64856C] font-bold' : ''}>
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
