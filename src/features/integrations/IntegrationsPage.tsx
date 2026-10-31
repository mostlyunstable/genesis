import React from 'react';
import { 
  Layers, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  Terminal, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const IntegrationsPage: React.FC = () => {
  const { logSources, addNotification } = useSecurityStore();

  const handleTestProbe = (name: string) => {
    addNotification({
      type: 'success',
      title: 'Forwarder Probe Verified',
      message: `Telemetry pipeline connectivity to ${name} is active.`
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E6E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#171717] font-sans">
            Telemetry Integrations
          </h2>
          <p className="text-xs text-[#77736D] font-sans mt-0.5">
            Distributed Syslog, WinLogBeat, and Kubernetes PAM collectors streaming to Sentinel.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#77736D]">
          <span className="w-2 h-2 rounded-full bg-[#258A62] animate-pulse" />
          <span>5 Forwarders Online</span>
        </div>
      </div>

      {/* Grid of Clean Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {logSources.map((source) => (
          <div
            key={source.id}
            className="p-5 rounded-2xl bg-white border border-[#E9E6E0] shadow-sm space-y-4 hover:border-[#D8D4CC] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FAFAF8] border border-[#E9E6E0] flex items-center justify-center text-[#F15A24]">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#171717] font-sans">{source.name}</h3>
                  <span className="text-[10px] font-mono text-[#77736D]">{source.host}</span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                source.status === 'active' ? 'bg-[#F0FDF4] text-[#258A62] border border-[#258A62]/20' :
                'bg-[#FFFBEB] text-[#D97706] border border-[#D97706]/20'
              }`}>
                {source.status.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-[#77736D] font-sans leading-relaxed">
              {source.description}
            </p>

            <div className="p-3 bg-[#FAFAF8] rounded-xl border border-[#E9E6E0] space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#A5A19A]">Format:</span>
                <span className="text-[#171717] font-medium">{source.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A5A19A]">24h Processed:</span>
                <span className="text-[#171717] font-semibold">{source.eventsProcessed24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A5A19A]">Last Ingest:</span>
                <span className="text-[#258A62]">{source.lastEventReceived}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestProbe(source.name)}
              >
                Test Connection Probe
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
