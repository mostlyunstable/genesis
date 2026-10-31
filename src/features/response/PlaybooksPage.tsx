import React, { useState } from 'react';
import { 
  BookOpen, 
  Zap, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  Search,
  ExternalLink
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { ResponsePlaybook } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const PlaybooksPage: React.FC = () => {
  const { playbooks, executePlaybookAction } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPlaybookId, setExpandedPlaybookId] = useState<string | null>('PB-SSH-BRUTE-01');

  const filteredPlaybooks = playbooks.filter(pb => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        pb.name.toLowerCase().includes(q) ||
        pb.id.toLowerCase().includes(q) ||
        pb.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleTestExecution = async (playbook: ResponsePlaybook) => {
    await executePlaybookAction(
      playbook.id,
      `Simulated Manual Trigger of ${playbook.name}`,
      '198.51.100.42 (Simulated Target)'
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Defensive Response Playbooks</h2>
            <Badge variant="accent">SOAR ORCHESTRATION</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Deterministic stateful countermeasures with pre-flight verification, scoped privilege limits, and rollback paths.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search playbooks..."
          />
        </div>
      </div>

      {/* Playbooks List */}
      <div className="space-y-4">
        {filteredPlaybooks.map((pb) => {
          const isExpanded = expandedPlaybookId === pb.id;

          return (
            <Card
              key={pb.id}
              title={
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-[#E0A34A] font-bold">{pb.id}</span>
                  <span className="text-sm font-semibold text-[#E8EDF4] font-sans">{pb.name}</span>
                </div>
              }
              badge={
                <Badge variant={pb.enabled ? 'success' : 'neutral'}>
                  {pb.enabled ? 'ACTIVE POLICY' : 'DISABLED'}
                </Badge>
              }
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Play className="w-3 h-3" />}
                    onClick={() => handleTestExecution(pb)}
                  >
                    Simulate Execution
                  </Button>
                  <button
                    onClick={() => setExpandedPlaybookId(isExpanded ? null : pb.id)}
                    className="p-1 rounded text-[#8994A4] hover:text-[#E8EDF4] cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              }
            >
              <div className="space-y-3 font-mono text-xs">
                <p className="text-[#8994A4] font-sans text-xs leading-relaxed">
                  {pb.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-[#1C2430]">
                  <div className="p-2 bg-[#0D1016] rounded border border-[#1C2430]">
                    <div className="text-[10px] text-[#586574] uppercase">Trigger Severities</div>
                    <div className="flex gap-1 mt-1">
                      {pb.severityTrigger.map(s => <SeverityBadge key={s} severity={s} />)}
                    </div>
                  </div>
                  <div className="p-2 bg-[#0D1016] rounded border border-[#1C2430]">
                    <div className="text-[10px] text-[#586574] uppercase">Historical Runs</div>
                    <div className="text-xs font-bold text-[#42B883] mt-1">{pb.executionCount} Executions</div>
                  </div>
                  <div className="p-2 bg-[#0D1016] rounded border border-[#1C2430] md:col-span-2">
                    <div className="text-[10px] text-[#586574] uppercase">Enforcement Scope</div>
                    <div className="text-xs text-[#E8EDF4] mt-1 truncate">{pb.allowedScope}</div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#252D38] space-y-4 text-xs font-mono">
                    {/* Trigger Conditions */}
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-[#8994A4] mb-1.5">
                        Trigger Conditions
                      </div>
                      <ul className="space-y-1 bg-[#0D1016] p-2.5 rounded border border-[#1C2430]">
                        {pb.triggers.map((trig, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-[#E8EDF4]">
                            <span className="text-[#E0A34A]">•</span>
                            <span>{trig}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Investigation Requirements */}
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-[#8994A4] mb-1.5">
                        Pre-Flight Investigation Requirements
                      </div>
                      <ul className="space-y-1 bg-[#0D1016] p-2.5 rounded border border-[#1C2430]">
                        {pb.investigationRequirements.map((req, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-[#8994A4]">
                            <span className="text-[#6DA9E8]">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Steps Table */}
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-[#8994A4] mb-1.5">
                        Sequential Countermeasure Steps
                      </div>
                      <div className="border border-[#1C2430] rounded overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#080A0E] text-[#586574] uppercase">
                            <tr>
                              <th className="py-2 px-3">#</th>
                              <th className="py-2 px-3">Action Description</th>
                              <th className="py-2 px-3">Target Scope</th>
                              <th className="py-2 px-3">Automation Level</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1C2430]">
                            {pb.responseSteps.map((step) => (
                              <tr key={step.stepNumber} className="hover:bg-[#121720]">
                                <td className="py-2 px-3 text-[#E0A34A] font-bold">{step.stepNumber}</td>
                                <td className="py-2 px-3 text-[#E8EDF4]">{step.action}</td>
                                <td className="py-2 px-3 uppercase text-[#8994A4]">{step.targetType}</td>
                                <td className="py-2 px-3">
                                  {step.automated ? (
                                    <span className="text-[#42B883]">Autonomous</span>
                                  ) : (
                                    <span className="text-[#E5AD52]">Requires Approval</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Verification & Rollback */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-[#0D1016] rounded border border-[#1C2430] space-y-1">
                        <div className="text-[10px] text-[#586574] uppercase font-semibold">Verification Protocol</div>
                        <ul className="space-y-1 text-[#8994A4]">
                          {pb.verificationSteps.map((v, i) => (
                            <li key={i}>• {v}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-[#0D1016] rounded border border-[#1C2430] space-y-1">
                        <div className="text-[10px] text-[#586574] uppercase font-semibold">Rollback & Fallback Strategy</div>
                        <p className="text-[#8994A4]">{pb.rollbackStrategy}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
