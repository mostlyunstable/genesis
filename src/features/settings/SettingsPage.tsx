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
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-16">
      
      {/* Editorial Header (De-boxed) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E4DC]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-[#5C645B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E4BD8]" />
            <span>Platform Controls</span>
            <span className="text-[#CFD4C9]">•</span>
            <span>Orchestration &amp; Safeguards</span>
          </div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-[#111417] tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#5C645B]">
            Detection heuristic baselines, SOAR safeguards, and backend telemetry connection.
          </p>
        </div>
      </div>

      {/* 1. Global Kill-Switch Guard */}
      <section className="bg-white border border-[#E2E4DC] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              autonomousResponseGlobalEnabled ? 'bg-[#EFF4FF] text-[#1E4BD8]' : 'bg-[#F9ECEB] text-[#B94C43]'
            }`}>
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-[#111417]">
                Autonomous Defensive Response Engine
              </h3>
              <p className="text-xs text-[#5C645B]">
                When disabled, all automated SOAR countermeasures, IP drops, and session terminations are halted.
              </p>
            </div>
          </div>

          <Button
            variant={autonomousResponseGlobalEnabled ? 'primary' : 'danger'}
            size="md"
            onClick={toggleAutonomousGlobal}
            icon={<Zap className="w-4 h-4" />}
            className="self-start sm:self-auto shrink-0"
          >
            {autonomousResponseGlobalEnabled ? 'ARMED • ACTIVE' : 'HALTED • DISARMED'}
          </Button>
        </div>
      </section>

      {/* 2. Detection Velocity Thresholds */}
      <section className="bg-white border border-[#E2E4DC] rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E2E4DC] pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#1E4BD8]" />
            <h3 className="font-display text-base font-semibold text-[#111417]">
              Heuristic Correlation Thresholds
            </h3>
          </div>
          <Button
            variant="action"
            size="sm"
            onClick={handleSaveThresholds}
            isLoading={isSaving}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            Save Policies
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="text-[#111417] font-semibold block">
              SSH Brute Force Velocity Limit (attempts)
            </label>
            <input
              type="number"
              value={localThresholds.sshFailedAttemptThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshFailedAttemptThreshold: Number(e.target.value) })}
              className="w-full bg-[#F0F1EA] border-2 border-[#E2E4DC] rounded-xl px-4 py-2.5 text-[#111417] focus:outline-none focus:border-[#1E4BD8] focus:bg-white focus:ring-2 focus:ring-[#1E4BD8]/10"
            />
            <span className="text-[10px] text-[#889085]">Failures before adversary IP isolation trigger</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#111417] font-semibold block">
              SSH Velocity Window (seconds)
            </label>
            <input
              type="number"
              value={localThresholds.sshWindowSeconds}
              onChange={(e) => setLocalThresholds({ ...localThresholds, sshWindowSeconds: Number(e.target.value) })}
              className="w-full bg-[#F0F1EA] border-2 border-[#E2E4DC] rounded-xl px-4 py-2.5 text-[#111417] focus:outline-none focus:border-[#1E4BD8] focus:bg-white focus:ring-2 focus:ring-[#1E4BD8]/10"
            />
            <span className="text-[10px] text-[#889085]">Sliding window for brute-force rate calculations</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#111417] font-semibold block">
              Password Spray Unique Accounts Threshold
            </label>
            <input
              type="number"
              value={localThresholds.passwordSprayUniqueUsersThreshold}
              onChange={(e) => setLocalThresholds({ ...localThresholds, passwordSprayUniqueUsersThreshold: Number(e.target.value) })}
              className="w-full bg-[#F0F1EA] border-2 border-[#E2E4DC] rounded-xl px-4 py-2.5 text-[#111417] focus:outline-none focus:border-[#1E4BD8] focus:bg-white focus:ring-2 focus:ring-[#1E4BD8]/10"
            />
            <span className="text-[10px] text-[#889085]">Unique usernames probed before spray detection</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[#111417] font-semibold block">
              Temporary IP Block Duration (minutes)
            </label>
            <input
              type="number"
              value={localThresholds.temporaryIpBlockDurationMinutes}
              onChange={(e) => setLocalThresholds({ ...localThresholds, temporaryIpBlockDurationMinutes: Number(e.target.value) })}
              className="w-full bg-[#F0F1EA] border-2 border-[#E2E4DC] rounded-xl px-4 py-2.5 text-[#111417] focus:outline-none focus:border-[#1E4BD8] focus:bg-white focus:ring-2 focus:ring-[#1E4BD8]/10"
            />
            <span className="text-[10px] text-[#889085]">Ingress iptables DROP duration before auto-expiry</span>
          </div>
        </div>
      </section>

      {/* 3. Real Backend API Connection Settings */}
      <section className="bg-white border-2 border-[#E2E4DC] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E2E4DC] pb-4">
          <Server className="w-4 h-4 text-[#1E4BD8]" />
          <h3 className="font-display text-base font-semibold text-[#111417]">
            FastAPI Ingestion Gateway Target
          </h3>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={fastApiEndpoint}
              onChange={(e) => setFastApiEndpoint(e.target.value)}
              className="w-full bg-[#F0F1EA] border-2 border-[#E2E4DC] rounded-xl px-4 py-2.5 text-[#111417] focus:outline-none focus:border-[#1E4BD8] focus:bg-white focus:ring-2 focus:ring-[#1E4BD8]/10"
            />
            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                size="md"
                onClick={handleSaveEndpoint}
              >
                Update Target
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handlePingBackend}
                isLoading={isPinging}
              >
                Ping /health
              </Button>
            </div>
          </div>
          <p className="text-[11px] font-sans text-[#5C645B]">
            All dashboard telemetry, incidents, and audit trails stream live from this service.
          </p>
        </div>
      </section>

    </div>
  );
};
