import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Play,
  ArrowRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { ResponsePlaybook } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

  const [activeTab, setActiveTab] = useState<'recommendations' | 'history' | 'policies'>('recommendations');

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E6E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#171717] font-sans">
            Autonomous Response
          </h2>
          <p className="text-xs text-[#77736D] font-sans mt-0.5">
            Defensive action governance, policy evaluations, dry runs, and deterministic verifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={autonomousResponseGlobalEnabled ? 'danger' : 'primary'}
            size="sm"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            onClick={toggleAutonomousGlobal}
          >
            {autonomousResponseGlobalEnabled ? 'Emergency Halt' : 'Resume Autonomous Defense'}
          </Button>
        </div>
      </div>

      {/* Emergency Halt Banner if disabled */}
      {!autonomousResponseGlobalEnabled && (
        <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#D94B45]/20 text-xs font-sans text-[#D94B45] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>DEFENSIVE AUTOMATION HALTED:</strong> All automated playbooks, firewall block actions, and session revocations are blocked by emergency policy.
            </span>
          </div>
          <Button variant="danger" size="sm" onClick={toggleAutonomousGlobal}>
            Resume Protection
          </Button>
        </div>
      )}

      {/* Action States Guide Pill */}
      <div className="p-3 bg-white border border-[#E9E6E0] rounded-xl flex items-center justify-between overflow-x-auto gap-3 text-[11px] font-mono">
        <span className="text-[#A5A19A] uppercase shrink-0 font-semibold">Action States:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#D97706]/20 font-medium">RECOMMENDED</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F0F6FF] text-[#4F7FC1] border border-[#4F7FC1]/20 font-medium">POLICY APPROVED</span>
          <span className="px-2 py-0.5 rounded-full bg-[#FFF0E8] text-[#F15A24] border border-[#F15A24]/30 font-bold">DRY RUN (DEFAULT)</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#258A62] border border-[#258A62]/20 font-semibold">VERIFIED</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F3F2EE] text-[#77736D] border border-[#E9E6E0] font-medium">ROLLED BACK</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E9E6E0] pb-2 text-xs font-medium font-sans">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            activeTab === 'recommendations'
              ? 'bg-[#171717] text-white'
              : 'text-[#77736D] hover:text-[#171717] hover:bg-[#F3F2EE]'
          }`}
        >
          Active Recommendations ({playbooks.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#171717] text-white'
              : 'text-[#77736D] hover:text-[#171717] hover:bg-[#F3F2EE]'
          }`}
        >
          Action History & Rollback ({actions.length})
        </button>
      </div>

      {/* Tab 1: Recommended Actions & Policies */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {playbooks.map((pb) => (
            <div
              key={pb.id}
              className="p-5 rounded-2xl bg-white border border-[#E9E6E0] shadow-sm space-y-4 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#FFF0E8] text-[#F15A24] flex items-center justify-center font-bold text-xs font-mono">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#171717] font-sans">{pb.name}</h3>
                    <span className="text-[10px] font-mono text-[#F15A24] font-semibold">{pb.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FFF0E8] text-[#F15A24] border border-[#F15A24]/30">
                    DRY RUN READY
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Play className="w-3 h-3" />}
                    onClick={() => handleSimulateExecution(pb)}
                  >
                    Simulate Dry Run
                  </Button>
                </div>
              </div>

              <p className="text-xs text-[#77736D] font-sans leading-relaxed">
                {pb.description}
              </p>

              {/* Attribution Meta Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#FAFAF8] rounded-xl border border-[#E9E6E0] text-xs font-mono">
                <div>
                  <span className="text-[#A5A19A] text-[10px] block">PERMITTED SCOPE</span>
                  <span className="text-[#171717] font-medium">{pb.allowedScope}</span>
                </div>
                <div>
                  <span className="text-[#A5A19A] text-[10px] block">TRIGGER CONDITION</span>
                  <span className="text-[#171717] font-medium truncate block">{pb.triggers[0]}</span>
                </div>
                <div>
                  <span className="text-[#A5A19A] text-[10px] block">VERIFICATION LOOP</span>
                  <span className="text-[#258A62] font-semibold">Telemetry Probe Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Action History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-[#E9E6E0] rounded-2xl shadow-sm overflow-hidden divide-y divide-[#F0ECE6]">
          {actions.map((act) => (
            <div key={act.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#171717] font-sans">{act.actionName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F0FDF4] text-[#258A62] border border-[#258A62]/30">
                    VERIFIED (DRY RUN)
                  </span>
                </div>
                <div className="text-[11px] text-[#77736D] font-mono">
                  Target: <strong className="text-[#171717]">{act.target}</strong> • Latency: {act.durationMs}ms • Timestamp: {new Date(act.timestamp).toLocaleTimeString()} UTC
                </div>
              </div>

              <div className="flex items-center gap-3">
                {act.rollbackAvailable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RotateCcw className="w-3 h-3" />}
                    onClick={() => rollbackAction(act.id)}
                  >
                    Rollback
                  </Button>
                ) : (
                  <span className="text-[10px] font-mono text-[#A5A19A]">Rollback Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
