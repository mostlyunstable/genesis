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
import { SeverityBadge } from '@/components/ui/Badge';
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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. DETECTION ENGINE HUD & VELOCITY THRESHOLDS
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#38BDF8] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
                BEHAVIORAL HEURISTIC ENGINE
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-[10px] font-mono text-[#94A3B8]">STREAMING CORRELATION WINDOWS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Detection Engine
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Automated behavioral anomaly detection, statistical velocity triggers, and rule evaluations.
            </p>
          </div>

          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search detections, rule names, or IPs..."
                className="w-full bg-[#07080B] border border-[#1C2230] focus:border-[#38BDF8] rounded-lg px-3.5 py-2 pl-9 text-xs text-white placeholder-[#64748B] font-mono focus:outline-none transition-colors"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Active Engine Threshold Rules Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 mt-4 border-t border-[#1C2230] font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
            <div className="text-[10px] text-[#64748B] uppercase">SSH Brute Velocity Threshold</div>
            <div className="text-white font-bold text-sm mt-0.5">
              &ge; {thresholds.sshFailedAttemptThreshold} attempts <span className="text-[10px] font-normal text-[#94A3B8]">/ {thresholds.sshWindowSeconds}s</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
            <div className="text-[10px] text-[#64748B] uppercase">SAML Password Spray Threshold</div>
            <div className="text-white font-bold text-sm mt-0.5">
              &ge; {thresholds.passwordSprayUniqueUsersThreshold} unique accounts <span className="text-[10px] font-normal text-[#94A3B8]">/ {thresholds.passwordSprayWindowSeconds}s</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
            <div className="text-[10px] text-[#64748B] uppercase">Distributed Ingress Threshold</div>
            <div className="text-white font-bold text-sm mt-0.5">
              &ge; {thresholds.distributedThresholdIps} distinct source IPs <span className="text-[10px] font-normal text-[#94A3B8]">converging</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN DETECTION INSPECTION WORKSPACE
          Left (5 cols): Detections List
          Right (7 cols): Selected Detection Heuristics & Trigger Dossier
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Detections List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B] px-1">
            Triggered Detections ({filteredDetections.length})
          </div>

          <div className="space-y-2">
            {filteredDetections.map((detection) => {
              const isSelected = detection.id === selectedDetection?.id;

              return (
                <div
                  key={detection.id}
                  onClick={() => setSelectedDetectionId(detection.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#161B26] border-[#38BDF8] ring-1 ring-[#38BDF8]/20 shadow-sm'
                      : 'bg-[#10131B] border-[#1C2230] hover:border-[#2A3347]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#F97316]">{detection.id}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={detection.severity} />
                      <span className="text-[10px] text-[#64748B] uppercase font-bold">{detection.status}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white font-sans mt-1">
                    {detection.name}
                  </h3>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#1C2230] text-[11px] font-mono text-[#64748B]">
                    <span>Source: <strong className="text-slate-300">{detection.sourceIp}</strong></span>
                    <span>Events: <strong className="text-white">{detection.eventCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Detection Dossier */}
        <div className="lg:col-span-7">
          {selectedDetection ? (
            <div className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm space-y-6">
              
              {/* Header */}
              <div className="p-5 border-b border-[#1C2230] bg-[#0C0E14] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-[#38BDF8] font-bold">{selectedDetection.id}</span>
                    <SeverityBadge severity={selectedDetection.severity} />
                    <span className="text-[#64748B]">Rule: {selectedDetection.ruleId}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">
                    {selectedDetection.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedDetection.status}
                    onChange={(e) => handleStatusChange(e.target.value as Detection['status'])}
                    className="bg-[#07080B] border border-[#1C2230] text-white px-2.5 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-[#38BDF8]"
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
              <div className="p-5 space-y-6">
                
                {/* Description Narrative */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    HEURISTIC EVALUATION SUMMARY
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {selectedDetection.description}
                  </p>
                </div>

                {/* Quantitative Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#1C2230] font-mono text-xs">
                  <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[10px] text-[#64748B] uppercase block">Risk Score</span>
                    <span className="text-[#EF4444] font-bold text-base block mt-0.5">{selectedDetection.riskScore}/100</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[10px] text-[#64748B] uppercase block">Confidence</span>
                    <span className="text-[#38BDF8] font-bold text-base block mt-0.5">{selectedDetection.confidence}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[10px] text-[#64748B] uppercase block">Event Count</span>
                    <span className="text-white font-bold text-base block mt-0.5">{selectedDetection.eventCount}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#07080B] border border-[#1C2230]">
                    <span className="text-[10px] text-[#64748B] uppercase block">Target Accounts</span>
                    <span className="text-white font-bold text-base block mt-0.5">{selectedDetection.targetAccounts.length}</span>
                  </div>
                </div>

                {/* Triggering Conditions Evaluated */}
                <div className="pt-4 border-t border-[#1C2230] space-y-2">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    TRIGGERING CONDITIONS EVALUATED (MATHEMATICAL MODEL)
                  </div>
                  <div className="space-y-1.5 font-mono text-xs">
                    {selectedDetection.triggeringConditions.map((cond, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-[#07080B] border border-[#1C2230] text-slate-300 flex items-center gap-2">
                        <span className="text-[#38BDF8] font-bold">&gt;</span>
                        <span>{cond}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supporting Telemetry Event IDs */}
                <div className="pt-4 border-t border-[#1C2230] space-y-2">
                  <div className="text-[10px] font-mono uppercase text-[#64748B] font-bold tracking-wider">
                    SUPPORTING EVENT IDENTIFIERS ({selectedDetection.supportingEventIds.length})
                  </div>
                  <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
                    {selectedDetection.supportingEventIds.map((eid) => (
                      <span key={eid} className="px-2.5 py-1 rounded bg-[#07080B] border border-[#1C2230] text-slate-300">
                        {eid}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-[#10131B] border border-[#1C2230] rounded-xl text-xs text-[#94A3B8] font-mono">
              Select a detection on the left to inspect heuristic triggering conditions.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
