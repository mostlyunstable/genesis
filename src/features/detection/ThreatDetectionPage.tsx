import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crosshair, 
  ShieldAlert, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Zap, 
  FileText, 
  Search, 
  ExternalLink,
  Bot
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Detection, DetectionCategory } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

export const ThreatDetectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    detections, 
    thresholds, 
    updateDetectionStatus, 
    updateThresholds,
    setSelectedIncidentId,
    executePlaybookAction
  } = useSecurityStore();

  const [selectedDetectionId, setSelectedDetectionId] = useState<string>('DET-2026-0891');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showThresholdsModal, setShowThresholdsModal] = useState(false);

  // Active selected detection
  const selectedDetection = detections.find(d => d.id === selectedDetectionId) || detections[0];

  const filteredDetections = detections.filter(d => {
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.sourceIp.includes(q) ||
        d.ruleName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleJumpToIncident = (incidentId?: string) => {
    if (!incidentId) return;
    setSelectedIncidentId(incidentId);
    navigate('/incidents');
  };

  const handleExecutePlaybook = async (detection: Detection) => {
    if (!detection.suggestedPlaybookId) return;
    await executePlaybookAction(
      detection.suggestedPlaybookId,
      `Simulated Mitigation for ${detection.name}`,
      detection.sourceIp,
      detection.associatedIncidentId
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Threat Detection Engine</h2>
            <Badge variant="accent" dot>RULES & CORRELATION</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Active behavioral models: High-velocity SSH brute force, distributed password spraying, and geospatial drift.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Sliders className="w-3.5 h-3.5" />}
            onClick={() => setShowThresholdsModal(true)}
          >
            Detection Thresholds
          </Button>
        </div>
      </div>

      {/* Main Split: Left Detection Feed & Right Details Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Filter and Detection Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filters */}
          <div className="p-3 bg-[#121720] border border-[#252D38] rounded-md space-y-2.5">
            <Input
              icon={<Search className="w-3.5 h-3.5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search detection rule, ID, IP..."
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="ssh_brute_force">SSH Brute Force</option>
                <option value="password_spraying">Password Spraying</option>
                <option value="credential_stuffing">Credential Stuffing</option>
                <option value="abnormal_frequency">Abnormal Frequency</option>
              </Select>

              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </Select>
            </div>
          </div>

          {/* Detections List */}
          <div className="space-y-2">
            {filteredDetections.map((detection) => {
              const isSelected = selectedDetection?.id === detection.id;
              return (
                <div
                  key={detection.id}
                  onClick={() => setSelectedDetectionId(detection.id)}
                  className={`p-3.5 rounded-md border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#171E28] border-[#E0A34A] shadow-lg'
                      : 'bg-[#121720] border-[#252D38] hover:bg-[#151D28]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={detection.severity} />
                      <span className="text-xs font-mono text-[#586574]">{detection.id}</span>
                    </div>
                    <RiskScoreBadge score={detection.riskScore} size="sm" />
                  </div>

                  <h3 className="text-sm font-semibold text-[#E8EDF4] mt-2 line-clamp-1">
                    {detection.name}
                  </h3>

                  <p className="text-xs text-[#8994A4] font-mono mt-1 line-clamp-2">
                    {detection.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#586574] mt-3 pt-2 border-t border-[#1C2430]">
                    <span>Source: <strong className="text-[#6DA9E8]">{detection.sourceIp}</strong></span>
                    <span>Confidence: <strong className="text-[#42B883]">{detection.confidence}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Detection In-Depth Inspector (7 cols) */}
        {selectedDetection ? (
          <div className="lg:col-span-7 space-y-4">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-[#E8EDF4]">{selectedDetection.name}</span>
                  <SeverityBadge severity={selectedDetection.severity} />
                </div>
              }
              action={
                <div className="flex items-center gap-2">
                  <RiskScoreBadge score={selectedDetection.riskScore} />
                  <Select
                    value={selectedDetection.status}
                    onChange={(e) => updateDetectionStatus(selectedDetection.id, e.target.value as any)}
                    className="text-xs font-mono"
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="contained">Contained</option>
                    <option value="resolved">Resolved</option>
                    <option value="false_positive">False Positive</option>
                  </Select>
                </div>
              }
            >
              <div className="space-y-4 text-xs font-mono">
                {/* Description Banner */}
                <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded text-[#E8EDF4] text-xs leading-relaxed">
                  {selectedDetection.description}
                </div>

                {/* Core Attributes Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded">
                    <div className="text-[10px] text-[#586574] uppercase">Attacking Source IP</div>
                    <div className="text-xs font-semibold text-[#EF5350] mt-0.5">{selectedDetection.sourceIp}</div>
                  </div>
                  <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded">
                    <div className="text-[10px] text-[#586574] uppercase">Correlated Events</div>
                    <div className="text-xs font-semibold text-[#E8EDF4] mt-0.5">{selectedDetection.eventCount}</div>
                  </div>
                  <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded">
                    <div className="text-[10px] text-[#586574] uppercase">Detection Rule</div>
                    <div className="text-xs font-semibold text-[#E0A34A] mt-0.5 truncate">{selectedDetection.ruleId}</div>
                  </div>
                  <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded">
                    <div className="text-[10px] text-[#586574] uppercase">Confidence Factor</div>
                    <div className="text-xs font-semibold text-[#42B883] mt-0.5">{selectedDetection.confidence}% Match</div>
                  </div>
                </div>

                {/* Target Accounts */}
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[#8994A4] mb-1.5">
                    Target Accounts Probed ({selectedDetection.targetAccounts.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetection.targetAccounts.map((acct) => (
                      <span key={acct} className="px-2 py-0.5 rounded bg-[#171E28] border border-[#252D38] text-[#E8EDF4]">
                        {acct}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Triggering Conditions */}
                <div>
                  <div className="text-[10px] uppercase font-semibold text-[#8994A4] mb-1.5">
                    Triggering Behavioral Conditions
                  </div>
                  <ul className="space-y-1.5 bg-[#0D1016] p-3 rounded border border-[#1C2430]">
                    {selectedDetection.triggeringConditions.map((cond, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[#E8EDF4]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#E0A34A] shrink-0 mt-0.5" />
                        <span>{cond}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Supporting Telemetry Events */}
                {selectedDetection.supportingEventIds.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-[#8994A4] mb-1.5">
                      Supporting Telemetry Evidence References
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedDetection.supportingEventIds.map((evtId) => (
                        <button
                          key={evtId}
                          onClick={() => navigate('/logs')}
                          className="px-2 py-1 rounded bg-[#0D1016] hover:bg-[#171E28] border border-[#252D38] text-[#6DA9E8] hover:text-[#E8EDF4] flex items-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3 h-3 text-[#586574]" />
                          <span>{evtId}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Playbook & Incident Actions */}
                <div className="p-3 bg-[#171E28] border border-[#252D38] rounded flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-[#586574]">Associated Incident</div>
                    <div className="text-xs font-semibold text-[#E8EDF4] mt-0.5">
                      {selectedDetection.associatedIncidentId || 'No Incident Linked'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedDetection.associatedIncidentId && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                        onClick={() => handleJumpToIncident(selectedDetection.associatedIncidentId)}
                      >
                        Investigate Incident
                      </Button>
                    )}

                    {selectedDetection.suggestedPlaybookId && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Zap className="w-3.5 h-3.5" />}
                        onClick={() => handleExecutePlaybook(selectedDetection)}
                      >
                        Execute Playbook
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </div>

      {/* Thresholds Modal */}
      {showThresholdsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121720] border border-[#252D38] rounded-lg max-w-lg w-full p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#252D38] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#E0A34A]" />
                <h3 className="text-sm font-bold text-[#E8EDF4]">Configure Detection Thresholds</h3>
              </div>
              <button onClick={() => setShowThresholdsModal(false)} className="text-[#8994A4] hover:text-[#E8EDF4]">
                ✕
              </button>
            </div>

            <p className="text-[11px] text-[#8994A4]">
              Tune heuristics for SSH brute-force triggers and distributed password spray windows.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[#8994A4] block mb-1">SSH Failed Attempts Threshold (attempts):</label>
                <Input
                  type="number"
                  value={thresholds.sshFailedAttemptThreshold}
                  onChange={(e) => updateThresholds({ sshFailedAttemptThreshold: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-[#8994A4] block mb-1">SSH Detection Window (seconds):</label>
                <Input
                  type="number"
                  value={thresholds.sshWindowSeconds}
                  onChange={(e) => updateThresholds({ sshWindowSeconds: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-[#8994A4] block mb-1">Password Spray Unique Users Threshold:</label>
                <Input
                  type="number"
                  value={thresholds.passwordSprayUniqueUsersThreshold}
                  onChange={(e) => updateThresholds({ passwordSprayUniqueUsersThreshold: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-[#8994A4] block mb-1">Temporary IP Block Duration (minutes):</label>
                <Input
                  type="number"
                  value={thresholds.temporaryIpBlockDurationMinutes}
                  onChange={(e) => updateThresholds({ temporaryIpBlockDurationMinutes: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#252D38] pt-3">
              <Button variant="secondary" size="sm" onClick={() => setShowThresholdsModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
