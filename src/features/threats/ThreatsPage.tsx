import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sliders, 
  FileText,
  Clock,
  Zap
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Detection } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

export const ThreatsPage: React.FC = () => {
  const { detections, updateDetectionStatus, executePlaybookAction } = useSecurityStore();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E6E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#171717] font-sans">
            Threat Detections
          </h2>
          <p className="text-xs text-[#77736D] font-sans mt-0.5">
            Behavioral anomaly detections identified by Genysis rule engines.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search detected threats..."
          />
        </div>
      </div>

      {/* Clean 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Threats List (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredDetections.map((threat) => {
            const isSelected = selectedThreat?.id === threat.id;

            return (
              <div
                key={threat.id}
                onClick={() => setSelectedThreatId(threat.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-[#F15A24] shadow-sm ring-1 ring-[#F15A24]/20'
                    : 'bg-white border-[#E9E6E0] hover:border-[#D8D4CC] shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-semibold text-[#F15A24]">{threat.id}</span>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={threat.severity} />
                    <RiskScoreBadge score={threat.riskScore} size="sm" showLabel={false} />
                  </div>
                </div>

                <h3 className="text-xs font-bold text-[#171717] mt-2 font-sans line-clamp-1">
                  {threat.name}
                </h3>

                <p className="text-[11px] text-[#77736D] mt-1 line-clamp-2 font-sans">
                  {threat.description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-[#A5A19A] mt-3 pt-2.5 border-t border-[#F0ECE6]">
                  <span>Source: <strong className="text-[#D94B45]">{threat.sourceIp}</strong></span>
                  <span>Confidence: <strong className="text-[#258A62]">{threat.confidence}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Clean Threat Details View (7 cols) */}
        {selectedThreat && (
          <div className="lg:col-span-7 bg-white border border-[#E9E6E0] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="space-y-2 border-b border-[#F0ECE6] pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#F15A24]">{selectedThreat.id}</span>
                <RiskScoreBadge score={selectedThreat.riskScore} />
              </div>
              <h3 className="text-lg font-bold text-[#171717] font-sans">
                {selectedThreat.name}
              </h3>
              <p className="text-xs text-[#77736D] leading-relaxed font-sans">
                {selectedThreat.description}
              </p>
            </div>

            {/* Core Attribution Grid */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E9E6E0]">
                <span className="text-[#A5A19A] text-[10px] block">ADVERSARY SOURCE IP</span>
                <span className="text-[#D94B45] font-semibold mt-0.5 block">{selectedThreat.sourceIp}</span>
              </div>
              <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E9E6E0]">
                <span className="text-[#A5A19A] text-[10px] block">HEURISTIC CONFIDENCE</span>
                <span className="text-[#258A62] font-semibold mt-0.5 block">{selectedThreat.confidence}% Verified</span>
              </div>
            </div>

            {/* Triggering Conditions */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-semibold text-[#77736D] uppercase">
                TRIGGERING BEHAVIORAL CONDITIONS
              </div>
              <ul className="space-y-1.5 font-sans text-xs bg-[#FAFAF8] p-3.5 rounded-xl border border-[#E9E6E0]">
                {selectedThreat.triggeringConditions.map((cond, i) => (
                  <li key={i} className="flex items-start gap-2 text-[#171717]">
                    <span className="text-[#F15A24] font-bold">•</span>
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Target Accounts */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-semibold text-[#77736D] uppercase">
                TARGETED IDENTITIES ({selectedThreat.targetAccounts.length})
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {selectedThreat.targetAccounts.map((acct) => (
                  <span key={acct} className="px-2.5 py-1 rounded-md bg-[#F3F2EE] text-[#171717] border border-[#E9E6E0]">
                    {acct}
                  </span>
                ))}
              </div>
            </div>

            {/* Playbook Trigger */}
            {selectedThreat.suggestedPlaybookId && (
              <div className="pt-4 border-t border-[#F0ECE6] flex items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="text-[10px] font-mono text-[#A5A19A] uppercase">Suggested Playbook</div>
                  <div className="font-semibold text-[#171717]">{selectedThreat.suggestedPlaybookId}</div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Zap className="w-3.5 h-3.5" />}
                  onClick={() => handleExecutePlaybook(selectedThreat)}
                >
                  Execute Defensive Dry Run
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
