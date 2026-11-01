import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { ThreatIntelIndicator } from '@/types';
import { Button } from '@/components/ui/Button';

export const ThreatsPage: React.FC = () => {
  const { threatIntel, incidents, setSelectedIncidentId, fetchThreatIntel } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchThreatIntel();
  }, [fetchThreatIntel]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchThreatIntel();
    setIsRefreshing(false);
  };

  const selectedIndicator = threatIntel.find(t => t.ip === selectedIp) || (threatIntel.length > 0 ? threatIntel[0] : null);

  const filteredIndicators = threatIntel.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.ip.toLowerCase().includes(q) ||
      item.threatClassification.toLowerCase().includes(q) ||
      (item.country && item.country.toLowerCase().includes(q)) ||
      (item.asn && item.asn.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & GLOBAL ADVERSARY SEARCH BAR
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl text-[#20251F] tracking-tight">
              Threat Intel
            </h1>
            <p className="text-sm text-[#73796F]">
              Adversary indicators, reputation scores, and observed threat actors ({threatIntel.length} tracked).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IP, ASN, country..."
                className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 pl-10 text-xs text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C]"
              />
              <Search className="w-4 h-4 text-[#969B91] absolute left-3.5 top-3 pointer-events-none" />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-[#F0F1EB] hover:bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
              title="Refresh intelligence"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN MASTER-DETAIL INTELLIGENCE DOSSIER
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (5 cols): Indicator Repository */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91] px-1">
            Tracked External Indicators ({filteredIndicators.length})
          </div>

          {filteredIndicators.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-[#E3E5DC] text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF0E6] text-[#54765C] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base text-[#20251F]">No threat indicators</h3>
              <p className="text-xs text-[#73796F] max-w-xs mx-auto">
                No adversary indicators match the current query. Threat indicators populate when suspicious external actors are observed in telemetry.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIndicators.map((item) => {
                const isSelected = item.ip === selectedIndicator?.ip;

                return (
                  <div
                    key={item.ip}
                    onClick={() => setSelectedIp(item.ip)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#54765C] shadow-origin-sm ring-1 ring-[#54765C]/30'
                        : 'bg-white border-[#E3E5DC] hover:border-[#CFD4C9] hover:bg-[#FAFAF7]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#B94C43] text-sm">{item.ip}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]">
                        REP: {item.reputationScore}/100
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#20251F] mt-1.5 line-clamp-1">
                      {item.threatClassification}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E3E5DC] text-[11px] font-mono text-[#73796F]">
                      <span>{item.country || 'Unknown'} ({item.countryCode || 'N/A'})</span>
                      <span>Confidence: <strong className="text-[#54765C]">{item.confidence}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Full Indicator Dossier */}
        <div className="lg:col-span-7">
          {selectedIndicator ? (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm space-y-6">
              
              {/* Dossier Header */}
              <div className="p-6 border-b border-[#E3E5DC] bg-[#FAFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#B94C43] font-bold">{selectedIndicator.ip}</span>
                    <span className="text-[#969B91]">•</span>
                    <span className="text-[#73796F]">{selectedIndicator.asn || 'Autonomous System'}</span>
                  </div>
                  <h2 className="font-display text-2xl text-[#20251F] mt-1 font-bold">
                    {selectedIndicator.threatClassification}
                  </h2>
                </div>

                <div className="text-right font-mono">
                  <div className="text-2xl font-bold text-[#B94C43]">
                    {selectedIndicator.reputationScore}<span className="text-xs text-[#73796F]">/100</span>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-[#969B91]">Reputation Penalty</div>
                </div>
              </div>

              {/* Dossier Body */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Geolocation & Origin Context */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase font-bold">Country</span>
                    <div className="text-sm font-bold text-[#20251F] mt-1">
                      {selectedIndicator.country} ({selectedIndicator.countryCode})
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase font-bold">Confidence</span>
                    <div className="text-sm font-bold text-[#54765C] mt-1">
                      {selectedIndicator.confidence}%
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#969B91] uppercase font-bold">Data Feed Source</span>
                    <div className="text-xs font-bold text-[#20251F] mt-1 truncate">
                      {selectedIndicator.simulatedDataSource}
                    </div>
                  </div>
                </div>

                {/* MITRE Techniques Mapped to IOC */}
                {selectedIndicator.mitreTechniques && selectedIndicator.mitreTechniques.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E3E5DC]">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91]">
                      MAPPED MITRE ATT&amp;CK TECHNIQUES
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedIndicator.mitreTechniques.map((tech) => (
                        <span
                          key={tech}
                          className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedIndicator.tags && selectedIndicator.tags.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E3E5DC]">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91]">
                      BEHAVIORAL TAGS
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedIndicator.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#F0F1EB] text-[#73796F] border border-[#E3E5DC]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl p-12 text-center space-y-3 shadow-origin-sm">
              <div className="w-12 h-12 rounded-full bg-[#F0F1EB] text-[#73796F] mx-auto flex items-center justify-center">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg text-[#20251F]">No indicator selected</h3>
              <p className="text-sm text-[#73796F] max-w-sm mx-auto">
                Select an indicator from the repository to inspect autonomous reputation scoring, geolocations, and ATT&amp;CK mappings.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
