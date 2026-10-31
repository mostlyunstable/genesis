import React, { useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  Flame, 
  ShieldAlert, 
  Clock, 
  ArrowLeft, 
  CheckCircle2, 
  Copy, 
  Check, 
  FileText,
  ExternalLink,
  Zap
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Incident } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E6E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#171717] font-sans">
            Investigations
          </h2>
          <p className="text-xs text-[#77736D] font-sans mt-0.5">
            Every signal has a story. Find it.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter investigations..."
          />
        </div>
      </div>

      {/* Main Investigation Layout: Clean List & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Minimal Investigation List (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E9E6E0] rounded-xl text-xs text-[#77736D] font-mono">
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
                      ? 'bg-white border-[#F15A24] shadow-sm ring-1 ring-[#F15A24]/20'
                      : 'bg-white border-[#E9E6E0] hover:border-[#D8D4CC] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-[#F15A24]">{inv.id}</span>
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={inv.severity} />
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#F3F2EE] text-[#77736D]">
                        {inv.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-[#171717] mt-2 font-sans line-clamp-2">
                    {inv.title}
                  </h3>

                  <p className="text-[11px] text-[#77736D] mt-1 line-clamp-2 font-sans">
                    {inv.detectionExplanation}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#A5A19A] mt-3 pt-2.5 border-t border-[#F0ECE6]">
                    <span>{new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
                    <span>{inv.eventCount} Correlated Events</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Dedicated Investigation Detail View (7 cols) */}
        {activeInvestigation && (
          <div className="lg:col-span-7 bg-white border border-[#E9E6E0] rounded-2xl p-6 shadow-sm space-y-6">
            {/* Investigation Overview */}
            <div className="space-y-2 border-b border-[#F0ECE6] pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#F15A24]">{activeInvestigation.id}</span>
                <RiskScoreBadge score={activeInvestigation.riskScore} />
              </div>
              <h3 className="text-lg font-bold text-[#171717] font-sans">
                {activeInvestigation.title}
              </h3>
              <p className="text-xs text-[#77736D] leading-relaxed font-sans">
                {activeInvestigation.detectionExplanation}
              </p>
            </div>

            {/* AI Analytical Synthesis */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-semibold text-[#F15A24] uppercase">
                ANALYTICAL SYNTHESIS
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E9E6E0] text-xs text-[#171717] font-sans leading-relaxed">
                {activeInvestigation.aiSummary.executiveSummary}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="p-2.5 rounded-lg bg-[#FAFAF8] border border-[#E9E6E0]">
                  <span className="text-[#A5A19A] text-[10px] block">CONFIDENCE</span>
                  <span className="text-[#258A62] font-semibold">{activeInvestigation.confidenceScore}% Calculated</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FAFAF8] border border-[#E9E6E0]">
                  <span className="text-[#A5A19A] text-[10px] block">SOURCE ASSET</span>
                  <span className="text-[#D94B45] font-semibold">{activeInvestigation.sourceIps[0]}</span>
                </div>
              </div>
            </div>

            {/* MITRE ATT&CK Footprint */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-semibold text-[#77736D] uppercase">
                MITRE ATT&CK MAPPING
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {activeInvestigation.mitreAttack.map((tech) => (
                  <div key={tech.techniqueId} className="px-3 py-1.5 rounded-lg bg-[#F0F6FF] text-[#4F7FC1] border border-[#4F7FC1]/20">
                    <span className="font-semibold">{tech.techniqueId}</span>: {tech.techniqueName}
                  </div>
                ))}
              </div>
            </div>

            {/* Progression Timeline */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono font-semibold text-[#77736D] uppercase">
                PROGRESSION TIMELINE ({activeInvestigation.timelineEvents.length} STAGES)
              </div>
              <div className="space-y-2 border-l-2 border-[#E9E6E0] ml-2 pl-3 font-mono text-xs">
                {activeInvestigation.timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative group p-2.5 rounded-lg bg-[#FAFAF8] border border-[#E9E6E0]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#171717]">{evt.title}</span>
                      <span className="text-[#A5A19A]">{evt.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#77736D] mt-1 font-sans">{evt.description}</p>
                    {evt.evidenceId && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#F15A24]">
                        <span>Evidence: <code>{evt.evidenceId}</code></span>
                        <button onClick={() => copyToClipboard(evt.evidenceId!, evt.evidenceId!)}>
                          {copiedId === evt.evidenceId ? <Check className="w-2.5 h-2.5 text-[#258A62]" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Response & Dry-run execution */}
            {activeInvestigation.assignedPlaybookId && (
              <div className="pt-3 border-t border-[#F0ECE6] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="text-[10px] font-mono text-[#A5A19A] uppercase">Recommended Playbook</div>
                  <div className="font-semibold text-[#171717]">{activeInvestigation.assignedPlaybookId}</div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Zap className="w-3.5 h-3.5" />}
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
