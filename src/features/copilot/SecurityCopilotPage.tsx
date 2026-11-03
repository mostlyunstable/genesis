import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  User, 
  ShieldAlert, 
  Clock, 
  Copy, 
  RotateCcw, 
  AlertCircle,
  ShieldCheck,
  Flame,
  MessageSquare,
  Paperclip,
  UploadCloud,
  FileText,
  Loader2,
  FileUp,
  PanelLeft
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InvestigationStepsIndicator } from './InvestigationStepsIndicator';
import { LocalModelStatus } from './LocalModelStatus';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useModalFocus } from '@/hooks/useModalFocus';
import { ActionProposalCard } from './ActionProposalCard';

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
    uploadedFiles,
    activeFileId,
    isUploading,
    uploadError,
    isEvidencePanelOpen,
    searchQuery,
    error,
    loadConversations,
    selectConversation,
    createNewConversation,
    updateConversation,
    deleteConversation,
    uploadFile,
    setActiveFileId,
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
  const [isDragging, setIsDragging] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      handleSubmit(q.trim());
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const record = await uploadFile(file);
      if (record && !inputMessage.trim()) {
        setInputMessage(`Analyze uploaded log file ${record.filename} and perform full autonomous forensic investigation.`);
      }
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const record = await uploadFile(file);
      if (record && !inputMessage.trim()) {
        setInputMessage(`Analyze uploaded log file ${record.filename} and perform full autonomous forensic investigation.`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const historyRef = useRef<HTMLElement>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const mobileHistory = isHistoryOpen && isMobile;
  useModalFocus(mobileHistory, historyRef, () => setIsHistoryOpen(false));
  const scroll = useChatScroll(activeConversationId, [messages, streamingContent, currentStep, isStreaming]);

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
    <div className="w-full h-full flex min-h-0 min-w-0 overflow-hidden bg-[#F8F8F5] relative">
      {/* Mobile Backdrop for Conversation History */}
      {isHistoryOpen && (
        <div
          onClick={() => setIsHistoryOpen(false)}
          className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* COLUMN 1: LEFT CONVERSATION HISTORY & NEW INVESTIGATION */}
      {/* ---------------------------------------------------- */}
      <aside
        ref={historyRef}
        role={mobileHistory ? "dialog" : undefined}
        aria-modal={mobileHistory || undefined}
        aria-label="Conversation history"
        className={`bg-white border-r border-[#E2E4DC] flex flex-col shrink-0 min-h-0 h-full transition-all duration-200 select-none ${
          isHistoryOpen
            ? 'fixed md:relative inset-y-0 left-0 w-[min(100vw,24rem)] md:w-80 z-30 shadow-origin-lg md:shadow-none'
            : 'hidden'
        }`}
      >
        {/* Top Action Bar */}
        <div className="p-3 border-b border-[#E2E4DC] space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                createNewConversation();
                if (window.innerWidth < 768) setIsHistoryOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#111417] hover:bg-[#1E2328] text-white text-xs font-bold border-2 border-[#2A3138] hover:border-[#404A54] shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Investigation</span>
            </button>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="md:hidden min-h-11 min-w-11 p-1.5 rounded-lg text-[#5E656D] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer"
              aria-label="Close conversation history"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A939E]" />
            <input
              type="text"
              placeholder="Search past threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F0F1EA] border border-[#E2E4DC] text-xs text-[#111417] placeholder-[#8A939E] focus:outline-none focus:border-[#1E4BD8] focus:bg-white transition-all font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A939E] hover:text-[#111417]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-[#889085]">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No conversations found.</p>
            </div>
          ) : (
            <>
              {/* Pinned Group */}
              {pinnedConversations.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-[#5C645B] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Pin className="w-3 h-3 text-[#1E4BD8]" />
                    <span>Pinned</span>
                  </div>
                  {pinnedConversations.map(c => renderConversationItem(c))}
                </div>
              )}

              {/* Recent Group */}
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-[#5C645B] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Clock className="w-3 h-3 text-[#5C645B]" />
                  <span>Recent</span>
                </div>
                {recentConversations.map(c => renderConversationItem(c))}
              </div>
            </>
          )}
        </div>

        {/* Footer Status */}
        <div className="p-3 border-t border-[#E2E4DC] bg-[#F8F8F5] text-[11px] text-[#5C645B] flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E4BD8]" />
            <span>Genesis Ready</span>
          </span>
          <span className="font-mono text-[#5C645B] text-[10px]">v2.5</span>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* COLUMN 2: CENTER CHAT WORKSPACE                      */}
      {/* ---------------------------------------------------- */}
      <main 
        className="flex-1 min-w-0 min-h-0 flex flex-col h-full bg-[#F8F8F5] overflow-hidden relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-and-drop file overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-[#1E4BD8]/10 border-2 border-dashed border-[#1E4BD8] z-30 rounded-2xl flex flex-col items-center justify-center p-6 backdrop-blur-xs pointer-events-none">
            <UploadCloud className="w-10 h-10 text-[#1E4BD8] mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-[#111417]">Drop log file to analyze</p>
            <p className="text-xs text-[#5C645B]">Supports OpenSSH, Syslog RFC 5424, Windows 4625, JSON, CSV</p>
          </div>
        )}

        {/* Workspace Top Header */}
        <header className="px-4 sm:px-6 py-2.5 border-b border-[#E2E4DC] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="p-1.5 rounded-lg text-[#5C645B] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer flex items-center gap-1.5 text-xs shrink-0"
              title={isHistoryOpen ? "Hide chat history" : "Show chat history"}
              aria-label="Toggle chat history"
            >
              <PanelLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-sans">
                {isHistoryOpen ? "Hide History" : "Chats"}
              </span>
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#111417] truncate">
                {activeConversation?.title && activeConversation.title !== 'New Security Investigation'
                  ? activeConversation.title 
                  : 'Copilot'}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-[#5C645B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E4BD8]" />
                <LocalModelStatus />
              </div>
            </div>
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
        <div ref={scroll.containerRef} onScroll={scroll.onScroll} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {messages.length === 0 && !isStreaming ? (
            /* Refined, Minimal Initial State with Genesis Logo */
            <div className="max-w-xl mx-auto py-12 sm:py-16 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-[#0A0D10] flex items-center justify-center p-2.5 shadow-origin-md border border-white/10 ring-1 ring-[#1E4BD8]/25">
                  <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-display font-medium text-[#111417] tracking-tight">
                  Hi. What would you like to investigate?
                </h2>
                <p className="text-sm text-[#5C645B]">
                  Ask a security question or upload a log file to get started.
                </p>
              </div>

              {/* 4 Understated Prompt Suggestions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] hover:bg-[#F0F1EA]/40 transition-all text-xs cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between font-medium text-[#111417] group-hover:text-[#1E4BD8]">
                    <span>Analyze a security log</span>
                    <FileUp className="w-3.5 h-3.5 text-[#889085] group-hover:text-[#1E4BD8] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#5C645B] mt-1">Upload syslog, auth log, or CSV</p>
                </button>

                <button
                  onClick={() => handleSubmit("Investigate IP address 198.51.100.42")}
                  className="p-4 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] hover:bg-[#F0F1EA]/40 transition-all text-xs cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between font-medium text-[#111417] group-hover:text-[#1E4BD8]">
                    <span>Investigate an IP address</span>
                    <Search className="w-3.5 h-3.5 text-[#889085] group-hover:text-[#1E4BD8] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#5C645B] mt-1">Check host telemetry & reputation</p>
                </button>

                <button
                  onClick={() => handleSubmit("Explain brute-force attack detection and thresholds")}
                  className="p-4 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] hover:bg-[#F0F1EA]/40 transition-all text-xs cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between font-medium text-[#111417] group-hover:text-[#1E4BD8]">
                    <span>Explain a detection</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-[#889085] group-hover:text-[#1E4BD8] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#5C645B] mt-1">Understand detection heuristics</p>
                </button>

                <button
                  onClick={() => handleSubmit("Review active response playbooks and defense status")}
                  className="p-4 rounded-xl border border-[#E2E4DC] bg-white hover:border-[#1E4BD8] hover:bg-[#F0F1EA]/40 transition-all text-xs cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between font-medium text-[#111417] group-hover:text-[#1E4BD8]">
                    <span>Review response playbooks</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#889085] group-hover:text-[#1E4BD8] transition-colors" />
                  </div>
                  <p className="text-[11px] text-[#5C645B] mt-1">Review active automated containment</p>
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
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0A0D10] flex items-center justify-center shrink-0 shadow-xs mt-1 border border-white/10 ring-1 ring-[#1E4BD8]/20 p-1">
                      <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[92%] sm:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-[#111417] text-white rounded-tr-xs shadow-xs'
                          : 'bg-white border border-[#E2E4DC] rounded-tl-xs shadow-2xs text-[#111417]'
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
                      <div className="flex items-center gap-2 px-1 text-[11px] text-[#5C645B] pt-1">
                        <button
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-[#F0F1EA] text-[#111417] font-semibold border border-[#D5D9CE] hover:border-[#111417] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#5C645B]" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => retryLastMessage(msg.id)}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-[#F0F1EA] text-[#111417] font-semibold border border-[#D5D9CE] hover:border-[#111417] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#5C645B]" />
                          <span>Retry</span>
                        </button>
                        {msg.tokenCount && (
                          <span className="font-mono text-[10px] text-[#889085] ml-1">{msg.tokenCount} tokens</span>
                        )}
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-[#F0F1EA] border border-[#E2E4DC] text-[#111417] flex items-center justify-center shrink-0 mt-1">
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
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0A0D10] flex items-center justify-center shrink-0 shadow-xs mt-1 border border-white/10 ring-1 ring-[#1E4BD8]/30 animate-pulse p-1">
                    <img src="/genesis-logo-mark.png" alt="Genesis AI" className="w-full h-full object-contain" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-[#1E4BD8]/30 text-xs sm:text-sm text-[#111417] shadow-2xs flex-1">
                    <MarkdownRenderer
                      content={streamingContent}
                      onChipClick={handleChipClick}
                    />
                    <span className="inline-block w-2 h-4 ml-1 bg-[#1E4BD8] animate-pulse align-middle" />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {scroll.showJump && <button onClick={scroll.jump} className="min-h-11 px-4 bg-white border rounded-lg self-center">Jump to latest reply</button>}

        {/* Input Composer Area */}
        <div className="p-4 border-t border-[#E2E4DC] bg-white shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            {/* Upload Error Alert */}
            {uploadError && (
              <div className="px-3 py-1.5 rounded-xl bg-[#F9ECEB] border border-[#F2D5D3] text-[#B94C43] text-xs flex items-center justify-between">
                <span>Upload error: {uploadError}</span>
              </div>
            )}

            {/* Attached Log Files Tray (Only active selected file) */}
            {activeFileId && uploadedFiles.find(f => f.id === activeFileId) && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(() => {
                  const file = uploadedFiles.find(f => f.id === activeFileId);
                  if (!file) return null;
                  return (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-[#D0DEFF] bg-[#EFF4FF] text-[#111417] text-xs font-mono shadow-2xs">
                      <FileText className="w-3.5 h-3.5 text-[#1E4BD8]" />
                      <span className="font-bold truncate max-w-[160px]">{file.filename}</span>
                      <span className="text-[10px] text-[#5C645B]">({file.parsedCount} evts)</span>
                      <button
                        onClick={() => setActiveFileId(null)}
                        className="p-1 hover:bg-[#D0DEFF] rounded-full text-[#1E4BD8] cursor-pointer ml-1 transition-colors"
                        title="Detach file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="relative flex items-end rounded-xl border border-[#E2E4DC] bg-[#F8F8F5] focus-within:ring-2 focus-within:ring-[#1E4BD8]/10 focus-within:border-[#1E4BD8] focus-within:bg-white transition-all shadow-inner">
              {/* Paperclip attachment button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || isUploading}
                className="p-3 text-[#5C645B] hover:text-[#1E4BD8] transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                title="Attach log file (.log, .txt, .csv, .json, .jsonl)"
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
                placeholder="Ask Genesis anything about your security data..."
                rows={1}
                disabled={isStreaming}
                className="w-full resize-none py-3 pl-1 pr-14 bg-transparent text-xs sm:text-sm text-[#111417] placeholder-[#889085] focus:outline-none max-h-36 overflow-y-auto"
                style={{ minHeight: '44px' }}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                {isStreaming ? (
                  <button
                    onClick={stopStreaming}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#B94C43] hover:bg-[#A33C34] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Stop generation"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!inputMessage.trim()}
                    className="p-2 rounded-lg bg-[#111417] hover:bg-[#1E4BD8] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                    title="Send message (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Prompts Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-[#5C645B]">
              <span className="shrink-0 font-medium text-[#111417]">Suggestions:</span>
              {activeFileId && uploadedFiles.find(f => f.id === activeFileId) && (
                <button
                  onClick={() => handleSubmit(`Analyze uploaded log file ${uploadedFiles.find(f => f.id === activeFileId)?.filename} and investigate suspicious activities`)}
                  className="px-3 py-1.5 rounded-lg bg-[#EFF4FF] text-[#1E4BD8] border-2 border-[#D0DEFF] hover:border-[#1E4BD8] font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze {uploadedFiles.find(f => f.id === activeFileId)?.filename}</span>
                </button>
              )}
              <button
                onClick={() => handleSubmit("Summarize current security status and threat posture")}
                className="px-3 py-1.5 rounded-lg bg-white border-2 border-[#CFD4C9] hover:border-[#111417] text-[#111417] font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                Security Posture
              </button>
              <button
                onClick={() => handleSubmit("Check system operational health and forwarders")}
                className="px-3 py-1.5 rounded-lg bg-white border-2 border-[#CFD4C9] hover:border-[#111417] text-[#111417] font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                System Status
              </button>
              <button
                onClick={() => handleSubmit("Explain brute force attack detection")}
                className="px-3 py-1.5 rounded-lg bg-white border-2 border-[#CFD4C9] hover:border-[#111417] text-[#111417] font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                Brute Force Heuristics
              </button>
              <button
                onClick={() => handleSubmit("Explain brute force mitigation")}
                className="px-3 py-1.5 rounded-lg bg-white border-2 border-[#CFD4C9] hover:border-[#111417] text-[#111417] font-bold whitespace-nowrap transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                Defense Strategy
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-[#E2E4DC]">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-[#111417]">Delete Investigation?</h4>
              <p className="text-xs text-[#5C645B]">
                This will permanently delete the conversation history. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#F0F1EA] hover:bg-[#E2E4DC] border border-[#E2E4DC] text-[#111417] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
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
        className={`group relative rounded-lg px-3 py-2 text-xs transition-all cursor-pointer flex items-center justify-between ${
          isActive
            ? 'bg-[#EFF4FF] text-[#1E4BD8] font-semibold border border-[#D0DEFF] shadow-2xs'
            : 'text-[#5C645B] hover:bg-[#F0F1EA] hover:text-[#111417]'
        }`}
        onClick={() => {
          if (!isEditing) {
            selectConversation(c.id);
            if (window.innerWidth < 768) setIsHistoryOpen(false);
          }
        }}
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
                className="w-full text-xs py-0.5 px-1 rounded border border-[#1E4BD8] bg-white text-[#111417]"
              />
              <button onClick={() => saveEditedTitle(c.id)} className="text-[#1E4BD8]">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingTitleId(null)} className="text-[#889085]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                {c.isPinned && <Pin className="w-3 h-3 text-[#1E4BD8] shrink-0" />}
                <span className="truncate font-medium">{c.title}</span>
              </div>
              {c.lastMessageSnippet && (
                <p className="text-[10px] text-[#889085] truncate mt-0.5">
                  {c.lastMessageSnippet}
                </p>
              )}
            </>
          )}
        </div>

        {/* Hover Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateConversation(c.id, { isPinned: !c.isPinned });
              }}
              className={`min-h-11 min-w-11 md:min-h-8 md:min-w-8 p-1 rounded focus-visible:ring-2 focus-visible:ring-blue-600 hover:bg-white text-[#889085] hover:text-[#1E4BD8] ${
                c.isPinned ? 'text-[#1E4BD8]' : ''
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
              className="min-h-11 min-w-11 md:min-h-8 md:min-w-8 p-1 rounded focus-visible:ring-2 focus-visible:ring-blue-600 hover:bg-white text-[#889085] hover:text-[#111417]"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(c.id);
              }}
              className="min-h-11 min-w-11 md:min-h-8 md:min-w-8 p-1 rounded focus-visible:ring-2 focus-visible:ring-blue-600 hover:bg-white text-[#889085] hover:text-[#B94C43]"
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
