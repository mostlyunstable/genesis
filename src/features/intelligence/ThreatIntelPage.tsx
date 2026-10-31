import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  ExternalLink, 
  ShieldAlert, 
  Tag, 
  Clock, 
  Calendar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { ThreatIntelIndicator } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

export const ThreatIntelPage: React.FC = () => {
  const { threatIntel, setSelectedIncidentId } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndicator, setSelectedIndicator] = useState<ThreatIntelIndicator | null>(threatIntel[0]);

  const filteredIndicators = threatIntel.filter(ti => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ti.ip.includes(q) ||
        ti.threatClassification.toLowerCase().includes(q) ||
        ti.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Threat Intelligence Indicators</h2>
            <Badge variant="accent">RFC 5737 SYNTHETIC FEED</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Adversary attribution, reputation scores, autonomous system telemetry, and MITRE behavioral tags.
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            icon={<Search className="w-3.5 h-3.5 text-[#8994A4]" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IP, classification, tag..."
          />
        </div>
      </div>

      {/* 2-Column Split: Table & Indicator Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Indicators Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#121720] border border-[#252D38] rounded-md overflow-hidden font-mono text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#0F141C] border-b border-[#252D38] text-[#8994A4] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Adversary IP</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Reputation</th>
                  <th className="py-2.5 px-3">Incidents</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C2430]">
                {filteredIndicators.map((ti) => {
                  const isSelected = selectedIndicator?.ip === ti.ip;

                  return (
                    <tr
                      key={ti.ip}
                      onClick={() => setSelectedIndicator(ti)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#171E28]' : 'hover:bg-[#151D28]'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[#EF5350] font-bold">
                        {ti.ip}
                      </td>
                      <td className="py-2.5 px-3 text-[#E8EDF4] truncate max-w-[200px]">
                        {ti.threatClassification}
                      </td>
                      <td className="py-2.5 px-3">
                        <RiskScoreBadge score={ti.reputationScore} size="sm" showLabel={false} />
                      </td>
                      <td className="py-2.5 px-3 text-[#E0A34A]">
                        {ti.associatedIncidents.join(', ') || 'None'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button className="text-[#8994A4] hover:text-[#E8EDF4]">
                          <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Indicator Panel (5 cols) */}
        {selectedIndicator ? (
          <div className="lg:col-span-5 space-y-3">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#6DA9E8]" />
                  <span className="font-bold text-xs text-[#EF5350] font-mono">{selectedIndicator.ip}</span>
                </div>
              }
              badge={<RiskScoreBadge score={selectedIndicator.reputationScore} />}
            >
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[#586574]">Classification Narrative</div>
                  <div className="text-sm font-semibold text-[#E8EDF4] mt-0.5">{selectedIndicator.threatClassification}</div>
                </div>

                <div className="p-3 bg-[#0D1016] border border-[#1C2430] rounded space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#586574]">Autonomous System:</span>
                    <span className="text-[#E8EDF4]">{selectedIndicator.asn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#586574]">Simulated Region:</span>
                    <span className="text-[#E8EDF4]">{selectedIndicator.country} ({selectedIndicator.countryCode})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#586574]">First Seen:</span>
                    <span className="text-[#8994A4]">{new Date(selectedIndicator.firstSeen).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#586574]">Last Activity:</span>
                    <span className="text-[#EF5350]">{new Date(selectedIndicator.lastSeen).toLocaleTimeString()} UTC</span>
                  </div>
                </div>

                {/* MITRE Tags */}
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[#586574] mb-1.5">MITRE ATT&CK Attribution</div>
                  <div className="space-y-1">
                    {selectedIndicator.mitreTechniques.map(m => (
                      <div key={m} className="p-1.5 rounded bg-[#0D1016] border border-[#1C2430] text-[#6DA9E8]">
                        {m}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Behavioral Tags */}
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[#586574] mb-1.5">Behavioral Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIndicator.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-[#171E28] border border-[#252D38] text-[#E0A34A] text-[10px]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 bg-[#080A0E] rounded border border-[#1C2430] text-[10px] text-[#586574]">
                  Feed: {selectedIndicator.simulatedDataSource}
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
};
