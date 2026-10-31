import React, { useState } from 'react';
import { 
  Flame, 
  Search, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  User,
  Radio,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Incident } from '@/types';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const IncidentsPage: React.FC = () => {
  const { 
    incidents, 
    selectedIncidentId, 
    setSelectedIncidentId, 
    updateIncidentStatus,
    addNotification 
  } = useSecurityStore();

  const [statusFilter, setStatusFilter] = useState<'ALL' | Incident['status']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

  const filteredIncidents = incidents.filter(i => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.sourceIps.some(ip => ip.includes(q)) ||
        i.targetAccounts.some(acc => acc.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleStatusUpdate = (newStatus: Incident['status']) => {
    if (!selectedIncident) return;
    updateIncidentStatus(selectedIncident.id, newStatus);
    addNotification({
      type: 'info',
      title: 'Incident Lifecycle Updated',
      message: `${selectedIncident.id} marked as ${newStatus.toUpperCase()}.`
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. INCIDENT COMMAND HEADER & LIFECYCLE FILTERS
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#38BDF8] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#F97316]" />
                INCIDENT OPERATIONS CENTER
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-[10px] font-mono text-[#94A3B8]">CORRELATED MULTI-SIGNAL INCIDENTS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Incident Management
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Multi-vector adversary engagements, target exposure, evidence progression, and incident lifecycle state.
            </p>
          </div>

          {/* Quick Lifecycle Filters */}
          <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
            {(['ALL', 'active', 'investigating', 'contained', 'resolved'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8] font-bold'
                    : 'bg-[#07080B] border-[#1C2230] text-[#94A3B8] hover:text-white'
                }`}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN MASTER-DETAIL INCIDENT ENVIRONMENT
          Left (5 cols): Incident Queue
          Right (7 cols): Full Incident Dossier & Lifecycle Controls
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Incidents List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B] px-1">
            Correlated Incidents ({filteredIncidents.length})
          </div>

          <div className="space-y-2">
            {filteredIncidents.map((incident) => {
              const isSelected = incident.id === selectedIncident?.id;

              return (
                <div
                  key={incident.id}
                  onClick={() => setSelectedIncidentId(incident.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#161B26] border-[#38BDF8] ring-1 ring-[#38BDF8]/20 shadow-sm'
                      : 'bg-[#10131B] border-[#1C2230] hover:border-[#2A3347]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#38BDF8]">{incident.id}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={incident.severity} />
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#07080B] text-[#64748B] border border-[#1C2230] uppercase">
                        {incident.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white font-sans mt-1 leading-snug">
                    {incident.title}
                  </h3>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#1C2230] text-[11px] font-mono text-[#64748B]">
                    <span>Target: <strong className="text-slate-300">{incident.targetAccounts.join(', ')}</strong></span>
                    <span>Risk: <strong className="text-[#EF4444]">{incident.riskScore}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Full Incident Dossier */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm space-y-6">
              
              {/* Incident Header & Lifecycle Status Control */}
              <div className="p-5 border-b border-[#1C2230] bg-[#0C0E14] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#38BDF8] font-bold">{selectedIncident.id}</span>
                    <SeverityBadge severity={selectedIncident.severity} />
                    <span className="text-[#64748B]">Created: {selectedIncident.createdAt.split('T')[1]?.replace('Z', ' UTC')}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {selectedIncident.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedIncident.status}
                    onChange={(e) => handleStatusUpdate(e.target.value as Incident['status'])}
                    className="bg-[#07080B] border border-[#1C2230] text-white px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-[#38BDF8]"
                  >
                    <option value="active">STATUS: ACTIVE</option>
                    <option value="investigating">STATUS: INVESTIGATING</option>
                    <option value="contained">STATUS: CONTAINED</option>
                    <option value="resolved">STATUS: RESOLVED</option>
                    <option value="dismissed">STATUS: DISMISSED</option>
                  </select>
                </div>
              </div>

              {/* Dossier Content */}
              <div className="p-5 space-y-6">
                
                {/* Executive Summary & Root Cause */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    EXECUTIVE INCIDENT SUMMARY
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {selectedIncident.aiSummary.executiveSummary}
                  </p>
                </div>

                {/* Scope & Identity Ribbons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#1C2230] font-mono text-xs">
                  <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[10px] text-[#64748B] uppercase block">Adversary IPs</span>
                    <span className="text-[#F97316] font-bold text-sm block mt-0.5 truncate">{selectedIncident.sourceIps.join(', ')}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[10px] text-[#64748B] uppercase block">Target Accounts</span>
                    <span className="text-white font-bold text-sm block mt-0.5 truncate">{selectedIncident.targetAccounts.join(', ')}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[10px] text-[#64748B] uppercase block">Risk Score</span>
                    <span className="text-[#EF4444] font-bold text-sm block mt-0.5">{selectedIncident.riskScore}/100</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[10px] text-[#64748B] uppercase block">Event Volume</span>
                    <span className="text-white font-bold text-sm block mt-0.5">{selectedIncident.eventCount} events</span>
                  </div>
                </div>

                {/* Root Cause Analysis */}
                <div className="pt-4 border-t border-[#1C2230] space-y-1">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    ROOT CAUSE ANALYSIS
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    {selectedIncident.aiSummary.rootCauseAnalysis}
                  </p>
                </div>

                {/* Attack Progression Timeline */}
                <div className="pt-4 border-t border-[#1C2230] space-y-3">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    EVIDENCE &amp; ATTACK PROGRESSION TIMELINE
                  </div>
                  <div className="border-l-2 border-[#1C2230] ml-2 pl-4 space-y-3 font-mono text-xs">
                    {selectedIncident.timelineEvents.map((evt) => (
                      <div key={evt.id} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white font-sans">{evt.title}</span>
                          <span className="text-[11px] text-[#64748B]">{evt.timestamp.split('T')[1]?.replace('Z', ' UTC')}</span>
                        </div>
                        <p className="text-xs text-[#94A3B8] font-sans">{evt.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned Playbook */}
                {selectedIncident.assignedPlaybookId && (
                  <div className="pt-4 border-t border-[#1C2230] p-4 rounded-xl bg-[#07080B] border border-[#1C2230] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-[#F97316] font-bold uppercase">
                        Assigned Defense Playbook
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5 font-mono">
                        {selectedIncident.assignedPlaybookId}
                      </div>
                    </div>
                    <Button
                      variant="action"
                      size="sm"
                      onClick={() => handleStatusUpdate('contained')}
                    >
                      Contain Incident
                    </Button>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-[#10131B] border border-[#1C2230] rounded-xl text-xs text-[#94A3B8] font-mono">
              Select an incident from the queue on the left.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
