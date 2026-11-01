import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Square, 
  Search, 
  Plus, 
  Pin, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Bot, 
  User, 
  ShieldAlert, 
  Clock, 
  Copy, 
  RotateCcw, 
  AlertCircle,
  Layers,
  ChevronRight,
  ShieldCheck,
  Flame,
  Radio,
  Sliders,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InvestigationStepsIndicator } from './InvestigationStepsIndicator';
import { ActionProposalCard } from './ActionProposalCard';
import { EvidenceDetailPanel } from './EvidenceDetailPanel';
import { EvidenceReference } from '@/types';

export const SecurityCopilotPage: React.FC = () => {
  const {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    currentStep,
    evidenceReferences,
    suggestedActions,
    isEvidencePanelOpen,
    searchQuery,
    error,
    loadConversations,
    selectConversation,
    createNewConversation,
    updateConversation,
    deleteConversation,
    sendMessage,
    retryLastMessage,
    stopStreaming,
    setSelectedEvidence,
    setEvidencePanelOpen,
    setSearchQuery,
    clearError
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, currentStep]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async (presetText?: string) => {
    const textToSend = presetText || inputMessage;
    if (!textToSend.trim() || isStreaming) return;

    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendMessage(textToSend);
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 1500);
  };

  const startEditingTitle = (id: string, currentTitle: string) => {
    setEditingTitleId(id);
    setEditedTitle(currentTitle);
  };

  const saveEditedTitle = async (id: string) => {
    if (editedTitle.trim()) {
      await updateConversation(id, { title: editedTitle.trim() });
    }
    setEditingTitleId(null);
  };

  const handleChipClick = (id: string, type?: string) => {
    // Find matching evidence or construct temporary preview
    const found = evidenceReferences.find(e => e.id === id);
    if (found) {
      setSelectedEvidence(found);
    } else {
      setSelectedEvidence({
        id,
        title: `Telemetry Reference: ${id}`,
        type: (type as any) || (id.startsWith('INC-') ? 'incident' : id.startsWith('EVT-') ? 'event' : 'threat_intel'),
        snippet: `Inspecting entity ${id} referenced in investigation analysis.`
      });
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(c => 
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const pinnedConversations = filteredConversations.filter(c => c.isPinned);
  const recentConversations = filteredConversations.filter(c => !c.isPinned);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#FFFEFA] overflow-hidden">
      {/* ---------------------------------------------------- */}
      {/* COLUMN 1: LEFT CONVERSATION HISTORY & NEW INVESTIGATION */}
      {/* ---------------------------------------------------- */}
      <aside className="w-72 md:w-80 border-r border-[#DFE5E2] bg-white flex flex-col shrink-0">
        {/* Top Action Bar */}
        <div className="p-3.5 border-b border-[#E5EBE8] space-y-2.5">
          <button
            onClick={() => createNewConversation()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#26796C] hover:bg-[#1E6157] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9E98]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#E5EBE8] text-xs text-[#192622] placeholder-[#8C9E98] focus:outline-none focus:border-[#26796C] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C9E98] hover:text-[#192622]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-[#8C9E98]">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No investigations found.</p>
            </div>
          ) : (
            <>
              {/* Pinned Group */}
              {pinnedConversations.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-[#6B7D78] uppercase tracking-wider flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-[#26796C]" />
                    <span>Pinned Investigations</span>
                  </div>
                  {pinnedConversations.map(c => renderConversationItem(c))}
                </div>
              )}

              {/* Recent Group */}
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-[#6B7D78] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#6B7D78]" />
                  <span>Investigations</span>
                </div>
                {recentConversations.map(c => renderConversationItem(c))}
              </div>
            </>
          )}
        </div>

        {/* Footer Status */}
        <div className="p-3 border-t border-[#E5EBE8] bg-[#FAF9F5] text-[11px] text-[#6B7D78] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Copilot Guardrails: Active</span>
          </span>
          <span className="font-mono text-[#26796C] font-medium">v2.5</span>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* COLUMN 2: CENTER CHAT & INVESTIGATION WORKSPACE      */}
      {/* ---------------------------------------------------- */}
      <main className="flex-1 flex flex-col h-full bg-[#FFFEFA] overflow-hidden">
        {/* Workspace Top Header */}
        <header className="px-5 py-3 border-b border-[#DFE5E2] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#26796C]/10 border border-[#26796C]/20 flex items-center justify-center text-[#26796C] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#142C29] truncate">
                {activeConversation?.title || 'Security Copilot Workspace'}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-[#6B7D78]">
                <span className="inline-flex items-center gap-1 text-[#26796C] font-medium">
                  <ShieldCheck className="w-3 h-3" /> Grounded RAG & MITRE ATT&CK
                </span>
                <span>•</span>
                <span>Human-in-the-Loop Safe Containment</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEvidencePanelOpen(!isEvidencePanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isEvidencePanelOpen
                  ? 'bg-[#26796C]/10 text-[#26796C] border-[#26796C]/30'
                  : 'bg-white text-[#5A6B66] border-[#DFE5E2] hover:bg-[#FAF9F5]'
              }`}
              title="Toggle Evidence Drawer"
            >
              {isEvidencePanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Evidence Drawer</span>
              {evidenceReferences.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#26796C] text-white">
                  {evidenceReferences.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Global Error Banner if any */}
        {error && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={clearError} className="hover:text-rose-950">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.length === 0 && !isStreaming ? (
            /* Welcome / Briefing Empty State */
            <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-[#26796C]/10 border border-[#26796C]/20 flex items-center justify-center text-[#26796C] mx-auto shadow-xs">
                <Bot className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#142C29]">SENTINEL AI Security Copilot</h3>
                <p className="text-xs sm:text-sm text-[#5A6B66] max-w-lg mx-auto leading-relaxed">
                  Your autonomous cybersecurity pair-analyst. Query telemetry, investigate active incidents, correlate multi-source attacks, cross-reference MITRE techniques, and evaluate safe response actions.
                </p>
              </div>

              {/* Prompt Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                <button
                  onClick={() => handleSubmit("Summarize active incidents and prioritize high-risk credential attacks")}
                  className="p-3.5 rounded-xl border border-[#DFE5E2] bg-white hover:border-[#26796C] hover:shadow-xs transition-all text-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-semibold text-[#142C29] group-hover:text-[#26796C] mb-1">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>Active Incident Triage</span>
                  </div>
                  <p className="text-[11px] text-[#6B7D78] leading-normal">
                    Summarize active incidents and prioritize high-risk credential attacks
                  </p>
                </button>

                <button
                  onClick={() => handleSubmit("Inspect authentication events from suspicious IP 198.51.100.42")}
                  className="p-3.5 rounded-xl border border-[#DFE5E2] bg-white hover:border-[#26796C] hover:shadow-xs transition-all text-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-semibold text-[#142C29] group-hover:text-[#26796C] mb-1">
                    <Radio className="w-4 h-4 text-emerald-500" />
                    <span>Telemetry Correlation</span>
                  </div>
                  <p className="text-[11px] text-[#6B7D78] leading-normal">
                    Inspect authentication events from suspicious IP 198.51.100.42
                  </p>
                </button>

                <button
                  onClick={() => handleSubmit("Investigate incident INC-COPILOT-001 and recommend defensive playbooks")}
                  className="p-3.5 rounded-xl border border-[#DFE5E2] bg-white hover:border-[#26796C] hover:shadow-xs transition-all text-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-semibold text-[#142C29] group-hover:text-[#26796C] mb-1">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Incident Deep Dive</span>
                  </div>
                  <p className="text-[11px] text-[#6B7D78] leading-normal">
                    Investigate incident INC-COPILOT-001 and recommend defensive playbooks
                  </p>
                </button>

                <button
                  onClick={() => handleSubmit("Check system operational health, forwarders status, and policy boundaries")}
                  className="p-3.5 rounded-xl border border-[#DFE5E2] bg-white hover:border-[#26796C] hover:shadow-xs transition-all text-xs group cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-semibold text-[#142C29] group-hover:text-[#26796C] mb-1">
                    <Sliders className="w-4 h-4 text-[#26796C]" />
                    <span>Operational Health</span>
                  </div>
                  <p className="text-[11px] text-[#6B7D78] leading-normal">
                    Check system operational health, forwarders status, and policy boundaries
                  </p>
                </button>
              </div>
            </div>
          ) : (
            /* Render Thread Messages */
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3.5 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-[#26796C] text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#142C29] text-white rounded-tr-xs shadow-xs'
                          : 'bg-white border border-[#DFE5E2] rounded-tl-xs shadow-xs text-[#192622]'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          <MarkdownRenderer
                            content={msg.content}
                            onChipClick={handleChipClick}
                          />

                          {/* Grounded Evidence References Chips */}
                          {msg.evidenceReferences && msg.evidenceReferences.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-[#E5EBE8] space-y-1.5">
                              <span className="text-[11px] font-semibold text-[#6B7D78] uppercase tracking-wider block">
                                Grounded Security References ({msg.evidenceReferences.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.evidenceReferences.map((ref, rIdx) => (
                                  <button
                                    key={rIdx}
                                    onClick={() => setSelectedEvidence(ref)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#FAF9F5] border border-[#DFE5E2] hover:border-[#26796C] hover:bg-white text-[#192622] transition-colors cursor-pointer"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#26796C]" />
                                    <span>{ref.id}</span>
                                    <span className="text-[10px] text-[#8C9E98]">({ref.type})</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Suggested Action Proposals */}
                          {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.suggestedActions.map((action, aIdx) => (
                                <ActionProposalCard key={action.id || aIdx} action={action} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message Action Footer */}
                    {!isUser && (
                      <div className="flex items-center gap-3 px-1 text-[11px] text-[#8C9E98]">
                        <button
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="flex items-center gap-1 hover:text-[#192622] transition-colors cursor-pointer"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy response</span>
                            </>
                          )}
                        </button>
                        <span>•</span>
                        <button
                          onClick={retryLastMessage}
                          className="flex items-center gap-1 hover:text-[#192622] transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                        {msg.tokenCount && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{msg.tokenCount} tokens</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#DFE5E2] text-[#142C29] flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Active Streaming Pipeline Indicator & Streaming Chunks */}
          {isStreaming && (
            <div className="max-w-4xl mx-auto space-y-3">
              <InvestigationStepsIndicator currentStep={currentStep} />

              {streamingContent && (
                <div className="flex gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#26796C] text-white flex items-center justify-center shrink-0 shadow-xs mt-1 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-[#26796C]/30 text-xs sm:text-sm text-[#192622] shadow-xs flex-1">
                    <MarkdownRenderer
                      content={streamingContent}
                      onChipClick={handleChipClick}
                    />
                    <span className="inline-block w-2 h-4 ml-1 bg-[#26796C] animate-pulse align-middle" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer Area */}
        <div className="p-4 border-t border-[#DFE5E2] bg-white">
          <div className="max-w-4xl mx-auto space-y-2.5">
            <div className="relative flex items-end rounded-xl border border-[#DFE5E2] bg-[#FAF9F5] focus-within:border-[#26796C] focus-within:bg-white transition-all shadow-xs">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Security Copilot... (e.g. 'Investigate incident INC-001' or 'Analyze brute force attempts from 198.51.100.42')"
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none py-3 pl-4 pr-14 bg-transparent text-xs sm:text-sm text-[#192622] placeholder-[#8C9E98] focus:outline-none max-h-36 overflow-y-auto"
                style={{ minHeight: '44px' }}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Stop Generation"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!inputMessage.trim()}
                    className="p-2 rounded-lg bg-[#26796C] hover:bg-[#1E6157] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                    title="Send message (Enter)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Prompts Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-[#6B7D78]">
              <span className="shrink-0 font-medium text-[#142C29]">Quick queries:</span>
              <button
                onClick={() => handleSubmit("Summarize active incidents")}
                className="px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#E5EBE8] hover:border-[#26796C] hover:text-[#26796C] whitespace-nowrap transition-colors cursor-pointer"
              >
                Active Incidents
              </button>
              <button
                onClick={() => handleSubmit("Check system forwarder and health status")}
                className="px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#E5EBE8] hover:border-[#26796C] hover:text-[#26796C] whitespace-nowrap transition-colors cursor-pointer"
              >
                Forwarder Health
              </button>
              <button
                onClick={() => handleSubmit("List recent credential spraying detections")}
                className="px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#E5EBE8] hover:border-[#26796C] hover:text-[#26796C] whitespace-nowrap transition-colors cursor-pointer"
              >
                Password Spraying
              </button>
              <button
                onClick={() => handleSubmit("Explain MITRE technique T1110.001 mitigation")}
                className="px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#E5EBE8] hover:border-[#26796C] hover:text-[#26796C] whitespace-nowrap transition-colors cursor-pointer"
              >
                MITRE T1110.001
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* COLUMN 3: RIGHT CONTEXTUAL SECURITY EVIDENCE PANEL    */}
      {/* ---------------------------------------------------- */}
      <EvidenceDetailPanel />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-[#DFE5E2]">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-[#142C29]">Delete Investigation?</h4>
              <p className="text-xs text-[#5A6B66]">
                This will permanently delete the conversation history and evidence references. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[#FAF9F5] border border-[#DFE5E2] hover:bg-[#EAEFEA] text-[#192622] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderConversationItem(c: any) {
    const isActive = c.id === activeConversationId;
    const isEditing = editingTitleId === c.id;

    return (
      <div
        key={c.id}
        className={`group relative rounded-xl px-3 py-2 text-xs transition-all cursor-pointer flex items-center justify-between ${
          isActive
            ? 'bg-[#26796C]/10 text-[#142C29] font-medium border border-[#26796C]/25 shadow-xs'
            : 'text-[#5A6B66] hover:bg-[#FAF9F5] hover:text-[#192622]'
        }`}
        onClick={() => !isEditing && selectConversation(c.id)}
      >
        <div className="flex-1 min-w-0 pr-2">
          {isEditing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEditedTitle(c.id)}
                autoFocus
                className="w-full text-xs py-0.5 px-1 rounded border border-[#26796C] bg-white text-[#192622]"
              />
              <button onClick={() => saveEditedTitle(c.id)} className="text-[#26796C]">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingTitleId(null)} className="text-[#8C9E98]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                {c.isPinned && <Pin className="w-3 h-3 text-[#26796C] shrink-0" />}
                <span className="truncate font-medium">{c.title}</span>
              </div>
              {c.lastMessageSnippet && (
                <p className="text-[10px] text-[#8C9E98] truncate mt-0.5">
                  {c.lastMessageSnippet}
                </p>
              )}
            </>
          )}
        </div>

        {/* Hover Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateConversation(c.id, { isPinned: !c.isPinned });
              }}
              className={`p-1 rounded hover:bg-white text-[#8C9E98] hover:text-[#26796C] ${
                c.isPinned ? 'text-[#26796C]' : ''
              }`}
              title={c.isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startEditingTitle(c.id, c.title);
              }}
              className="p-1 rounded hover:bg-white text-[#8C9E98] hover:text-[#192622]"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(c.id);
              }}
              className="p-1 rounded hover:bg-white text-[#8C9E98] hover:text-rose-600"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
};
