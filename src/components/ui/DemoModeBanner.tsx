import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

export const DemoModeBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const { autonomousResponseGlobalEnabled } = useSecurityStore();

  return (
    <div className="bg-[#FAFAF7] border-b border-[#E3E5DC] text-[11px] font-mono text-[#73796F] transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF0E6] border border-[#CFDCC9] font-semibold text-[#54765C] text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#54765C] animate-pulse" />
            SIMULATION ENVIRONMENT
          </span>
          <span className="text-[#20251F] font-medium hidden sm:inline">
            Autonomous Security Intelligence
          </span>
          <span className="opacity-40 hidden md:inline">•</span>
          <span className="text-[#969B91] hidden md:inline">
            Deterministic Sandbox (RFC 5737 Protected IP Ranges)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-[#969B91]">Autonomous Engine:</span>
            <span className={`font-semibold font-mono ${autonomousResponseGlobalEnabled ? 'text-[#54765C]' : 'text-[#B94C43]'}`}>
              {autonomousResponseGlobalEnabled ? 'ACTIVE (DRY RUN)' : 'HALTED'}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
          >
            <span>Telemetry Notice</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-2.5 bg-white border-t border-[#E3E5DC] text-xs">
          <div className="max-w-7xl mx-auto flex items-start gap-2.5 text-[#73796F]">
            <AlertCircle className="w-3.5 h-3.5 text-[#54765C] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-[#20251F]">Telemetry Notice:</strong> Ingested events, brute-force indicators, and countermeasure executions operate in a local deterministic verification sandbox. Telemetry originates from reserved RFC 5737 ranges (198.51.100.0/24, 203.0.113.0/24). Production enforcement requires authenticating with the FastAPI orchestrator in Settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
