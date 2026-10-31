import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, 
  Search, 
  Filter, 
  ShieldAlert, 
  Bot, 
  GitCommit, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Terminal, 
  User, 
  Server, 
  Copy, 
  RotateCcw,
  Check,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Incident, Severity } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    incidents, 
    selectedIncidentId, 
    setSelectedIncidentId, 
    updateIncidentStatus, 
    executePlaybookAction,
    addNotification
  } = useSecurityStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Incident
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

  const filteredIncidents = incidents.filter(i => {
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.sourceIps.some(ip => ip.includes(q))
      );
    }
    return true;
  });

  const handleCopyEvidence = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addNotification({
      type: 'info',
      title: 'Copied Evidence ID',
      message: `Referenced ID ${id} copied to clipboard.`
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExecuteResponse = async () => {
    if (!selectedIncident?.assignedPlaybookId) return;
    await executePlaybookAction(
      selectedIncident.assignedPlaybookId,
      'Automated Isolation & Containment',
      selectedIncident.sourceIps[0],
      selectedIncident.id
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Incident Investigation Workspace</h2>
            <Badge variant="critical" dot>SIMULATED INCIDENT</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Correlated multi-stage attack chronologies, evidence chains, and MITRE ATT&CK mapping.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<Bot className="w-3.5 h-3.5 text-[#E0A34A]" />}
            onClick={() => navigate('/analyst')}
          >
            Ask AI Analyst
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<GitCommit className="w-3.5 h-3.5 text-[#6DA9E8]" />}
            onClick={() => navigate('/timeline')}
          >
            Full Progression Timeline
          </Button>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel: Incident List & Filters (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="p-3 bg-[#121720] border border-[#252D38] rounded-md space-y-2">
            <Input
              icon={<Search className="w-3.5 h-3.5" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incidents..."
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="all">Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </Select>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Statuses</option>
                <option value="active">Active</option>
                <option value="investigating">Investigating</option>
                <option value="contained">Contained</option>
                <option value="resolved">Resolved</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#171E28] border-[#E0A34A] shadow-md'
                      : 'bg-[#121720] border-[#252D38] hover:bg-[#151D28]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={inc.severity} />
                    <RiskScoreBadge score={inc.riskScore} size="sm" showLabel={false} />
                  </div>

                  <h3 className="text-xs font-semibold text-[#E8EDF4] mt-2 line-clamp-2">
                    {inc.title}
                  </h3>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#586574] mt-2 pt-2 border-t border-[#1C2430]">
                    <span>{inc.id}</span>
                    <span className="capitalize text-[#8994A4]">{inc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Panel: Incident Overview & Event Timeline (5 cols) */}
        {selectedIncident ? (
          <div className="lg:col-span-5 space-y-4">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#E0A34A] font-bold">{selectedIncident.id}</span>
                  <SeverityBadge severity={selectedIncident.severity} />
                </div>
              }
              action={
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedIncident.status}
                    onChange={(e) => updateIncidentStatus(selectedIncident.id, e.target.value as any)}
                    className="text-xs font-mono"
                  >
                    <option value="active">Active</option>
                    <option value="investigating">Investigating</option>
                    <option value="contained">Contained</option>
                    <option value="resolved">Resolved</option>
                  </Select>
                </div>
              }
            >
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <h3 className="text-base font-bold text-[#E8EDF4] font-sans">
                    {selectedIncident.title}
                  </h3>
                  <div className="text-[11px] text-[#8994A4] mt-1">
                    Category: <span className="text-[#E8EDF4]">{selectedIncident.category}</span>
                  </div>
                </div>

                {/* Score & Scope Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded">
                    <div className="text-[10px] text-[#586574]">RISK SCORE</div>
                    <div className="text-base font-bold text-[#EF5350] mt-0.5">{selectedIncident.riskScore}/100</div>
                  </div>
                  <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded">
                    <div className="text-[10px] text-[#586574]">AI CONFIDENCE</div>
                    <div className="text-base font-bold text-[#42B883] mt-0.5">{selectedIncident.confidenceScore}%</div>
                  </div>
                  <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded">
                    <div className="text-[10px] text-[#586574]">EVENTS CORRELATED</div>
                    <div className="text-base font-bold text-[#E8EDF4] mt-0.5">{selectedIncident.eventCount}</div>
                  </div>
                  <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded">
                    <div className="text-[10px] text-[#586574]">SOURCE HOSTS</div>
                    <div className="text-xs font-bold text-[#6DA9E8] mt-1 truncate">{selectedIncident.sourceIps[0]}</div>
                  </div>
                </div>

                {/* Detection Explanation */}
                <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded space-y-1">
                  <div className="text-[10px] font-semibold text-[#8994A4] uppercase">Detection Narrative</div>
                  <p className="text-[#E8EDF4] leading-relaxed text-xs">
                    {selectedIncident.detectionExplanation}
                  </p>
                </div>

                {/* Attack Progression Timeline */}
                <div>
                  <div className="text-[10px] font-semibold text-[#8994A4] uppercase mb-2 flex items-center justify-between">
                    <span>Correlated Attack Progression ({selectedIncident.timelineEvents.length} stages)</span>
                    <span className="text-[10px] text-[#586574]">Deterministic Replay</span>
                  </div>

                  <div className="space-y-2 border-l-2 border-[#252D38] ml-2 pl-3">
                    {selectedIncident.timelineEvents.map((evt) => (
                      <div key={evt.id} className="relative group">
                        <div className={`absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#121720] ${
                          evt.severity === 'critical' ? 'bg-[#EF5350]' :
                          evt.severity === 'warning' ? 'bg-[#E5AD52]' : 'bg-[#6DA9E8]'
                        }`} />

                        <div className="p-2.5 bg-[#0D1016] border border-[#1C2430] rounded hover:border-[#252D38] transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#E8EDF4]">{evt.title}</span>
                            <span className="text-[10px] text-[#586574]">{evt.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-[#8994A4] mt-1">{evt.description}</p>
                          {evt.evidenceId && (
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#6DA9E8]">
                              <span>Evidence:</span>
                              <code className="bg-[#171E28] px-1 py-0.5 rounded text-[#E0A34A]">{evt.evidenceId}</code>
                              <button
                                onClick={() => handleCopyEvidence(evt.evidenceId!, evt.evidenceId!)}
                                className="hover:text-[#E8EDF4]"
                              >
                                {copiedId === evt.evidenceId ? <Check className="w-3 h-3 text-[#42B883]" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Related Incidents */}
                <div className="pt-2 border-t border-[#1C2430]">
                  <div className="text-[10px] font-semibold text-[#8994A4] uppercase mb-1.5">
                    Related Open Security Incidents
                  </div>
                  <div className="space-y-1">
                    {incidents.filter(i => i.id !== selectedIncident.id).map(other => (
                      <div
                        key={other.id}
                        onClick={() => setSelectedIncidentId(other.id)}
                        className="p-2 rounded bg-[#0D1016] border border-[#1C2430] flex items-center justify-between cursor-pointer hover:bg-[#171E28]"
                      >
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={other.severity} />
                          <span className="text-xs text-[#E8EDF4] truncate">{other.title}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#586574]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {/* Right Panel: AI Investigation, MITRE ATT&CK & Autonomous Actions (4 cols) */}
        {selectedIncident ? (
          <div className="lg:col-span-4 space-y-4">
            {/* AI Investigation Summary Card */}
            <Card
              title="AI Investigation Summary"
              badge={<Badge variant="accent">AUTONOMOUS SYNTHESIS</Badge>}
            >
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded text-[#E8EDF4] leading-relaxed">
                  {selectedIncident.aiSummary.executiveSummary}
                </div>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-[#8994A4] mb-1">
                    Evidence Chain Correlated
                  </div>
                  <ul className="space-y-1 text-[#8994A4] bg-[#0D1016] p-2.5 rounded border border-[#1C2430] text-[11px]">
                    {selectedIncident.aiSummary.evidenceChain.map((ev, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#E0A34A] font-bold">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-[#8994A4] mb-1">
                    Root Cause Analysis
                  </div>
                  <div className="p-2.5 bg-[#0D1016] rounded border border-[#1C2430] text-[#E8EDF4] text-[11px]">
                    {selectedIncident.aiSummary.rootCauseAnalysis}
                  </div>
                </div>
              </div>
            </Card>

            {/* MITRE ATT&CK Matrix Card */}
            <Card
              title="MITRE ATT&CK Mapping"
              badge={<Badge variant="info">ENTERPRISE MATRIX</Badge>}
            >
              <div className="space-y-2 text-xs font-mono">
                {selectedIncident.mitreAttack.map((tech) => (
                  <div
                    key={tech.techniqueId}
                    className="p-2.5 bg-[#0D1016] border border-[#252D38] rounded space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[#E0A34A] font-bold">{tech.techniqueId}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#171E28] text-[#8994A4]">
                        {tech.tactic}
                      </span>
                    </div>
                    <div className="text-[#E8EDF4] font-semibold">{tech.techniqueName}</div>
                    {tech.subtechnique && (
                      <div className="text-[10px] text-[#6DA9E8]">{tech.subtechnique}</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Recommended Response & Action Trigger */}
            <Card
              title="Recommended Defensive Playbook"
              badge={<Badge variant="success">READY</Badge>}
            >
              <div className="space-y-3 text-xs font-mono">
                <div className="text-[#E8EDF4]">
                  Playbook: <strong className="text-[#E0A34A]">{selectedIncident.assignedPlaybookId}</strong>
                </div>

                <div className="space-y-1.5">
                  {selectedIncident.aiSummary.recommendedActions.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-[#8994A4]">
                      <span className="text-[#42B883] font-bold">✓</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#1C2430]">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    icon={<Zap className="w-3.5 h-3.5" />}
                    onClick={handleExecuteResponse}
                  >
                    Execute Autonomous Response (Simulated)
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
};
