import React from 'react';
import { Loader2 } from 'lucide-react';
import { StreamInvestigationStep } from '@/types';

export const InvestigationStepsIndicator: React.FC<{
  currentStep: StreamInvestigationStep | null;
}> = ({ currentStep }) => {
  if (!currentStep) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl border border-[#1E4BD8]/25 bg-[#FAFBFD] p-3 mb-4 text-sm text-[#1E4BD8]">
      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      <span>{currentStep.label}</span>
    </div>
  );
};
