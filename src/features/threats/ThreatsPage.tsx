import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Zap,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Detection } from '@/types';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

export const ThreatsPage: React.FC = () => {
  const { detections, executePlaybookAction } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreatId, setSelectedThreatId] = useState<string>('DET-2026-0891');

  const selectedThreat = detections.find(d => d.id === selectedThreatId) || detections[0];

  const filteredDetections = detections.filter(d => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.sourceIp.includes(q)
      );
    }
    return true;
  });

  const handleExecutePlaybook = async (threat: Detection) => {
    if (!threat.suggestedPlaybookId) return;
    await executePlaybookAction(
      threat.suggestedPlaybookId,
      `Simulated Mitigation for ${threat.name}`,
      threat.sourceIp,
      threat.associatedIncidentId
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#38BDF8] uppercase mb-1">
            BEHAVIORAL HEURISTICS
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Threats
          </h2>
          <p className="text-sm text-slate-300 font-sans mt-0.5">
            Behavioral detections and heuristic threshold matches.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter threats by ID, name, or IP..."
          />
        </div>
      </div>

      {/* Clean 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Threats List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {filteredDetections.length === 0 ? (
            <div className="p-8 text-center bg-[#0F1523] border border-[#1E293B] rounded-xl text-xs text-[#94A3B8] font-mono">
              No threats match filter criteria.
            </div>
          ) : (
            filteredDetections.map((threat) => {
              const isSelected = selectedThreat?.id === threat.id;

              return (
                <div
                  key={threat.id}
                  onClick={() => setSelectedThreatId(threat.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#141C2E] border-[#0066FF] shadow-cyber-blue ring-1 ring-[#0066FF]/30'
                      : 'bg-[#0F1523] border-[#1E293B] hover:border-[#0066FF]/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-[#FF5722]">{threat.id}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={threat.severity} />
                      <RiskScoreBadge score={threat.riskScore} size="sm" showLabel={false} />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2 font-sans line-clamp-1">
                    {threat.name}
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-1.5 line-clamp-2 font-sans leading-relaxed">
                    {threat.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] mt-3 pt-2.5 border-t border-[#1E293B]">
                    <span>Source: <strong className="text-[#FF5722]">{threat.sourceIp}</strong></span>
                    <span className="text-[#10B981] font-semibold">{threat.confidence}% Confidence</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Clean Threat Details Dossier (7 cols) */}
        {selectedThreat && (
          <div className="lg:col-span-7 bg-[#0F1523] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-cyber-lg space-y-6 relative overflow-hidden">
            {/* Top Glowing Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0066FF] via-[#38BDF8] to-[#FF5722]" />

            <div className="space-y-2 border-b border-[#1E293B] pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#FF5722]">{selectedThreat.id}</span>
                <RiskScoreBadge score={selectedThreat.riskScore} />
              </div>
              <h3 className="text-xl font-bold text-white font-sans tracking-tight">
                {selectedThreat.name}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                {selectedThreat.description}
              </p>
            </div>

            {/* Core Attribution Grid */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3.5 bg-[#0B0F17] rounded-xl border border-[#1E293B]">
                <span className="text-[#64748B] text-[10px] uppercase tracking-wider block">Adversary Source IP</span>
                <span className="text-[#FF5722] font-bold text-sm mt-1 block">{selectedThreat.sourceIp}</span>
              </div>
              <div className="p-3.5 bg-[#0B0F17] rounded-xl border border-[#1E293B]">
                <span className="text-[#64748B] text-[10px] uppercase tracking-wider block">Heuristic Confidence</span>
                <span className="text-[#10B981] font-bold text-sm mt-1 block">{selectedThreat.confidence}% Calculated</span>
              </div>
            </div>

            {/* Triggering Conditions */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-[#64748B] tracking-[0.15em] uppercase">
                TRIGGERING BEHAVIORAL CONDITIONS
              </div>
              <ul className="space-y-2 font-sans text-xs bg-[#0B0F17] p-4 rounded-xl border border-[#1E293B]">
                {selectedThreat.triggeringConditions.map((cond, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-slate-200">
                    <span className="text-[#FF5722] font-bold text-sm leading-none">•</span>
                    <span className="leading-relaxed">{cond}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Target Accounts */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold text-[#64748B] tracking-[0.15em] uppercase">
                TARGETED IDENTITIES ({selectedThreat.targetAccounts.length})
              </div>
              <div className="flex flex-wrap gap-2 font-mono text-xs">
                {selectedThreat.targetAccounts.map((acct) => (
                  <span key={acct} className="px-3 py-1 rounded-lg bg-[#141C2E] text-slate-200 border border-[#1E293B] font-semibold">
                    {acct}
                  </span>
                ))}
              </div>
            </div>

            {/* Playbook Trigger Strip */}
            {selectedThreat.suggestedPlaybookId && (
              <div className="pt-4 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B0F17] p-4 rounded-xl border border-[#1E293B]">
                <div>
                  <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Suggested Mitigation Playbook</div>
                  <div className="font-bold text-white text-sm font-mono mt-0.5">{selectedThreat.suggestedPlaybookId}</div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Zap className="w-4 h-4" />}
                  onClick={() => handleExecutePlaybook(selectedThreat)}
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
