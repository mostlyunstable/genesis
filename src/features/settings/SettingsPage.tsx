import React, { useState } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Save, 
  Moon, 
  Sun,
  Zap
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      setIsDark(false);
      addNotification({
        type: 'info',
        title: 'Theme Updated',
        message: 'Switched to Warm Canvas light mode.'
      });
    } else {
      root.classList.add('dark');
      setIsDark(true);
      addNotification({
        type: 'info',
        title: 'Theme Updated',
        message: 'Switched to Dark Workspace mode.'
      });
    }
  };

  const handleSaveThresholds = () => {
    updateThresholds(localThresholds);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E6E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#171717] font-sans">
            Platform Settings & Policy
          </h2>
          <p className="text-xs text-[#77736D] font-sans mt-0.5">
            Configure defense parameters, autonomous safeguards, and backend orchestrator targets.
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
              message: 'Local mock state restored to default.'
            });
          }}
        >
          Reset Demo State
        </Button>
      </div>

      {/* Visual Workspace Theme */}
      <div className="p-5 rounded-2xl bg-white border border-[#E9E6E0] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#171717]">Appearance & Workspace Theme</h3>
            <p className="text-xs text-[#77736D] mt-0.5">
              Choose between MetaMask-inspired Warm Canvas and dark SOC mode.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={isDark ? <Sun className="w-4 h-4 text-[#F15A24]" /> : <Moon className="w-4 h-4 text-[#77736D]" />}
            onClick={toggleTheme}
          >
            {isDark ? 'Switch to Warm Canvas' : 'Switch to Dark Mode'}
          </Button>
        </div>
      </div>

      {/* Emergency Autonomous Kill Switch */}
      <div className="p-5 rounded-2xl bg-white border border-[#E9E6E0] shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#171717]">Emergency Autonomous Guard</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                autonomousResponseGlobalEnabled ? 'bg-[#F0FDF4] text-[#258A62] border border-[#258A62]/20' :
                'bg-[#FDF2F2] text-[#D94B45] border border-[#D94B45]/20'
              }`}>
                {autonomousResponseGlobalEnabled ? 'ARMED' : 'HALTED'}
              </span>
            </div>
            <p className="text-xs text-[#77736D] mt-1 leading-relaxed">
              When disengaged, Genysis AI is immediately restricted from executing automated dry runs or countermeasure policies.
            </p>
          </div>

          <Button
            variant={autonomousResponseGlobalEnabled ? 'danger' : 'primary'}
            size="sm"
            icon={<Zap className="w-3.5 h-3.5" />}
            onClick={toggleAutonomousGlobal}
            className="shrink-0"
          >
            {autonomousResponseGlobalEnabled ? 'Engage Emergency Halt' : 'Enable Autonomous Defense'}
          </Button>
        </div>
      </div>

      {/* Heuristic Detection Thresholds */}
      <div className="p-5 rounded-2xl bg-white border border-[#E9E6E0] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F0ECE6] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#171717]">Detection Heuristics & Windows</h3>
            <p className="text-xs text-[#77736D] mt-0.5">Adjust velocity thresholds for brute force and spraying detectors.</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-[#171717] font-medium block mb-1">
              SSH Failed Login Velocity Limit:
            </label>
            <Input
              type="number"
              value={localThresholds.sshFailedAttemptThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshFailedAttemptThreshold: Number(e.target.value) })}
            />
            <span className="text-[11px] text-[#A5A19A] font-mono mt-1 block">Default: 10 attempts</span>
          </div>

          <div>
            <label className="text-[#171717] font-medium block mb-1">
              SSH Window Seconds:
            </label>
            <Input
              type="number"
              value={localThresholds.sshWindowSeconds}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshWindowSeconds: Number(e.target.value) })}
            />
            <span className="text-[11px] text-[#A5A19A] font-mono mt-1 block">Default: 120 seconds</span>
          </div>

          <div>
            <label className="text-[#171717] font-medium block mb-1">
              Password Spray Unique Users Limit:
            </label>
            <Input
              type="number"
              value={localThresholds.passwordSprayUniqueUsersThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, passwordSprayUniqueUsersThreshold: Number(e.target.value) })}
            />
            <span className="text-[11px] text-[#A5A19A] font-mono mt-1 block">Default: 8 distinct users</span>
          </div>

          <div>
            <label className="text-[#171717] font-medium block mb-1">
              Temporary IP Block TTL (minutes):
            </label>
            <Input
              type="number"
              value={localThresholds.temporaryIpBlockDurationMinutes}
              onChange={(e) => setLocalThresholds({ ...localThresholds, temporaryIpBlockDurationMinutes: Number(e.target.value) })}
            />
            <span className="text-[11px] text-[#A5A19A] font-mono mt-1 block">Default: 30 minutes</span>
          </div>
        </div>
      </div>

      {/* Backend Target Integration */}
      <div className="p-5 rounded-2xl bg-white border border-[#E9E6E0] shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#171717]">FastAPI Backend Target</h3>
          <p className="text-xs text-[#77736D] mt-0.5">
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
            size="sm"
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
