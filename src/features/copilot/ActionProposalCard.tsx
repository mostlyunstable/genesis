import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Check, 
  X, 
  Lock, 
  AlertTriangle, 
  FileCheck2, 
  Loader2,
  Terminal
} from 'lucide-react';
import { SuggestedAction } from '@/types';
import { useChatStore } from '@/stores/useChatStore';

interface ActionProposalCardProps {
  action: SuggestedAction;
}

export const ActionProposalCard: React.FC<ActionProposalCardProps> = ({ action }) => {
  const { confirmAction } = useChatStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDecision = async (confirmed: boolean) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await confirmAction(action, confirmed);
    } catch (err: any) {
      setErrorMessage(err.message || 'Action authorization failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExecuted = action.status === 'executed';
  const isRejected = action.status === 'rejected';
  const isBlocked = action.status === 'blocked';
  const isPending = action.status === 'pending';

  return (
    <div className={`my-3 p-4 rounded-xl border transition-all ${
      isExecuted
        ? 'bg-emerald-50/60 border-emerald-300'
        : isBlocked
        ? 'bg-rose-50/70 border-rose-200'
        : isRejected
        ? 'bg-[#F0F1EA] border-[#E2E4DC] opacity-75'
        : 'bg-white border-[#E2E4DC] shadow-xs'
    }`}>
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          {isExecuted ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          ) : isBlocked ? (
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          ) : (
            <Lock className="w-5 h-5 text-[#1E4BD8]" />
          )}
          <div>
            <h4 className="text-sm font-bold text-[#111417] flex items-center gap-2">
              Autonomous Defensive Action Proposal
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EFF4FF] text-[#1E4BD8] uppercase font-semibold">
                {action.playbookId}
              </span>
            </h4>
            <p className="text-xs text-[#5C645B]">
              {action.description}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isExecuted && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              <Check className="w-3.5 h-3.5" /> Executed & Verified
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
              <X className="w-3.5 h-3.5" /> Cancelled by Analyst
            </span>
          )}
          {isBlocked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              <AlertTriangle className="w-3.5 h-3.5" /> Blocked by Guardrail
            </span>
          )}
          {isPending && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 animate-pulse">
              Requires Authorization
            </span>
          )}
        </div>
      </div>

      {/* Action Parameters Table */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-[#F8F8F5] border border-[#E2E4DC] text-xs">
        <div>
          <span className="text-[#889085] block">Countermeasure</span>
          <span className="font-mono font-semibold text-[#111417]">{action.actionName}</span>
        </div>
        <div>
          <span className="text-[#889085] block">Target Identifier</span>
          <span className="font-mono font-semibold text-[#1E4BD8]">{action.target}</span>
        </div>
        <div>
          <span className="text-[#889085] block">Governance Policy</span>
          <span className="font-medium text-[#111417]">Human-in-the-Loop Gate</span>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="flex items-center gap-2 text-xs text-[#5C645B] mb-3">
        <FileCheck2 className="w-3.5 h-3.5 text-[#1E4BD8]" />
        <span>Read-only default enforced. Action requires explicit human approval before kernel/firewall dispatch.</span>
      </div>

      {errorMessage && (
        <div className="mb-3 p-2 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Buttons if Pending */}
      {isPending && (
        <div className="flex items-center gap-2 pt-1 border-t border-[#E2E4DC]">
          <button
            onClick={() => handleDecision(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#111417] hover:bg-[#1E4BD8] text-white transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Authorize & Execute
          </button>
          <button
            onClick={() => handleDecision(false)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#5C645B] hover:bg-[#F0F1EA] hover:text-[#111417] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Reject Countermeasure
          </button>
        </div>
      )}

      {/* Cryptographic Execution Details if Executed */}
      {isExecuted && action.executionResult && (
        <div className="mt-2.5 pt-2.5 border-t border-emerald-200 text-xs font-mono text-emerald-900 flex items-center justify-between">
          <span>Action ID: {action.executionResult.actionId || 'ACT-VERIFIED'}</span>
          <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
            Cryptographically Signed Audit Trail
          </span>
        </div>
      )}
    </div>
  );
};
