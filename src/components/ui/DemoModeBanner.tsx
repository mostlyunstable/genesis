import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Terminal, Shield } from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

export const DemoModeBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const { autonomousResponseGlobalEnabled } = useSecurityStore();

  return (
    <div className="bg-[#F3F2EE] border-b border-[#E9E6E0] text-[11px] font-mono text-[#77736D] transition-all">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-[#E9E6E0] font-semibold text-[#F15A24] text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F15A24] animate-pulse" />
            DEMO MODE
          </span>
          <span className="text-[#171717] font-medium hidden sm:inline">
            Autonomous Security Intelligence v2.0
          </span>
          <span className="text-[#A5A19A] hidden md:inline">•</span>
          <span className="text-[#77736D] hidden md:inline">
            Deterministic Sandbox (RFC 5737 Protected IP Ranges)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-[#77736D]">Autonomous Engine:</span>
            <span className={`font-semibold ${autonomousResponseGlobalEnabled ? 'text-[#258A62]' : 'text-[#D94B45]'}`}>
              {autonomousResponseGlobalEnabled ? 'ACTIVE (DRY RUN)' : 'HALTED'}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[#77736D] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <span>Telemetry Notice</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-2 bg-white border-t border-[#E9E6E0] text-xs">
          <div className="max-w-7xl mx-auto flex items-start gap-2 text-[#77736D]">
            <AlertCircle className="w-3.5 h-3.5 text-[#F15A24] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Simulated Telemetry Disclosure:</strong> All brute-force detections, SSH authentication rejections, and defensive response executions operate in a local deterministic simulation mode. Production enforcement requires authenticating with the FastAPI backend orchestrator in Settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
