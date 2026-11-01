import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  RefreshCw,
  Inbox
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
    fetchIncidents,
    isLoading,
    error,
    addNotification 
  } = useSecurityStore();

  const [statusFilter, setStatusFilter] = useState<'ALL' | Incident['status']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchIncidents();
    setIsRefreshing(false);
  };

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || (incidents.length > 0 ? incidents[0] : null);

  const filteredIncidents = incidents.filter(i => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        (i.sourceIps && i.sourceIps.some(ip => ip.includes(q))) ||
        (i.targetAccounts && i.targetAccounts.some(acc => acc.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  const handleStatusUpdate = async (newStatus: Incident['status']) => {
    if (!selectedIncident) return;
    const ok = await updateIncidentStatus(selectedIncident.id, newStatus);
    if (ok) {
      addNotification({
        type: 'info',
        title: 'Incident Status Transition',
        message: `${selectedIncident.id} updated to ${newStatus.toUpperCase()}.`
      });
    }
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
              <span className="text-[10px] font-mono text-[#73796F]">
                CORRELATED ENGAGEMENTS ({incidents.length})
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Incident Command
            </h1>
            <p className="text-sm text-[#73796F] max-w-2xl leading-relaxed">
              Active multi-signal adversary operations, asset compromise triage, and governed containment lifecycle.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter Pills */}
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

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] hover:border-[#54765C] transition-colors cursor-pointer"
              title="Refresh incidents"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN MASTER-DETAIL INCIDENT QUEUE
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (5 cols): Incident Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91]">
              Incident Queue ({filteredIncidents.length})
            </span>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-[#E3E5DC] text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF0E6] text-[#54765C] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base text-[#20251F]">No incidents detected</h3>
              <p className="text-xs text-[#73796F] max-w-xs mx-auto">
                No incidents match the current filter. Ingest security telemetry to trigger automated threat correlation.
              </p>
            </div>
          ) : (
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
                      <span>Target: <strong className="text-[#20251F]">{inc.targetAccounts?.join(', ') || 'N/A'}</strong></span>
                      <span>Risk: <strong className={inc.riskScore > 80 ? 'text-[#B94C43]' : 'text-[#C47A45]'}>{inc.riskScore}/100</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                    <span className="text-[#969B91]">
                      Created: {new Date(selectedIncident.createdAt).toLocaleTimeString()}
                    </span>
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
                    {selectedIncident.aiSummary?.executiveSummary || selectedIncident.detectionExplanation || 'No executive summary provided.'}
                  </p>
                </div>

                {/* Key Correlated Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E3E5DC] font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase font-bold">Adversary IP</span>
                    <div className="text-sm font-bold text-[#B94C43] mt-1 truncate">
                      {selectedIncident.sourceIps?.join(', ') || 'N/A'}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase font-bold">Target User</span>
                    <div className="text-sm font-bold text-[#20251F] mt-1 truncate">
                      {selectedIncident.targetAccounts?.join(', ') || 'N/A'}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase font-bold">Correlated Events</span>
                    <div className="text-sm font-bold text-[#20251F] mt-1">
                      {selectedIncident.eventCount}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase font-bold">Confidence</span>
                    <div className="text-sm font-bold text-[#54765C] mt-1">
                      {selectedIncident.confidenceScore}%
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl p-12 text-center space-y-3 shadow-origin-sm">
              <div className="w-12 h-12 rounded-full bg-[#F0F1EB] text-[#73796F] mx-auto flex items-center justify-center">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg text-[#20251F]">No incident selected</h3>
              <p className="text-sm text-[#73796F] max-w-sm mx-auto">
                Select an incident from the queue to inspect root-cause analysis, correlated telemetry, and lifecycle controls.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
