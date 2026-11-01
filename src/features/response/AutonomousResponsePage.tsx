import React, { useState, useEffect } from 'react';
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
  Power,
  RefreshCw,
  Inbox
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
    fetchPlaybooks,
    fetchActions,
    addNotification 
  } = useSecurityStore();

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [simulationTarget, setSimulationTarget] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPlaybooks();
    fetchActions();
  }, [fetchPlaybooks, fetchActions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchPlaybooks(), fetchActions()]);
    setIsRefreshing(false);
  };

  const selectedPlaybook = playbooks.find(p => p.id === selectedPlaybookId) || (playbooks.length > 0 ? playbooks[0] : null);

  const handleSimulateExecution = async () => {
    if (!selectedPlaybook || !simulationTarget.trim() || isSimulating) return;
    setIsSimulating(true);

    try {
      const ok = await executePlaybookAction(
        selectedPlaybook.id,
        `Execution for ${selectedPlaybook.name}`,
        simulationTarget.trim()
      );

      if (ok) {
        setSimulationLogs([
          `[POLICY VALIDATION] Checking playbook ${selectedPlaybook.id} authorization scope... PERMITTED`,
          `[DISPATCH] Countermeasure dispatched targeting ${simulationTarget.trim()}`,
          `[STATUS] Execution verified and persisted to database response_actions ledger.`
        ]);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EMERGENCY DISARM TOGGLE (DE-BOXED)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E4DC]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-[#5C645B]">
            <span className={`w-1.5 h-1.5 rounded-full ${autonomousResponseGlobalEnabled ? 'bg-[#1E4BD8]' : 'bg-[#B94C43]'}`} />
            <span>SOAR Orchestration</span>
            <span className="text-[#CFD4C9]">•</span>
            <span>Kernel Enforcement</span>
          </div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-[#111417] tracking-tight">
            Autonomous Response
          </h1>
          <p className="text-xs sm:text-sm text-[#5C645B]">
            Containment playbooks and persisted mitigation ledger ({actions.length} executions recorded).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant={autonomousResponseGlobalEnabled ? 'secondary' : 'action'}
            size="md"
            onClick={toggleAutonomousGlobal}
            icon={<Power className="w-4 h-4" />}
          >
            {autonomousResponseGlobalEnabled ? 'Emergency Halt' : 'Arm Defense Engine'}
          </Button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#F0F1EA] hover:bg-white border border-[#E2E4DC] text-[#5C645B] hover:text-[#111417] transition-colors cursor-pointer"
            title="Refresh response operations"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN PLAYBOOKS & EXECUTION HISTORY
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (5 cols): Available Playbooks */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#889085] px-1 flex items-center justify-between">
            <span>Governed Defensive Playbooks</span>
            <span>{playbooks.length} Active</span>
          </div>

          {playbooks.length === 0 ? (
            <div className="p-8 rounded-xl bg-white border border-[#E2E4DC] text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#EFF4FF] text-[#1E4BD8] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base text-[#111417] font-semibold">No Playbooks Registered</h3>
              <p className="text-xs text-[#5C645B] max-w-xs mx-auto">
                No SOAR playbooks are currently registered in the database.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {playbooks.map((pb) => {
                const isSelected = pb.id === selectedPlaybook?.id;

                return (
                  <div
                    key={pb.id}
                    onClick={() => setSelectedPlaybookId(pb.id)}
                    className={`p-4.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#1E4BD8] shadow-xs ring-1 ring-[#1E4BD8]/30'
                        : 'bg-white border-[#E2E4DC] hover:border-[#CFD4C9] hover:bg-[#F8F8F5]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#1E4BD8]">{pb.id}</span>
                      <span className="text-[10px] text-[#889085] uppercase">
                        {pb.executionCount} Executions
                      </span>
                    </div>

                    <h3 className="font-display text-base text-[#111417] font-semibold mt-1.5">
                      {pb.name}
                    </h3>

                    <p className="text-xs text-[#5C645B] line-clamp-2 mt-1">
                      {pb.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Playbook Inspector & Action History */}
        <div className="lg:col-span-7 space-y-6">
          {selectedPlaybook && (
            <div className="bg-white border border-[#E2E4DC] rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#E2E4DC] pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-[#1E4BD8]">{selectedPlaybook.id}</span>
                  <h2 className="font-display text-xl text-[#111417] font-semibold mt-1">
                    {selectedPlaybook.name}
                  </h2>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#889085]">
                  DISPATCH DEFENSIVE MITIGATION
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simulationTarget}
                    onChange={(e) => setSimulationTarget(e.target.value)}
                    placeholder="Enter target IP or username (e.g., 198.51.100.42)..."
                    className="w-full bg-[#F0F1EA] border border-[#E2E4DC] rounded-lg px-3.5 py-2 text-xs text-[#111417] placeholder-[#889085] focus:outline-none focus:border-[#1E4BD8] focus:bg-white focus:ring-2 focus:ring-[#1E4BD8]/10 font-mono"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSimulateExecution}
                    isLoading={isSimulating}
                    disabled={!simulationTarget.trim()}
                    icon={<Play className="w-3.5 h-3.5" />}
                  >
                    Execute
                  </Button>
                </div>
              </div>

              {simulationLogs.length > 0 && (
                <div className="p-3.5 rounded-lg bg-[#F8F8F5] border border-[#E2E4DC] font-mono text-xs space-y-1">
                  {simulationLogs.map((log, i) => (
                    <div key={i} className="text-[#111417]">{log}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Real Action History Table */}
          <div className="bg-white border border-[#E2E4DC] rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-[#E2E4DC] bg-[#F8F8F5] flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-[#111417]">
                Persisted Execution History ({actions.length})
              </h3>
            </div>

            {actions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5C645B]">
                No response actions have been recorded yet in database.
              </div>
            ) : (
              <div className="divide-y divide-[#E2E4DC] font-mono text-xs">
                {actions.map((act) => (
                  <div key={act.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8F8F5] transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1E4BD8]">{act.id}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EFF4FF] text-[#1E4BD8]">
                          {act.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[#111417] font-semibold text-xs mt-1">{act.actionName}</div>
                      <div className="text-[11px] text-[#5C645B] mt-0.5">
                        Target: <strong className="text-[#111417]">{act.target}</strong> | Duration: {act.durationMs}ms
                      </div>
                    </div>

                    {act.rollbackAvailable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rollbackAction(act.id)}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Rollback
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
