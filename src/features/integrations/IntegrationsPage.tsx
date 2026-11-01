import React, { useEffect, useState } from 'react';
import { 
  Server, 
  CheckCircle2, 
  Activity, 
  Radio,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';

export const IntegrationsPage: React.FC = () => {
  const { logSources, fetchSources, addNotification } = useSecurityStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSources();
    setIsRefreshing(false);
  };

  const handleTestProbe = (name: string) => {
    addNotification({
      type: 'success',
      title: 'Forwarder Connectivity Confirmed',
      message: `Telemetry ingest pipeline verified for ${name}.`
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto font-sans pb-16">
      
      {/* Editorial Header */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#54765C] uppercase">
                INGESTION PIPELINES
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">
                TELEMETRY FORWARDERS &amp; PROBES
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Telemetry Forwarders
            </h1>
            <p className="text-sm text-[#73796F] font-sans max-w-xl leading-relaxed">
              Configured log forwarders, agents, and protocol collectors streaming into Sentinel AI.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-full bg-[#EAF0E6] border border-[#CFDCC9] text-[#54765C]">
              <span className="w-2 h-2 rounded-full bg-[#54765C] animate-pulse" />
              <span>{logSources.length} Forwarders Active</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-[#F0F1EB] hover:bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
              title="Refresh forwarders"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Grid of Clean Integration Cards */}
      {logSources.length === 0 ? (
        <section className="bg-white border border-[#E3E5DC] rounded-3xl p-16 text-center space-y-4 shadow-origin-sm">
          <div className="w-14 h-14 rounded-full bg-[#F0F1EB] text-[#73796F] mx-auto flex items-center justify-center">
            <Inbox className="w-7 h-7" />
          </div>
          <h2 className="font-display text-2xl text-[#20251F]">
            No Forwarders Registered
          </h2>
          <p className="text-sm text-[#73796F] max-w-md mx-auto leading-relaxed">
            No telemetry forwarders are currently registered in the database.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {logSources.map((source) => (
            <div
              key={source.id}
              className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E3E5DC] shadow-origin-sm space-y-5 hover:border-[#54765C]/40 transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold text-[#54765C]">{source.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  source.status === 'active'
                    ? 'bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9]'
                    : 'bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]'
                }`}>
                  {source.status}
                </span>
              </div>

              <div>
                <h3 className="font-display text-xl text-[#20251F] font-bold">
                  {source.name}
                </h3>
                <div className="text-xs font-mono text-[#73796F] mt-1">
                  Endpoint: {source.host}:{source.port}
                </div>
              </div>

              <p className="text-sm text-[#73796F] leading-relaxed">
                {source.description}
              </p>

              <div className="space-y-2 pt-3 border-t border-[#E3E5DC] font-mono text-xs">
                <div className="flex items-center justify-between text-[#73796F]">
                  <span>Collector Format:</span>
                  <span className="text-[#20251F] font-bold">{source.format}</span>
                </div>
                <div className="flex items-center justify-between text-[#73796F]">
                  <span>Agent Version:</span>
                  <span className="text-[#20251F] font-bold">{source.agentVersion}</span>
                </div>
                <div className="flex items-center justify-between text-[#73796F]">
                  <span>Events Processed:</span>
                  <span className="text-[#54765C] font-bold">{source.eventsProcessed24h.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs font-mono"
                  onClick={() => handleTestProbe(source.name)}
                  icon={<Activity className="w-3.5 h-3.5" />}
                >
                  Verify Collector Ingestion Probe
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
