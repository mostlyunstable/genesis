import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Globe, 
  ExternalLink, 
  Activity, 
  AlertTriangle,
  Flame,
  Radio,
  Tag,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { ThreatIntelIndicator } from '@/types';
import { Button } from '@/components/ui/Button';

export const ThreatsPage: React.FC = () => {
  const { threatIntel, incidents, setSelectedIncidentId } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIp, setSelectedIp] = useState<string>(threatIntel[0]?.ip || '198.51.100.42');

  const selectedIndicator = threatIntel.find(t => t.ip === selectedIp) || threatIntel[0];

  const filteredIndicators = threatIntel.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.ip.toLowerCase().includes(q) ||
      item.threatClassification.toLowerCase().includes(q) ||
      item.country.toLowerCase().includes(q) ||
      item.asn.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & GLOBAL ADVERSARY SEARCH BAR
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#54765C]">
                ADVERSARY INTELLIGENCE DATABASE
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">REPUTATION &amp; CORRELATION</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Threat Landscape
            </h1>
            <p className="text-sm text-[#73796F] max-w-2xl leading-relaxed">
              Global threat actor profiles, IOC reputation scores, autonomous behavioral profiling, and ATT&amp;CK technique mapping.
            </p>
          </div>

          <div className="w-full md:w-84">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by IP, ASN, country, or classification..."
                className="w-full bg-[#F0F1EB] border border-[#E3E5DC] focus:border-[#54765C] rounded-full px-4 py-2.5 pl-10 text-xs text-[#20251F] placeholder-[#969B91] font-mono focus:outline-none transition-colors shadow-inner"
              />
              <Search className="w-4 h-4 text-[#969B91] absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN MASTER-DETAIL INTELLIGENCE DOSSIER
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (5 cols): Adversary Indicators Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91] px-1">
            Tracked Adversary IPs ({filteredIndicators.length})
          </div>

          <div className="space-y-3">
            {filteredIndicators.map((indicator) => {
              const isSelected = indicator.ip === selectedIndicator?.ip;

              return (
                <div
                  key={indicator.ip}
                  onClick={() => setSelectedIp(indicator.ip)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#54765C] shadow-origin-sm ring-1 ring-[#54765C]/30'
                      : 'bg-white border-[#E3E5DC] hover:border-[#CFD4C9] hover:bg-[#FAFAF7]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#20251F] text-sm">{indicator.ip}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      indicator.reputationScore >= 80 ? 'bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]' :
                      indicator.reputationScore >= 50 ? 'bg-[#FAF2EC] text-[#C47A45] border border-[#F4E2D5]' :
                      'bg-[#EDF3EF] text-[#64856C] border border-[#DBE7DF]'
                    }`}>
                      REP: {indicator.reputationScore}/100
                    </span>
                  </div>

                  <p className="text-xs text-[#73796F] font-sans mt-2 line-clamp-1">
                    {indicator.threatClassification}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E3E5DC] text-[11px] font-mono text-[#969B91]">
                    <span>{indicator.country}</span>
                    <span>{indicator.asn}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 cols): Selected Threat Dossier */}
        <div className="lg:col-span-7">
          {selectedIndicator ? (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm space-y-6">
              
              {/* Dossier Header */}
              <div className="p-6 border-b border-[#E3E5DC] bg-[#FAFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#73796F]">
                    <Globe className="w-3.5 h-3.5 text-[#54765C]" />
                    <span>{selectedIndicator.country} • {selectedIndicator.asn}</span>
                  </div>
                  <h2 className="font-display text-2xl text-[#20251F] mt-1 font-mono">
                    {selectedIndicator.ip}
                  </h2>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs shrink-0">
                  <div className="px-3.5 py-1.5 rounded-full bg-white border border-[#E3E5DC] text-center">
                    <div className="text-[9px] text-[#969B91] uppercase">Confidence</div>
                    <div className="font-bold text-[#54765C]">{selectedIndicator.confidence}%</div>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-white border border-[#E3E5DC] text-center">
                    <div className="text-[9px] text-[#969B91] uppercase">Reputation</div>
                    <div className="font-bold text-[#B94C43]">{selectedIndicator.reputationScore}/100</div>
                  </div>
                </div>
              </div>

              {/* Dossier Body */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Threat Profile Narrative */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    THREAT PROFILE &amp; HEURISTIC CLASSIFICATION
                  </div>
                  <p className="text-base text-[#20251F] leading-relaxed font-sans">
                    {selectedIndicator.threatClassification}. Observed conducting automated credential brute force against perimeter SSH bastions. Activity exhibits dictionary rotation across standard administrative accounts. Associated with RFC 5737 benchmark evaluation range.
                  </p>
                </div>

                {/* Behavioral Metadata Strip */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E3E5DC] font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">First Seen Telemetry</span>
                    <span className="text-[#20251F] font-bold text-xs mt-1 block">
                      {selectedIndicator.firstSeen.replace('T', ' ').replace('Z', ' UTC')}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Last Seen Telemetry</span>
                    <span className="text-[#20251F] font-bold text-xs mt-1 block">
                      {selectedIndicator.lastSeen.replace('T', ' ').replace('Z', ' UTC')}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Data Feed Source</span>
                    <span className="text-[#54765C] font-bold text-xs mt-1 block">
                      {selectedIndicator.simulatedDataSource}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Geographic Origin</span>
                    <span className="text-[#20251F] font-bold text-xs mt-1 block">
                      {selectedIndicator.country}
                    </span>
                  </div>
                </div>

                {/* Associated Incidents & Targeted Assets */}
                <div className="pt-4 border-t border-[#E3E5DC] space-y-3">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    CORRELATED ENTERPRISE INCIDENTS ({selectedIndicator.associatedIncidents.length})
                  </div>

                  <div className="space-y-2">
                    {selectedIndicator.associatedIncidents.map((incId) => {
                      const incident = incidents.find(i => i.id === incId);

                      return (
                        <div
                          key={incId}
                          onClick={() => setSelectedIncidentId(incId)}
                          className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] hover:border-[#54765C] transition-colors cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="font-bold text-[#54765C]">{incId}</span>
                              <span className="text-[#73796F] font-sans font-medium">{incident?.title || 'Active Correlated Threat'}</span>
                            </div>
                            <div className="text-[11px] text-[#969B91] mt-0.5 font-mono">
                              Risk Score: {incident?.riskScore || 90}/100 • Target: {incident?.targetAccounts.join(', ') || 'bastion-01'}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#969B91]" />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-[#E3E5DC] rounded-3xl text-xs text-[#969B91] font-mono">
              Select an indicator on the left to inspect intelligence dossier.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
