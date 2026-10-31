import React, { useState } from 'react';
import { 
  GitCommit, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  AlertOctagon, 
  ArrowRight,
  Filter,
  Bot
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';

interface DetailedTimelineNode {
  id: string;
  time: string;
  stage: 'initial_recon' | 'credential_exhaustion' | 'unauthorized_access' | 'detection_trigger' | 'ai_synthesis' | 'autonomous_countermeasure' | 'verification';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  evidenceType: 'raw_log' | 'rule_match' | 'ai_inference' | 'soar_action';
  source: string;
  evidenceSnippet?: string;
  eventId?: string;
}

const CHRONOLOGICAL_SSH_BREACH: DetailedTimelineNode[] = [
  {
    id: 'TN-01',
    time: '10:15:00 UTC',
    stage: 'initial_recon',
    title: 'First SSH Connection Handshake',
    description: 'External IP 198.51.100.42 opened TCP handshake to bastion-01 port 22.',
    severity: 'info',
    evidenceType: 'raw_log',
    source: 'bastion-01 (sshd)',
    eventId: 'EVT-2026-SSH-001',
    evidenceSnippet: 'sshd[12400]: Failed password for invalid user root from 198.51.100.42 port 41200 ssh2'
  },
  {
    id: 'TN-02',
    time: '10:15:25 UTC',
    stage: 'credential_exhaustion',
    title: 'Rapid Password Exhaustion Wave (10 Attempts)',
    description: 'Systematic testing of unix administrative accounts (admin, ubuntu, devops, ansible).',
    severity: 'warning',
    evidenceType: 'raw_log',
    source: 'bastion-01 (sshd)',
    eventId: 'EVT-2026-SSH-010',
    evidenceSnippet: 'sshd[12410]: Failed password for invalid user devops from 198.51.100.42 port 41210 ssh2'
  },
  {
    id: 'TN-03',
    time: '10:16:15 UTC',
    stage: 'credential_exhaustion',
    title: 'Velocity Threshold Breached (30+ Attempts)',
    description: 'Correlation engine marks IP 198.51.100.42 as high-frequency brute force adversary.',
    severity: 'warning',
    evidenceType: 'rule_match',
    source: 'sentinel-correlation-daemon',
    eventId: 'EVT-2026-SSH-030',
    evidenceSnippet: 'Heuristic Rule: Attempts >= 30 within 90s matched. Anomaly score: 92.'
  },
  {
    id: 'TN-04',
    time: '10:16:31 UTC',
    stage: 'unauthorized_access',
    title: 'CRITICAL: Accepted SSH Password for Account "deploy"',
    description: 'Successful authentication accepted from identical external source IP. Interactive shell allocated (PID 12436).',
    severity: 'critical',
    evidenceType: 'raw_log',
    source: 'bastion-01 (sshd)',
    eventId: 'EVT-2026-SSH-036',
    evidenceSnippet: 'sshd[12436]: Accepted password for deploy from 198.51.100.42 port 41236 ssh2 (session sess_993429ab)'
  },
  {
    id: 'TN-05',
    time: '10:16:33 UTC',
    stage: 'detection_trigger',
    title: 'Detection Rule Triggered: SSH Brute Followed by Compromise',
    description: 'Rule RULE-SSH-BRUTE-SUCCESS-01 escalated severity to CRITICAL (Risk Score: 94).',
    severity: 'critical',
    evidenceType: 'rule_match',
    source: 'sentinel-rule-evaluator',
    eventId: 'DET-2026-0891',
    evidenceSnippet: 'Matched composite trigger: [BruteForce >= 10 in 120s] AND [SubsequentAuthSuccess within 60s]'
  },
  {
    id: 'TN-06',
    time: '10:16:35 UTC',
    stage: 'detection_trigger',
    title: 'Incident INC-2026-0042 Generated',
    description: 'Security incident registered in central state machine. On-call notified.',
    severity: 'critical',
    evidenceType: 'rule_match',
    source: 'sentinel-soar-controller',
    eventId: 'INC-2026-0042',
    evidenceSnippet: 'Incident INC-2026-0042 opened with status ACTIVE and priority P0.'
  },
  {
    id: 'TN-07',
    time: '10:16:40 UTC',
    stage: 'ai_synthesis',
    title: 'AI Analyst Evidence Correlation Completed',
    description: 'MITRE ATT&CK T1110.001 & T1078.003 mapped. Playbook PB-SSH-BRUTE-01 selected.',
    severity: 'info',
    evidenceType: 'ai_inference',
    source: 'sentinel-ai-engine',
    eventId: 'AUD-2026-1047',
    evidenceSnippet: 'Synthesis completed in 1.1s. Recommendation: Terminate session 12436 and apply iptables drop.'
  },
  {
    id: 'TN-08',
    time: '10:16:42 UTC',
    stage: 'autonomous_countermeasure',
    title: 'Simulated Autonomous Firewall Ingress Block',
    description: 'Autonomous SOAR pushed iptables DROP rule for 198.51.100.42 on bastion-01.',
    severity: 'info',
    evidenceType: 'soar_action',
    source: 'sentinel-autonomous-engine',
    eventId: 'ACT-2026-0312',
    evidenceSnippet: 'iptables -I INPUT -s 198.51.100.42 -p tcp --dport 22 -j DROP (Simulated execution: OK)'
  },
  {
    id: 'TN-09',
    time: '10:16:44 UTC',
    stage: 'autonomous_countermeasure',
    title: 'Simulated SSH Session Termination (PID 12436)',
    description: 'SIGKILL sent to rogue interactive shell session. Process table cleared.',
    severity: 'info',
    evidenceType: 'soar_action',
    source: 'sentinel-autonomous-engine',
    eventId: 'ACT-2026-0313',
    evidenceSnippet: 'kill -9 12436; verified process exited with code 137.'
  },
  {
    id: 'TN-10',
    time: '10:16:46 UTC',
    stage: 'verification',
    title: 'Autonomous Response Verification Verified',
    description: 'Zero incoming SYN packets accepted. Target account deploy flagged for credential rotation.',
    severity: 'info',
    evidenceType: 'soar_action',
    source: 'sentinel-verification-probe',
    eventId: 'AUD-2026-1049',
    evidenceSnippet: 'Telemetry audit confirms attack isolated. Incident status moved to CONTAINED.'
  }
];

export const AttackTimelinePage: React.FC = () => {
  const { incidents, selectedIncidentId, setSelectedIncidentId } = useSecurityStore();
  const [selectedIncident, setSelectedIncident] = useState<string>(selectedIncidentId || 'INC-2026-0042');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ 'TN-04': true, 'TN-08': true });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredNodes = CHRONOLOGICAL_SSH_BREACH.filter(node => {
    if (stageFilter !== 'all' && node.stage !== stageFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Attack Progression Timeline</h2>
            <Badge variant="accent" dot>HIGH-RESOLUTION CHRONOLOGY</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Microsecond-ordered telemetry reconstruction from initial probe through autonomous containment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs font-mono"
          >
            <option value="all">All Progression Stages</option>
            <option value="credential_exhaustion">Credential Exhaustion</option>
            <option value="unauthorized_access">Unauthorized Access</option>
            <option value="detection_trigger">Detection & Rule Match</option>
            <option value="autonomous_countermeasure">Autonomous Response</option>
          </Select>
        </div>
      </div>

      {/* Main Timeline Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E0A34A]" />
            <span className="font-mono text-xs uppercase font-bold text-[#E8EDF4]">
              Incident INC-2026-0042 Chronological Attack Wave
            </span>
          </div>
        }
        badge={<Badge variant="critical">CRITICAL RISK</Badge>}
      >
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#252D38]">
          {filteredNodes.map((node) => {
            const isExpanded = !!expandedNodes[node.id];
            const isCompromise = node.stage === 'unauthorized_access';

            const dotColors = {
              critical: 'bg-[#EF5350] ring-4 ring-[#EF5350]/20',
              warning: 'bg-[#E5AD52] ring-4 ring-[#E5AD52]/20',
              info: 'bg-[#6DA9E8] ring-4 ring-[#6DA9E8]/20'
            };

            return (
              <div key={node.id} className="relative group">
                {/* Node Bullet */}
                <div
                  className={`absolute -left-[30px] sm:-left-[34px] top-1.5 w-3 h-3 rounded-full border border-[#090B0F] ${dotColors[node.severity]}`}
                />

                {/* Node Box */}
                <div
                  className={`p-3.5 rounded-md border font-mono text-xs transition-colors ${
                    isCompromise
                      ? 'bg-[#EF5350]/10 border-[#EF5350]/40'
                      : 'bg-[#0D1016] border-[#252D38] hover:bg-[#121720]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#E0A34A] font-bold">{node.time}</span>
                      <span className="text-[#586574]">|</span>
                      <span className="text-sm font-semibold text-[#E8EDF4] font-sans">{node.title}</span>
                      <SeverityBadge severity={node.severity} />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#171E28] text-[#8994A4] border border-[#252D38]">
                        {node.source}
                      </span>
                      <button
                        onClick={() => toggleNode(node.id)}
                        className="text-[#8994A4] hover:text-[#E8EDF4]"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#8994A4] mt-1.5 leading-relaxed font-sans">
                    {node.description}
                  </p>

                  {/* Expandable Evidence Snippet */}
                  {isExpanded && node.evidenceSnippet && (
                    <div className="mt-3 pt-3 border-t border-[#1C2430] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-[#586574]">
                        <span>TELEMETRY PAYLOAD [{node.eventId || node.id}]</span>
                        <span className="text-[#42B883]">VERIFIED EVIDENCE</span>
                      </div>
                      <pre className="p-2.5 bg-[#080A0E] rounded border border-[#1C2430] text-[11px] text-[#6DA9E8] overflow-x-auto break-all font-mono">
                        {node.evidenceSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
