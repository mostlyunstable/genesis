import React, { useState } from 'react';
import { 
  Cpu, 
  Search, 
  AlertTriangle, 
  ShieldAlert, 
  Filter, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  Layers,
  Terminal,
  Zap,
  Sliders
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Detection } from '@/types';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const DetectionEnginePage: React.FC = () => {
  const { detections, thresholds, updateDetectionStatus, addNotification } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetectionId, setSelectedDetectionId] = useState<string>(detections[0]?.id || 'DET-2026-0891');

  const selectedDetection = detections.find(d => d.id === selectedDetectionId) || detections[0];

  const filteredDetections = detections.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      d.sourceIp.includes(q) ||
      d.ruleName.toLowerCase().includes(q)
    );
  });

  const handleStatusChange = (status: Detection['status']) => {
    if (!selectedDetection) return;
    updateDetectionStatus(selectedDetection.id, status);
    addNotification({
      type: 'info',
      title: 'Detection Status Updated',
      message: `${selectedDetection.id} updated to ${status.toUpperCase()}.`
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. DETECTION ENGINE HUD & VELOCITY THRESHOLDS
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#54765C] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                BEHAVIORAL HEURISTIC ENGINE
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">STREAMING CORRELATION WINDOWS</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Detection Engine
            </h1>
            <p className="text-sm text-[#73796F] font-sans max-w-2xl leading-relaxed">
              Automated behavioral anomaly detection, statistical velocity triggers, and deterministic rule evaluations.
            </p>
          </div>

          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search detections, rules, or IPs..."
                className="w-full bg-[#F0F1EB] border border-[#E3E5DC] focus:border-[#54765C] rounded-full px-4 py-2.5 pl-10 text-xs text-[#20251F] placeholder-[#969B91] font-mono focus:outline-none transition-colors shadow-inner"
              />
              <Search className="w-4 h-4 text-[#969B91] absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Active Engine Threshold Rules Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-[#E3E5DC] font-mono text-xs">
          <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
            <div className="text-[10px] text-[#969B91] uppercase tracking-wider font-bold">SSH Brute Velocity Threshold</div>
            <div className="text-[#20251F] font-bold text-base mt-1">
              &ge; {thresholds.sshFailedAttemptThreshold} attempts <span className="text-[10px] font-normal text-[#73796F]">/ {thresholds.sshWindowSeconds}s</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
            <div className="text-[10px] text-[#969B91] uppercase tracking-wider font-bold">SAML Password Spray Threshold</div>
            <div className="text-[#20251F] font-bold text-base mt-1">
              &ge; {thresholds.passwordSprayUniqueUsersThreshold} unique accounts <span className="text-[10px] font-normal text-[#73796F]">/ {thresholds.passwordSprayWindowSeconds}s</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
            <div className="text-[10px] text-[#969B91] uppercase tracking-wider font-bold">Distributed Ingress Threshold</div>
            <div className="text-[#20251F] font-bold text-base mt-1">
              &ge; {thresholds.distributedThresholdIps} distinct source IPs <span className="text-[10px] font-normal text-[#73796F]">converging</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN DETECTION INSPECTION WORKSPACE
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Detections List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91] px-1">
            Triggered Detections ({filteredDetections.length})
          </div>

          <div className="space-y-3">
            {filteredDetections.map((detection) => {
              const isSelected = detection.id === selectedDetection?.id;

              return (
                <div
                  key={detection.id}
                  onClick={() => setSelectedDetectionId(detection.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#54765C] shadow-origin-sm ring-1 ring-[#54765C]/30'
                      : 'bg-white border-[#E3E5DC] hover:border-[#CFD4C9] hover:bg-[#FAFAF7]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#54765C]">{detection.id}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={detection.severity} />
                      <span className="text-[10px] text-[#969B91] uppercase font-bold">{detection.status}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-[#20251F] font-sans mt-2">
                    {detection.name}
                  </h3>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E3E5DC] text-[11px] font-mono text-[#73796F]">
                    <span>Source: <strong className="text-[#20251F]">{detection.sourceIp}</strong></span>
                    <span>Events: <strong className="text-[#20251F]">{detection.eventCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Detection Dossier */}
        <div className="lg:col-span-7">
          {selectedDetection ? (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm space-y-6">
              
              {/* Header */}
              <div className="p-6 border-b border-[#E3E5DC] bg-[#FAFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#54765C] font-bold">{selectedDetection.id}</span>
                    <SeverityBadge severity={selectedDetection.severity} />
                    <span className="text-[#73796F]">Rule: {selectedDetection.ruleId}</span>
                  </div>
                  <h2 className="font-display text-2xl text-[#20251F] mt-1">
                    {selectedDetection.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedDetection.status}
                    onChange={(e) => handleStatusChange(e.target.value as Detection['status'])}
                    className="bg-white border border-[#E3E5DC] text-[#20251F] px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-[#54765C] cursor-pointer"
                  >
                    <option value="open">STATUS: OPEN</option>
                    <option value="investigating">STATUS: INVESTIGATING</option>
                    <option value="contained">STATUS: CONTAINED</option>
                    <option value="resolved">STATUS: RESOLVED</option>
                    <option value="false_positive">STATUS: FALSE POSITIVE</option>
                  </select>
                </div>
              </div>

              {/* Dossier Content */}
              <div className="p-6 sm:p-8 space-y-6">
                
                {/* Description Narrative */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    HEURISTIC EVALUATION SUMMARY
                  </div>
                  <p className="text-sm text-[#20251F] leading-relaxed font-sans">
                    {selectedDetection.description}
                  </p>
                </div>

                {/* Quantitative Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E3E5DC] font-mono text-xs">
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Risk Score</span>
                    <span className="text-[#B94C43] font-bold text-base block mt-0.5">{selectedDetection.riskScore}/100</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Confidence</span>
                    <span className="text-[#54765C] font-bold text-base block mt-0.5">{selectedDetection.confidence}%</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Event Count</span>
                    <span className="text-[#20251F] font-bold text-base block mt-0.5">{selectedDetection.eventCount}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase block">Target Accounts</span>
                    <span className="text-[#20251F] font-bold text-base block mt-0.5">{selectedDetection.targetAccounts.length}</span>
                  </div>
                </div>

                {/* Triggering Conditions Evaluated */}
                <div className="pt-4 border-t border-[#E3E5DC] space-y-2.5">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    TRIGGERING CONDITIONS EVALUATED (MATHEMATICAL MODEL)
                  </div>
                  <div className="space-y-2 font-mono text-xs">
                    {selectedDetection.triggeringConditions.map((cond, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] text-[#20251F] flex items-center gap-2">
                        <span className="text-[#54765C] font-bold">&gt;</span>
                        <span>{cond}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supporting Telemetry Event IDs */}
                <div className="pt-4 border-t border-[#E3E5DC] space-y-2.5">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    SUPPORTING EVENT IDENTIFIERS ({selectedDetection.supportingEventIds.length})
                  </div>
                  <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                    {selectedDetection.supportingEventIds.map((eid) => (
                      <span key={eid} className="px-3 py-1 rounded-full bg-[#EAF0E6] border border-[#CFDCC9] text-[#54765C]">
                        {eid}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-[#E3E5DC] rounded-3xl text-xs text-[#969B91] font-mono">
              Select a detection on the left to inspect heuristic triggering conditions.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
