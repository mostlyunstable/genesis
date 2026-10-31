import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Search, 
  ChevronRight, 
  ShieldAlert, 
  Clock, 
  Zap, 
  CheckCircle2, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Incident } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, selectedIncidentId, setSelectedIncidentId, updateIncidentStatus, executePlaybookAction } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');

  const activeIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

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

  const handleSimulateResponse = async () => {
    if (!activeIncident?.assignedPlaybookId) return;
    await executePlaybookAction(
      activeIncident.assignedPlaybookId,
      'Incident Automated Quarantine Dry Run',
      activeIncident.sourceIps[0],
      activeIncident.id
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E6E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#171717] font-sans">
            Incidents
          </h2>
          <p className="text-xs text-[#77736D] font-sans mt-0.5">
            Correlated event sequences requiring analytical assessment or containment.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter incidents..."
          />
        </div>
      </div>

      {/* Clean 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Incidents List (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-white border border-[#E9E6E0] rounded-xl text-xs text-[#77736D] font-mono">
              No active incidents.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isSelected = activeIncident?.id === inc.id;

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-[#F15A24] shadow-sm ring-1 ring-[#F15A24]/20'
                      : 'bg-white border-[#E9E6E0] hover:border-[#D8D4CC] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-[#F15A24]">{inc.id}</span>
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={inc.severity} />
                      <RiskScoreBadge score={inc.riskScore} size="sm" showLabel={false} />
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-[#171717] mt-2 font-sans line-clamp-2">
                    {inc.title}
                  </h3>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#A5A19A] mt-3 pt-2.5 border-t border-[#F0ECE6]">
                    <span>Asset: <strong className="text-[#171717]">{inc.sourceIps[0]}</strong></span>
                    <span className="capitalize px-2 py-0.5 rounded-full bg-[#F3F2EE] text-[#77736D] font-medium font-sans">
                      {inc.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Clean Incident Detail & Investigation Timeline (7 cols) */}
        {activeIncident && (
          <div className="lg:col-span-7 bg-white border border-[#E9E6E0] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-2 border-b border-[#F0ECE6] pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#F15A24]">{activeIncident.id}</span>
                <div className="flex items-center gap-2">
                  <RiskScoreBadge score={activeIncident.riskScore} />
                  <Select
                    value={activeIncident.status}
                    onChange={(e) => updateIncidentStatus(activeIncident.id, e.target.value as any)}
                    className="text-xs font-mono"
                  >
                    <option value="active">Active</option>
                    <option value="investigating">Investigating</option>
                    <option value="contained">Contained</option>
                    <option value="resolved">Resolved</option>
                  </Select>
                </div>
              </div>

              <h3 className="text-lg font-bold text-[#171717] font-sans">
                {activeIncident.title}
              </h3>
              <p className="text-xs text-[#77736D] leading-relaxed font-sans">
                {activeIncident.detectionExplanation}
              </p>
            </div>

            {/* AI Summary Banner */}
            <div className="p-4 rounded-xl bg-[#FFF0E8]/50 border border-[#F15A24]/20 space-y-2 text-xs">
              <div className="text-[10px] font-mono font-semibold text-[#F15A24] uppercase">
                ANALYTICAL SUMMARY
              </div>
              <p className="text-[#171717] leading-relaxed font-sans">
                {activeIncident.aiSummary.executiveSummary}
              </p>
            </div>

            {/* Investigation Progression Timeline */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono font-semibold text-[#77736D] uppercase">
                PROGRESSION TIMELINE
              </div>
              <div className="space-y-2 border-l-2 border-[#E9E6E0] ml-2 pl-3 font-mono text-xs">
                {activeIncident.timelineEvents.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-lg bg-[#FAFAF8] border border-[#E9E6E0]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#171717]">{evt.title}</span>
                      <span className="text-[#A5A19A]">{evt.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#77736D] mt-1 font-sans">{evt.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Trigger */}
            <div className="pt-3 border-t border-[#F0ECE6] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs">
                <div className="text-[10px] font-mono text-[#A5A19A] uppercase">Assigned Playbook</div>
                <div className="font-semibold text-[#171717]">{activeIncident.assignedPlaybookId}</div>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={<Zap className="w-3.5 h-3.5" />}
                onClick={handleSimulateResponse}
              >
                Execute Policy Dry Run
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
