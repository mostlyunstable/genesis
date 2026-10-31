import React, { useState } from 'react';
import { 
  Settings, 
  ShieldAlert, 
  Sliders, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Save, 
  Terminal,
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
  const [apiKey, setApiKey] = useState('sentinel_sk_live_9942a8b9e1');

  const handleSaveThresholds = () => {
    updateThresholds(localThresholds);
  };

  const handleTestBackendPing = () => {
    addNotification({
      type: 'info',
      title: 'Backend Endpoint Configured',
      message: `FastAPI target set to ${fastApiEndpoint}. Running in simulated frontend mode.`
    });
  };

  return (
    <div className="space-y-6 max-w-4xl font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4] font-sans">Platform & Defense Configuration</h2>
            <Badge variant="accent">SYSTEM CONTROLS</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Manage autonomous containment limits, behavioral detection windows, and future FastAPI orchestrator routes.
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
              message: 'Local mock state restored to initial baseline.'
            });
          }}
        >
          Reset Mock Data
        </Button>
      </div>

      {/* Emergency Control Card */}
      <Card
        title="Autonomous Defense Engine — Emergency Master Switch"
        badge={
          <Badge variant={autonomousResponseGlobalEnabled ? 'success' : 'critical'}>
            {autonomousResponseGlobalEnabled ? 'DEFENSE ONLINE' : 'EMERGENCY HALTED'}
          </Badge>
        }
      >
        <div className="space-y-4">
          <p className="text-[#8994A4] font-sans text-xs">
            Instantly halt or restore autonomous defensive actions across all network ingress points, reverse proxies, and session managers.
          </p>

          <div className="p-4 bg-[#0D1016] border border-[#252D38] rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm text-[#E8EDF4]">
                Global Countermeasure Enforcement
              </div>
              <div className="text-[11px] text-[#586574] mt-0.5">
                Current State: <strong className={autonomousResponseGlobalEnabled ? 'text-[#42B883]' : 'text-[#EF5350]'}>
                  {autonomousResponseGlobalEnabled ? 'ACTIVE (Permits automated IP drops)' : 'HALTED (All SOAR actions blocked)'}
                </strong>
              </div>
            </div>

            <Button
              variant={autonomousResponseGlobalEnabled ? 'danger' : 'primary'}
              size="sm"
              icon={<Zap className="w-3.5 h-3.5" />}
              onClick={toggleAutonomousGlobal}
            >
              {autonomousResponseGlobalEnabled ? 'Engage Emergency Halt' : 'Enable Autonomous Defense'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Thresholds Card */}
      <Card
        title="Behavioral Detection Heuristics & Windows"
        badge={<Badge variant="info">DETECTION HEURISTICS</Badge>}
        action={
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="w-3.5 h-3.5" />}
            onClick={handleSaveThresholds}
          >
            Save Changes
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[#8994A4] block mb-1">
              SSH Failed Login Velocity Threshold (failures):
            </label>
            <Input
              type="number"
              value={localThresholds.sshFailedAttemptThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshFailedAttemptThreshold: Number(e.target.value) })}
            />
            <span className="text-[10px] text-[#586574]">Baseline: 10 attempts in window</span>
          </div>

          <div>
            <label className="text-[#8994A4] block mb-1">
              SSH Detection Rolling Window (seconds):
            </label>
            <Input
              type="number"
              value={localThresholds.sshWindowSeconds}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshWindowSeconds: Number(e.target.value) })}
            />
            <span className="text-[10px] text-[#586574]">Window for velocity calculation</span>
          </div>

          <div>
            <label className="text-[#8994A4] block mb-1">
              Password Spray Unique Users Threshold:
            </label>
            <Input
              type="number"
              value={localThresholds.passwordSprayUniqueUsersThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, passwordSprayUniqueUsersThreshold: Number(e.target.value) })}
            />
            <span className="text-[10px] text-[#586574]">Trigger spray alert after N accounts</span>
          </div>

          <div>
            <label className="text-[#8994A4] block mb-1">
              Temporary IP Block Duration (minutes):
            </label>
            <Input
              type="number"
              value={localThresholds.temporaryIpBlockDurationMinutes}
              onChange={(e) => setLocalThresholds({ ...localThresholds, temporaryIpBlockDurationMinutes: Number(e.target.value) })}
            />
            <span className="text-[10px] text-[#586574]">Automated expiration TTL for iptables drop</span>
          </div>
        </div>
      </Card>

      {/* Backend Integration Target Card */}
      <Card
        title="Python / FastAPI Integration Orchestrator"
        badge={<Badge variant="neutral">FUTURE BACKEND</Badge>}
      >
        <div className="space-y-3">
          <p className="text-[#8994A4] font-sans text-xs">
            Sentinel AI frontend utilizes an API abstraction layer (`src/services/api/index.ts`). Point this endpoint to an active FastAPI backend to swap simulated telemetry with real endpoints.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[#8994A4] block mb-1">FastAPI Backend URL:</label>
              <Input
                value={fastApiEndpoint}
                onChange={(e) => setFastApiEndpoint(e.target.value)}
                placeholder="http://localhost:8000"
              />
            </div>
            <div>
              <label className="text-[#8994A4] block mb-1">Bearer API Secret Token:</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key..."
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#1C2430] flex justify-between items-center">
            <span className="text-[11px] text-[#586574]">Current Client: SentinelMockAdapter (Active)</span>
            <Button variant="secondary" size="sm" onClick={handleTestBackendPing}>
              Verify Connectivity Probe
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
