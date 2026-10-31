import React, { useState } from 'react';
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Save, 
  Zap,
  Palette,
  ShieldAlert
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const SettingsPage: React.FC = () => {
  const { 
    thresholds, 
    updateThresholds, 
    autonomousResponseGlobalEnabled, 
    toggleAutonomousGlobal,
    resetToMockDefaults,
    addNotification
  } = useSecurityStore();

  const [localThresholds, setLocalThresholds] = useState(thresholds);
  const [fastApiEndpoint, setFastApiEndpoint] = useState('http://localhost:8000');

  const handleSaveThresholds = () => {
    updateThresholds(localThresholds);
    addNotification({
      type: 'success',
      title: 'Policy Saved',
      message: 'Heuristic velocity thresholds updated successfully.'
    });
  };

  const handlePingBackend = () => {
    addNotification({
      type: 'info',
      title: 'Backend Verification',
      message: `Configured FastAPI target: ${fastApiEndpoint}. Running in simulated sandbox mode.`
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#38BDF8] uppercase mb-1">
            PLATFORM CONTROLS
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            System Configuration
          </h2>
          <p className="text-sm text-slate-300 font-sans mt-0.5">
            Ingestion thresholds, defense safeguards, and backend orchestration endpoints.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={() => {
            resetToMockDefaults();
            setLocalThresholds(thresholds);
            addNotification({
              type: 'info',
              title: 'Sandbox Reset',
              message: 'Local mock state restored to default baseline.'
            });
          }}
        >
          Reset Sandbox Baseline
        </Button>
      </div>

      {/* Visual Color Theme Indicator */}
      <div className="p-6 rounded-2xl bg-[#0F1523] border border-[#1E293B] shadow-cyber-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#38BDF8]" />
              <h3 className="text-base font-bold text-white font-sans">Active Cyber Visual Identity</h3>
            </div>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Command theme: <strong>Obsidian Black</strong> with <strong>Electric Blue</strong> telemetry &amp; <strong>Brand Orange</strong> countermeasures.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0066FF]/15 text-[#38BDF8] border border-[#0066FF]/30 font-mono text-xs font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
            <span>Black • Blue • Orange Active</span>
          </div>
        </div>
      </div>

      {/* Emergency Autonomous Kill Switch */}
      <div className="p-6 rounded-2xl bg-[#0F1523] border border-[#1E293B] shadow-cyber-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-white font-sans">Emergency Autonomous Guard</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                autonomousResponseGlobalEnabled ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' :
                'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
              }`}>
                {autonomousResponseGlobalEnabled ? 'ARMED' : 'HALTED'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1.5 leading-relaxed">
              When disengaged, automated countermeasures and dry runs are paused across all forwarders.
            </p>
          </div>

          <Button
            variant={autonomousResponseGlobalEnabled ? 'danger' : 'primary'}
            size="md"
            icon={<Zap className="w-4 h-4" />}
            onClick={toggleAutonomousGlobal}
            className="shrink-0"
          >
            {autonomousResponseGlobalEnabled ? 'Engage Emergency Halt' : 'Resume Autonomous Engine'}
          </Button>
        </div>
      </div>

      {/* Heuristic Detection Thresholds */}
      <div className="p-6 rounded-2xl bg-[#0F1523] border border-[#1E293B] shadow-cyber-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
          <div>
            <h3 className="text-base font-bold text-white font-sans">Detection Thresholds &amp; Windows</h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">Adjust velocity thresholds for brute force and spraying detectors.</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSaveThresholds}
          >
            Save Policy
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div>
            <label className="text-white font-semibold block mb-1.5 font-sans">
              SSH Failed Login Velocity Limit:
            </label>
            <Input
              type="number"
              value={localThresholds.sshFailedAttemptThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshFailedAttemptThreshold: Number(e.target.value) })}
            />
            <span className="text-[11px] text-[#64748B] font-mono mt-1.5 block">Default: 10 attempts</span>
          </div>

          <div>
            <label className="text-white font-semibold block mb-1.5 font-sans">
              SSH Window Seconds:
            </label>
            <Input
              type="number"
              value={localThresholds.sshWindowSeconds}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshWindowSeconds: Number(e.target.value) })}
            />
            <span className="text-[11px] text-[#64748B] font-mono mt-1.5 block">Default: 120 seconds</span>
          </div>

          <div>
            <label className="text-white font-semibold block mb-1.5 font-sans">
              Password Spray Unique Users Limit:
            </label>
            <Input
              type="number"
              value={localThresholds.passwordSprayUniqueUsersThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, passwordSprayUniqueUsersThreshold: Number(e.target.value) })}
            />
            <span className="text-[11px] text-[#64748B] font-mono mt-1.5 block">Default: 8 distinct users</span>
          </div>

          <div>
            <label className="text-white font-semibold block mb-1.5 font-sans">
              Temporary IP Block TTL (minutes):
            </label>
            <Input
              type="number"
              value={localThresholds.temporaryIpBlockDurationMinutes}
              onChange={(e) => setLocalThresholds({ ...localThresholds, temporaryIpBlockDurationMinutes: Number(e.target.value) })}
            />
            <span className="text-[11px] text-[#64748B] font-mono mt-1.5 block">Default: 30 minutes</span>
          </div>
        </div>
      </div>

      {/* Backend Target Integration */}
      <div className="p-6 rounded-2xl bg-[#0F1523] border border-[#1E293B] shadow-cyber-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-white font-sans">FastAPI Backend Target</h3>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            Configure the target Python/FastAPI endpoint for live telemetry.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Input
            value={fastApiEndpoint}
            onChange={(e) => setFastApiEndpoint(e.target.value)}
            placeholder="http://localhost:8000"
          />
          <Button
            variant="secondary"
            size="md"
            onClick={handlePingBackend}
            className="shrink-0"
          >
            Test Endpoint
          </Button>
        </div>
      </div>
    </div>
  );
};
