import React from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Search, 
  GitMerge, 
  ShieldCheck, 
  Layers, 
  Terminal, 
  Sparkles 
} from 'lucide-react';
import { StreamInvestigationStep } from '@/types';

interface InvestigationStepsIndicatorProps {
  currentStep: StreamInvestigationStep | null;
}

const STAGES: Array<{ id: StreamInvestigationStep['step']; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'understanding', label: 'Query Intent', icon: Search },
  { id: 'retrieving', label: 'Telemetry & DB', icon: Layers },
  { id: 'correlating', label: 'Correlation', icon: GitMerge },
  { id: 'mapping', label: 'MITRE & RAG', icon: Terminal },
  { id: 'evaluating', label: 'Policy Engine', icon: ShieldCheck },
  { id: 'synthesizing', label: 'Synthesis', icon: Sparkles },
];

export const InvestigationStepsIndicator: React.FC<InvestigationStepsIndicatorProps> = ({ currentStep }) => {
  if (!currentStep) return null;

  const currentIdx = STAGES.findIndex(s => s.id === currentStep.step);

  return (
    <div className="bg-[#FAFBFD] border border-[#1E4BD8]/25 rounded-xl p-3.5 mb-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-[#1E4BD8] animate-spin" />
          <span className="text-xs font-semibold text-[#111417] tracking-wider uppercase font-mono">
            Autonomous Pipeline Analysis
          </span>
        </div>
        <span className="text-xs text-[#1E4BD8] font-mono font-medium animate-pulse">
          {currentStep.label}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {STAGES.map((stage, idx) => {
          const isPassed = currentIdx > idx;
          const isCurrent = currentIdx === idx;
          const isUpcoming = currentIdx < idx;
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                isCurrent
                  ? 'bg-[#1E4BD8]/10 border-[#1E4BD8] text-[#111417] font-medium shadow-xs'
                  : isPassed
                  ? 'bg-[#F0F4FE] border-[#D0DEFF] text-[#1E4BD8]'
                  : 'bg-white/80 border-[#E2E4DC] text-[#889085]'
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1E4BD8] shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 text-[#1E4BD8] animate-spin shrink-0" />
              ) : (
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-40" />
              )}
              <span className="truncate">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
