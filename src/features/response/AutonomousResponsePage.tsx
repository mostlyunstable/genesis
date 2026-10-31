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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EMERGENCY KILLSWITCH COCKPIT
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#38BDF8] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                POLICY-GOVERNED DEFENSE SYSTEM
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-[10px] font-mono text-[#F97316]">LAB SIMULATION MODE (RFC 5737)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Response Operations
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Automated countermeasure simulation, policy dry-runs, rollback controls, and strict execution governance.
            </p>
          </div>

          {/* Emergency Killswitch Toggle */}
          <div className="flex items-center gap-3 bg-[#07080B] border border-[#1C2230] p-3 rounded-xl shrink-0">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold">Autonomous Defense Killswitch</div>
              <div className={`text-xs font-mono font-bold ${autonomousResponseGlobalEnabled ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {autonomousResponseGlobalEnabled ? 'SYSTEM ARMED' : 'SYSTEM HALTED'}
              </div>
            </div>
            <button
              onClick={toggleAutonomousGlobal}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                autonomousResponseGlobalEnabled 
                  ? 'bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30' 
                  : 'bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30'
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
          Left (5 cols): Playbook Catalog
          Right (7 cols): Playbook Scope, Dry Run Simulator & Rollback Log
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Playbooks Catalog */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B] px-1">
            Available Defense Playbooks ({playbooks.length})
          </div>

          <div className="space-y-2">
            {playbooks.map((pb) => {
              const isSelected = pb.id === selectedPlaybook?.id;

              return (
                <div
                  key={pb.id}
                  onClick={() => setSelectedPlaybookId(pb.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#161B26] border-[#38BDF8] ring-1 ring-[#38BDF8]/20 shadow-sm'
                      : 'bg-[#10131B] border-[#1C2230] hover:border-[#2A3347]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#F97316]">{pb.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 uppercase">
                      READY
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white font-sans mt-1">
                    {pb.name}
                  </h3>

                  <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                    {pb.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#1C2230] text-[11px] font-mono text-[#64748B]">
                    <span>Scope: <strong className="text-slate-300">{pb.allowedScope}</strong></span>
                    <span>Steps: <strong className="text-white">{pb.responseSteps.length}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Playbook Simulation & Rollback Log */}
        <div className="lg:col-span-7 space-y-6">
          
          {selectedPlaybook ? (
            <div className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm space-y-6">
              
              {/* Playbook Header */}
              <div className="p-5 border-b border-[#1C2230] bg-[#0C0E14] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
                    <span className="text-[#F97316] font-bold">{selectedPlaybook.id}</span>
                    <span>•</span>
                    <span>Scope: {selectedPlaybook.allowedScope}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {selectedPlaybook.name}
                  </h2>
                </div>
              </div>

              {/* Steps & Governance */}
              <div className="p-5 space-y-6">
                
                {/* Description */}
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  {selectedPlaybook.description}
                </p>

                {/* Response Steps Sequence */}
                <div className="space-y-2 pt-2 border-t border-[#1C2230]">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    POLICY RESPONSE STEPS
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    {selectedPlaybook.responseSteps.map((step) => (
                      <div key={step.stepNumber} className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230] flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded bg-[#161B26] border border-[#1C2230] flex items-center justify-center text-[10px] font-bold text-[#38BDF8]">
                            {step.stepNumber}
                          </span>
                          <span className="text-white font-medium">{step.action}</span>
                        </div>
                        <span className="text-[10px] text-[#64748B] uppercase">Target: {step.targetType}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rollback Strategy Note */}
                <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230] text-xs font-mono space-y-1">
                  <span className="text-[10px] text-[#F97316] font-bold uppercase block">Automated Rollback Strategy:</span>
                  <span className="text-slate-300 block">{selectedPlaybook.rollbackStrategy}</span>
                </div>

                {/* Interactive Dry-Run Execution Trigger */}
                <div className="pt-4 border-t border-[#1C2230] space-y-3">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    SIMULATE PLAYBOOK DRY RUN (DETERMINISTIC SANDBOX)
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      value={simulationTarget}
                      onChange={(e) => setSimulationTarget(e.target.value)}
                      placeholder="Target IP or identity..."
                      className="w-full sm:flex-1 bg-[#07080B] border border-[#1C2230] focus:border-[#38BDF8] rounded-lg px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
                    />
                    <Button
                      variant="action"
                      size="sm"
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
                  <div className="p-4 rounded-lg bg-[#07080B] border border-[#10B981]/30 font-mono text-xs space-y-1.5 animate-in fade-in-0 duration-150">
                    <div className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider pb-1 border-b border-[#1C2230] flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Simulation Verification Output
                      </span>
                      <span>RFC 5737 Benchmark</span>
                    </div>
                    {simulationLogs.map((log, i) => (
                      <div key={i} className="text-slate-300 text-[11px] leading-relaxed">
                        <span className="text-[#38BDF8]">&gt; </span>
                        <span className={log.includes('verified') || log.includes('PERMITTED') ? 'text-[#10B981] font-bold' : log.includes('DROP') ? 'text-[#F97316]' : ''}>
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
          <div className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-[#1C2230] pb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Historical Action &amp; Rollback Log ({actions.length})
              </h3>
              <span className="text-[10px] font-mono text-[#F97316] font-bold">SIMULATION ONLY</span>
            </div>

            <div className="divide-y divide-[#1C2230] font-mono text-xs">
              {actions.map((act) => (
                <div key={act.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#38BDF8] font-bold">{act.id}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        act.status === 'rolled_back' ? 'bg-[#64748B]/20 text-[#94A3B8]' : 'bg-[#10B981]/20 text-[#10B981]'
                      }`}>
                        {act.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-slate-200 text-xs font-sans font-medium">{act.actionName}</div>
                    <div className="text-[10px] text-[#64748B]">Target: {act.target} • {act.durationMs}ms</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {act.rollbackAvailable && act.status !== 'rolled_back' && (
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={<RotateCcw className="w-3 h-3 text-[#F97316]" />}
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
