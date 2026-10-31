import React, { useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  Zap,
  Activity,
  Terminal,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

export const InvestigationsPage: React.FC = () => {
  const { incidents, selectedIncidentId, setSelectedIncidentId, executePlaybookAction, addNotification } = useSecurityStore();
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>(selectedIncidentId || 'INC-2026-0042');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeInvestigation = incidents.find(i => i.id === activeInvestigationId) || incidents[0];

  const filteredIncidents = incidents.filter(i => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.sourceIps.some(ip => ip.includes(q))
      );
    }
    return true;
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addNotification({
      type: 'info',
      title: 'Copied Evidence ID',
      message: `${id} copied to clipboard.`
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExecuteResponse = async (playbookId: string, target: string) => {
    await executePlaybookAction(
      playbookId,
      'Automated Containment Dry Run',
      target,
      activeInvestigation?.id
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#38BDF8] uppercase mb-1">
            SECURITY INTELLIGENCE DOSSIERS
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Investigations
          </h2>
          <p className="text-sm text-slate-300 font-sans mt-0.5">
            Every signal has a story. Find it.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter investigations..."
          />
        </div>
      </div>

      {/* Main Investigation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Investigation List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-[#0F1523] border border-[#1E293B] rounded-xl text-xs text-[#94A3B8] font-mono">
              No investigations match filter criteria.
            </div>
          ) : (
            filteredIncidents.map((inv) => {
              const isSelected = activeInvestigation?.id === inv.id;

              return (
                <div
                  key={inv.id}
                  onClick={() => {
                    setActiveInvestigationId(inv.id);
                    setSelectedIncidentId(inv.id);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#141C2E] border-[#0066FF] shadow-cyber-blue ring-1 ring-[#0066FF]/30'
                      : 'bg-[#0F1523] border-[#1E293B] hover:border-[#0066FF]/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-[#FF5722]">{inv.id}</span>
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={inv.severity} />
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#161F30] text-[#38BDF8] border border-[#0066FF]/30">
                        {inv.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2 font-sans line-clamp-2">
                    {inv.title}
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-1.5 line-clamp-2 font-sans leading-relaxed">
                    {inv.detectionExplanation}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] mt-3 pt-2.5 border-t border-[#1E293B]">
                    <span>{new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
                    <span className="text-[#38BDF8]">{inv.eventCount} Signals Correlated</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Clean Detail Dossier View (7 cols) */}
        {activeInvestigation && (
          <div className="lg:col-span-7 bg-[#0F1523] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-cyber-lg space-y-6 relative overflow-hidden">
            {/* Top Glowing Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0066FF] via-[#38BDF8] to-[#FF5722]" />

            {/* Investigation Overview */}
            <div className="space-y-2 border-b border-[#1E293B] pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#FF5722]">{activeInvestigation.id}</span>
                <RiskScoreBadge score={activeInvestigation.riskScore} />
              </div>
              <h3 className="text-xl font-bold text-white font-sans tracking-tight">
                {activeInvestigation.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                {activeInvestigation.detectionExplanation}
              </p>
            </div>

            {/* AI Analytical Synthesis */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-mono font-bold text-[#38BDF8] tracking-[0.15em] uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>ANALYTICAL SYNTHESIS</span>
              </div>
              <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] text-sm text-slate-200 font-sans leading-relaxed">
                {activeInvestigation.aiSummary.executiveSummary}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-1">
                <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                  <span className="text-[#64748B] text-[10px] block uppercase tracking-wider">CONFIDENCE</span>
                  <span className="text-[#10B981] font-bold text-sm block mt-0.5">{activeInvestigation.confidenceScore}% Calculated</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                  <span className="text-[#64748B] text-[10px] block uppercase tracking-wider">SOURCE ASSET</span>
                  <span className="text-[#FF5722] font-bold text-sm block mt-0.5">{activeInvestigation.sourceIps[0]}</span>
                </div>
              </div>
            </div>

            {/* MITRE ATT&CK Footprint */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-[#64748B] tracking-[0.15em] uppercase">
                MITRE ATT&CK MAPPING
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {activeInvestigation.mitreAttack.map((tech) => (
                  <div key={tech.techniqueId} className="px-3 py-1.5 rounded-lg bg-[#0066FF]/15 text-[#38BDF8] border border-[#0066FF]/30">
                    <span className="font-bold">{tech.techniqueId}</span>: {tech.techniqueName}
                  </div>
                ))}
              </div>
            </div>

            {/* Progression Timeline */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono font-bold text-[#64748B] tracking-[0.15em] uppercase">
                PROGRESSION TIMELINE ({activeInvestigation.timelineEvents.length} STAGES)
              </div>
              <div className="space-y-2 border-l-2 border-[#1E293B] ml-2 pl-4 font-mono text-xs">
                {activeInvestigation.timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{evt.title}</span>
                      <span className="text-[#64748B] text-[11px]">{evt.timestamp}</span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1 font-sans">{evt.description}</p>
                    {evt.evidenceId && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-[#FF5722]">
                        <span>Evidence: <code>{evt.evidenceId}</code></span>
                        <button onClick={() => copyToClipboard(evt.evidenceId!, evt.evidenceId!)} className="cursor-pointer">
                          {copiedId === evt.evidenceId ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Response & Dry-run execution */}
            {activeInvestigation.assignedPlaybookId && (
              <div className="pt-4 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B0F17] p-4 rounded-xl border border-[#1E293B]">
                <div>
                  <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Recommended Playbook</div>
                  <div className="font-bold text-white text-sm font-mono mt-0.5">{activeInvestigation.assignedPlaybookId}</div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Zap className="w-4 h-4" />}
                  onClick={() => handleExecuteResponse(activeInvestigation.assignedPlaybookId!, activeInvestigation.sourceIps[0])}
                >
                  Execute Policy Dry Run
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
