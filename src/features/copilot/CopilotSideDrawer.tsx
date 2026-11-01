import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Send, 
  Square, 
  X, 
  User, 
  Maximize2, 
  Paperclip, 
  FileText, 
  Loader2, 
  RotateCcw, 
  Copy, 
  Check, 
  ShieldAlert, 
  FileUp, 
  ShieldCheck, 
  Search 
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InvestigationStepsIndicator } from './InvestigationStepsIndicator';
import { ActionProposalCard } from './ActionProposalCard';

export const CopilotSideDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    isSideDrawerOpen,
    setSideDrawerOpen,
    pendingDrawerPrompt,
    setPendingDrawerPrompt,
    messages,
    isStreaming,
    streamingContent,
    currentStep,
    uploadedFiles,
    activeFileId,
    isUploading,
    uploadFile,
    setActiveFileId,
    sendMessage,
    retryLastMessage,
    stopStreaming,
    loadConversations,
    createNewConversation,
    activeConversationId
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll when messages change or streaming
  useEffect(() => {
    if (isSideDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [messages, streamingContent, isStreaming, isSideDrawerOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isSideDrawerOpen) {
      if (!activeConversationId) {
        loadConversations();
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 200);
    }
  }, [isSideDrawerOpen, activeConversationId, loadConversations]);

  // Handle pending drawer prompt when opened
  useEffect(() => {
    if (isSideDrawerOpen && pendingDrawerPrompt) {
      const promptToRun = pendingDrawerPrompt;
      setPendingDrawerPrompt(null);
      handleSend(promptToRun);
    }
  }, [isSideDrawerOpen, pendingDrawerPrompt, setPendingDrawerPrompt]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputMessage).trim();
    if (!text || isStreaming) return;
    setInputMessage('');
    try {
      await sendMessage(text, undefined, activeFileId || undefined);
    } catch {
      // Error handled by store
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const record = await uploadFile(file);
      if (record && !inputMessage.trim()) {
        setInputMessage(`Analyze uploaded log file ${record.filename} and perform autonomous forensic investigation.`);
      }
      e.target.value = '';
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  if (!isSideDrawerOpen) return null;

  return (
    <>
      {/* Semi-transparent Backdrop */}
      <div 
        onClick={() => setSideDrawerOpen(false)}
        className="fixed inset-0 bg-black/30 z-50 backdrop-blur-2xs transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Slide-over Side Drawer Panel */}
      <aside 
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] lg:w-[520px] z-50 bg-white border-l border-[#E2E4DC] shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-250 select-none"
        role="dialog"
        aria-label="Genesis Copilot Assistant"
      >
        {/* Top Header Bar */}
        <header className="px-4 py-3 border-b border-[#E2E4DC] bg-[#F8F8F5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0A0D10] flex items-center justify-center shrink-0 border border-white/10 ring-1 ring-[#1E4BD8]/25 p-1 shadow-xs">
              <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-semibold text-sm text-[#111417] tracking-tight">
                  Genesis Copilot
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EFF4FF] text-[#1E4BD8] font-bold">
                  AI
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#5C645B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E4BD8]" />
                <span>Autonomous Assistant Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSideDrawerOpen(false);
                navigate('/copilot');
              }}
              className="p-1.5 rounded-lg text-[#5C645B] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer"
              title="Expand to Full Workspace"
              aria-label="Expand to full copilot workspace"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSideDrawerOpen(false)}
              className="p-1.5 rounded-lg text-[#5C645B] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer"
              title="Close Copilot"
              aria-label="Close copilot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Message Thread */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[#F8F8F5]">
          {messages.length === 0 && !isStreaming ? (
            /* Minimal Understated Initial Greeting */
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#0A0D10] flex items-center justify-center p-2.5 mx-auto shadow-md border border-white/10 ring-1 ring-[#1E4BD8]/25">
                <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-base font-semibold text-[#111417]">
                  What would you like to investigate?
                </h4>
                <p className="text-xs text-[#5C645B] max-w-xs mx-auto">
                  Ask a security question, analyze telemetry, or attach a log file.
                </p>
              </div>

              {/* 3 Quick Action Cards */}
              <div className="space-y-2 pt-2 text-left max-w-sm mx-auto">
                <button
                  onClick={() => handleSend("Investigate recent SSH brute-force attack telemetry")}
                  className="w-full p-3 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all text-xs cursor-pointer group shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-[#111417] group-hover:text-[#1E4BD8]">
                      Investigate Brute-Force Activity
                    </div>
                    <div className="text-[11px] text-[#5C645B]">Check failed logins & suspicious IP telemetry</div>
                  </div>
                  <ShieldAlert className="w-4 h-4 text-[#889085] group-hover:text-[#1E4BD8] shrink-0 ml-2" />
                </button>

                <button
                  onClick={() => handleSend("Check system operational health and log forwarders")}
                  className="w-full p-3 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all text-xs cursor-pointer group shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-[#111417] group-hover:text-[#1E4BD8]">
                      Verify System Health
                    </div>
                    <div className="text-[11px] text-[#5C645B]">Inspect ingestion pipeline & active forwarders</div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-[#889085] group-hover:text-[#1E4BD8] shrink-0 ml-2" />
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-3 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] transition-all text-xs cursor-pointer group shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-[#111417] group-hover:text-[#1E4BD8]">
                      Attach & Analyze Log File
                    </div>
                    <div className="text-[11px] text-[#5C645B]">Upload syslog, auth.log, or CSV file</div>
                  </div>
                  <FileUp className="w-4 h-4 text-[#889085] group-hover:text-[#1E4BD8] shrink-0 ml-2" />
                </button>
              </div>
            </div>
          ) : (
            /* Render Messages */
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id || idx}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#0A0D10] flex items-center justify-center shrink-0 shadow-2xs mt-1 border border-white/10 ring-1 ring-[#1E4BD8]/20 p-1">
                      <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className={`space-y-1.5 max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#111417] text-white rounded-tr-xs shadow-xs'
                          : 'bg-white border border-[#E2E4DC] rounded-tl-xs shadow-xs text-[#111417]'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          <MarkdownRenderer content={msg.content} />
                          {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                            <div className="mt-2.5 space-y-2">
                              {msg.suggestedActions.map((action, aIdx) => (
                                <ActionProposalCard key={action.id || aIdx} action={action} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!isUser && (
                      <div className="flex items-center gap-2.5 px-1 text-[11px] text-[#889085]">
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="flex items-center gap-1 hover:text-[#111417] transition-colors cursor-pointer"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-[#1E4BD8]" />
                              <span className="text-[#1E4BD8]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <span>•</span>
                        <button
                          onClick={retryLastMessage}
                          className="flex items-center gap-1 hover:text-[#111417] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[#F0F1EA] border border-[#E2E4DC] text-[#111417] flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Active Streaming Pipeline */}
          {isStreaming && (
            <div className="space-y-2.5">
              <InvestigationStepsIndicator currentStep={currentStep} />
              {streamingContent && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-[#0A0D10] flex items-center justify-center shrink-0 shadow-2xs mt-1 border border-white/10 ring-1 ring-[#1E4BD8]/30 animate-pulse p-1">
                    <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
                  </div>
                  <div className="p-3.5 rounded-xl rounded-tl-xs bg-white border border-[#E2E4DC] text-xs text-[#111417] shadow-xs flex-1">
                    <MarkdownRenderer content={streamingContent} />
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-[#1E4BD8] animate-pulse align-middle" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Composer */}
        <div className="p-3.5 border-t border-[#E2E4DC] bg-white shrink-0 space-y-2">
          {/* Attached Files Tray */}
          {uploadedFiles.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {uploadedFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF4FF] border border-[#D0DEFF] text-[#1E4BD8] text-[11px] font-mono shrink-0"
                >
                  <FileText className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{f.filename}</span>
                </div>
              ))}
            </div>
          )}

          {/* Input Dock */}
          <div className="relative flex items-end rounded-xl border border-[#E2E4DC] bg-[#F8F8F5] focus-within:bg-white focus-within:border-[#1E4BD8] focus-within:ring-2 focus-within:ring-[#1E4BD8]/10 transition-all shadow-2xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || isUploading}
              className="p-2.5 text-[#5C645B] hover:text-[#1E4BD8] transition-colors cursor-pointer disabled:opacity-40 shrink-0"
              title="Attach log file (.log, .txt, .csv, .json)"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#1E4BD8]" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".log,.txt,.csv,.json,.jsonl"
              className="hidden"
            />

            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Genesis anything..."
              rows={1}
              disabled={isStreaming}
              className="w-full resize-none py-2.5 pl-1 pr-12 bg-transparent text-xs text-[#111417] placeholder-[#889085] focus:outline-none max-h-28 overflow-y-auto font-sans"
              style={{ minHeight: '38px' }}
            />

            <div className="absolute right-2 bottom-1.5 flex items-center">
              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs transition-colors cursor-pointer"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!inputMessage.trim()}
                  className="p-2 rounded-lg bg-[#111417] hover:bg-[#1E4BD8] text-white border border-[#2A3138] hover:border-[#4D76F8] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
                  title="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Suggestions Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
            <button
              onClick={() => handleSend("Summarize current threat posture")}
              className="px-2 py-0.5 rounded-md bg-[#F0F1EA] hover:bg-[#E2E4DC] text-[#5C645B] hover:text-[#111417] whitespace-nowrap transition-colors cursor-pointer"
            >
              Security Posture
            </button>
            <button
              onClick={() => handleSend("Explain brute force mitigation")}
              className="px-2 py-0.5 rounded-md bg-[#F0F1EA] hover:bg-[#E2E4DC] text-[#5C645B] hover:text-[#111417] whitespace-nowrap transition-colors cursor-pointer"
            >
              Defense Strategy
            </button>
            <button
              onClick={() => handleSend("Check response playbooks")}
              className="px-2 py-0.5 rounded-md bg-[#F0F1EA] hover:bg-[#E2E4DC] text-[#5C645B] hover:text-[#111417] whitespace-nowrap transition-colors cursor-pointer"
            >
              SOAR Status
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
