import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Server, 
  Save, 
  Zap,
  Palette,
  ShieldAlert,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';
import { sentinelApi } from '@/services/api';

export const SettingsPage: React.FC = () => {
  const { 
    thresholds, 
    updateThresholds, 
    fetchThresholds,
    autonomousResponseGlobalEnabled, 
    toggleAutonomousGlobal,
    addNotification
  } = useSecurityStore();

  const [localThresholds, setLocalThresholds] = useState(thresholds);
  const [fastApiEndpoint, setFastApiEndpoint] = useState(sentinelApi.system.getBackendUrl());
  const [isSaving, setIsSaving] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  useEffect(() => {
    setLocalThresholds(thresholds);
  }, [thresholds]);

  const handleSaveThresholds = async () => {
    setIsSaving(true);
    try {
      const ok = await updateThresholds(localThresholds);
      if (ok) {
        addNotification({
          type: 'success',
          title: 'Policy Saved',
          message: 'Heuristic velocity thresholds updated in backend database.'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePingBackend = async () => {
    setIsPinging(true);
    try {
      const res = await sentinelApi.system.pingHealth();
      addNotification({
        type: res.healthy ? 'success' : 'error',
        title: res.healthy ? 'Backend Online' : 'Backend Unreachable',
        message: res.healthy 
          ? `Connected to ${fastApiEndpoint} successfully.`
          : `Failed to connect to ${fastApiEndpoint}.`
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveEndpoint = () => {
    sentinelApi.system.setBackendUrl(fastApiEndpoint);
    addNotification({
      type: 'info',
      title: 'Target Updated',
      message: `Active API target set to ${fastApiEndpoint}.`
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
              Platform Configuration
            </h1>
            <p className="text-sm text-[#73796F] font-sans max-w-xl leading-relaxed">
              Detection heuristic baselines, SOAR safeguards, and backend telemetry connection.
            </p>
          </div>
        </div>
      </section>

      {/* 1. Global Kill-Switch Guard */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              autonomousResponseGlobalEnabled ? 'bg-[#EAF0E6] text-[#54765C]' : 'bg-[#F9ECEB] text-[#B94C43]'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-lg text-[#20251F]">
                Autonomous Defensive Response Engine
              </h3>
              <p className="text-xs text-[#73796F]">
                When disabled, all automated SOAR countermeasures, IP drops, and session terminations are halted.
              </p>
            </div>
          </div>

          <Button
            variant={autonomousResponseGlobalEnabled ? 'primary' : 'secondary'}
            size="sm"
            onClick={toggleAutonomousGlobal}
          >
            {autonomousResponseGlobalEnabled ? 'ARMED' : 'HALTED'}
          </Button>
        </div>
      </section>

      {/* 2. Detection Velocity Thresholds */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm space-y-6">
        <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#54765C]" />
            <h3 className="font-display text-lg text-[#20251F]">
              Heuristic Correlation Thresholds
            </h3>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveThresholds}
            isLoading={isSaving}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            Save Policies
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono">
          <div className="space-y-2">
            <label className="text-[#20251F] font-bold block">
              SSH Brute Force Velocity Limit (attempts)
            </label>
            <input
              type="number"
              value={localThresholds.sshFailedAttemptThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshFailedAttemptThreshold: Number(e.target.value) })}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-xl px-4 py-2.5 text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <span className="text-[10px] text-[#969B91]">Failures before adversary IP isolation trigger</span>
          </div>

          <div className="space-y-2">
            <label className="text-[#20251F] font-bold block">
              SSH Velocity Window (seconds)
            </label>
            <input
              type="number"
              value={localThresholds.sshWindowSeconds}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshWindowSeconds: Number(e.target.value) })}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-xl px-4 py-2.5 text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <span className="text-[10px] text-[#969B91]">Sliding window for brute-force rate calculations</span>
          </div>

          <div className="space-y-2">
            <label className="text-[#20251F] font-bold block">
              Password Spray Unique Accounts Threshold
            </label>
            <input
              type="number"
              value={localThresholds.passwordSprayUniqueUsersThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, passwordSprayUniqueUsersThreshold: Number(e.target.value) })}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-xl px-4 py-2.5 text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <span className="text-[10px] text-[#969B91]">Unique usernames probed before spray detection</span>
          </div>

          <div className="space-y-2">
            <label className="text-[#20251F] font-bold block">
              Temporary IP Block Duration (minutes)
            </label>
            <input
              type="number"
              value={localThresholds.temporaryIpBlockDurationMinutes}
              onChange={(e) => setLocalThresholds({ ...localThresholds, temporaryIpBlockDurationMinutes: Number(e.target.value) })}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-xl px-4 py-2.5 text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <span className="text-[10px] text-[#969B91]">Ingress iptables DROP duration before auto-expiry</span>
          </div>
        </div>
      </section>

      {/* 3. Real Backend API Connection Settings */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-[#E3E5DC] pb-4">
          <Server className="w-4 h-4 text-[#54765C]" />
          <h3 className="font-display text-lg text-[#20251F]">
            FastAPI Ingestion Gateway Target
          </h3>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex gap-2">
            <input
              type="text"
              value={fastApiEndpoint}
              onChange={(e) => setFastApiEndpoint(e.target.value)}
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-xl px-4 py-2.5 text-[#20251F] focus:outline-none focus:border-[#54765C]"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={handleSaveEndpoint}
            >
              Update Target
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handlePingBackend}
              isLoading={isPinging}
            >
              Ping /health
            </Button>
          </div>
          <p className="text-[11px] font-sans text-[#73796F]">
            All dashboard telemetry, incidents, and audit trails stream live from this service.
          </p>
        </div>
      </section>

    </div>
  );
};
