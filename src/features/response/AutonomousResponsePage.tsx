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
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EMERGENCY DISARM TOGGLE
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl text-[#20251F] tracking-tight">
              Response
            </h1>
            <p className="text-sm text-[#73796F]">
              Containment playbooks and action history ({actions.length} executions).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant={autonomousResponseGlobalEnabled ? 'secondary' : 'primary'}
              size="md"
              onClick={toggleAutonomousGlobal}
              icon={<Power className="w-4 h-4" />}
            >
              {autonomousResponseGlobalEnabled ? 'Emergency Halt' : 'Enable Defense'}
            </Button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-[#F0F1EB] hover:bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
              title="Refresh response operations"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN PLAYBOOKS & EXECUTION HISTORY
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (5 cols): Available Playbooks */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91] px-1">
            Governed Defensive Playbooks ({playbooks.length})
          </div>

          {playbooks.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-[#E3E5DC] text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF0E6] text-[#54765C] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base text-[#20251F]">No Playbooks Registered</h3>
              <p className="text-xs text-[#73796F] max-w-xs mx-auto">
                No SOAR playbooks are currently registered in the database.
              </p>
            </div>
          ) : (
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
                      <span className="text-[10px] text-[#969B91] uppercase">
                        {pb.executionCount} Executions
                      </span>
                    </div>

                    <h3 className="font-display text-lg text-[#20251F] font-bold mt-2">
                      {pb.name}
                    </h3>

                    <p className="text-xs text-[#73796F] line-clamp-2 mt-1">
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
            <div className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-[#54765C]">{selectedPlaybook.id}</span>
                  <h2 className="font-display text-2xl text-[#20251F] font-bold mt-1">
                    {selectedPlaybook.name}
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91]">
                  DISPATCH DEFENSIVE MITIGATION
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={simulationTarget}
                    onChange={(e) => setSimulationTarget(e.target.value)}
                    placeholder="Enter target IP or username (e.g., 198.51.100.42)..."
                    className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 text-xs text-[#20251F] focus:outline-none focus:border-[#54765C] font-mono"
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
                <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] font-mono text-xs space-y-1">
                  {simulationLogs.map((log, i) => (
                    <div key={i} className="text-[#20251F]">{log}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Real Action History Table */}
          <div className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
            <div className="p-6 border-b border-[#E3E5DC] bg-[#FAFAF7] flex items-center justify-between">
              <h3 className="font-display text-lg text-[#20251F]">
                Persisted Execution History ({actions.length})
              </h3>
            </div>

            {actions.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#73796F]">
                No response actions have been recorded yet in database.
              </div>
            ) : (
              <div className="divide-y divide-[#E3E5DC] font-mono text-xs">
                {actions.map((act) => (
                  <div key={act.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#FAFAF7]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#54765C]">{act.id}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF0E6] text-[#54765C]">
                          {act.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[#20251F] font-bold text-xs mt-1">{act.actionName}</div>
                      <div className="text-[11px] text-[#73796F] mt-0.5">
                        Target: <strong className="text-[#20251F]">{act.target}</strong> | Duration: {act.durationMs}ms
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
