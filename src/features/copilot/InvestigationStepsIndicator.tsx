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
    <div className="bg-[#FAFDFB] border border-[#26796C]/25 rounded-xl p-3.5 mb-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-[#26796C] animate-spin" />
          <span className="text-xs font-semibold text-[#142C29] tracking-wider uppercase">
            Autonomous Investigation Pipeline
          </span>
        </div>
        <span className="text-xs text-[#26796C] font-mono font-medium animate-pulse">
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
                  ? 'bg-[#26796C]/10 border-[#26796C] text-[#142C29] font-medium shadow-xs'
                  : isPassed
                  ? 'bg-[#F2F7F5] border-[#D1E0DB] text-[#26796C]'
                  : 'bg-white/60 border-[#E8EDE9] text-[#8C9E98]'
              }`}
            >
              {isPassed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#26796C] shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 text-[#26796C] animate-spin shrink-0" />
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
