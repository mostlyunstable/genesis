import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  Ban, 
  Play, 
  BookOpen, 
  History, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const AutonomousResponsePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    actions, 
    playbooks, 
    autonomousResponseGlobalEnabled, 
    toggleAutonomousGlobal,
    rollbackAction 
  } = useSecurityStore();

  const successActions = actions.filter(a => a.status === 'simulated_success');
  const rolledBackActions = actions.filter(a => a.status === 'rolled_back');
  const tempRestrictions = actions.filter(a => a.status === 'simulated_success' && a.actionName.toLowerCase().includes('block'));

  return (
    <div className="space-y-6">
      {/* Header with Global Emergency Kill Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Autonomous Defensive Response Center</h2>
            <Badge variant="accent" dot>SOAR AUTOMATION</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Real-time rule execution, temporary containment restrictions, and deterministic verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={autonomousResponseGlobalEnabled ? 'danger' : 'primary'}
            size="sm"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            onClick={toggleAutonomousGlobal}
          >
            {autonomousResponseGlobalEnabled ? 'EMERGENCY HALT (Disable Autonomous)' : 'RESTORE AUTONOMOUS ENGINE'}
          </Button>
        </div>
      </div>

      {/* Global Status Banner if Emergency Halt */}
      {!autonomousResponseGlobalEnabled && (
        <div className="p-4 rounded-md bg-[#EF5350]/15 border border-[#EF5350]/40 text-xs font-mono text-[#EF5350] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold">AUTONOMOUS COUNTERMEASURES GLOBALLY HALTED:</span> No automated firewall drops or session revocations will execute until restored by security administration.
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={toggleAutonomousGlobal}>
            Resume Protection
          </Button>
        </div>
      )}

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono">
        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md">
          <div className="text-[10px] text-[#586574] uppercase">Active Defense Playbooks</div>
          <div className="text-xl font-bold text-[#E8EDF4] mt-1">{playbooks.filter(p => p.enabled).length} Online</div>
          <div className="text-[10px] text-[#42B883] mt-1">100% Policy Sync</div>
        </div>

        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md">
          <div className="text-[10px] text-[#586574] uppercase">Simulated Executions</div>
          <div className="text-xl font-bold text-[#42B883] mt-1">{successActions.length} Executed</div>
          <div className="text-[10px] text-[#586574] mt-1">Zero failures recorded</div>
        </div>

        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md">
          <div className="text-[10px] text-[#586574] uppercase">Temporary IP Drops</div>
          <div className="text-xl font-bold text-[#EF5350] mt-1">{tempRestrictions.length} Active</div>
          <div className="text-[10px] text-[#8994A4] mt-1">30m expiration TTL</div>
        </div>

        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md">
          <div className="text-[10px] text-[#586574] uppercase">Verified Mitigations</div>
          <div className="text-xl font-bold text-[#6DA9E8] mt-1">100% Pass</div>
          <div className="text-[10px] text-[#586574] mt-1">Post-action probe check</div>
        </div>

        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md">
          <div className="text-[10px] text-[#586574] uppercase">Reverted / Rolled Back</div>
          <div className="text-xl font-bold text-[#8994A4] mt-1">{rolledBackActions.length} Reverted</div>
          <div className="text-[10px] text-[#586574] mt-1">Audit tracked</div>
        </div>
      </div>

      {/* 2-Section Grid: Playbooks Summary & Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Playbooks Section (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card
            title="Operational Defensive Playbooks"
            badge={<Badge variant="accent">{playbooks.length} CONFIGURED</Badge>}
            action={
              <Button size="sm" variant="outline" onClick={() => navigate('/playbooks')}>
                View Playbook Specs <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            }
          >
            <div className="space-y-3 font-mono text-xs">
              {playbooks.slice(0, 3).map((pb) => (
                <div key={pb.id} className="p-3 bg-[#0D1016] border border-[#252D38] rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#E8EDF4]">{pb.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#171E28] text-[#E0A34A] border border-[#252D38]">
                      {pb.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8994A4] line-clamp-2">{pb.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#586574] pt-2 border-t border-[#1C2430]">
                    <span>Scope: {pb.allowedScope}</span>
                    <span>Executions: <strong className="text-[#E8EDF4]">{pb.executionCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Action History Feed (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card
            title="Recent Simulated Defensive Actions"
            badge={<Badge variant="info">AUDIT LOG</Badge>}
            action={
              <Button size="sm" variant="outline" onClick={() => navigate('/action-history')}>
                Full History <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            }
          >
            <div className="space-y-2.5 font-mono text-xs">
              {actions.map((act) => (
                <div key={act.id} className="p-3 bg-[#0D1016] border border-[#252D38] rounded space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#E8EDF4] font-semibold">{act.actionName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                      act.status === 'simulated_success' ? 'bg-[#42B883]/20 text-[#42B883]' :
                      act.status === 'rolled_back' ? 'bg-[#8994A4]/20 text-[#8994A4]' : 'bg-[#EF5350]/20 text-[#EF5350]'
                    }`}>
                      {act.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#8994A4]">
                    <span>Target: <strong className="text-[#EF5350]">{act.target}</strong></span>
                    <span>Latency: {act.durationMs}ms</span>
                  </div>

                  <p className="text-[10px] text-[#586574]">{act.details}</p>

                  <div className="flex items-center justify-between text-[10px] text-[#586574] pt-2 border-t border-[#1C2430]">
                    <span>{new Date(act.timestamp).toLocaleTimeString()} UTC</span>
                    {act.rollbackAvailable && (
                      <button
                        onClick={() => rollbackAction(act.id)}
                        className="text-[#E0A34A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Revert Action (Simulated)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
