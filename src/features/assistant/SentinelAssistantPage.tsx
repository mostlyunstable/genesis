import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Sparkles, 
  CheckCircle2, 
  ShieldAlert, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Terminal,
  Cpu,
  Radio,
  Activity,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { sentinelApi } from '@/services/api';
import { SentinelLogo } from '@/components/ui/SentinelLogo';
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
  terminalLogs?: string[];
}

interface Message {
  id: string;
  sender: 'user' | 'sentinel';
  timestamp: string;
  content?: string;
  structured?: StructuredAIResponse;
}

const PROMPT_CHIPS = [
  'Investigate an IP address',
  'Trace authentication failures',
  'Examine a security event',
  'Review active incidents'
];

export const SentinelAssistantPage: React.FC = () => {
  const { executePlaybookAction, addNotification } = useSecurityStore();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-01',
      sender: 'sentinel',
      timestamp: 'Just now',
      content: `Sentinel is standing by.\n\nMonitoring telemetry across enrolled forwarders. Specify a signal, address, or incident to initiate analysis.`,
      structured: {
        title: 'SSH Brute-Force & Account Takeover Sequence',
        summary: '35 consecutive SSH authentication failures were observed against bastion-01 followed within 4.0 seconds by an accepted login for user "deploy" from external adversary IP 198.51.100.42.',
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
        playbookId: 'PB-SSH-BRUTE-01',
        terminalLogs: [
          '[SENTINEL BOT] Ingestion stream synced: Bastion Auth Forwarder',
          '[CORRELATION] 35 failed password attempts aggregated from 198.51.100.42',
          '[ANOMALY DETECTED] Valid session accepted after high-rate failures (PID: 12436)',
          '[POLICY ENGINE] Countermeasure PB-SSH-BRUTE-01 dry-run recommended'
        ]
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
        summary: 'Single external actor probing 18 distinct corporate identities at 12-second intervals, causing AD 4740 account lockouts without successful login.',
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
        playbookId: 'PB-SPRAY-DEFENSE-02',
        terminalLogs: [
          '[SENTINEL BOT] SAML Gateway forwarder reported 18 AD 4740 event codes',
          '[CORRELATION] Velocity matches low-and-slow spraying heuristics (1 req/12s)',
          '[COUNTERMEASURE] Rate-limit threshold ready for dry-run simulation'
        ]
      } : {
        title: isSSH ? 'SSH Brute-Force & Session Compromise' : 'Correlated Environmental Threat Assessment',
        summary: res.reply.replace(/\*\*/g, '').slice(0, 240) + '...',
        evidence: {
          sourceIp: '198.51.100.42',
          targetAsset: 'bastion-01 (sshd:22)',
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
        playbookId: res.recommendedPlaybookId || 'PB-SSH-BRUTE-01',
        terminalLogs: [
          '[SENTINEL BOT] Correlating 6 telemetry signals across 3 enrolled forwarders',
          '[ASSESSMENT] Source IP 198.51.100.42 confirmed in RFC 5737 adversary range',
          '[MITIGATION] Simulated dry-run firewall rule ready for validation'
        ]
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
          const updatedLogs = [
            ...(m.structured.terminalLogs || []),
            `[EXECUTION TRIGGERED] Dry-run policy dispatch for target: ${target}`,
            `[SIMULATED COMMAND] iptables -A INPUT -s ${target} -j DROP`,
            `[VERIFICATION PROBE] Ingress packet drop rate: 100% (0 packets observed)`,
            `[STATUS: VERIFIED] Telemetry probe confirmed countermeasure efficacy`
          ];

          return {
            ...m,
            structured: {
              ...m.structured,
              actionStatus: 'DRY RUN EXECUTED',
              terminalLogs: updatedLogs
            }
          };
        }
        return m;
      }));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto space-y-4">
      {/* Central Autonomous Bot Hero */}
      <div className="text-center pt-1 pb-4 select-none">
        {/* Glowing Cyber Bot Beacon Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0066FF]/15 border border-[#0066FF]/35 text-[#38BDF8] text-[11px] font-mono font-bold tracking-[0.2em] mb-3 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
          <span>AUTONOMOUS SECURITY INTELLIGENCE</span>
        </div>

        {/* Prominent High-Contrast Headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-sans leading-tight">
          Know what happened.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-white to-[#FF5722]">
            Understand what happens next.
          </span>
        </h1>

        {/* Clear, Readable Supporting Narrative */}
        <p className="text-sm sm:text-base text-slate-300 mt-2.5 max-w-xl mx-auto font-sans leading-relaxed">
          Sentinel correlates security events, investigates emerging threats and coordinates defensive action — with evidence at every step.
        </p>

        {/* Live Bot Telemetry HUD Strip */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[11px] font-mono text-[#94A3B8]">
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-[#38BDF8] animate-pulse" />
            <span>Autonomous Engine: <strong className="text-[#38BDF8]">ONLINE</strong></span>
          </span>
          <span className="text-[#334155]">•</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-[#FF5722]" />
            <span>Telemetry Streams: <strong className="text-white">5 Active</strong></span>
          </span>
          <span className="text-[#334155] hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Sandbox: <strong className="text-[#10B981]">RFC 5737</strong></span>
          </span>
        </div>

        {/* Suggested Cyber Prompt Chips */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSendMessage(chip)}
              className="px-3.5 py-1.5 rounded-full bg-[#0F1523] hover:bg-[#162035] text-slate-200 border border-[#1E293B] hover:border-[#0066FF]/60 hover:text-white text-xs font-mono transition-all shadow-sm cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-[#FF5722]" />
              <span>{chip}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-2 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-in fade-in-50 duration-200">
            {msg.sender === 'user' ? (
              /* User Query Bubble */
              <div className="flex justify-end">
                <div className="max-w-xl bg-[#141C2E] border border-[#2E3E5B] rounded-2xl px-5 py-3.5 text-sm text-white shadow-cyber-sm font-sans">
                  {msg.content}
                </div>
              </div>
            ) : (
              /* Autonomous Cybersecurity Bot Output Dossier */
              <div className="flex items-start gap-3.5 max-w-4xl">
                {/* Bot Emblem with Glowing Ring */}
                <div className="w-9 h-9 rounded-full bg-[#0B0F17] border-2 border-[#0066FF] flex items-center justify-center shrink-0 mt-0.5 overflow-hidden shadow-cyber-blue">
                  <SentinelLogo size="sm" showWordmark={false} imageOnly={true} />
                </div>

                {/* Sleek, Clean Intelligence Dossier (NO BOX-IN-BOX CLUTTER) */}
                <div className="flex-1 bg-[#0F1523] border border-[#1E293B] rounded-2xl p-6 shadow-cyber-lg space-y-5 relative overflow-hidden">
                  {/* Glowing Top Cyber Accent Line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0066FF] via-[#38BDF8] to-[#FF5722]" />

                  {/* Header: Identity & Calculated Risk */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#38BDF8] flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>EVIDENCE SYNTHESIS</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mt-1 font-sans tracking-tight">
                        {msg.structured?.title || 'Security Telemetry Analysis'}
                      </h3>
                    </div>

                    {msg.structured && (
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide ${
                          msg.structured.riskLevel === 'CRITICAL' ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40' :
                          'bg-[#FF5722]/20 text-[#FF5722] border border-[#FF5722]/40'
                        }`}>
                          {msg.structured.riskLevel} RISK
                        </span>
                        <span className="text-xs font-mono text-[#38BDF8] bg-[#0066FF]/15 border border-[#0066FF]/30 px-2.5 py-1 rounded-full font-bold">
                          {msg.structured.confidence}% Confidence
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Clear Executive Summary Narrative */}
                  <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans font-normal">
                    {msg.structured?.summary || msg.content}
                  </p>

                  {/* Clean Attribution Ribbon (Single sleek panel, NO nested mini boxes) */}
                  {msg.structured?.evidence && (
                    <div className="bg-[#0B0F17] rounded-xl p-4 border border-[#1E293B] space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                        <span className="text-[#38BDF8] tracking-wider uppercase text-[10px]">Attribution Metrics</span>
                        <button
                          onClick={() => toggleEvidence(msg.id)}
                          className="text-[#94A3B8] hover:text-white flex items-center gap-1 text-[11px] font-normal cursor-pointer transition-colors"
                        >
                          <span>{expandedEvidence[msg.id] ? 'Hide Signals' : 'Inspect Correlated Signals'}</span>
                          {expandedEvidence[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 text-[#38BDF8]" />}
                        </button>
                      </div>

                      {/* Clean 4-Column Metric Presentation */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono pt-1">
                        <div>
                          <span className="text-[#64748B] text-[10px] uppercase block tracking-wider">Adversary Source</span>
                          <span className="text-[#FF5722] font-bold text-sm block mt-0.5">{msg.structured.evidence.sourceIp}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] text-[10px] uppercase block tracking-wider">Target Surface</span>
                          <span className="text-white font-bold text-sm block mt-0.5 truncate">{msg.structured.evidence.targetAsset}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] text-[10px] uppercase block tracking-wider">Time Window</span>
                          <span className="text-slate-300 font-medium text-xs block mt-0.5">{msg.structured.evidence.timeRange}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] text-[10px] uppercase block tracking-wider">Telemetry Volume</span>
                          <span className="text-[#EF4444] font-bold text-sm block mt-0.5">{msg.structured.evidence.failedAttempts} Failures</span>
                        </div>
                      </div>

                      {/* Expandable Event Signal References */}
                      {expandedEvidence[msg.id] && (
                        <div className="pt-3 border-t border-[#1E293B] space-y-2 text-xs">
                          <span className="text-[#64748B] text-[11px] font-mono block">Correlated Telemetry Event IDs:</span>
                          <div className="flex flex-wrap gap-2">
                            {msg.structured.evidence.eventIds.map((eid) => (
                              <button
                                key={eid}
                                onClick={() => copyToClipboard(eid, eid)}
                                className="px-2.5 py-1 rounded-lg bg-[#141C2E] hover:bg-[#1E293B] border border-[#1E293B] text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer font-mono text-[11px]"
                              >
                                <span>{eid}</span>
                                {copiedId === eid ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MITRE ATT&CK Matrix Bar */}
                  {msg.structured?.mitreTechniques && msg.structured.mitreTechniques.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                      <span className="text-[#64748B] text-[11px] uppercase tracking-wider">MITRE ATT&CK:</span>
                      {msg.structured.mitreTechniques.map((tech) => (
                        <span key={tech} className="px-2.5 py-0.5 rounded-full bg-[#0066FF]/15 text-[#38BDF8] border border-[#0066FF]/30 font-semibold text-[11px]">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Interactive Terminal Execution Stream */}
                  {msg.structured?.terminalLogs && msg.structured.terminalLogs.length > 0 && (
                    <div className="bg-[#07090E] rounded-xl p-3.5 border border-[#1E293B] font-mono text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-[#38BDF8] text-[10px] uppercase font-bold tracking-wider mb-1">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Autonomous Bot Audit Stream</span>
                      </div>
                      {msg.structured.terminalLogs.map((log, index) => (
                        <div key={index} className="text-slate-300 text-[11px] leading-relaxed">
                          <span className="text-[#0066FF] font-bold">&gt; </span>
                          <span className={log.includes('VERIFIED') ? 'text-[#10B981] font-bold' : log.includes('ANOMALY') || log.includes('TRIGGERED') ? 'text-[#FF5722] font-semibold' : ''}>
                            {log}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Autonomous Mitigation Strip */}
                  {msg.structured?.recommendedAction && (
                    <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-mono font-bold text-[#FF5722] uppercase tracking-wider">
                          RECOMMENDED MITIGATION
                        </div>
                        <div className="text-xs sm:text-sm text-white font-medium mt-1 font-sans">
                          {msg.structured.recommendedAction}
                        </div>
                        <div className="text-[11px] font-mono text-[#94A3B8] mt-1">
                          Status: <strong className={msg.structured.actionStatus === 'DRY RUN EXECUTED' ? 'text-[#10B981]' : 'text-[#FF5722]'}>{msg.structured.actionStatus}</strong>
                        </div>
                      </div>

                      {msg.structured.actionStatus === 'AWAITING POLICY EVALUATION' ? (
                        <Button
                          variant="primary"
                          size="md"
                          icon={<ShieldAlert className="w-4 h-4" />}
                          onClick={() => handleSimulateExecution(msg.id, msg.structured!.playbookId || 'PB-SSH-BRUTE-01', msg.structured!.evidence.sourceIp)}
                          className="shrink-0"
                        >
                          Execute Policy Dry Run
                        </Button>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40 text-xs font-mono font-bold shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>VERIFIED — Telemetry Probe Confirmed</span>
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
          <div className="flex items-center gap-3 text-xs text-[#38BDF8] p-3 font-mono bg-[#0F1523] border border-[#1E293B] rounded-xl w-fit">
            <Sparkles className="w-4 h-4 text-[#38BDF8] animate-spin" />
            <span>Correlating telemetry across enrolled forwarders...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Premium Autonomous Bot Message Composer */}
      <div className="pt-2 pb-1">
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-2xl p-3 shadow-composer transition-all focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/25">
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
            placeholder="Describe an event or begin an investigation..."
            className="w-full bg-transparent border-none text-sm text-white placeholder-[#64748B] focus:outline-none resize-none font-sans px-2"
          />

          <div className="flex items-center justify-between pt-2 px-1 border-t border-[#1E293B]">
            <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
              <button
                type="button"
                onClick={() => addNotification({
                  type: 'info',
                  title: 'Log Attachment',
                  message: 'Select a syslog or JSON event log to correlate.'
                })}
                className="p-1.5 rounded-full hover:bg-[#141C2E] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
                title="Attach log file for analysis"
              >
                <Paperclip className="w-4 h-4 text-[#38BDF8]" />
              </button>
              <span className="hidden sm:inline text-[11px] text-[#64748B] font-mono">
                <kbd className="text-white font-semibold">↵ Send</kbd> • <kbd className="text-white font-semibold">⇧↵ Line break</kbd>
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Send className="w-3.5 h-3.5" />}
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
            >
              Start Investigation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
