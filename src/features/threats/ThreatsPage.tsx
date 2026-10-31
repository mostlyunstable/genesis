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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & GLOBAL ADVERSARY SEARCH BAR
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#38BDF8]">
                ADVERSARY INTELLIGENCE DATABASE
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-[10px] font-mono text-[#94A3B8]">OSINT &amp; INTERNAL CORRELATION</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Threat Intelligence
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Active adversary indicators, IOC reputation scores, autonomous behavioral profiling, and MITRE mapping.
            </p>
          </div>

          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by IP, ASN, country, or classification..."
                className="w-full bg-[#07080B] border border-[#1C2230] focus:border-[#38BDF8] rounded-lg px-3.5 py-2 pl-9 text-xs text-white placeholder-[#64748B] font-mono focus:outline-none transition-colors"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN MASTER-DETAIL INTELLIGENCE DOSSIER
          Left (5 cols): Adversary Indicator List with Reputation Badges
          Right (7 cols): Full Deep Forensic Indicator Profile
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Indicator List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B] px-1">
            Tracked Adversary IPs ({filteredIndicators.length})
          </div>

          <div className="space-y-2">
            {filteredIndicators.map((item) => {
              const isSelected = item.ip === selectedIndicator?.ip;
              const isHighRisk = item.reputationScore >= 80;

              return (
                <div
                  key={item.ip}
                  onClick={() => setSelectedIp(item.ip)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#161B26] border-[#38BDF8] ring-1 ring-[#38BDF8]/20 shadow-sm'
                      : 'bg-[#10131B] border-[#1C2230] hover:border-[#2A3347]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white text-sm">{item.ip}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isHighRisk 
                        ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30' 
                        : 'bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30'
                    }`}>
                      REP: {item.reputationScore}/100
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-sans mt-1">
                    {item.threatClassification}
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#1C2230] text-[11px] font-mono text-[#64748B]">
                    <span>{item.country} ({item.countryCode})</span>
                    <span>{item.asn}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Forensic Dossier */}
        <div className="lg:col-span-7">
          {selectedIndicator ? (
            <div className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm space-y-6">
              
              {/* Profile Header */}
              <div className="p-5 border-b border-[#1C2230] bg-[#0C0E14] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748B] uppercase">
                    <Globe className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>{selectedIndicator.country} • {selectedIndicator.asn}</span>
                  </div>
                  <h2 className="text-xl font-bold font-mono text-white mt-1">
                    {selectedIndicator.ip}
                  </h2>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <div className="px-3 py-1 rounded bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[#64748B]">Confidence: </span>
                    <span className="text-[#38BDF8] font-bold">{selectedIndicator.confidence}%</span>
                  </div>
                  <div className="px-3 py-1 rounded bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[#64748B]">Reputation: </span>
                    <span className="text-[#EF4444] font-bold">{selectedIndicator.reputationScore}/100</span>
                  </div>
                </div>
              </div>

              {/* Forensic Details */}
              <div className="p-5 space-y-6">
                
                {/* Threat Classification & Activity Narrative */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    THREAT PROFILE &amp; HEURISTIC CLASSIFICATION
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    Observed conducting automated credential brute force against perimeter SSH bastions. Activity exhibits dictionary rotation across standard administrative accounts. Associated with RFC 5737 benchmark evaluation range.
                  </p>
                </div>

                {/* Key Metadata Table */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1C2230] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">First Seen Telemetry:</span>
                    <span className="text-white font-semibold block mt-0.5">{selectedIndicator.firstSeen.replace('T', ' ').replace('Z', ' UTC')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">Last Seen Telemetry:</span>
                    <span className="text-white font-semibold block mt-0.5">{selectedIndicator.lastSeen.replace('T', ' ').replace('Z', ' UTC')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">Data Feed Source:</span>
                    <span className="text-[#38BDF8] block mt-0.5">{selectedIndicator.simulatedDataSource}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase block">Geographic Origin:</span>
                    <span className="text-white block mt-0.5">{selectedIndicator.country} ({selectedIndicator.countryCode})</span>
                  </div>
                </div>

                {/* MITRE ATT&CK Techniques */}
                <div className="pt-4 border-t border-[#1C2230] space-y-2">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    OBSERVED MITRE ATT&amp;CK TACTICS
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedIndicator.mitreTechniques.map((tech) => (
                      <span 
                        key={tech} 
                        className="px-2.5 py-1 rounded bg-[#07080B] border border-[#1C2230] text-[#38BDF8] text-xs font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Intelligence Tags */}
                <div className="pt-4 border-t border-[#1C2230] space-y-2">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    BEHAVIORAL TAGS
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedIndicator.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#161B26] text-slate-300 border border-[#1C2230]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Associated Incidents */}
                {selectedIndicator.associatedIncidents.length > 0 && (
                  <div className="pt-4 border-t border-[#1C2230] space-y-2">
                    <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                      LINKED CORRELATED INCIDENTS
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      {selectedIndicator.associatedIncidents.map((incId) => (
                        <div 
                          key={incId} 
                          className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230] flex items-center justify-between"
                        >
                          <span className="text-[#38BDF8] font-bold">{incId}</span>
                          <span className="text-slate-300">SSH Brute Force with Valid User Compromise</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-[#10131B] border border-[#1C2230] rounded-xl text-xs text-[#94A3B8] font-mono">
              Select an adversary indicator on the left to inspect threat intelligence.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
