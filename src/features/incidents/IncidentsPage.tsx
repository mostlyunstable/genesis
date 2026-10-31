import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Search, 
  ChevronRight, 
  Zap, 
  CheckCircle2, 
  Clock,
  Activity
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge } from '@/components/ui/Badge';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#38BDF8] uppercase mb-1">
            SECURITY INCIDENT CORRELATION
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Incidents
          </h2>
          <p className="text-sm text-slate-300 font-sans mt-0.5">
            Correlated event sequences requiring analytical assessment or containment.
          </p>
        </div>

        <div className="w-full sm:w-72">
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
        <div className="lg:col-span-5 space-y-3">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-[#0F1523] border border-[#1E293B] rounded-xl text-xs text-[#94A3B8] font-mono">
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
                      ? 'bg-[#141C2E] border-[#0066FF] shadow-cyber-blue ring-1 ring-[#0066FF]/30'
                      : 'bg-[#0F1523] border-[#1E293B] hover:border-[#0066FF]/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-[#FF5722]">{inc.id}</span>
                    <div className="flex items-center gap-1.5">
                      <SeverityBadge severity={inc.severity} />
                      <RiskScoreBadge score={inc.riskScore} size="sm" showLabel={false} />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2 font-sans line-clamp-2">
                    {inc.title}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] mt-3 pt-2.5 border-t border-[#1E293B]">
                    <span>Asset: <strong className="text-white">{inc.sourceIps[0]}</strong></span>
                    <span className="capitalize px-2 py-0.5 rounded-full bg-[#161F30] text-[#38BDF8] border border-[#0066FF]/30 font-bold font-mono text-[10px]">
                      {inc.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Clean Incident Detail Dossier (7 cols) */}
        {activeIncident && (
          <div className="lg:col-span-7 bg-[#0F1523] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-cyber-lg space-y-6 relative overflow-hidden">
            {/* Top Glowing Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0066FF] via-[#38BDF8] to-[#FF5722]" />

            <div className="space-y-2 border-b border-[#1E293B] pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#FF5722]">{activeIncident.id}</span>
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

              <h3 className="text-xl font-bold text-white font-sans tracking-tight">
                {activeIncident.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                {activeIncident.detectionExplanation}
              </p>
            </div>

            {/* AI Summary Banner */}
            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] space-y-2 text-xs">
              <div className="text-[10px] font-mono font-bold text-[#38BDF8] uppercase tracking-[0.15em] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>ANALYTICAL SUMMARY</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-sans font-normal">
                {activeIncident.aiSummary.executiveSummary}
              </p>
            </div>

            {/* Investigation Progression Timeline */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono font-bold text-[#64748B] tracking-[0.15em] uppercase">
                PROGRESSION TIMELINE
              </div>
              <div className="space-y-2 border-l-2 border-[#1E293B] ml-2 pl-4 font-mono text-xs">
                {activeIncident.timelineEvents.map((evt) => (
                  <div key={evt.id} className="p-3 rounded-xl bg-[#0B0F17] border border-[#1E293B]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{evt.title}</span>
                      <span className="text-[#64748B] text-[11px]">{evt.timestamp}</span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1 font-sans">{evt.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Response Trigger */}
            <div className="pt-4 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0B0F17] p-4 rounded-xl border border-[#1E293B]">
              <div>
                <div className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider">Assigned Playbook</div>
                <div className="font-bold text-white text-sm font-mono mt-0.5">{activeIncident.assignedPlaybookId}</div>
              </div>

              <Button
                variant="primary"
                size="md"
                icon={<Zap className="w-4 h-4" />}
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
