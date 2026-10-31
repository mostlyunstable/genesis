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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#38BDF8] uppercase mb-1">
            INGESTION PIPELINES
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Telemetry Forwarders
          </h2>
          <p className="text-sm text-slate-300 font-sans mt-0.5">
            Configured log forwarders, agents, and protocol collectors.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs px-3.5 py-1.5 rounded-full bg-[#0F1523] border border-[#1E293B] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
          <span>5 Forwarders Ingesting</span>
        </div>
      </div>

      {/* Grid of Clean Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {logSources.map((source) => (
          <div
            key={source.id}
            className="p-6 rounded-2xl bg-[#0F1523] border border-[#1E293B] shadow-cyber-sm space-y-4 hover:border-[#0066FF]/40 transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0066FF]/15 border border-[#0066FF]/30 flex items-center justify-center text-[#38BDF8]">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">{source.name}</h3>
                  <span className="text-[11px] font-mono text-[#38BDF8]">{source.host}</span>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                source.status === 'active' ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' :
                'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
              }`}>
                {source.status.toUpperCase()}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              {source.description}
            </p>

            <div className="p-3.5 bg-[#0B0F17] rounded-xl border border-[#1E293B] space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Format:</span>
                <span className="text-white font-medium">{source.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">24h Processed:</span>
                <span className="text-[#38BDF8] font-bold">{source.eventsProcessed24h.toLocaleString()} events</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Last Ingest:</span>
                <span className="text-[#10B981]">{source.lastEventReceived}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestProbe(source.name)}
              >
                Verify Connectivity
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
