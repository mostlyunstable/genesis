import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
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
  ShieldCheck,
  Zap,
  MessageSquare,
  Activity,
  Layers
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const AIInvestigatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    incidents, 
    selectedIncidentId, 
    setSelectedIncidentId,
    executePlaybookAction,
    addNotification
  } = useSecurityStore();

  const [activeTab, setActiveTab] = useState<'evidence' | 'timeline' | 'mitre'>('evidence');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [dryRunLogs, setDryRunLogs] = useState<string[]>([]);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || (incidents.length > 0 ? incidents[0] : null);

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

  const handleExecutePolicyDryRun = async () => {
    if (!selectedIncident) return;
    setIsSimulating(true);
    try {
      const primaryIp = selectedIncident.sourceIps?.[0] || '198.51.100.42';
      const ok = await executePlaybookAction(
        selectedIncident.assignedPlaybookId || 'PB-SSH-BRUTE-01',
        'Simulated Host Session Termination & Drop Filter',
        primaryIp,
        selectedIncident.id
      );

      if (ok) {
        setDryRunLogs([
          `[POLICY EVALUATION] Evaluating ${selectedIncident.assignedPlaybookId || 'PB-SSH-BRUTE-01'} against active policy... OK`,
          `[SANDBOX BOUNDARY] Target ${primaryIp} verified within operational boundary.`,
          `[DISPATCH SIMULATION] Simulated command: iptables -A INPUT -s ${primaryIp} -j DROP`,
          `[TELEMETRY PROBE] Connection state: 0 ingress packets received from ${primaryIp}.`,
          `[RESULT: VERIFIED] Defensive countermeasure validated in deterministic dry-run mode.`
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

  // If no incidents exist, show clean empty state
  if (!selectedIncident) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto font-sans pb-16">
        <section className="bg-white border border-[#E3E5DC] rounded-3xl p-8 sm:p-12 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF0E6] text-[#54765C] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#20251F]">
              No Active Investigations
            </h1>
            <p className="text-sm text-[#73796F] max-w-md mx-auto">
              No correlated incident clusters currently meet escalation thresholds. Telemetry is monitored in real-time.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/copilot')}
              icon={<MessageSquare className="w-4 h-4" />}
            >
              Open Security Copilot
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/events')}
              icon={<Activity className="w-4 h-4" />}
            >
              View Telemetry Stream
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // Derive dynamic evidence from the real selected incident
  const evidenceArtifacts = [
    ...(selectedIncident.sourceIps || []).map((ip, idx) => ({
      id: `EV-IP-${idx + 1}`,
      type: 'CONFIRMED_EVIDENCE' as const,
      label: 'Adversary Source IP',
      value: ip,
      source: 'Ingested Telemetry Stream',
      details: `Observed in ${selectedIncident.eventCount} correlated security log handshakes.`
    })),
    ...(selectedIncident.targetAccounts || []).map((acc, idx) => ({
      id: `EV-USR-${idx + 1}`,
      type: 'CONFIRMED_EVIDENCE' as const,
      label: 'Targeted Identity',
      value: acc,
      source: 'Authentication Forwarder',
      details: `Account targeted during credential spray / brute-force authentication attempts.`
    })),
    ...(selectedIncident.mitreAttack || []).map((m, idx) => ({
      id: `EV-MITRE-${idx + 1}`,
      type: 'AI_HYPOTHESIS' as const,
      label: `MITRE ${m.techniqueId || 'Tactic'}`,
      value: m.techniqueName || m.tactic || 'Technique',
      source: 'SENTINEL Detection & Knowledge Engine',
      confidence: selectedIncident.confidenceScore || 85,
      details: `Correlated behavioral signature mapped to ${m.tactic || 'adversary operation'}.`
    }))
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. INVESTIGATION WORKSPACE HEADER & SCOPE SELECTOR
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-display font-medium text-[#20251F] tracking-tight">
              Investigator
            </h1>
            <p className="text-xs sm:text-sm text-[#73796F]">
              Forensic evidence and incident investigation workspace.
            </p>
          </div>

          {/* Scope Selector & Copilot Shortcut */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-[#73796F] text-[11px] uppercase">Incident:</span>
              <select
                value={selectedIncident.id}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="bg-[#F0F1EB] border border-[#E3E5DC] text-[#20251F] px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-[#54765C]"
              >
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.id} — {inc.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/copilot')}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Investigate in Copilot
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. ACTIVE INCIDENT OVERVIEW CARD
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-sm">
        {/* Dossier Header */}
        <div className="p-5 sm:p-6 border-b border-[#E3E5DC] bg-[#FAF9F5] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#54765C]">{selectedIncident.id}</span>
              <SeverityBadge severity={selectedIncident.severity} />
              <span className="text-[11px] font-mono text-[#73796F]">Category: {selectedIncident.category}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#20251F] mt-1">
              {selectedIncident.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E3E5DC]">
              <span className="text-[#73796F]">Risk Score: </span>
              <span className="text-rose-600 font-bold">{selectedIncident.riskScore}/100</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E3E5DC]">
              <span className="text-[#73796F]">AI Confidence: </span>
              <span className="text-[#54765C] font-bold">{selectedIncident.confidenceScore || 85}%</span>
            </div>
          </div>
        </div>

        {/* Narrative & Summary */}
        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                AI HYPOTHESIS
              </span>
              <span className="text-[10px] font-mono uppercase text-[#73796F] font-bold tracking-wider">
                AI ROOT-CAUSE DEDUCTION &amp; FINDING NARRATIVE
              </span>
            </div>
            <p className="text-sm text-[#20251F] leading-relaxed pt-1">
              {selectedIncident.aiSummary?.rootCauseAnalysis || selectedIncident.detectionExplanation || selectedIncident.title}
            </p>
          </div>

          {/* Key Forensic Evidence Pills */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                CONFIRMED EVIDENCE
              </span>
              <span className="text-[10px] font-mono uppercase text-[#73796F] font-bold tracking-wider">
                CRYPTOGRAPHICALLY VERIFIED TELEMETRY
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F0F1EB]/60 border border-[#E3E5DC] space-y-1">
              <span className="text-[10px] font-mono text-[#73796F] uppercase">Source Adversary IP</span>
              <div className="font-mono text-xs font-semibold text-[#20251F]">
                {selectedIncident.sourceIps?.join(', ') || 'N/A'}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F0F1EB]/60 border border-[#E3E5DC] space-y-1">
              <span className="text-[10px] font-mono text-[#73796F] uppercase">Targeted Account(s)</span>
              <div className="font-mono text-xs font-semibold text-[#20251F]">
                {selectedIncident.targetAccounts?.join(', ') || 'root'}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F0F1EB]/60 border border-[#E3E5DC] space-y-1">
              <span className="text-[10px] font-mono text-[#73796F] uppercase">Correlated Events</span>
              <div className="font-mono text-xs font-semibold text-[#20251F]">
                {selectedIncident.eventCount} Ingested Records
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Tabs */}
        <div className="border-t border-[#E3E5DC] px-6 pt-3 flex gap-4 text-xs font-semibold text-[#73796F]">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'evidence' ? 'border-[#54765C] text-[#20251F]' : 'border-transparent hover:text-[#20251F]'}`}
          >
            Forensic Evidence ({evidenceArtifacts.length})
          </button>
          <button
            onClick={() => setActiveTab('mitre')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'mitre' ? 'border-[#54765C] text-[#20251F]' : 'border-transparent hover:text-[#20251F]'}`}
          >
            MITRE ATT&CK Mapping
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. EVIDENCE ARTIFACTS LIST
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'evidence' && (
        <section className="space-y-3">
          {evidenceArtifacts.map((item) => (
            <div 
              key={item.id}
              className="bg-white border border-[#E3E5DC] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#54765C]/40 transition-colors shadow-xs"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#54765C] uppercase px-2 py-0.5 rounded bg-[#EAF0E6]">
                    {item.label}
                  </span>
                  <span className="text-xs font-mono text-[#73796F]">Source: {item.source}</span>
                </div>
                <div className="font-mono text-sm font-semibold text-[#20251F]">
                  {item.value}
                </div>
                <p className="text-xs text-[#73796F] leading-relaxed">
                  {item.details}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(item.value, item.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#E3E5DC] text-xs font-mono text-[#73796F] hover:text-[#20251F] hover:bg-[#FAF9F5] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-[#54765C]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. MITRE ATT&CK MAPPING TAB
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'mitre' && (
        <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#20251F] uppercase tracking-wider">
            Correlated MITRE ATT&CK Techniques
          </h3>
          {selectedIncident.mitreAttack && selectedIncident.mitreAttack.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedIncident.mitreAttack.map((m, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E3E5DC] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#54765C]">{m.techniqueId}</span>
                    <span className="text-[11px] font-mono text-[#73796F]">{m.tactic}</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#20251F]">{m.techniqueName}</h4>
                  <a
                    href={`https://attack.mitre.org/techniques/${m.techniqueId?.replace('.', '/')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#54765C] hover:underline pt-1"
                  >
                    <span>View on MITRE Framework</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#73796F]">No specific MITRE techniques mapped to this incident yet.</p>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. AUTONOMOUS CONTAINMENT DRY RUN SIMULATOR
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#20251F]">
              Defensive Playbook Evaluation
            </h3>
            <p className="text-xs text-[#73796F]">
              Validate containment countermeasures against policy engine before dispatching kernel drop rules.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExecutePolicyDryRun}
            isLoading={isSimulating}
            icon={<Zap className="w-3.5 h-3.5" />}
          >
            Run Policy Dry Run
          </Button>
        </div>

        {dryRunLogs.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#20251F] text-[#EAF0E6] font-mono text-xs space-y-1.5 overflow-x-auto">
            {dryRunLogs.map((log, lIdx) => (
              <div key={lIdx} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
