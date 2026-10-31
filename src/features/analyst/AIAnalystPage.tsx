import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  ShieldAlert, 
  FileText, 
  Terminal, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Zap, 
  ExternalLink,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { sentinelApi } from '@/services/api';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

interface ChatMessage {
  id: string;
  sender: 'user' | 'analyst';
  timestamp: string;
  content: string;
  referencedEventIds?: string[];
  mitreTechniques?: string[];
  recommendedPlaybookId?: string;
  confidence?: number;
}

const PRESET_QUERIES = [
  'Investigate the latest SSH brute-force incident (INC-2026-0042)',
  'Explain why source IP 198.51.100.42 was classified as suspicious',
  'Show authentication failures followed by successful logins',
  'Identify accounts targeted by the password spraying campaign',
  'Summarize today\'s critical incidents and current security posture'
];

export const AIAnalystPage: React.FC = () => {
  const { incidents, selectedIncidentId, setSelectedIncidentId, executePlaybookAction, addNotification } = useSecurityStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-01',
      sender: 'analyst',
      timestamp: '10:16:40 UTC',
      content: `**Sentinel AI Analyst Initialized.**\n\nI have correlated telemetry for active incident **INC-2026-0042** (*SSH Brute Force Followed by Successful Authentication*).\n\nKey Findings:\n- **Attacker IP**: \`198.51.100.42\`\n- **Target Host**: \`bastion-01\` (\`10.240.10.15:22\`)\n- **Event Sequence**: 35 failed attempts against root/admin/devops followed by an accepted login for user \`deploy\` (\`EVT-2026-SSH-036\`).\n- **Confidence**: 98%.\n\nSelect a preset query below or ask a specific investigation question.`,
      referencedEventIds: ['EVT-2026-SSH-001', 'EVT-2026-SSH-020', 'EVT-2026-SSH-035', 'EVT-2026-SSH-036'],
      mitreTechniques: ['T1110.001 - Password Guessing', 'T1078.003 - Local Accounts'],
      recommendedPlaybookId: 'PB-SSH-BRUTE-01',
      confidence: 0.98
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputValue;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString() + ' UTC',
      content: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputValue('');
    setIsTyping(true);

    try {
      // Simulate brief model reasoning latency
      const res = await sentinelApi.analyst.query(textToSend, selectedIncident?.id);
      
      const analystMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'analyst',
        timestamp: new Date().toLocaleTimeString() + ' UTC',
        content: res.reply,
        referencedEventIds: res.referencedEventIds,
        mitreTechniques: res.mitreTechniques,
        recommendedPlaybookId: res.recommendedPlaybookId,
        confidence: res.confidence
      };

      setMessages(prev => [...prev, analystMsg]);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Analyst Query Error',
        message: 'Failed to process investigation query.'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteRecommendedPlaybook = async (playbookId: string) => {
    await executePlaybookAction(
      playbookId,
      'AI Recommended Remediation Action',
      selectedIncident?.sourceIps[0] || 'Target-Host',
      selectedIncident?.id
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Sentinel AI Analyst Workspace</h2>
            <Badge variant="accent" dot>SECURITY LLM COPILOT</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Deterministic generative reasoning agent for threat synthesis, evidence attribution, and remediation advice.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="info">SIMULATED INFERENCE</Badge>
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className="w-3 h-3" />}
            onClick={() => setMessages([messages[0]])}
          >
            Clear History
          </Button>
        </div>
      </div>

      {/* Main Split: Left Investigation Conversation & Right Incident Context */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Chat & Reasoning Stream (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[750px] bg-[#121720] border border-[#252D38] rounded-md overflow-hidden">
          {/* Top Chat Bar */}
          <div className="px-4 py-3 bg-[#0F141C] border-b border-[#252D38] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#E0A34A]" />
              <span className="font-semibold text-[#E8EDF4]">Investigation Thread</span>
              <span className="text-[#586574]">| Context: {selectedIncident.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#42B883]" />
              <span className="text-[11px] text-[#42B883]">Analyst Engine Ready</span>
            </div>
          </div>

          {/* Conversation Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'analyst' && (
                  <div className="w-7 h-7 rounded bg-[#171E28] border border-[#252D38] flex items-center justify-center shrink-0 text-[#E0A34A] mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-md p-3.5 space-y-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-[#171E28] text-[#E8EDF4] border border-[#252D38]'
                      : 'bg-[#0D1016] text-[#E8EDF4] border border-[#252D38]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-[#586574] border-b border-[#1C2430] pb-1.5">
                    <span className="font-semibold text-[#8994A4]">
                      {msg.sender === 'user' ? 'SecOps Analyst (You)' : 'Sentinel AI Security Assistant'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Body with markdown formatting */}
                  <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                    {msg.content}
                  </div>

                  {/* Supporting Evidence Chips */}
                  {msg.referencedEventIds && msg.referencedEventIds.length > 0 && (
                    <div className="pt-2 border-t border-[#1C2430]">
                      <div className="text-[10px] uppercase font-semibold text-[#586574] mb-1">
                        Referenced Mock Telemetry Evidence:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.referencedEventIds.map((eid) => (
                          <span
                            key={eid}
                            className="px-2 py-0.5 rounded bg-[#171E28] border border-[#252D38] text-[#E0A34A] text-[10px] font-mono"
                          >
                            {eid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MITRE ATT&CK Chips */}
                  {msg.mitreTechniques && msg.mitreTechniques.length > 0 && (
                    <div className="pt-1">
                      <div className="text-[10px] uppercase font-semibold text-[#586574] mb-1">
                        MITRE ATT&CK Attribution:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.mitreTechniques.map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-0.5 rounded bg-[#171E28] border border-[#252D38] text-[#6DA9E8] text-[10px] font-mono"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Playbook Trigger */}
                  {msg.recommendedPlaybookId && (
                    <div className="pt-2 border-t border-[#1C2430] flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#8994A4]">
                        Suggested: <strong className="text-[#E0A34A]">{msg.recommendedPlaybookId}</strong>
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Zap className="w-3 h-3" />}
                        onClick={() => handleExecuteRecommendedPlaybook(msg.recommendedPlaybookId!)}
                      >
                        Execute Playbook
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 items-center text-xs text-[#8994A4] font-mono p-2">
                <Bot className="w-4 h-4 text-[#E0A34A] animate-spin" />
                <span>Sentinel AI synthesizing evidence chain & MITRE mapping...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Prompts Strip */}
          <div className="px-4 py-2 bg-[#0F141C] border-t border-[#252D38] flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
            <span className="text-[#586574] shrink-0">Prompts:</span>
            {PRESET_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="shrink-0 px-2.5 py-1 rounded bg-[#171E28] hover:bg-[#252D38] text-[#8994A4] hover:text-[#E8EDF4] border border-[#252D38] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Bottom Chat Input */}
          <div className="p-3 bg-[#0D1016] border-t border-[#252D38] flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask Sentinel AI about telemetry, evidence attribution, or response recommendations..."
              className="flex-1 bg-[#121720] border border-[#252D38] rounded px-3 py-2 text-xs text-[#E8EDF4] placeholder-[#586574] focus:outline-none focus:border-[#E0A34A] font-mono"
            />
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="w-3.5 h-3.5" />}
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
            >
              Analyze
            </Button>
          </div>
        </div>

        {/* Right Column: Incident Context Drawer (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card
            title="Investigation Target Context"
            badge={<Badge variant="critical">ACTIVE SCOPE</Badge>}
          >
            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[10px] text-[#586574] uppercase block mb-1">Select Incident to Investigate</label>
                <Select
                  value={selectedIncident.id}
                  onChange={(e) => setSelectedIncidentId(e.target.value)}
                  className="w-full"
                >
                  {incidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      {inc.id} - {inc.title.slice(0, 32)}...
                    </option>
                  ))}
                </Select>
              </div>

              <div className="p-3 bg-[#0D1016] border border-[#1C2430] rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#8994A4]">Severity:</span>
                  <SeverityBadge severity={selectedIncident.severity} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8994A4]">Risk Score:</span>
                  <RiskScoreBadge score={selectedIncident.riskScore} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8994A4]">Source IP:</span>
                  <span className="text-[#EF5350] font-bold">{selectedIncident.sourceIps[0]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8994A4]">Target Accounts:</span>
                  <span className="text-[#E8EDF4]">{selectedIncident.targetAccounts.slice(0, 2).join(', ')}</span>
                </div>
              </div>

              <div className="p-3 bg-[#0D1016] border border-[#1C2430] rounded">
                <div className="text-[10px] uppercase font-semibold text-[#586574] mb-1">
                  AI Investigation Summary
                </div>
                <p className="text-[11px] text-[#8994A4] leading-relaxed">
                  {selectedIncident.aiSummary.executiveSummary}
                </p>
              </div>

              <div className="p-3 bg-[#0D1016] border border-[#1C2430] rounded">
                <div className="text-[10px] uppercase font-semibold text-[#586574] mb-1">
                  FastAPI Backend Endpoint Status
                </div>
                <div className="text-[11px] text-[#586574] flex items-center justify-between">
                  <span>Target API:</span>
                  <code className="text-[#6DA9E8]">POST /api/v1/analyst/query</code>
                </div>
                <div className="text-[10px] text-[#42B883] mt-1">
                  • Mock Adapter Client Engaged (Simulated Inference)
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
