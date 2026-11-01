import React, { useEffect, useState } from 'react';
import { 
  Server, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Layers, 
  ExternalLink,
  Cpu,
  Clock,
  ArrowRight,
  Network,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const AssetsPage: React.FC = () => {
  const { logSources, incidents, fetchSources, fetchIncidents } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchSources();
    fetchIncidents();
  }, [fetchSources, fetchIncidents]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchSources(), fetchIncidents()]);
    setIsRefreshing(false);
  };

  // Derive real asset records from registered log sources and incidents
  const assets = logSources.map((source, index) => {
    // Check if this asset is referenced in any active incident
    const linkedIncident = incidents.find(inc => 
      inc.title.toLowerCase().includes(source.name.toLowerCase()) ||
      (inc.sourceIps && inc.sourceIps.includes(source.host))
    );

    const isCompromised = !!linkedIncident;

    return {
      id: source.id,
      name: source.name,
      ip: source.host,
      role: source.description || source.format,
      os: source.agentVersion,
      zone: `Port ${source.port} (${source.type})`,
      riskScore: isCompromised ? (linkedIncident?.riskScore || 85) : 10,
      status: isCompromised ? ('COMPROMISED' as const) : ('HEALTHY' as const),
      openPorts: [source.port],
      connectedSubnets: 1,
      eventsProcessed: source.eventsProcessed24h
    };
  });

  const filteredAssets = assets.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.ip.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      a.os.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. EDITORIAL HEADER & ASSET INVENTORY HUD
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#54765C]">
                ENTERPRISE ASSET REGISTRY
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">
                MONITORED HOSTS &amp; SENSORS ({assets.length})
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Asset Topology &amp; Blast Radius
            </h1>
            <p className="text-sm text-[#73796F] max-w-2xl leading-relaxed">
              Monitored production infrastructure nodes, authentication gateways, and forwarder endpoints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search host, IP, OS..."
                className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 pl-10 text-xs text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C]"
              />
              <Search className="w-4 h-4 text-[#969B91] absolute left-3.5 top-3 pointer-events-none" />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-[#F0F1EB] hover:bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
              title="Refresh assets"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. ASSET CARDS GRID
          ───────────────────────────────────────────────────────────── */}
      {filteredAssets.length === 0 ? (
        <section className="bg-white border border-[#E3E5DC] rounded-3xl p-16 text-center space-y-4 shadow-origin-sm">
          <div className="w-14 h-14 rounded-full bg-[#EAF0E6] text-[#54765C] mx-auto flex items-center justify-center">
            <Server className="w-7 h-7" />
          </div>
          <h2 className="font-display text-2xl text-[#20251F]">
            No Monitored Assets Found
          </h2>
          <p className="text-sm text-[#73796F] max-w-md mx-auto leading-relaxed">
            No assets match the query or are registered as log forwarder endpoints. Configure forwarders to populate the topology.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="p-6 rounded-3xl bg-white border border-[#E3E5DC] shadow-origin-sm space-y-5 hover:border-[#54765C]/40 transition-all"
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-[#54765C]">{asset.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  asset.status === 'COMPROMISED'
                    ? 'bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]'
                    : 'bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9]'
                }`}>
                  {asset.status}
                </span>
              </div>

              <div>
                <h3 className="font-display text-xl text-[#20251F] font-bold">
                  {asset.name}
                </h3>
                <div className="text-xs font-mono text-[#73796F] mt-0.5">
                  {asset.ip}
                </div>
              </div>

              <p className="text-sm text-[#73796F] leading-relaxed line-clamp-2">
                {asset.role}
              </p>

              <div className="space-y-2 pt-3 border-t border-[#E3E5DC] font-mono text-xs">
                <div className="flex items-center justify-between text-[#73796F]">
                  <span>Agent / OS:</span>
                  <span className="text-[#20251F] font-bold">{asset.os}</span>
                </div>
                <div className="flex items-center justify-between text-[#73796F]">
                  <span>Zone:</span>
                  <span className="text-[#20251F] font-bold">{asset.zone}</span>
                </div>
                <div className="flex items-center justify-between text-[#73796F]">
                  <span>Events (24h):</span>
                  <span className="text-[#54765C] font-bold">{asset.eventsProcessed.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
