import React, { useState, useEffect } from 'react';
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
  Sliders,
  RefreshCw,
  ShieldCheck,
  Inbox
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Detection } from '@/types';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const DetectionEnginePage: React.FC = () => {
  const { 
    detections, 
    thresholds, 
    updateDetectionStatus, 
    updateThresholds,
    fetchDetections, 
    fetchThresholds,
    addNotification 
  } = useSecurityStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDetections();
    fetchThresholds();
  }, [fetchDetections, fetchThresholds]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDetections(), fetchThresholds()]);
    setIsRefreshing(false);
  };

  const selectedDetection = detections.find(d => d.id === selectedDetectionId) || (detections.length > 0 ? detections[0] : null);

  const filteredDetections = detections.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      (d.sourceIp && d.sourceIp.includes(q)) ||
      (d.ruleName && d.ruleName.toLowerCase().includes(q))
    );
  });

  const handleStatusChange = async (status: Detection['status']) => {
    if (!selectedDetection) return;
    const ok = await updateDetectionStatus(selectedDetection.id, status);
    if (ok) {
      addNotification({
        type: 'info',
        title: 'Detection Status Updated',
        message: `${selectedDetection.id} updated to ${status.toUpperCase()}.`
      });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. DETECTION ENGINE HUD & VELOCITY THRESHOLDS
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl text-[#20251F] tracking-tight">
              Detections
            </h1>
            <p className="text-sm text-[#73796F]">
              Behavioral detection rules and active security findings ({detections.length} total).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rule, IP, ID..."
                className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 pl-10 text-xs text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C]"
              />
              <Search className="w-4 h-4 text-[#969B91] absolute left-3.5 top-3 pointer-events-none" />
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-[#F0F1EB] hover:bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
              title="Refresh detections"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Current Active Engine Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-[#E3E5DC] font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
            <span className="text-[10px] text-[#969B91] uppercase">SSH Threshold</span>
            <div className="text-sm font-bold text-[#20251F] mt-0.5">
              {thresholds.sshFailedAttemptThreshold} fails / {thresholds.sshWindowSeconds}s
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
            <span className="text-[10px] text-[#969B91] uppercase">Spray Threshold</span>
            <div className="text-sm font-bold text-[#20251F] mt-0.5">
              {thresholds.passwordSprayUniqueUsersThreshold} users / {thresholds.passwordSprayWindowSeconds}s
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
            <span className="text-[10px] text-[#969B91] uppercase">Distributed IPs</span>
            <div className="text-sm font-bold text-[#20251F] mt-0.5">
              &gt;= {thresholds.distributedThresholdIps} IPs
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
            <span className="text-[10px] text-[#969B91] uppercase">Auto Response</span>
            <div className={`text-sm font-bold mt-0.5 ${thresholds.autonomousResponseEnabled ? 'text-[#54765C]' : 'text-[#B94C43]'}`}>
              {thresholds.autonomousResponseEnabled ? 'ENABLED' : 'HALTED'}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN MASTER-DETAIL DETECTIONS VIEW
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (5 cols): Detections Feed */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91] px-1">
            Confirmed Detections ({filteredDetections.length})
          </div>

          {filteredDetections.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white border border-[#E3E5DC] text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF0E6] text-[#54765C] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base text-[#20251F]">No detections generated</h3>
              <p className="text-xs text-[#73796F] max-w-xs mx-auto">
                No behavioral detections have been triggered yet. Ingest telemetry to test detection rules against live log data.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDetections.map((det) => {
                const isSelected = det.id === selectedDetection?.id;

                return (
                  <div
                    key={det.id}
                    onClick={() => setSelectedDetectionId(det.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#54765C] shadow-origin-sm ring-1 ring-[#54765C]/30'
                        : 'bg-white border-[#E3E5DC] hover:border-[#CFD4C9] hover:bg-[#FAFAF7]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-[#54765C] text-sm">{det.id}</span>
                      <SeverityBadge severity={det.severity} />
                    </div>

                    <h3 className="font-display text-xl text-[#20251F] font-bold mt-2">
                      {det.name}
                    </h3>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E3E5DC] text-[11px] font-mono text-[#73796F]">
                      <span>Source: <strong className="text-[#B94C43]">{det.sourceIp}</strong></span>
                      <span>Confidence: <strong className="text-[#54765C]">{det.confidence}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Full Detection Details */}
        <div className="lg:col-span-7">
          {selectedDetection ? (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm space-y-6">
              
              <div className="p-6 border-b border-[#E3E5DC] bg-[#FAFAF7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-xs font-mono">
                    <span className="text-[#54765C] font-bold">{selectedDetection.id}</span>
                    <SeverityBadge severity={selectedDetection.severity} />
                    <span className="text-[#969B91]">
                      {selectedDetection.timestamp ? new Date(selectedDetection.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl text-[#20251F] mt-1 font-bold">
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

              <div className="p-6 sm:p-8 space-y-6">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                    DETECTION DESCRIPTION
                  </div>
                  <p className="text-sm text-[#20251F] leading-relaxed font-sans">
                    {selectedDetection.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#E3E5DC]">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91]">
                    TRIGGERING CONDITIONS
                  </span>
                  <div className="space-y-1.5">
                    {selectedDetection.triggeringConditions?.map((cond, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC] text-xs font-mono text-[#20251F]">
                        &gt; {cond}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-[#E3E5DC] font-mono text-xs">
                  <div className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase">Rule Triggered</span>
                    <div className="text-xs font-bold text-[#20251F] mt-1">{selectedDetection.ruleName}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase">Source IP</span>
                    <div className="text-xs font-bold text-[#B94C43] mt-1">{selectedDetection.sourceIp}</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[10px] text-[#969B91] uppercase">Event Evidence</span>
                    <div className="text-xs font-bold text-[#20251F] mt-1">{selectedDetection.eventCount} events</div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-[#E3E5DC] rounded-3xl p-12 text-center space-y-3 shadow-origin-sm">
              <div className="w-12 h-12 rounded-full bg-[#F0F1EB] text-[#73796F] mx-auto flex items-center justify-center">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg text-[#20251F]">No detection selected</h3>
              <p className="text-sm text-[#73796F] max-w-sm mx-auto">
                Select a detection from the feed to inspect triggered behavioral conditions and audit trail links.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
