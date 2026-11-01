import React, { useState } from 'react';
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Save, 
  Zap,
  Palette,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';

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
    <div className="space-y-8 max-w-4xl mx-auto font-sans pb-16">
      
      {/* Editorial Header */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#54765C] uppercase">
                PLATFORM CONTROLS
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">
                ORCHESTRATION &amp; SAFEGUARDS
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              System Configuration
            </h1>
            <p className="text-sm text-[#73796F] font-sans max-w-xl leading-relaxed">
              Ingestion velocity thresholds, autonomous defense safeguards, botanical design tokens, and backend endpoints.
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
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
      </section>

      {/* Visual Design Foundation Indicator */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E3E5DC] shadow-origin-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#54765C]" />
              <h3 className="font-display text-xl text-[#20251F]">Sentinel Light-First Foundation</h3>
            </div>
            <p className="text-sm text-[#73796F] mt-1 font-sans">
              Refined light visual identity with <strong>warm white canvas (#F7F7F2)</strong>, <strong>botanical green branding (#54765C)</strong>, and <strong>deep natural typography (#20251F)</strong>.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9] font-mono text-xs font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#54765C] animate-pulse" />
            <span>Botanical Light Active</span>
          </div>
        </div>
      </div>

      {/* Emergency Autonomous Kill Switch */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E3E5DC] shadow-origin-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-xl text-[#20251F]">Emergency Autonomous Guard</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                autonomousResponseGlobalEnabled ? 'bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9]' :
                'bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]'
              }`}>
                {autonomousResponseGlobalEnabled ? 'ARMED' : 'HALTED'}
              </span>
            </div>
            <p className="text-sm text-[#73796F] mt-1.5 leading-relaxed font-sans">
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
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E3E5DC] shadow-origin-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-4">
          <div>
            <h3 className="font-display text-xl text-[#20251F]">Detection Thresholds &amp; Windows</h3>
            <p className="text-sm text-[#73796F] mt-0.5 font-sans">Adjust velocity thresholds for brute force and spraying detectors.</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1.5">
            <label className="text-[#20251F] font-semibold block font-sans">
              SSH Failed Login Velocity Limit:
            </label>
            <input
              type="number"
              value={localThresholds.sshFailedAttemptThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshFailedAttemptThreshold: Number(e.target.value) })}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 text-xs font-mono text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <span className="text-[11px] text-[#969B91] font-mono block">Baseline: 10 attempts</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#20251F] font-semibold block font-sans">
              SSH Window Seconds:
            </label>
            <input
              type="number"
              value={localThresholds.sshWindowSeconds}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshWindowSeconds: Number(e.target.value) })}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 text-xs font-mono text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <span className="text-[11px] text-[#969B91] font-mono block">Baseline: 120 seconds</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#20251F] font-semibold block font-sans">
              Password Spray Unique Users Limit:
            </label>
            <input
              type="number"
              value={localThresholds.passwordSprayUniqueUsersThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, passwordSprayUniqueUsersThreshold: Number(e.target.value) })}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 text-xs font-mono text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <span className="text-[11px] text-[#969B91] font-mono block">Baseline: 8 distinct users</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#20251F] font-semibold block font-sans">
              Temporary IP Block TTL (minutes):
            </label>
            <input
              type="number"
              value={localThresholds.temporaryIpBlockDurationMinutes}
              onChange={(e) => setLocalThresholds({ ...localThresholds, temporaryIpBlockDurationMinutes: Number(e.target.value) })}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 text-xs font-mono text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <span className="text-[11px] text-[#969B91] font-mono block">Baseline: 30 minutes</span>
          </div>
        </div>
      </div>

      {/* Backend Target Integration */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E3E5DC] shadow-origin-sm space-y-4">
        <div>
          <h3 className="font-display text-xl text-[#20251F]">FastAPI Backend Target</h3>
          <p className="text-sm text-[#73796F] mt-0.5 font-sans">
            Configure the target Python/FastAPI endpoint for live telemetry.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            value={fastApiEndpoint}
            onChange={(e) => setFastApiEndpoint(e.target.value)}
            placeholder="http://localhost:8000"
            className="w-full sm:flex-1 bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 text-xs font-mono text-[#20251F] focus:outline-none focus:border-[#54765C]"
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
