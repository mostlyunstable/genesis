import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  Play,
  ShieldCheck,
  Activity,
  Terminal
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { ResponsePlaybook } from '@/types';
import { Button } from '@/components/ui/Button';

export const AutonomousResponsePage: React.FC = () => {
  const { 
    actions, 
    playbooks, 
    autonomousResponseGlobalEnabled, 
    toggleAutonomousGlobal,
    executePlaybookAction,
    rollbackAction 
  } = useSecurityStore();

  const [activeTab, setActiveTab] = useState<'recommendations' | 'history'>('recommendations');

  const handleSimulateExecution = async (playbook: ResponsePlaybook) => {
    await executePlaybookAction(
      playbook.id,
      `Simulated Dry Run: ${playbook.name}`,
      '198.51.100.42 (Target Asset)',
      'INC-2026-0042'
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#38BDF8] uppercase mb-1">
            DEFENSE AUTOMATION GOVERNANCE
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Autonomous Response
          </h2>
          <p className="text-sm text-slate-300 font-sans mt-0.5">
            Policy-approved defensive countermeasures, dry runs, and verification telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={autonomousResponseGlobalEnabled ? 'danger' : 'primary'}
            size="md"
            icon={<AlertTriangle className="w-4 h-4" />}
            onClick={toggleAutonomousGlobal}
          >
            {autonomousResponseGlobalEnabled ? 'Emergency Defense Halt' : 'Resume Autonomous Engine'}
          </Button>
        </div>
      </div>

      {/* Emergency Halt Banner if disabled */}
      {!autonomousResponseGlobalEnabled && (
        <div className="p-4 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-sm font-sans text-[#EF4444] flex items-center justify-between gap-4 animate-in fade-in-0 duration-150">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#EF4444]" />
            <span>
              <strong>DEFENSIVE AUTOMATION HALTED:</strong> Automated countermeasures blocked by administrative override.
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={toggleAutonomousGlobal}>
            Resume Protection
          </Button>
        </div>
      )}

      {/* Action States Guide Pill */}
      <div className="p-3.5 bg-[#0F1523] border border-[#1E293B] rounded-xl flex items-center justify-between overflow-x-auto gap-3 text-xs font-mono">
        <span className="text-[#64748B] uppercase shrink-0 font-bold text-[11px] tracking-wider">Countermeasure Pipeline:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-semibold text-[11px]">RECOMMENDED</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#0066FF]/15 text-[#38BDF8] border border-[#0066FF]/30 font-semibold text-[11px]">POLICY APPROVED</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/40 font-bold text-[11px]">DRY RUN (DEFAULT)</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold text-[11px]">VERIFIED</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#141C2E] text-[#94A3B8] border border-[#1E293B] font-semibold text-[11px]">ROLLED BACK</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2 text-xs font-semibold font-sans">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer font-mono text-xs ${
            activeTab === 'recommendations'
              ? 'bg-[#0066FF] text-white shadow-cyber-blue'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#141C2E]'
          }`}
        >
          Defensive Playbooks ({playbooks.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-full transition-all cursor-pointer font-mono text-xs ${
            activeTab === 'history'
              ? 'bg-[#0066FF] text-white shadow-cyber-blue'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#141C2E]'
          }`}
        >
          Action Log & Verification ({actions.length})
        </button>
      </div>

      {/* Tab 1: Recommended Actions & Policies */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {playbooks.map((pb) => (
            <div
              key={pb.id}
              className="p-6 rounded-2xl bg-[#0F1523] border border-[#1E293B] shadow-cyber-sm space-y-4 transition-all hover:border-[#0066FF]/40 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0066FF]/15 border border-[#0066FF]/30 text-[#38BDF8] flex items-center justify-center font-bold text-xs font-mono">
                    <Zap className="w-4 h-4 text-[#FF5722]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">{pb.name}</h3>
                    <span className="text-[11px] font-mono text-[#38BDF8] font-semibold">{pb.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF5722]/15 text-[#FF5722] border border-[#FF5722]/30">
                    DRY RUN READY
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Play className="w-3.5 h-3.5" />}
                    onClick={() => handleSimulateExecution(pb)}
                  >
                    Execute Policy Dry Run
                  </Button>
                </div>
              </div>

              <p className="text-sm text-slate-300 font-sans leading-relaxed">
                {pb.description}
              </p>

              {/* Attribution Meta Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#0B0F17] rounded-xl border border-[#1E293B] text-xs font-mono">
                <div>
                  <span className="text-[#64748B] text-[10px] block uppercase tracking-wider">PERMITTED SCOPE</span>
                  <span className="text-white font-bold block mt-0.5">{pb.allowedScope}</span>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px] block uppercase tracking-wider">TRIGGER CONDITION</span>
                  <span className="text-slate-200 font-medium truncate block mt-0.5">{pb.triggers[0]}</span>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px] block uppercase tracking-wider">VERIFICATION LOOP</span>
                  <span className="text-[#10B981] font-bold block mt-0.5">Telemetry Probe Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Action History */}
      {activeTab === 'history' && (
        <div className="bg-[#0F1523] border border-[#1E293B] rounded-2xl shadow-cyber-lg overflow-hidden divide-y divide-[#1E293B]">
          {actions.map((act) => (
            <div key={act.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white font-sans text-sm">{act.actionName}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    VERIFIED — Telemetry Probe Confirmed
                  </span>
                </div>
                <div className="text-xs text-[#94A3B8] font-mono">
                  Target: <strong className="text-white font-semibold">{act.target}</strong> • Latency: {act.durationMs}ms • Timestamp: {new Date(act.timestamp).toLocaleTimeString()} UTC
                </div>
              </div>

              <div className="flex items-center gap-3">
                {act.rollbackAvailable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={() => rollbackAction(act.id)}
                  >
                    Rollback
                  </Button>
                ) : (
                  <span className="text-[11px] font-mono text-[#64748B]">Rollback Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
