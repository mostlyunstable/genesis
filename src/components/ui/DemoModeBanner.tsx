import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

export const DemoModeBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const { autonomousResponseGlobalEnabled } = useSecurityStore();

  return (
    <div className="bg-[#0B0F17] border-b border-[#1E293B] text-[11px] font-mono text-[#94A3B8] transition-all">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#161F30] border border-[#FF5722]/40 font-semibold text-[#FF5722] text-[10px] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722] animate-pulse" />
            SIMULATION ENVIRONMENT
          </span>
          <span className="text-white font-medium hidden sm:inline">
            Autonomous Security Intelligence
          </span>
          <span className="text-[#334155] hidden md:inline">•</span>
          <span className="text-[#94A3B8] hidden md:inline">
            Deterministic Sandbox (RFC 5737 Protected IP Ranges)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-[#64748B]">Autonomous Engine:</span>
            <span className={`font-semibold font-mono ${autonomousResponseGlobalEnabled ? 'text-[#38BDF8]' : 'text-[#EF4444]'}`}>
              {autonomousResponseGlobalEnabled ? 'ACTIVE (DRY RUN)' : 'HALTED'}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <span>Telemetry Notice</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-2.5 bg-[#0F1523] border-t border-[#1E293B] text-xs">
          <div className="max-w-7xl mx-auto flex items-start gap-2.5 text-[#94A3B8]">
            <AlertCircle className="w-3.5 h-3.5 text-[#FF5722] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white">Telemetry Notice:</strong> Ingested events, brute-force indicators, and countermeasure executions operate in a local deterministic verification sandbox. Telemetry originates from reserved RFC 5737 ranges (198.51.100.0/24, 203.0.113.0/24). Production enforcement requires authenticating with the FastAPI orchestrator in Settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
