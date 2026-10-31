import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

export const DemoModeBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const autonomousResponseGlobalEnabled = useSecurityStore(state => state.autonomousResponseGlobalEnabled);

  return (
    <div className="bg-[#0B0E14] border-b border-[#252D38] text-[11px] font-mono text-[#8994A4]">
      <div className="max-w-screen-2xl mx-auto px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#E0A34A]/15 text-[#E0A34A] border border-[#E0A34A]/30 font-semibold tracking-wider text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E0A34A] animate-pulse" />
            SIMULATION MODE
          </span>
          <span className="text-[#E8EDF4]">
            Sentinel AI Defense Suite v1.0.4-rc
          </span>
          <span className="text-[#586574] hidden md:inline">|</span>
          <span className="text-[#8994A4] hidden md:inline">
            Deterministic Cyber Threat Sandbox (RFC 5737 Protected IP Ranges)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[#586574]">Autonomous Guard:</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${autonomousResponseGlobalEnabled ? 'text-[#42B883]' : 'text-[#EF5350]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${autonomousResponseGlobalEnabled ? 'bg-[#42B883]' : 'bg-[#EF5350]'}`} />
              {autonomousResponseGlobalEnabled ? 'ENABLED (SIMULATED)' : 'EMERGENCY HALT'}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[#8994A4] hover:text-[#E8EDF4] transition-colors cursor-pointer"
          >
            <span>Telemetry Contract</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-2.5 bg-[#090B0F] border-t border-[#1C2430] text-xs space-y-2">
          <div className="flex items-start gap-2 text-[#E5AD52]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Security Environment Disclosure:</span> All data, telemetry logs, brute-force indicators, and incident chronologies displayed within this portal are synthetically simulated or replay generated. No real production firewall or host rules are modified by this frontend interface without a configured and authenticated FastAPI orchestrator.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-[#586574] pt-1">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#6DA9E8]" />
              <span>SSH Honeypot: 198.51.100.42 (RFC 5737)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#6DA9E8]" />
              <span>SSO Spray Vector: 203.0.113.88 (RFC 5737)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#42B883]" />
              <span>Autonomous Action Verifier: Active Loop</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
