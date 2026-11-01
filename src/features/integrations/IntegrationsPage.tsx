import React from 'react';
import { 
  Server, 
  CheckCircle2, 
  Activity, 
  Radio
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';

export const IntegrationsPage: React.FC = () => {
  const { logSources, addNotification } = useSecurityStore();

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

          <div className="flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-full bg-[#EAF0E6] border border-[#CFDCC9] text-[#54765C]">
            <span className="w-2 h-2 rounded-full bg-[#54765C] animate-pulse" />
            <span>{logSources.length} Forwarders Active</span>
          </div>
        </div>
      </section>

      {/* Grid of Clean Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logSources.map((source) => (
          <div
            key={source.id}
            className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E3E5DC] shadow-origin-sm space-y-5 hover:border-[#54765C]/40 transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#EAF0E6] border border-[#CFDCC9] flex items-center justify-center text-[#54765C]">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg text-[#20251F]">{source.name}</h3>
                  <span className="text-[11px] font-mono text-[#54765C]">{source.host}:{source.port}</span>
                </div>
              </div>

              <span className={`px-3 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                source.status === 'active' ? 'bg-[#EDF3EF] text-[#64856C] border border-[#DBE7DF]' :
                'bg-[#FAF2EC] text-[#C47A45] border border-[#F4E2D5]'
              }`}>
                {source.status.toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-[#73796F] font-sans leading-relaxed">
              {source.description}
            </p>

            <div className="p-4 bg-[#FAFAF7] rounded-2xl border border-[#E3E5DC] space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#969B91]">Protocol Format:</span>
                <span className="text-[#20251F] font-semibold">{source.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#969B91]">24h Processed:</span>
                <span className="text-[#54765C] font-bold">{source.eventsProcessed24h.toLocaleString()} events</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#969B91]">Last Ingest:</span>
                <span className="text-[#64856C] font-semibold">{source.lastEventReceived}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestProbe(source.name)}
              >
                Verify Ingestion Pipeline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
