import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Sparkles, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight, 
  RotateCcw, 
  Copy, 
  Check, 
  FileText,
  Clock,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { sentinelApi } from '@/services/api';
import { SentinelLogo } from '@/components/ui/SentinelLogo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface StructuredAIResponse {
  title: string;
  summary: string;
  evidence: {
    sourceIp: string;
    targetAsset: string;
    timeRange: string;
    failedAttempts: number;
    eventIds: string[];
  };
  assessment: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  mitreTechniques: string[];
  recommendedAction: string;
  actionStatus: 'AWAITING POLICY EVALUATION' | 'DRY RUN EXECUTED' | 'POLICY APPROVED' | 'EXECUTING';
  playbookId?: string;
}

interface Message {
  id: string;
  sender: 'user' | 'sentinel';
  timestamp: string;
  content?: string;
  structured?: StructuredAIResponse;
}

const PROMPT_CHIPS = [
  'Investigate recent SSH attacks',
  'Analyze authentication failures',
  'Show active security incidents',
  'Explain suspicious login activity'
];

export const SentinelAssistantPage: React.FC = () => {
  const { incidents, executePlaybookAction, addNotification, autonomousResponseGlobalEnabled } = useSecurityStore();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-01',
      sender: 'sentinel',
      timestamp: 'Just now',
      content: `Hello, I'm **Genysis AI**. I'm actively monitoring your telemetry for authentication attacks, brute-force anomalies, and policy breaches.\n\nAsk me to investigate an IP address, correlate evidence for an incident, or execute an autonomous defensive playbook.`,
      structured: {
        title: 'Initial Security Telemetry Synthesis',
        summary: '35 consecutive SSH authentication failures were observed against bastion-01 followed within 4.0 seconds by an accepted login for user "deploy" from external IP 198.51.100.42.',
        evidence: {
          sourceIp: '198.51.100.42',
          targetAsset: 'bastion-01 (10.240.10.15:22)',
          timeRange: '10:15:00 - 10:16:31 UTC',
          failedAttempts: 35,
          eventIds: ['EVT-2026-SSH-001', 'EVT-2026-SSH-020', 'EVT-2026-SSH-035', 'EVT-2026-SSH-036']
        },
        assessment: 'High-velocity brute force resulted in valid session compromise on high-privilege account.',
        riskLevel: 'CRITICAL',
        confidence: 98,
        mitreTechniques: ['T1110.001 - Password Guessing', 'T1078.003 - Local Accounts'],
        recommendedAction: 'Apply simulated iptables DROP rule for 198.51.100.42 and terminate active Linux session (PID 12436).',
        actionStatus: 'AWAITING POLICY EVALUATION',
        playbookId: 'PB-SSH-BRUTE-01'
      }
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleEvidence = (id: string) => {
    setExpandedEvidence(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addNotification({
      type: 'info',
      title: 'Copied to Clipboard',
      message: `${id} copied.`
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim() || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: query
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    try {
      const res = await sentinelApi.analyst.query(query, 'INC-2026-0042');
      
      const isSSH = query.toLowerCase().includes('ssh') || query.toLowerCase().includes('brute') || query.includes('198.51');
      const isSpray = query.toLowerCase().includes('spray') || query.toLowerCase().includes('sso') || query.includes('203.0');

      const structuredPayload: StructuredAIResponse = isSpray ? {
        title: 'SAML SSO Horizontal Password Spraying Campaign',
        summary: 'Single external actor probing 18 distinct corporate identities at 12-second intervals, causing AD 4740 account lockouts.',
        evidence: {
          sourceIp: '203.0.113.88',
          targetAsset: 'sso-gw-02 (Enterprise SAML Gateway)',
          timeRange: '09:40:00 - 09:43:36 UTC',
          failedAttempts: 18,
          eventIds: ['EVT-2026-SSO-001', 'EVT-2026-SSO-005', 'EVT-2026-WIN-001']
        },
        assessment: 'Automated low-and-slow credential testing with zero verified authentications.',
        riskLevel: 'HIGH',
        confidence: 89,
        mitreTechniques: ['T1110.003 - Password Spraying'],
        recommendedAction: 'Enforce gateway rate limiting (1 request/minute) and prompt step-up MFA challenge.',
        actionStatus: 'AWAITING POLICY EVALUATION',
        playbookId: 'PB-SPRAY-DEFENSE-02'
      } : {
        title: isSSH ? 'SSH Brute-Force & Session Compromise' : 'Correlated Environmental Threat Assessment',
        summary: res.reply.replace(/\*\*/g, '').slice(0, 220) + '...',
        evidence: {
          sourceIp: '198.51.100.42',
          targetAsset: 'bastion-01 (sshd)',
          timeRange: '10:15:00 - 10:16:31 UTC',
          failedAttempts: 35,
          eventIds: res.referencedEventIds
        },
        assessment: 'Critical credential exposure observed on administrative bastion ingress.',
        riskLevel: 'CRITICAL',
        confidence: Math.round(res.confidence * 100),
        mitreTechniques: res.mitreTechniques,
        recommendedAction: 'Execute Playbook PB-SSH-BRUTE-01 to isolate source IP and terminate child shell processes.',
        actionStatus: 'AWAITING POLICY EVALUATION',
        playbookId: res.recommendedPlaybookId || 'PB-SSH-BRUTE-01'
      };

      const sentinelMsg: Message = {
        id: `sentinel-${Date.now()}`,
        sender: 'sentinel',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        structured: structuredPayload
      };

      setMessages(prev => [...prev, sentinelMsg]);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Investigation Error',
        message: 'Could not complete analysis query.'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSimulateExecution = async (msgId: string, playbookId: string, target: string) => {
    const success = await executePlaybookAction(
      playbookId,
      'Automated Countermeasure Isolation',
      target,
      'INC-2026-0042'
    );

    if (success) {
      setMessages(prev => prev.map(m => {
        if (m.id === msgId && m.structured) {
          return {
            ...m,
            structured: {
              ...m.structured,
              actionStatus: 'DRY RUN EXECUTED'
            }
          };
        }
        return m;
      }));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto">
      {/* Central Hero Header */}
      <div className="text-center pt-2 pb-6 select-none">
        <div className="inline-flex items-center gap-2 mb-3">
          <SentinelLogo size="xl" showWordmark={true} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] font-sans">
          Your security operations, under intelligent watch.
        </h2>
        <p className="text-xs sm:text-sm text-[#77736D] mt-1.5 max-w-xl mx-auto font-sans leading-relaxed">
          Ask Genysis to investigate suspicious activity, analyze authentication logs, identify threats or explain what is happening across your environment.
        </p>

        {/* Suggested Prompt Chips */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSendMessage(chip)}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-[#F3F2EE] text-[#171717] border border-[#E9E6E0] text-xs font-medium transition-all shadow-2xs hover:border-[#F15A24]/30 cursor-pointer active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-4 py-2 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-in fade-in-50 duration-200">
            {msg.sender === 'user' ? (
              /* User Query Bubble */
              <div className="flex justify-end">
                <div className="max-w-xl bg-white border border-[#E9E6E0] rounded-2xl px-4 py-3 text-xs text-[#171717] shadow-2xs font-sans">
                  {msg.content}
                </div>
              </div>
            ) : (
              /* Sentinel AI Structured Investigation Output */
              <div className="flex items-start gap-3.5 max-w-3xl">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                  <SentinelLogo size="sm" showWordmark={false} imageOnly={true} />
                </div>

                <div className="flex-1 bg-white border border-[#E9E6E0] rounded-2xl p-5 shadow-2xs text-xs space-y-4">
                  {/* Top Narrative Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-[#F0ECE6] pb-3">
                    <div>
                      <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#F15A24]">
                        GENYSIS INVESTIGATION
                      </div>
                      <h4 className="text-sm font-bold text-[#171717] mt-0.5">
                        {msg.structured?.title || 'Security Telemetry Analysis'}
                      </h4>
                    </div>

                    {msg.structured && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          msg.structured.riskLevel === 'CRITICAL' ? 'bg-[#FDF2F2] text-[#D94B45] border border-[#D94B45]/20' :
                          'bg-[#FFFBEB] text-[#D97706] border border-[#D97706]/20'
                        }`}>
                          {msg.structured.riskLevel} RISK
                        </span>
                        <span className="text-[10px] font-mono text-[#77736D]">
                          {msg.structured.confidence}% Conf.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Narrative */}
                  <p className="text-xs text-[#171717] leading-relaxed font-sans">
                    {msg.structured?.summary || msg.content}
                  </p>

                  {/* Structured Evidence Section */}
                  {msg.structured?.evidence && (
                    <div className="bg-[#FAFAF8] rounded-xl p-3.5 border border-[#E9E6E0] space-y-2.5 font-mono text-xs">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#171717]">
                        <span>Evidence Attribution</span>
                        <button
                          onClick={() => toggleEvidence(msg.id)}
                          className="text-[#77736D] hover:text-[#171717] flex items-center gap-1 text-[10px] font-normal cursor-pointer"
                        >
                          <span>{expandedEvidence[msg.id] ? 'Hide Details' : 'Expand Evidence'}</span>
                          {expandedEvidence[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#77736D]">
                        <div>
                          <span className="text-[#A5A19A]">Source IP: </span>
                          <span className="text-[#D94B45] font-semibold">{msg.structured.evidence.sourceIp}</span>
                        </div>
                        <div>
                          <span className="text-[#A5A19A]">Target Asset: </span>
                          <span className="text-[#171717] font-semibold">{msg.structured.evidence.targetAsset}</span>
                        </div>
                        <div>
                          <span className="text-[#A5A19A]">Observed Window: </span>
                          <span className="text-[#171717]">{msg.structured.evidence.timeRange}</span>
                        </div>
                        <div>
                          <span className="text-[#A5A19A]">Authentication Failures: </span>
                          <span className="text-[#D94B45] font-semibold">{msg.structured.evidence.failedAttempts} attempts</span>
                        </div>
                      </div>

                      {/* Expandable Event IDs */}
                      {expandedEvidence[msg.id] && (
                        <div className="pt-2 border-t border-[#E9E6E0] space-y-1.5 text-[10px]">
                          <span className="text-[#A5A19A] block">Correlated Telemetry Event References:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.structured.evidence.eventIds.map((eid) => (
                              <button
                                key={eid}
                                onClick={() => copyToClipboard(eid, eid)}
                                className="px-2 py-0.5 rounded bg-white hover:bg-[#F3F2EE] border border-[#E9E6E0] text-[#171717] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>{eid}</span>
                                {copiedId === eid ? <Check className="w-2.5 h-2.5 text-[#258A62]" /> : <Copy className="w-2.5 h-2.5 text-[#A5A19A]" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MITRE ATT&CK Attribution */}
                  {msg.structured?.mitreTechniques && msg.structured.mitreTechniques.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                      <span className="text-[#A5A19A]">MITRE:</span>
                      {msg.structured.mitreTechniques.map((tech) => (
                        <span key={tech} className="px-2 py-0.5 rounded bg-[#F0F6FF] text-[#4F7FC1] border border-[#4F7FC1]/20">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Recommended Autonomous Response Strip */}
                  {msg.structured?.recommendedAction && (
                    <div className="p-3.5 rounded-xl bg-[#FFF0E8]/40 border border-[#F15A24]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono font-semibold text-[#F15A24] uppercase">
                          RECOMMENDED RESPONSE
                        </div>
                        <div className="text-xs text-[#171717] font-medium mt-0.5">
                          {msg.structured.recommendedAction}
                        </div>
                        <div className="text-[10px] font-mono text-[#77736D] mt-1">
                          Status: <strong className="text-[#F15A24]">{msg.structured.actionStatus}</strong>
                        </div>
                      </div>

                      {msg.structured.actionStatus === 'AWAITING POLICY EVALUATION' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<ShieldAlert className="w-3.5 h-3.5" />}
                          onClick={() => handleSimulateExecution(msg.id, msg.structured!.playbookId || 'PB-SSH-BRUTE-01', msg.structured!.evidence.sourceIp)}
                          className="shrink-0"
                        >
                          Execute Defensive Dry Run
                        </Button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0FDF4] text-[#258A62] border border-[#258A62]/30 text-xs font-mono font-semibold shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>DRY RUN VERIFIED</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3 text-xs text-[#77736D] p-3 font-mono">
            <Sparkles className="w-4 h-4 text-[#F15A24] animate-spin" />
            <span>Genysis is correlating evidence across telemetry forwarders...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Premium Message Composer */}
      <div className="pt-3 pb-2">
        <div className="bg-white border border-[#E9E6E0] rounded-2xl p-2.5 shadow-composer transition-all focus-within:border-[#F15A24] focus-within:ring-2 focus-within:ring-[#F15A24]/10">
          <textarea
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask Genysis anything about your security environment..."
            className="w-full bg-transparent border-none text-xs sm:text-sm text-[#171717] placeholder-[#A5A19A] focus:outline-none resize-none font-sans px-2"
          />

          <div className="flex items-center justify-between pt-2 px-1 border-t border-[#F0ECE6]">
            <div className="flex items-center gap-2 text-xs text-[#77736D]">
              <button
                type="button"
                onClick={() => addNotification({
                  type: 'info',
                  title: 'Log Attachment',
                  message: 'Select a syslog or JSON event log to correlate.'
                })}
                className="p-1.5 rounded-full hover:bg-[#F3F2EE] text-[#77736D] hover:text-[#171717] transition-colors cursor-pointer"
                title="Attach log file for analysis"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <span className="hidden sm:inline text-[11px] text-[#A5A19A] font-mono">
                Press <kbd className="text-[#171717] font-semibold">↵ Enter</kbd> to analyze, <kbd className="text-[#171717] font-semibold">⇧ Enter</kbd> for newline
              </span>
            </div>

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
      </div>
    </div>
  );
};
