import React, { useState } from 'react';
import { 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Activity, 
  RefreshCw, 
  ExternalLink,
  Terminal,
  Database
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { LogSource } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

export const LogSourcesPage: React.FC = () => {
  const { logSources, addNotification } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<LogSource | null>(null);

  const filteredSources = logSources.filter(src => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        src.name.toLowerCase().includes(q) ||
        src.type.toLowerCase().includes(q) ||
        src.host.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleTestConnection = (source: LogSource) => {
    addNotification({
      type: 'success',
      title: 'Agent Ping OK (Simulated)',
      message: `Collector ping to ${source.host}:${source.port} latency: 12ms.`
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Log Ingestion Sources & Collectors</h2>
            <Badge variant="accent">TELEMETRY INGRESS</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Distributed Syslog, WinLogBeat, and Kubernetes audit forwarders forwarding to Sentinel pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            icon={<Search className="w-3.5 h-3.5 text-[#8994A4]" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collector host..."
            className="w-48 sm:w-64"
          />
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((source) => {
          const statusColors = {
            active: 'bg-[#42B883]/15 text-[#42B883] border-[#42B883]/30',
            degraded: 'bg-[#E5AD52]/15 text-[#E5AD52] border-[#E5AD52]/30',
            disconnected: 'bg-[#EF5350]/15 text-[#EF5350] border-[#EF5350]/30'
          };

          return (
            <Card
              key={source.id}
              title={
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#6DA9E8]" />
                  <span className="font-semibold text-xs text-[#E8EDF4] truncate">{source.name}</span>
                </div>
              }
              badge={
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${statusColors[source.status]}`}>
                  {source.status}
                </span>
              }
            >
              <div className="space-y-3 font-mono text-xs">
                <p className="text-[#8994A4] font-sans text-xs line-clamp-2">
                  {source.description}
                </p>

                <div className="space-y-1.5 p-2.5 bg-[#0D1016] rounded border border-[#1C2430]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#586574]">Host:</span>
                    <span className="text-[#E8EDF4] truncate max-w-[160px]">{source.host}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#586574]">Port / Protocol:</span>
                    <span className="text-[#E8EDF4]">{source.port} / TCP TLS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#586574]">Last Ingestion:</span>
                    <span className="text-[#42B883]">{source.lastEventReceived}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-[#0D1016] rounded border border-[#1C2430]">
                    <div className="text-[10px] text-[#586574]">24H EVENTS</div>
                    <div className="text-sm font-bold text-[#E8EDF4] mt-0.5">
                      {source.eventsProcessed24h.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 bg-[#0D1016] rounded border border-[#1C2430]">
                    <div className="text-[10px] text-[#586574]">24H ERRORS</div>
                    <div className="text-sm font-bold text-[#EF5350] mt-0.5">
                      {source.errorCount24h}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1C2430] flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedSource(source)}
                  >
                    View Config
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTestConnection(source)}
                  >
                    Ping Probe
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Selected Source Config Modal */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121720] border border-[#252D38] rounded-lg max-w-lg w-full p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#6DA9E8]" />
                <h3 className="text-sm font-bold text-[#E8EDF4]">{selectedSource.name}</h3>
              </div>
              <button onClick={() => setSelectedSource(null)} className="text-[#8994A4] hover:text-[#E8EDF4]">
                ✕
              </button>
            </div>

            <div className="space-y-2 p-3 bg-[#0D1016] rounded border border-[#1C2430]">
              <div className="flex justify-between">
                <span className="text-[#586574]">Collector ID:</span>
                <span className="text-[#E0A34A]">{selectedSource.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#586574]">Agent Version:</span>
                <span className="text-[#E8EDF4]">{selectedSource.agentVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#586574]">Schema Standard:</span>
                <span className="text-[#6DA9E8]">{selectedSource.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#586574]">Target Socket:</span>
                <span className="text-[#E8EDF4]">{selectedSource.host}:{selectedSource.port}</span>
              </div>
            </div>

            <p className="text-[11px] text-[#586574]">
              Note: This collector is communicating over synthetic mock forwarder channels. Production bindings are established via the FastAPI log ingress gateway.
            </p>

            <div className="flex justify-end pt-3 border-t border-[#252D38]">
              <Button variant="secondary" size="sm" onClick={() => setSelectedSource(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
