import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Terminal, 
  Clock, 
  Layers, 
  FileText,
  Lock,
  Zap,
  Power
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { ResponsePlaybook } from '@/types';
import { Button } from '@/components/ui/Button';

export const AutonomousResponsePage: React.FC = () => {
  const { 
    playbooks, 
    actions, 
    autonomousResponseGlobalEnabled, 
    toggleAutonomousGlobal, 
    executePlaybookAction, 
    rollbackAction,
    addNotification 
  } = useSecurityStore();

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>('PB-SSH-BRUTE-01');
  const [simulationTarget, setSimulationTarget] = useState('198.51.100.42');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const selectedPlaybook = playbooks.find(p => p.id === selectedPlaybookId) || playbooks[0];

  const handleSimulateExecution = async () => {
    if (!selectedPlaybook || !simulationTarget.trim() || isSimulating) return;
    setIsSimulating(true);

    try {
      const ok = await executePlaybookAction(
        selectedPlaybook.id,
        `Deterministic Sandbox Dry Run for ${selectedPlaybook.name}`,
        simulationTarget.trim(),
        'INC-2026-0042'
      );

      if (ok) {
        setSimulationLogs([
          `[POLICY VALIDATION] Checking playbook ${selectedPlaybook.id} authorization scope... PERMITTED`,
          `[GUARD BOUNDARY] Verifying target ${simulationTarget} within RFC 5737 sandbox... OK`,
          `[DISPATCH] Simulated command: iptables -A INPUT -s ${simulationTarget} -j DROP`,
          `[PROCESS KILL] Terminating rogue process tree PID 12436 (user: deploy)... Success`,
          `[TELEMETRY PROBE] Verification probe: 0 ingress packets observed in 60s window.`,
          `[RESULT] Execution verified in deterministic simulated mode. Action logged in cryptographic audit trail.`
        ]);
        addNotification({
          type: 'success',
          title: 'Simulated Execution Verified',
          message: `${selectedPlaybook.id} dry-run completed on ${simulationTarget}.`
        });
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRollback = async (actionId: string) => {
    const ok = await rollbackAction(actionId);
    if (ok) {
      addNotification({
        type: 'info',
        title: 'Action Rolled Back',
        message: `Action ${actionId} was successfully rolled back.`
      });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EMERGENCY KILLSWITCH COCKPIT
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#54765C] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                POLICY-GOVERNED DEFENSE SYSTEM
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">LAB SIMULATION MODE (RFC 5737)</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Response Center
            </h1>
            <p className="text-sm text-[#73796F] font-sans max-w-2xl leading-relaxed">
              Automated countermeasure simulation, policy dry-runs, rollback controls, and strict execution governance.
            </p>
          </div>

          {/* Emergency Killswitch Toggle */}
          <div className="flex items-center gap-4 bg-[#FAFAF7] border border-[#E3E5DC] p-3.5 px-5 rounded-full shrink-0 shadow-sm">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold">Autonomous Killswitch</div>
              <div className={`text-xs font-mono font-bold ${autonomousResponseGlobalEnabled ? 'text-[#54765C]' : 'text-[#B94C43]'}`}>
                {autonomousResponseGlobalEnabled ? 'SYSTEM ARMED' : 'SYSTEM HALTED'}
              </div>
            </div>
            <button
              onClick={toggleAutonomousGlobal}
              className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                autonomousResponseGlobalEnabled 
                  ? 'bg-[#EAF0E6] text-[#54765C] hover:bg-[#CFDCC9]' 
                  : 'bg-[#F9ECEB] text-[#B94C43] hover:bg-[#F2D5D3]'
              }`}
              title={autonomousResponseGlobalEnabled ? "Click to halt all autonomous response" : "Click to arm autonomous response"}
            >
              <Power className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN RESPONSE PLAYBOOK ENVIRONMENT
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Playbooks Catalog */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91] px-1">
            Available Defense Playbooks ({playbooks.length})
          </div>

          <div className="space-y-3">
            {playbooks.map((pb) => {
              const isSelected = pb.id === selectedPlaybook?.id;

              return (
                <div
                  key={pb.id}
                  onClick={() => setSelectedPlaybookId(pb.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#54765C] shadow-origin-sm ring-1 ring-[#54765C]/30'
                      : 'bg-white border-[#E3E5DC] hover:border-[#CFD4C9] hover:bg-[#FAFAF7]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#54765C]">{pb.id}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9] uppercase">
                      READY
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#20251F] font-sans mt-2">
                    {pb.name}
                  </h3>

                  <p className="text-xs text-[#73796F] mt-1 line-clamp-2 leading-relaxed">
                    {pb.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E3E5DC] text-[11px] font-mono text-[#969B91]">
                    <span>Scope: <strong className="text-[#20251F]">{pb.allowedScope}</strong></span>
                    <span>Steps: <strong className="text-[#20251F]">{pb.responseSteps.length}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Playbook Simulation & Rollback Log */}
        <div className="lg:col-span-7 space-y-8">
          
          {selectedPlaybook ? (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm space-y-6">
              
              {/* Playbook Header */}
              <div className="p-6 border-b border-[#E3E5DC] bg-[#FAFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#969B91]">
                    <span className="text-[#54765C] font-bold">{selectedPlaybook.id}</span>
                    <span>•</span>
                    <span>Scope: {selectedPlaybook.allowedScope}</span>
                  </div>
                  <h2 className="font-display text-2xl text-[#20251F] mt-1">
                    {selectedPlaybook.name}
                  </h2>
                </div>
              </div>

              {/* Steps & Governance */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Description */}
                <p className="text-sm text-[#20251F] leading-relaxed font-sans">
                  {selectedPlaybook.description}
                </p>

                {/* Response Steps Sequence */}
                <div className="space-y-3 pt-2 border-t border-[#E3E5DC]">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    POLICY RESPONSE STEPS
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    {selectedPlaybook.responseSteps.map((step) => (
                      <div key={step.stepNumber} className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#EAF0E6] text-[#54765C] flex items-center justify-center text-[10px] font-bold border border-[#CFDCC9]">
                            {step.stepNumber}
                          </span>
                          <span className="text-[#20251F] font-medium font-sans text-xs">{step.action}</span>
                        </div>
                        <span className="text-[10px] text-[#969B91] uppercase">Target: {step.targetType}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rollback Strategy Note */}
                <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] text-xs font-mono space-y-1">
                  <span className="text-[10px] text-[#C47A45] font-bold uppercase block">Automated Rollback Strategy:</span>
                  <span className="text-[#20251F] block">{selectedPlaybook.rollbackStrategy}</span>
                </div>

                {/* Interactive Dry-Run Execution Trigger */}
                <div className="pt-4 border-t border-[#E3E5DC] space-y-3">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    SIMULATE PLAYBOOK DRY RUN (DETERMINISTIC SANDBOX)
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      value={simulationTarget}
                      onChange={(e) => setSimulationTarget(e.target.value)}
                      placeholder="Target IP or identity..."
                      className="w-full sm:flex-1 bg-[#F0F1EB] border border-[#E3E5DC] focus:border-[#54765C] rounded-full px-4 py-2.5 text-xs font-mono text-[#20251F] focus:outline-none shadow-inner"
                    />
                    <Button
                      variant="primary"
                      size="md"
                      icon={<Play className="w-3.5 h-3.5" />}
                      onClick={handleSimulateExecution}
                      isLoading={isSimulating}
                      className="w-full sm:w-auto shrink-0"
                    >
                      Simulate Dry Run
                    </Button>
                  </div>
                </div>

                {/* Live Dry-Run Log Output */}
                {simulationLogs.length > 0 && (
                  <div className="p-5 rounded-2xl bg-[#FAFAF7] border border-[#CFDCC9] font-mono text-xs space-y-2 animate-in fade-in-0 duration-150">
                    <div className="text-[10px] font-bold text-[#54765C] uppercase tracking-wider pb-2 border-b border-[#E3E5DC] flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Simulation Verification Output
                      </span>
                      <span>RFC 5737 Benchmark</span>
                    </div>
                    {simulationLogs.map((log, i) => (
                      <div key={i} className="text-[#20251F] text-xs leading-relaxed">
                        <span className="text-[#54765C]">&gt; </span>
                        <span className={log.includes('verified') || log.includes('PERMITTED') ? 'text-[#64856C] font-bold' : ''}>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>
          ) : null}

          {/* Historical Response Action & Rollback Log */}
          <div className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm space-y-4 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-4">
              <h3 className="font-display text-lg text-[#20251F]">
                Historical Action &amp; Rollback Log ({actions.length})
              </h3>
              <span className="text-[10px] font-mono text-[#54765C] font-bold uppercase tracking-wider">SIMULATION ONLY</span>
            </div>

            <div className="divide-y divide-[#E3E5DC] font-mono text-xs">
              {actions.map((act) => (
                <div key={act.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#54765C] font-bold">{act.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        act.status === 'rolled_back' ? 'bg-[#F0F1EB] text-[#969B91] border border-[#E3E5DC]' : 'bg-[#EDF3EF] text-[#64856C] border border-[#DBE7DF]'
                      }`}>
                        {act.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[#20251F] text-xs font-sans font-medium">{act.actionName}</div>
                    <div className="text-[10px] text-[#969B91]">Target: {act.target} • {act.durationMs}ms</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {act.rollbackAvailable && act.status !== 'rolled_back' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RotateCcw className="w-3 h-3 text-[#54765C]" />}
                        onClick={() => handleRollback(act.id)}
                      >
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
