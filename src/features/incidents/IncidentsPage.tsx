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
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Incident } from '@/types';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
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
      title: 'Incident Status Transition',
      message: `${selectedIncident.id} updated to ${newStatus.toUpperCase()}.`
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. EDITORIAL INCIDENT HEADER & LIFECYCLE FILTER PILLS
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C47A45]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#C47A45] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                INCIDENT OPERATIONS CENTER
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">CORRELATED ENGAGEMENTS</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Incident Command
            </h1>
            <p className="text-sm text-[#73796F] max-w-2xl leading-relaxed">
              Active multi-signal adversary operations, asset compromise triage, and governed containment lifecycle.
            </p>
          </div>

          {/* Status Filter Pills (Light-First Origin X Style) */}
          <div className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-full bg-[#F0F1EB] border border-[#E3E5DC]">
            {(['ALL', 'active', 'investigating', 'contained', 'resolved'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-[#54765C] text-white shadow-sm'
                    : 'text-[#73796F] hover:text-[#20251F] hover:bg-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN MASTER-DETAIL INCIDENT QUEUE
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (5 cols): Incident Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91] px-1">
            Active Incidents Queue ({filteredIncidents.length})
          </div>

          <div className="space-y-3">
            {filteredIncidents.map((inc) => {
              const isSelected = inc.id === selectedIncident?.id;

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#54765C] shadow-origin-sm ring-1 ring-[#54765C]/30'
                      : 'bg-white border-[#E3E5DC] hover:border-[#CFD4C9] hover:bg-[#FAFAF7]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#54765C] text-sm">{inc.id}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={inc.severity} />
                      <span className="text-[10px] text-[#969B91] uppercase font-bold">{inc.status}</span>
                    </div>
                  </div>

                  <h3 className="font-display text-xl text-[#20251F] font-bold mt-2">
                    {inc.title}
                  </h3>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E3E5DC] text-[11px] font-mono text-[#73796F]">
                    <span>Target: <strong className="text-[#20251F]">{inc.targetAccounts.join(', ')}</strong></span>
                    <span>Risk: <strong className={inc.riskScore > 80 ? 'text-[#B94C43]' : 'text-[#C47A45]'}>{inc.riskScore}/100</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 cols): Deep Incident Dossier */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm space-y-6">
              
              {/* Dossier Header */}
              <div className="p-6 border-b border-[#E3E5DC] bg-[#FAFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-xs font-mono">
                    <span className="text-[#54765C] font-bold">{selectedIncident.id}</span>
                    <SeverityBadge severity={selectedIncident.severity} />
                    <span className="text-[#969B91]">Created: {selectedIncident.createdAt.split('T')[1]?.replace('Z', ' UTC')}</span>
                  </div>
                  <h2 className="font-display text-2xl text-[#20251F] mt-1 font-bold">
                    {selectedIncident.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedIncident.status}
                    onChange={(e) => handleStatusUpdate(e.target.value as Incident['status'])}
                    className="bg-white border border-[#E3E5DC] text-[#20251F] px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-[#54765C] cursor-pointer"
                  >
                    <option value="active">STATUS: ACTIVE</option>
                    <option value="investigating">STATUS: INVESTIGATING</option>
                    <option value="contained">STATUS: CONTAINED</option>
                    <option value="resolved">STATUS: RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Dossier Content */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Executive Summary */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    EXECUTIVE INCIDENT SUMMARY
                  </div>
                  <p className="text-base text-[#20251F] leading-relaxed font-sans">
                    {selectedIncident.aiSummary.executiveSummary}
                  </p>
                </div>

                {/* Key Correlated Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E3E5DC] font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Adversary IPs</span>
                    <span className="text-[#B94C43] font-bold text-sm block mt-0.5 truncate">{selectedIncident.sourceIps.join(', ')}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Target Accounts</span>
                    <span className="text-[#20251F] font-bold text-sm block mt-0.5 truncate">{selectedIncident.targetAccounts.join(', ')}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Risk Score</span>
                    <span className="text-[#B94C43] font-bold text-sm block mt-0.5">{selectedIncident.riskScore}/100</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Event Volume</span>
                    <span className="text-[#20251F] font-bold text-sm block mt-0.5">{selectedIncident.eventCount} evts</span>
                  </div>
                </div>

                {/* Root Cause Analysis */}
                <div className="pt-4 border-t border-[#E3E5DC] space-y-2">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    ROOT CAUSE ANALYSIS
                  </div>
                  <p className="text-sm text-[#73796F] font-sans leading-relaxed">
                    {selectedIncident.aiSummary.rootCauseAnalysis}
                  </p>
                </div>

                {/* MITRE Techniques */}
                <div className="pt-4 border-t border-[#E3E5DC] space-y-2.5">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    CORRELATED MITRE ATT&amp;CK TECHNIQUES
                  </div>
                  <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                    {selectedIncident.mitreAttack.map((t) => (
                      <span key={t.techniqueId} className="px-3 py-1 rounded-full bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9]">
                        {t.techniqueId} - {t.techniqueName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Assigned Countermeasure */}
                <div className="pt-4 border-t border-[#E3E5DC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#C47A45] font-bold tracking-wider">
                      RECOMMENDED DEFENSE PLAYBOOK
                    </div>
                    <div className="text-sm font-bold text-[#20251F] font-sans mt-0.5">
                      {selectedIncident.assignedPlaybookId} — Automated Session Revocation
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    icon={<ShieldCheck className="w-4 h-4" />}
                    onClick={() => handleStatusUpdate('contained')}
                  >
                    Simulate Containment
                  </Button>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-[#E3E5DC] rounded-3xl text-xs text-[#969B91] font-mono">
              Select an incident on the left to inspect intelligence dossier.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
